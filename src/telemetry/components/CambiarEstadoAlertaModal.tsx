// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: conserva formulario ante errores y cambios de permiso |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import type { AlertaSchema, ActualizarEstadoAlertaDTO, NuevoEstadoAlerta } from '../types';
import { accionesAlerta } from '../lib/accionesAlerta';
import type { ApiError } from '../../shared/api/errors';

interface Meta {
  titulo: string;
  labelMotivo: string;
  cta: string;
  variant: 'primary' | 'secondary' | 'danger';
  motivoRequerido: boolean;
}

const META: Record<NuevoEstadoAlerta, Meta> = {
  EN_ATENCION: { titulo: 'titulo_tomar', labelMotivo: 'nota', cta: 'tomar', variant: 'primary', motivoRequerido: false },
  RESUELTA: { titulo: 'titulo_resolver', labelMotivo: 'accion_tomada', cta: 'resolver', variant: 'primary', motivoRequerido: true },
  DESCARTADA: { titulo: 'titulo_descartar', labelMotivo: 'motivo', cta: 'descartar', variant: 'danger', motivoRequerido: true },
};

interface Props {
  alerta: AlertaSchema;
  estado: NuevoEstadoAlerta;
  saving: boolean;
  autorizada: boolean;
  saveError: ApiError | null;
  onConfirm: (dto: ActualizarEstadoAlertaDTO) => void;
  onClose: () => void;
}

const CONTROL: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  minHeight: 80,
  resize: 'none',
};

export function CambiarEstadoAlertaModal({ alerta, estado, saving, autorizada, saveError, onConfirm, onClose }: Props) {
  const { t } = useT('telemetry');
  const meta = META[estado];
  const [motivo, setMotivo] = useState('');
  const [touched, setTouched] = useState(false);

  const permitida = autorizada && accionesAlerta(alerta.estado_alerta, { puedeGestionar: true, puedeDescartar: true }).includes(estado);
  const cerrar = () => { if (!saving) onClose(); };
  const faltaMotivo = meta.motivoRequerido && motivo.trim().length === 0;

  const confirmar = () => {
    setTouched(true);
    if (faltaMotivo || saving || !permitida) return;
    onConfirm({ nuevo_estado: estado, motivo: motivo.trim() || null });
  };

  return (
    <ModalShell
      title={t(`fe12.${meta.titulo}`)}
      onClose={cerrar}
      maxWidth={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={cerrar} disabled={saving}>{t('cambiarestadoalertamodal.cancelar')}</Button>
          <Button variant={meta.variant} size="sm" loading={saving} disabled={saving || !permitida} onClick={confirmar}>{t(`fe12.${meta.cta}`)}</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>{t('cambiarestadoalertamodal.alerta')}{' '}<strong>#{alerta.id_alerta}</strong> · {alerta.tipo_alerta} · {alerta.tipo_variable}
      </p>

      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-alerta">
        {t(`fe12.${meta.labelMotivo}`)}{meta.motivoRequerido && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id="motivo-alerta"
        style={{ ...CONTROL, borderColor: touched && faltaMotivo ? 'var(--sem-error)' : 'var(--surface-border)' }}
        value={motivo}
        maxLength={500}
        onChange={(e) => setMotivo(e.target.value)}
        disabled={saving}
        aria-describedby={touched && faltaMotivo ? "motivo-alerta-error" : undefined}
        aria-required={meta.motivoRequerido}
        aria-invalid={touched && faltaMotivo}
      />
      {touched && faltaMotivo && (
        <p id="motivo-alerta-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('cambiarestadoalertamodal.este_campo_es_obligatorio')}</p>
      )}

      {!permitida && <Alert variant="warning" title={t('fe12.accion_no_disponible')} description={t('fe12.revisar')} style={{ marginTop: 'var(--s4)' }} />}
      {saveError && (
        <Alert
          variant={saveError.status === 403 ? 'warning' : 'error'}
          title={t(saveError.status === 403 ? 'cambiarestadoalertamodal.sin_permiso_para_cambiar_el_estado' : saveError.status === 422 ? 'fe12.transicion_titulo' : saveError.status === 0 ? 'fe12.red_titulo' : 'cambiarestadoalertamodal.no_se_pudo_actualizar_la_alerta')}
          description={saveError.message}
          style={{ marginTop: 'var(--s4)' }}
        />
      )}
    </ModalShell>
  );
}
