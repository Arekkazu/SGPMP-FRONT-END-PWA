import React, { useState } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import type { AlertaSchema, ActualizarEstadoAlertaDTO, NuevoEstadoAlerta } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Meta {
  titulo: string;
  labelMotivo: string;
  cta: string;
  variant: 'primary' | 'secondary' | 'danger';
  motivoRequerido: boolean;
}

const META: Record<NuevoEstadoAlerta, Meta> = {
  EN_ATENCION: { titulo: 'Tomar alerta en atención', labelMotivo: 'Nota (opcional)', cta: 'Tomar en atención', variant: 'primary', motivoRequerido: false },
  RESUELTA: { titulo: 'Marcar alerta como resuelta', labelMotivo: 'Acción tomada', cta: 'Marcar resuelta', variant: 'primary', motivoRequerido: true },
  DESCARTADA: { titulo: 'Descartar alerta (falso positivo)', labelMotivo: 'Motivo del descarte', cta: 'Descartar', variant: 'danger', motivoRequerido: true },
  VENCIDA: { titulo: 'Marcar alerta como vencida', labelMotivo: 'Motivo (opcional)', cta: 'Marcar vencida', variant: 'secondary', motivoRequerido: false },
};

interface Props {
  alerta: AlertaSchema;
  estado: NuevoEstadoAlerta;
  saving: boolean;
  saveError: ApiError | null;
  onConfirm: (dto: ActualizarEstadoAlertaDTO) => void;
  onClose: () => void;
}

const CONTROL: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  minHeight: 80,
  resize: 'vertical',
  outline: 'none',
};

export function CambiarEstadoAlertaModal({ alerta, estado, saving, saveError, onConfirm, onClose }: Props) {
  const meta = META[estado];
  const [motivo, setMotivo] = useState('');
  const [touched, setTouched] = useState(false);

  const faltaMotivo = meta.motivoRequerido && motivo.trim().length === 0;

  const confirmar = () => {
    setTouched(true);
    if (faltaMotivo) return;
    onConfirm({ nuevo_estado: estado, motivo: motivo.trim() || null });
  };

  return (
    <ModalShell
      title={meta.titulo}
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant={meta.variant} size="sm" loading={saving} disabled={saving} onClick={confirmar}>{meta.cta}</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
        Alerta <strong>#{alerta.id_alerta}</strong> · {alerta.tipo_alerta} · {alerta.tipo_variable}
      </p>

      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-alerta">
        {meta.labelMotivo}{meta.motivoRequerido && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id="motivo-alerta"
        style={{ ...CONTROL, borderColor: touched && faltaMotivo ? 'var(--sem-error)' : 'var(--surface-border)' }}
        value={motivo}
        maxLength={500}
        onChange={(e) => setMotivo(e.target.value)}
        aria-required={meta.motivoRequerido}
        aria-invalid={touched && faltaMotivo}
      />
      {touched && faltaMotivo && (
        <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
          Este campo es obligatorio.
        </p>
      )}

      {saveError && (
        <Alert
          variant={saveError.status === 403 ? 'warning' : 'error'}
          title={saveError.status === 403 ? 'Sin permiso para cambiar el estado' : 'No se pudo actualizar la alerta'}
          description={saveError.message}
          style={{ marginTop: 'var(--s4)' }}
        />
      )}
    </ModalShell>
  );
}
