import React from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('biologicalAssets');
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
    <ModalShell title={t('eventocrecimientoform.registrar_evento_de_crecimiento')} onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('eventocrecimientoform.no_se_pudo_registrar')}
          description={saveError.status === 409 ? saveError.message : saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect
            label={t('eventocrecimientoform.tipo_de_medicion')} required error={errors.tipo_medicion?.message}
            {...register('tipo_medicion', { required: 'Selecciona el tipo.' })}
          >
            <option value="PESO">{t('eventocrecimientoform.peso')}</option>
            <option value="TALLA">{t('eventocrecimientoform.talla')}</option>
            <option value="BIOMASA">{t('eventocrecimientoform.biomasa')}</option>
          </FormSelect>

          <Input
            label={t('eventocrecimientoform.valor')} required type="number" min={0} step="0.001"
            error={errors.valor_medicion?.message}
            {...register('valor_medicion', {
              required: 'El valor es obligatorio.',
              validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
            })}
          />

          <FormSelect
            label={t('eventocrecimientoform.unidad_de_medida')} required error={errors.unidad_medida?.message}
            {...register('unidad_medida', { required: 'Selecciona la unidad.' })}
          >
            <option value="">{t('eventocrecimientoform.seleccionar')}</option>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </FormSelect>

          <Input label={t('eventocrecimientoform.fecha')} type="date" {...register('fecha')} />

          {esPoblacional && (
            <>
              <Input label={t('eventocrecimientoform.tipo_de_agregacion')} placeholder="Ej: promedio (opcional)" {...register('tipo_agregacion')} />
              <Input label={t('eventocrecimientoform.frecuencia')} placeholder="Ej: Semanal (opcional)" {...register('frecuencia')} />
              <Input label={t('eventocrecimientoform.nuevo_peso_promedio')} type="number" min={0} step="0.001" placeholder={t('eventocrecimientoform.opcional')} {...register('nuevo_peso_promedio')} />
              <Input label={t('eventocrecimientoform.cantidad_medida')} type="number" min={0} placeholder={t('eventocrecimientoform.opcional')} {...register('cantidad_medida')} />
            </>
          )}

          <FormTextArea label={t('eventocrecimientoform.descripcion')} placeholder={t('eventocrecimientoform.opcional')} {...register('descripcion')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('eventocrecimientoform.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('eventocrecimientoform.registrar')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
