import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { GitFork, Pencil, ShieldCheck } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { EstadoVinculacionPill } from './EstadoVinculacionPill';
import { MecanismoPill } from './MecanismoPill';
import { horaCaptura } from '../lib/sensorEscala';
import type { VinculacionLecturaSchema } from '../types';

interface Props {
  vinc: VinculacionLecturaSchema;
  puedeGestionar: boolean;
  online: boolean;
  onResolver: () => void;
  onCorregir: () => void;
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

function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `${iso.slice(0, 10)} ${horaCaptura(iso)}`;
}

export function VinculacionDetalleModal({ vinc, puedeGestionar, online, onResolver, onCorregir, onClose }: Props) {
  const { t } = useT('telemetry');
  const estado = vinc.estado_vinculacion.toUpperCase();
  const puedeResolver = ['AMBIGUA', 'PENDIENTE_REVISION', 'SIN_VINCULAR'].includes(estado);
  const puedeCorregir = estado === 'CONFIRMADA';
  const disabled = !puedeGestionar || !online;

  return (
    <ModalShell
      title={`Vinculación #${vinc.id_vinculacion_lectura}`}
      onClose={onClose}
      maxWidth={520}
      footer={
        (puedeResolver || puedeCorregir) ? (
          <div style={{ display: 'flex', gap: 'var(--s2)' }}>
            {puedeResolver && (
              <Button variant="primary" size="sm" disabled={disabled} title={disabled ? t('vinculaciondetallemodal.sin_permiso_o_sin_conexion') : 'Resolver'} onClick={onResolver}>
                <GitFork size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('vinculaciondetallemodal.resolver')}</Button>
            )}
            {puedeCorregir && (
              <Button variant="danger" size="sm" disabled={disabled} title={disabled ? t('vinculaciondetallemodal.sin_permiso_o_sin_conexion') : 'Corregir'} onClick={onCorregir}>
                <Pencil size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('vinculaciondetallemodal.corregir')}</Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
        <EstadoVinculacionPill estado={vinc.estado_vinculacion} />
        <MecanismoPill mecanismo={vinc.mecanismo_vinculacion} />
      </div>

      <Fila label="Lectura (telemetría)">#{vinc.id_telemetria}</Fila>
      <Fila label={t('vinculaciondetallemodal.activo_biologico')}>{vinc.id_activo_biologico != null ? `#${vinc.id_activo_biologico}` : '—'}</Fila>
      <Fila label={t('vinculaciondetallemodal.modelo_de_manejo')}>{vinc.modelo_manejo || '—'}</Fila>
      <Fila label={t('vinculaciondetallemodal.infraestructura')}>#{vinc.id_infraestructura}</Fila>
      <Fila label={t('vinculaciondetallemodal.inicio_validez')}>{fechaHora(vinc.fecha_inicio_vinculacion)}</Fila>
      <Fila label={t('vinculaciondetallemodal.fin_validez')}>{fechaHora(vinc.fecha_fin_vinculacion)}</Fila>
      <Fila label={t('vinculaciondetallemodal.creada')}>{fechaHora(vinc.fecha_creacion)}</Fila>
      {vinc.id_usuario != null && <Fila label={t('vinculaciondetallemodal.usuario')}>#{vinc.id_usuario}</Fila>}

      <div style={{ marginTop: 'var(--s5)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
          <ShieldCheck size={16} aria-hidden />{t('vinculaciondetallemodal.trazabilidad_nic_41')}</h3>
        <Fila label={t('vinculaciondetallemodal.vinculacion_reemplazada')}>{vinc.id_vinculacion_reemplazada != null ? `#${vinc.id_vinculacion_reemplazada}` : '—'}</Fila>
        <Fila label={t('vinculaciondetallemodal.motivo_de_correccion')}>{vinc.motivo_correccion ?? '—'}</Fila>
      </div>
    </ModalShell>
  );
}
