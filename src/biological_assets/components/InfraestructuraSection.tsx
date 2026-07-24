import React, { useEffect, useState } from 'react';
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
  fontSize: '13px',
  cursor: 'pointer',
};

const TAB_ACTIVE: React.CSSProperties = {
  ...TAB,
  borderBottomColor: 'var(--brand-500)',
  color: 'var(--brand-600)',
  fontWeight: 600,
};

function AsociacionCard({ a, activa }: { a: AsociacionInfraestructuraResponse; activa?: boolean }) {
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
          {a.fecha_inicio?.slice(0, 10)}{a.fecha_fin ? ` → ${a.fecha_fin.slice(0, 10)}` : ' → vigente'}
        </div>
      </div>
      {activa && (
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-600)' }}>ACTUAL</span>
      )}
    </div>
  );
}

export function InfraestructuraSection({ idActivo, onChanged }: Props) {
  const online = useOnlineStatus();
  const puedeTransferir = usePermission(RECURSO_ACTIVOS, ACCION_E);
  const { data, loading, error, cargar } = useInfraestructuraActivo(idActivo);

  const [view, setView] = useState<'ACTIVA' | 'HISTORIAL'>('ACTIVA');
  const [origen, setOrigen] = useState<{ id: number; nombre: string } | null>(null);
  const [transferir, setTransferir] = useState(false);

  useEffect(() => { cargar(view); }, [view, cargar]);

  useEffect(() => {
    if (data?.asociacion_activa) {
      setOrigen({ id: data.asociacion_activa.id_infraestructura, nombre: data.asociacion_activa.nombre_infraestructura });
    }
  }, [data]);

  const handleDone = () => { setView('ACTIVA'); cargar('ACTIVA'); onChanged(); };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <button type="button" style={view === 'ACTIVA' ? TAB_ACTIVE : TAB} onClick={() => setView('ACTIVA')}>
            Ubicación actual
          </button>
          <button type="button" style={view === 'HISTORIAL' ? TAB_ACTIVE : TAB} onClick={() => setView('HISTORIAL')}>
            Historial de ubicaciones
          </button>
        </div>
        {puedeTransferir && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => setTransferir(true)}>
            <ArrowLeftRight size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Transferir
          </Button>
        )}
      </div>

      {error && <Alert variant="error" title="Error al cargar la asociación" description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ height: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : view === 'ACTIVA' ? (
        data?.asociacion_activa ? (
          <AsociacionCard a={data.asociacion_activa} activa />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Sin infraestructura asociada actualmente.</p>
        )
      ) : (
        (data?.historial && data.historial.length > 0) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {data.historial.map((a) => (
              <AsociacionCard key={a.id_historial} a={a} activa={a.fecha_fin == null} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Sin historial de ubicaciones.</p>
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
