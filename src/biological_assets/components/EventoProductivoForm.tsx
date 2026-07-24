import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoProductivoDTO } from '../types';

interface FormValues {
  tipo_producto: string;
  cantidad_producida: string;
  unidad_medida: string;
  fecha_evento: string;
  condiciones_produccion: string;
  observaciones: string;
}

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoProductivoDTO) => Promise<boolean>;
}

const HOY = new Date().toISOString().slice(0, 10);

export function EventoProductivoForm({ saving, saveError, onClose, onConfirmar }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { fecha_evento: HOY },
  });

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoProductivoDTO = {
      tipo_producto: v.tipo_producto.trim(),
      cantidad_producida: Number(v.cantidad_producida),
      unidad_medida: v.unidad_medida.trim(),
      fecha_evento: v.fecha_evento,
      condiciones_produccion: v.condiciones_produccion.trim() || null,
      observaciones: v.observaciones.trim() || null,
    };
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title="Registrar evento productivo" onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo registrar"
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <Input
            label="Tipo de producto" required placeholder="Ej: Leche, Carne, Huevo"
            error={errors.tipo_producto?.message}
            {...register('tipo_producto', { required: 'El tipo de producto es obligatorio.' })}
          />
          <Input
            label="Cantidad producida" required type="number" min={0} step="0.001"
            error={errors.cantidad_producida?.message}
            {...register('cantidad_producida', {
              required: 'La cantidad es obligatoria.',
              validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
            })}
          />
          <Input
            label="Unidad de medida" required placeholder="Ej: litros, kg"
            error={errors.unidad_medida?.message}
            {...register('unidad_medida', { required: 'La unidad es obligatoria.' })}
          />
          <Input
            label="Fecha del evento" required type="date" max={HOY}
            error={errors.fecha_evento?.message}
            {...register('fecha_evento', { required: 'La fecha es obligatoria.' })}
          />
          <FormTextArea label="Condiciones de producción" placeholder="Opcional" {...register('condiciones_produccion')} />
          <FormTextArea label="Observaciones" placeholder="Opcional" {...register('observaciones')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>Registrar</Button>
        </div>
      </form>
    </ModalShell>
  );
}
