import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Pencil } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { EditarActivoModal } from './EditarActivoModal';
import { RECURSO_ACTIVOS, ACCION_U } from '../rbac';
import type { ApiError } from '../../shared/api/errors';
import type { ActivoBiologicoResponse, ActualizarActivoIndividualDTO } from '../types';

interface Props {
  activo: ActivoBiologicoResponse | null;
  loading: boolean;
  saving: boolean;
  saveError: ApiError | null;
  onGuardar: (dto: ActualizarActivoIndividualDTO) => Promise<boolean>;
  onChanged: () => void;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 var(--s4)',
};

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: 2, wordBreak: 'break-word' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s5)' }}>
      {children}
    </div>
  );
}

export function DatosActivoSection({ activo, loading, saving, saveError, onGuardar, onChanged }: Props) {
  const { t } = useT('biologicalAssets');
  const online = useOnlineStatus();
  const puedeEditar = usePermission(RECURSO_ACTIVOS, ACCION_U);
  const [editando, setEditando] = useState(false);

  if (loading || !activo) {
    return (
      <div style={{ height: 180, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  const esIndividual = String(activo.tipo).toUpperCase() === 'INDIVIDUAL';
  const ind = activo.detalle_individual;
  const pob = activo.detalle_poblacional;

  const handleGuardar = async (dto: ActualizarActivoIndividualDTO) => {
    const ok = await onGuardar(dto);
    if (ok) onChanged();
    return ok;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Detalle según tipo */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <h3 style={{ ...CARD_TITLE, margin: 0 }}>{esIndividual ? 'Detalle individual' : 'Detalle poblacional'}</h3>
          {esIndividual && puedeEditar && (
            <Button variant="ghost" size="sm" onClick={() => setEditando(true)} disabled={!online} aria-label={t('datosactivosection.editar_activo')}>
              <Pencil size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('datosactivosection.editar')}</Button>
          )}
        </div>
        {esIndividual && ind ? (
          <Grid>
            <Dato label={t('datosactivosection.raza')} value={ind.raza} />
            <Dato label={t('datosactivosection.sexo')} value={ind.sexo} />
            <Dato label={t('datosactivosection.fecha_de_nacimiento')} value={ind.fecha_nacimiento?.slice(0, 10)} />
            <Dato label={t('datosactivosection.peso_inicial')} value={ind.peso_inicial} />
          </Grid>
        ) : pob ? (
          <Grid>
            <Dato label={t('datosactivosection.cantidad_inicial')} value={pob.cantidad_inicial} />
            <Dato label={t('datosactivosection.cantidad_actual')} value={pob.cantidad_actual} />
            <Dato label={t('datosactivosection.peso_promedio_inicial')} value={pob.peso_promedio_inicial} />
            <Dato label={t('datosactivosection.peso_promedio')} value={pob.peso_promedio} />
            <Dato label={t('datosactivosection.biomasa_total')} value={pob.biomasa_total} />
            <Dato label={t('datosactivosection.densidad')} value={pob.densidad} />
          </Grid>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('datosactivosection.sin_detalle_disponible')}</p>
        )}
      </div>

      {/* Datos generales / procedencia */}
      <div style={CARD}>
        <h3 style={CARD_TITLE}>{t('datosactivosection.origen_y_procedencia')}</h3>
        <Grid>
          <Dato label={t('datosactivosection.origen_financiero')} value={activo.origen_financiero} />
          <Dato label={t('datosactivosection.costo_de_adquisicion')} value={activo.costo_adquisicion} />
          <Dato label={t('datosactivosection.soporte_documental')} value={activo.soporte_documental} />
          <Dato label={t('datosactivosection.fecha_de_inicio_de_ciclo')} value={activo.fecha_inicio_ciclo} />
          <Dato label={t('datosactivosection.procedencia')} value={activo.detalles_procedencia} />
        </Grid>
      </div>

      {/* Atributos dinámicos */}
      {activo.atributos_dinamicos && Object.keys(activo.atributos_dinamicos).length > 0 && (
        <div style={CARD}>
          <h3 style={CARD_TITLE}>{t('datosactivosection.atributos_dinamicos')}</h3>
          <Grid>
            {Object.entries(activo.atributos_dinamicos).map(([k, v]) => (
              <Dato key={k} label={k} value={String(v)} />
            ))}
          </Grid>
        </div>
      )}

      {editando && (
        <EditarActivoModal
          activo={activo}
          saving={saving}
          saveError={saveError}
          onClose={() => setEditando(false)}
          onGuardar={handleGuardar}
        />
      )}
    </div>
  );
}
