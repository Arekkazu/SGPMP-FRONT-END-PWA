import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import { UNIDADES_POR_MEDICION } from '../types';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoCrecimientoDTO, TipoMedicionCrecimiento } from '../types';

interface FormValues {
  tipo_medicion: TipoMedicionCrecimiento;
  valor_medicion: string;
  unidad_medida: string;
  tipo_agregacion: string;
  frecuencia: string;
  nuevo_peso_promedio: string;
  cantidad_medida: string;
  fecha: string;
  descripcion: string;
}

interface Props {
  esPoblacional: boolean;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoCrecimientoDTO) => Promise<boolean>;
}

export function EventoCrecimientoForm({ esPoblacional, saving, saveError, onClose, onConfirmar }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { tipo_medicion: 'PESO', unidad_medida: '' },
  });

  const tipo = watch('tipo_medicion');
  const unidades = UNIDADES_POR_MEDICION[tipo] ?? [];

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoCrecimientoDTO = {
      tipo_medicion: v.tipo_medicion,
      valor_medicion: Number(v.valor_medicion),
      unidad_medida: v.unidad_medida,
      fecha: v.fecha ? new Date(v.fecha).toISOString() : null,
      descripcion: v.descripcion.trim() || null,
    };
    if (esPoblacional) {
      dto.tipo_agregacion = v.tipo_agregacion.trim() || null;
      dto.frecuencia = v.frecuencia.trim() || null;
      dto.nuevo_peso_promedio = v.nuevo_peso_promedio ? Number(v.nuevo_peso_promedio) : null;
      dto.cantidad_medida = v.cantidad_medida ? Number(v.cantidad_medida) : null;
    }
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title="Registrar evento de crecimiento" onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo registrar"
          description={saveError.status === 409 ? saveError.message : saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect
            label="Tipo de medición" required error={errors.tipo_medicion?.message}
            {...register('tipo_medicion', { required: 'Selecciona el tipo.' })}
          >
            <option value="PESO">Peso</option>
            <option value="TALLA">Talla</option>
            <option value="BIOMASA">Biomasa</option>
          </FormSelect>

          <Input
            label="Valor" required type="number" min={0} step="0.001"
            error={errors.valor_medicion?.message}
            {...register('valor_medicion', {
              required: 'El valor es obligatorio.',
              validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
            })}
          />

          <FormSelect
            label="Unidad de medida" required error={errors.unidad_medida?.message}
            {...register('unidad_medida', { required: 'Selecciona la unidad.' })}
          >
            <option value="">Seleccionar…</option>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </FormSelect>

          <Input label="Fecha" type="date" {...register('fecha')} />

          {esPoblacional && (
            <>
              <Input label="Tipo de agregación" placeholder="Ej: promedio (opcional)" {...register('tipo_agregacion')} />
              <Input label="Frecuencia" placeholder="Ej: Semanal (opcional)" {...register('frecuencia')} />
              <Input label="Nuevo peso promedio" type="number" min={0} step="0.001" placeholder="Opcional" {...register('nuevo_peso_promedio')} />
              <Input label="Cantidad medida" type="number" min={0} placeholder="Opcional" {...register('cantidad_medida')} />
            </>
          )}

          <FormTextArea label="Descripción" placeholder="Opcional" {...register('descripcion')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>Registrar</Button>
        </div>
      </form>
    </ModalShell>
  );
}
