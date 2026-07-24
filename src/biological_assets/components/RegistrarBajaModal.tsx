import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoBajaDTO, TipoBaja } from '../types';

interface FormValues {
  tipo_baja: TipoBaja;
  fecha_baja: string;
  motivo_baja: string;
  cantidad_afectada: string;
}

interface Props {
  esPoblacional: boolean;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoBajaDTO) => Promise<boolean>;
}

const HOY = new Date().toISOString().slice(0, 10);

export function RegistrarBajaModal({ esPoblacional, saving, saveError, onClose, onConfirmar }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { tipo_baja: 'muerte', fecha_baja: HOY },
  });

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoBajaDTO = {
      tipo_baja: v.tipo_baja,
      fecha_baja: v.fecha_baja,
      motivo_baja: v.motivo_baja.trim(),
    };
    if (esPoblacional && v.cantidad_afectada) {
      dto.cantidad_afectada = Number(v.cantidad_afectada);
    }
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title="Registrar baja" onClose={onClose} maxWidth={480}>
      <Alert
        variant="warning"
        title="Registro de baja"
        description={esPoblacional
          ? 'Deja la cantidad vacía para una baja total del lote, o indica la cantidad para una baja parcial.'
          : 'La baja de un activo individual es total.'}
        style={{ marginBottom: 'var(--s4)' }}
      />
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo registrar la baja"
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label="Tipo de baja" required {...register('tipo_baja')}>
            <option value="muerte">Muerte</option>
            <option value="venta">Venta</option>
            <option value="sacrificio">Sacrificio</option>
            <option value="perdida">Pérdida</option>
            <option value="descarte_sanitario">Descarte sanitario</option>
          </FormSelect>

          <Input
            label="Fecha de baja" required type="date" max={HOY}
            error={errors.fecha_baja?.message}
            {...register('fecha_baja', { required: 'La fecha es obligatoria.' })}
          />

          {esPoblacional && (
            <Input
              label="Cantidad afectada" type="number" min={1}
              placeholder="Vacío = baja total del lote"
              {...register('cantidad_afectada')}
            />
          )}

          <FormTextArea
            label="Motivo de la baja" required error={errors.motivo_baja?.message}
            placeholder="Describe el motivo…"
            {...register('motivo_baja', {
              required: 'El motivo es obligatorio.',
              validate: (v) => v.trim().length > 0 || 'El motivo no puede estar vacío.',
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="danger" size="md" loading={saving}>Registrar baja</Button>
        </div>
      </form>
    </ModalShell>
  );
}
