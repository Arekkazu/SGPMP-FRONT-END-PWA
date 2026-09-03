import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { AsociarSensorActivoDTO } from '../types';

interface FormValues {
  tipo_activo: 'INDIVIDUAL' | 'LOTE';
  tipo_asociacion: 'DIRECTA' | 'AMBIENTAL' | 'POBLACIONAL';
  dispositivo_iot_id: string;
  sensor_id: string;
  id_infraestructura: string;
  fecha_inicio: string;
  motivo: string;
}

interface Props {
  esPoblacional: boolean;
  idInfraestructura: number | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: AsociarSensorActivoDTO) => Promise<boolean>;
}

export function AsociarSensorModal({ esPoblacional, idInfraestructura, saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      tipo_activo: esPoblacional ? 'LOTE' : 'INDIVIDUAL',
      tipo_asociacion: esPoblacional ? 'POBLACIONAL' : 'DIRECTA',
      id_infraestructura: idInfraestructura != null ? String(idInfraestructura) : '',
    },
  });

  const submit = async (v: FormValues) => {
    const dto: AsociarSensorActivoDTO = {
      tipo_activo: v.tipo_activo,
      tipo_asociacion: v.tipo_asociacion,
      dispositivo_iot_id: Number(v.dispositivo_iot_id),
      sensor_id: Number(v.sensor_id),
      id_infraestructura: Number(v.id_infraestructura),
      fecha_inicio: v.fecha_inicio ? new Date(v.fecha_inicio).toISOString() : null,
      motivo: v.motivo.trim() || null,
    };
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title={t('asociarsensormodal.asociar_sensor_iot')} onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('asociarsensormodal.no_se_pudo_asociar_el_sensor')}
          description={saveError.status === 403 ? 'Solo Administrador e Ingeniero pueden asociar sensores.' : saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label={t('asociarsensormodal.tipo_de_activo')} required {...register('tipo_activo')}>
            <option value="INDIVIDUAL">{t('asociarsensormodal.individual')}</option>
            <option value="LOTE">{t('asociarsensormodal.lote')}</option>
          </FormSelect>

          <FormSelect label={t('asociarsensormodal.tipo_de_asociacion')} required {...register('tipo_asociacion')}>
            <option value="DIRECTA">{t('asociarsensormodal.directa')}</option>
            <option value="AMBIENTAL">{t('asociarsensormodal.ambiental')}</option>
            <option value="POBLACIONAL">{t('asociarsensormodal.poblacional')}</option>
          </FormSelect>

          <Input
            label={t('asociarsensormodal.id_dispositivo_iot')} required type="number" min={1}
            error={errors.dispositivo_iot_id?.message}
            {...register('dispositivo_iot_id', { required: 'El dispositivo es obligatorio.', min: { value: 1, message: 'ID inválido.' } })}
          />
          <Input
            label={t('asociarsensormodal.id_sensor')} required type="number" min={1}
            error={errors.sensor_id?.message}
            {...register('sensor_id', { required: 'El sensor es obligatorio.', min: { value: 1, message: 'ID inválido.' } })}
          />
          <Input
            label={t('asociarsensormodal.id_infraestructura')} required type="number" min={1}
            error={errors.id_infraestructura?.message}
            {...register('id_infraestructura', { required: 'La infraestructura es obligatoria.', min: { value: 1, message: 'ID inválido.' } })}
          />
          <Input label={t('asociarsensormodal.fecha_de_inicio')} type="date" {...register('fecha_inicio')} />
          <FormTextArea label={t('asociarsensormodal.motivo')} placeholder={t('asociarsensormodal.opcional')} {...register('motivo')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('asociarsensormodal.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('asociarsensormodal.asociar_sensor')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
