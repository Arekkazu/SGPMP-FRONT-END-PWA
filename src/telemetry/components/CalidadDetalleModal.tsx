import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { RefreshCcw } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ClasificacionCalidadPill } from './ClasificacionCalidadPill';
import { FlagChips } from './FlagChips';
import { horaCaptura } from '../lib/sensorEscala';
import type { TelemetriaCalidadSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  item: TelemetriaCalidadSchema;
  puedeEjecutar: boolean;
  online: boolean;
  saving: boolean;
  saveError: ApiError | null;
  onEvaluar: (idTelemetria: number) => void;
  onClose: () => void;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function Params({ dict }: { dict: Record<string, unknown> | null | undefined }) {
  const entries = dict ? Object.entries(dict) : [];
  if (entries.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--r-sm)', padding: 'var(--s2)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

export function CalidadDetalleModal({ item, puedeEjecutar, online, saving, saveError, onEvaluar, onClose }: Props) {
  const { t } = useT('telemetry');
  const disabled = !puedeEjecutar || !online || saving;
  return (
    <ModalShell
      title={`Evaluación de calidad · lectura #${item.id_telemetria}`}
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('calidaddetallemodal.cerrar')}</Button>
          <Button variant="secondary" size="sm" loading={saving} disabled={disabled} title={!puedeEjecutar ? t('calidaddetallemodal.sin_permiso_e') : !online ? t('calidaddetallemodal.sin_conexion') : t('calidaddetallemodal.re_evaluar_esta_lectura')} onClick={() => onEvaluar(item.id_telemetria)}>
            <RefreshCcw size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('calidaddetallemodal.evaluar_de_nuevo')}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
        <ClasificacionCalidadPill clasificacion={item.clasificacion_calidad} />
        {item.indice_calidad != null && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Índice: {item.indice_calidad}</span>
        )}
      </div>

      <Fila label={t('calidaddetallemodal.sensor')}>#{item.id_sensor}</Fila>
      <Fila label={t('calidaddetallemodal.evaluada')}>{item.timestamp_evaluacion?.slice(0, 10)} {horaCaptura(item.timestamp_evaluacion)}</Fila>
      <Fila label={t('calidaddetallemodal.apto_para_ia')}>{item.apto_para_ia ? 'Sí' : 'No'}</Fila>
      <Fila label={t('calidaddetallemodal.apto_para_nic_41')}>{item.apto_para_nic41 ? 'Sí' : 'No'}</Fila>
      <Fila label={t('calidaddetallemodal.estado')}>{item.estado_evaluacion}</Fila>
      {item.version_evaluacion != null && <Fila label={t('calidaddetallemodal.version')}>{item.version_evaluacion}</Fila>}
      {item.motivo_reevaluacion && <Fila label={t('calidaddetallemodal.motivo_reevaluacion')}>{item.motivo_reevaluacion}</Fila>}
      {item.id_evaluacion_superada && <Fila label={t('calidaddetallemodal.evaluacion_superada')}>{item.id_evaluacion_superada.slice(0, 8)}…</Fila>}

      <div style={{ marginTop: 'var(--s4)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>{t('calidaddetallemodal.flags_detectados')}</div>
        <FlagChips flags={item.flags_detectados} />
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidaddetallemodal.parametros_aplicados')}</div>
        <Params dict={item.parametros_aplicados} />
      </div>

      {saveError && (
        <Alert
          variant={saveError.status === 403 ? 'warning' : 'error'}
          title={saveError.status === 403 ? t('calidaddetallemodal.sin_permiso_para_evaluar') : t('calidaddetallemodal.no_se_pudo_evaluar_la_lectura')}
          description={saveError.message}
          style={{ marginTop: 'var(--s4)' }}
        />
      )}
    </ModalShell>
  );
}
