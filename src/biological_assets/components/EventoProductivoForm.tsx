import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoProductivoDTO } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

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

const HOY = hoyLocal();

export function EventoProductivoForm({ saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
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
    <ModalShell title={t('eventoproductivoform.registrar_evento_productivo')} onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('eventoproductivoform.no_se_pudo_registrar')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <Input
            label={t('eventoproductivoform.tipo_de_producto')} required placeholder={t('eventoproductivoform.ej_leche_carne_huevo')}
            error={errors.tipo_producto?.message}
            {...register('tipo_producto', { required: t('eventoproductivoform.el_tipo_de_producto_es_obligatorio') })}
          />
          <Input
            label={t('eventoproductivoform.cantidad_producida')} required type="number" min={0} step="0.001"
            error={errors.cantidad_producida?.message}
            {...register('cantidad_producida', {
              required: t('eventoproductivoform.la_cantidad_es_obligatoria'),
              validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
            })}
          />
          <Input
            label={t('eventoproductivoform.unidad_de_medida')} required placeholder={t('eventoproductivoform.ej_litros_kg')}
            error={errors.unidad_medida?.message}
            {...register('unidad_medida', { required: t('eventoproductivoform.la_unidad_es_obligatoria') })}
          />
          <Input
            label={t('eventoproductivoform.fecha_del_evento')} required type="date" max={HOY}
            error={errors.fecha_evento?.message}
            {...register('fecha_evento', { required: t('eventoproductivoform.la_fecha_es_obligatoria') })}
          />
          <FormTextArea label={t('eventoproductivoform.condiciones_de_produccion')} placeholder={t('eventoproductivoform.opcional')} {...register('condiciones_produccion')} />
          <FormTextArea label={t('eventoproductivoform.observaciones')} placeholder={t('eventoproductivoform.opcional')} {...register('observaciones')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('eventoproductivoform.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('eventoproductivoform.registrar')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
