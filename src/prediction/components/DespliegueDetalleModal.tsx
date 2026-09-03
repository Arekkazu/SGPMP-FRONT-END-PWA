import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { RotateCcw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { EstadoOtaPill } from './EstadoOtaPill';
import { ProgressBar } from './ProgressBar';
import { Pill } from './Pill';
import { TIPO_MODELO_LABEL } from '../types';
import type { DespliegueOtaResponse } from '../types';

interface Props {
  despliegue: DespliegueOtaResponse | null;
  onClose: () => void;
}

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

export function DespliegueDetalleModal({ despliegue, onClose }: Props) {
  const { t } = useT('prediction');
  if (!despliegue) return null;
  const d = despliegue;
  const progreso = d.tamano_modelo_bytes && d.tamano_descargado_bytes
    ? (d.tamano_descargado_bytes / d.tamano_modelo_bytes) * 100
    : d.estado_despliegue === 'EXITOSO' ? 100 : 0;

  return (
    <ModalShell title={`Despliegue #${d.id_despliegue_ota}`} onClose={onClose} maxWidth={640} footer={<Button variant="secondary" onClick={onClose}>{t('desplieguedetallemodal.cerrar')}</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <EstadoOtaPill estado={d.estado_despliegue} />
          <Pill tono="neutral">{TIPO_MODELO_LABEL[d.tipo_modelo] ?? d.tipo_modelo}</Pill>
          {d.rollback_ejecutado && <Pill tono="warning" icon={<RotateCcw size={12} aria-hidden />}>{t('desplieguedetallemodal.rollback_ejecutado')}</Pill>}
        </div>

        <ProgressBar valor={progreso} label={t('desplieguedetallemodal.progreso_de_descarga')} color={d.estado_despliegue === 'FALLIDO' ? 'var(--sem-error)' : 'var(--brand-500)'} height={10} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)' }}>
          <Fila label={t('desplieguedetallemodal.version_de_modelo')}>v{d.id_version_modelo}</Fila>
          <Fila label={t('desplieguedetallemodal.version_anterior')}>{d.id_version_modelo_anterior != null ? `v${d.id_version_modelo_anterior}` : '—'}</Fila>
          <Fila label={t('desplieguedetallemodal.dispositivo_iot')}>#{d.id_dispositivo_iot}</Fila>
          <Fila label={t('desplieguedetallemodal.modo_distribucion')}>{d.modo_distribucion || '—'}</Fila>
          <Fila label={t('desplieguedetallemodal.intentos')}>{d.intentos_descarga} / {d.max_reintentos}</Fila>
          <Fila label={t('desplieguedetallemodal.bateria_al_inicio')}>{d.nivel_bateria_al_inicio != null ? `${d.nivel_bateria_al_inicio}%` : '—'}</Fila>
          <Fila label={t('desplieguedetallemodal.duracion')}>{d.duracion_proceso_ms != null ? `${(d.duracion_proceso_ms / 1000).toFixed(1)} s` : '—'}</Fila>
          <Fila label={t('desplieguedetallemodal.tamano_modelo')}>{d.tamano_modelo_bytes != null ? `${(d.tamano_modelo_bytes / 1_048_576).toFixed(1)} MB` : '—'}</Fila>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <Fila label={t('desplieguedetallemodal.ventana_inicio')}>{fmt(d.ventana_inicio)}</Fila>
          <Fila label={t('desplieguedetallemodal.ventana_fin')}>{fmt(d.ventana_fin)}</Fila>
          <Fila label={t('desplieguedetallemodal.inicio_proceso')}>{fmt(d.fecha_inicio)}</Fila>
          <Fila label={t('desplieguedetallemodal.fin_proceso')}>{fmt(d.fecha_fin)}</Fila>
        </div>

        {d.hash_modelo_sha256 && (
          <Fila label="Hash modelo (SHA-256)"><span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', wordBreak: 'break-all' }}>{d.hash_modelo_sha256}</span></Fila>
        )}

        {d.estado_despliegue === 'FALLIDO' && d.motivo_fallo && (
          <Alert variant="error" title={t('desplieguedetallemodal.motivo_del_fallo')} description={d.motivo_fallo} />
        )}
      </div>
    </ModalShell>
  );
}
