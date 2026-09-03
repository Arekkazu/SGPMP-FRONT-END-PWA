import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoBajaDTO, TipoBaja } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

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

const HOY = hoyLocal();

export function RegistrarBajaModal({ esPoblacional, saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
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
    <ModalShell title={t('registrarbajamodal.registrar_baja')} onClose={onClose} maxWidth={480}>
      <Alert
        variant="warning"
        title={t('registrarbajamodal.registro_de_baja')}
        description={esPoblacional
          ? 'Deja la cantidad vacía para una baja total del lote, o indica la cantidad para una baja parcial.'
          : 'La baja de un activo individual es total.'}
        style={{ marginBottom: 'var(--s4)' }}
      />
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('registrarbajamodal.no_se_pudo_registrar_la_baja')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label={t('registrarbajamodal.tipo_de_baja')} required {...register('tipo_baja')}>
            <option value="muerte">{t('registrarbajamodal.muerte')}</option>
            <option value="venta">{t('registrarbajamodal.venta')}</option>
            <option value="sacrificio">{t('registrarbajamodal.sacrificio')}</option>
            <option value="perdida">{t('registrarbajamodal.perdida')}</option>
            <option value="descarte_sanitario">{t('registrarbajamodal.descarte_sanitario')}</option>
          </FormSelect>

          <Input
            label={t('registrarbajamodal.fecha_de_baja')} required type="date" max={HOY}
            error={errors.fecha_baja?.message}
            {...register('fecha_baja', { required: t('registrarbajamodal.la_fecha_es_obligatoria') })}
          />

          {esPoblacional && (
            <Input
              label={t('registrarbajamodal.cantidad_afectada')} type="number" min={1}
              placeholder="Vacío = baja total del lote"
              {...register('cantidad_afectada')}
            />
          )}

          <FormTextArea
            label={t('registrarbajamodal.motivo_de_la_baja')} required error={errors.motivo_baja?.message}
            placeholder={t('registrarbajamodal.describe_el_motivo')}
            {...register('motivo_baja', {
              required: t('registrarbajamodal.el_motivo_es_obligatorio'),
              validate: (v) => v.trim().length > 0 || 'El motivo no puede estar vacío.',
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('registrarbajamodal.cancelar')}</Button>
          <Button type="submit" variant="danger" size="md" loading={saving}>{t('registrarbajamodal.registrar_baja')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
