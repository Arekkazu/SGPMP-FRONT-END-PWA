import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import type { ApiError } from '../../shared/api/errors';
import type { CerrarCicloDTO } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  fecha_cierre: string;
  motivo_cierre: string;
  descripcion_cierre: string;
}

interface Props {
  identificador: string | null;
  saving: boolean;
  error: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: CerrarCicloDTO) => Promise<boolean>;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 72,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  resize: 'vertical',
  outline: 'none',
};

const HOY = hoyLocal();

export function CerrarCicloModal({ identificador, saving, error, onClose, onConfirmar }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { fecha_cierre: HOY, motivo_cierre: '', descripcion_cierre: '' },
  });

  const submit = async (v: FormValues) => {
    const ok = await onConfirmar({
      fecha_cierre: v.fecha_cierre,
      motivo_cierre: v.motivo_cierre.trim(),
      descripcion_cierre: v.descripcion_cierre.trim() || null,
    });
    if (ok) onClose();
  };

  return (
    <ModalShell title={`Cerrar ciclo — ${identificador ?? 'activo'}`} onClose={onClose}>
      <Alert
        variant="warning"
        title="Acción difícilmente reversible"
        description="El cierre marca el activo como CERRADO y finaliza su ciclo productivo. Desde CERRADO solo se puede pasar a BAJA."
        style={{ marginBottom: 'var(--s4)' }}
      />
      {error && (
        <Alert
          variant={error.status >= 500 ? 'error' : 'warning'}
          title="No se pudo cerrar el ciclo"
          description={error.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <Input
            label="Fecha de cierre" required type="date" max={HOY}
            error={errors.fecha_cierre?.message}
            {...register('fecha_cierre', {
              required: 'La fecha de cierre es obligatoria.',
              validate: (val) => val <= HOY || 'No puede ser una fecha futura.',
            })}
          />
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-cierre">
              Motivo del cierre <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="motivo-cierre" style={TEXTAREA}
              placeholder="Ej: Venta, fin de ciclo productivo…"
              {...register('motivo_cierre', {
                required: 'El motivo es obligatorio.',
                validate: (val) => val.trim().length > 0 || 'El motivo no puede estar vacío.',
              })}
            />
            {errors.motivo_cierre && (
              <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
                {errors.motivo_cierre.message}
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="descripcion-cierre">
              Descripción adicional
            </label>
            <textarea id="descripcion-cierre" style={TEXTAREA} placeholder="Opcional" {...register('descripcion_cierre')} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="danger" size="md" loading={saving}>Cerrar ciclo</Button>
        </div>
      </form>
    </ModalShell>
  );
}
