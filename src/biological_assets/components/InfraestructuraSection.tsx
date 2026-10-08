import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { FECHA_NUMERICA, formatearFecha } from '../../shared/i18n/formato';
import { MapPin, ArrowLeftRight } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useInfraestructuraActivo } from '../hooks/useInfraestructuraActivo';
import { TransferenciaWizard } from './TransferenciaWizard';
import { RECURSO_ACTIVOS, ACCION_E } from '../rbac';
import type { AsociacionInfraestructuraResponse } from '../types';

interface Props {
  idActivo: number;
  onChanged: () => void;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const TAB: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-body-md)',
  minHeight: 'var(--s9)',
  cursor: 'pointer',
};

const TAB_ACTIVE: React.CSSProperties = {
  ...TAB,
  borderBottomColor: 'var(--brand-500)',
  color: 'var(--brand-600)',
  fontWeight: 600,
};

function AsociacionCard({ a, activa }: { a: AsociacionInfraestructuraResponse; activa?: boolean }) {
  const { t } = useT('biologicalAssets');
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--s3)',
        padding: 'var(--s4)',
        border: `1px solid ${activa ? 'var(--brand-500)' : 'var(--surface-border)'}`,
        background: activa ? 'var(--brand-50)' : 'var(--surface-card)',
        borderRadius: 'var(--r-md)',
      }}
    >
      <MapPin size={18} aria-hidden style={{ color: 'var(--text-secondary)', marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{a.nombre_infraestructura}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.tipo_infraestructura}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {formatearFecha(a.fecha_inicio, FECHA_NUMERICA)}{a.fecha_fin ? ` → ${formatearFecha(a.fecha_fin, FECHA_NUMERICA)}` : ' → vigente'}
        </div>
      </div>
      {activa && (
        <span style={{ fontSize: 'var(--fs-label-sm)', fontWeight: 700, color: 'var(--brand-600)' }}>{t('infraestructurasection.actual')}</span>
      )}
    </div>
  );
}

export function InfraestructuraSection({ idActivo, onChanged }: Props) {
  const { t } = useT('biologicalAssets');
  const online = useOnlineStatus();
  const puedeTransferir = usePermission(RECURSO_ACTIVOS, ACCION_E);
  const { data, loading, error, cargar } = useInfraestructuraActivo(idActivo);

  const [view, setView] = useState<'ACTIVA' | 'HISTORIAL'>('ACTIVA');
  const [origen, setOrigen] = useState<{ id: number; nombre: string } | null>(null);
  const [transferir, setTransferir] = useState(false);
  // Contador y no booleano: cada transferencia remonta la alerta para que se anuncie de nuevo (TC-DIS-134).
  const [transferencias, setTransferencias] = useState(0);

  useEffect(() => { cargar(view); }, [view, cargar]);

  useEffect(() => {
    if (data?.asociacion_activa) {
      setOrigen({ id: data.asociacion_activa.id_infraestructura, nombre: data.asociacion_activa.nombre_infraestructura });
    }
  }, [data]);

  const handleDone = () => { setView('ACTIVA'); cargar('ACTIVA'); onChanged(); setTransferencias((n) => n + 1); };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          {/* aria-pressed expone cuál vista está activa, no solo el subrayado (TC-DIS-120). */}
          <button type="button" aria-pressed={view === 'ACTIVA'} style={view === 'ACTIVA' ? TAB_ACTIVE : TAB} onClick={() => setView('ACTIVA')}>{t('infraestructurasection.ubicacion_actual')}</button>
          <button type="button" aria-pressed={view === 'HISTORIAL'} style={view === 'HISTORIAL' ? TAB_ACTIVE : TAB} onClick={() => setView('HISTORIAL')}>{t('infraestructurasection.historial_de_ubicaciones')}</button>
        </div>
        {puedeTransferir && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => setTransferir(true)}>
            <ArrowLeftRight size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('infraestructurasection.transferir')}</Button>
        )}
      </div>

      {transferencias > 0 && (
        <Alert key={transferencias} variant="success" title={t('infraestructurasection.transferencia_realizada')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && <Alert variant="error" title={t('infraestructurasection.error_al_cargar_la_asociacion')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {data?.advertencia_integridad && (
        <Alert variant="warning" title={t('infraestructurasection.historial_con_inconsistencias')} description={data.advertencia_integridad} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {loading ? (
        <div style={{ height: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : view === 'ACTIVA' ? (
        data?.asociacion_activa ? (
          <AsociacionCard a={data.asociacion_activa} activa />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('infraestructurasection.sin_infraestructura_asociada_actualmente')}</p>
        )
      ) : (
        (data?.historial && data.historial.length > 0) ? (
          <ol aria-label={t('infraestructurasection.historial_de_ubicaciones')} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', listStyle: 'none', margin: 0, padding: 0 }}>
            {data.historial.map((a) => (
              <li key={a.id_historial}>
                <AsociacionCard a={a} activa={a.fecha_fin == null} />
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('infraestructurasection.sin_historial_de_ubicaciones')}</p>
        )
      )}

      {transferir && (
        <TransferenciaWizard
          idActivo={idActivo}
          origenId={origen?.id ?? null}
          origenNombre={origen?.nombre ?? null}
          onClose={() => setTransferir(false)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
