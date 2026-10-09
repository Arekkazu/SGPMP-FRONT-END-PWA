import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL, errorServidor } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoBajaDTO, TipoBaja } from '../types';
import { diaParaBackendUtc, hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  tipo_baja: TipoBaja;
  fecha_baja: string;
  motivo_baja: string;
  cantidad_afectada: string;
}

interface Props {
  esPoblacional: boolean;
  /** Cantidad actual del lote; acota "Cantidad afectada" antes de enviar (TC-DIS-128). */
  cantidadDisponible?: number | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoBajaDTO) => Promise<boolean>;
}

const HOY = hoyLocal();

export function RegistrarBajaModal({ esPoblacional, cantidadDisponible, saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { tipo_baja: 'muerte', fecha_baja: HOY },
  });
  // La baja es irreversible: el envío pasa por un resumen que hay que confirmar (TC-DIS-128/129).
  const [pendiente, setPendiente] = useState<RegistrarEventoBajaDTO | null>(null);

  const confirmar = async () => {
    if (!pendiente) return;
    const ok = await onConfirmar(pendiente);
    if (ok) onClose();
    else setPendiente(null);
  };

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoBajaDTO = {
      tipo_baja: v.tipo_baja,
      fecha_baja: diaParaBackendUtc(v.fecha_baja),
      motivo_baja: v.motivo_baja.trim(),
    };
    if (esPoblacional && v.cantidad_afectada) {
      dto.cantidad_afectada = Number(v.cantidad_afectada);
    }
    setPendiente(dto);
  };

  return (
    <ModalShell title={t('registrarbajamodal.registrar_baja')} onClose={onClose} maxWidth={480}>
      <Alert
        variant="warning"
        title={t('registrarbajamodal.registro_de_baja')}
        description={`${esPoblacional
          ? 'Deja la cantidad vacía para una baja total del lote, o indica la cantidad para una baja parcial.'
          : 'La baja de un activo individual es total.'} ${t('registrarbajamodal.accion_irreversible')}`}
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
      {pendiente ? (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
            {t('registrarbajamodal.confirma_la_baja')}
          </h3>
          <dl className="ds-fg2" style={{ gap: 'var(--s2) var(--s4)', margin: 0, fontSize: 'var(--fs-body-md)' }}>
            <dt style={{ color: 'var(--text-muted)' }}>{t('registrarbajamodal.tipo_de_baja')}</dt>
            <dd style={{ margin: 0 }}>{t(`registrarbajamodal.${pendiente.tipo_baja}`)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>{t('registrarbajamodal.fecha_de_baja')}</dt>
            <dd style={{ margin: 0 }}>{getValues('fecha_baja')}</dd>
            {esPoblacional && (
              <>
                <dt style={{ color: 'var(--text-muted)' }}>{t('registrarbajamodal.cantidad_afectada')}</dt>
                <dd style={{ margin: 0 }}>{pendiente.cantidad_afectada ?? t('registrarbajamodal.baja_total_del_lote')}</dd>
              </>
            )}
            <dt style={{ color: 'var(--text-muted)' }}>{t('registrarbajamodal.motivo_de_la_baja')}</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{pendiente.motivo_baja}</dd>
          </dl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setPendiente(null)} disabled={saving} autoFocus>{t('registrarbajamodal.volver')}</Button>
            <Button type="button" variant="danger" size="md" loading={saving} onClick={confirmar}>{t('registrarbajamodal.confirmar_baja')}</Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label={t('registrarbajamodal.tipo_de_baja')} required error={errorServidor(saveError, 'tipo_baja')} {...register('tipo_baja')}>
            <option value="muerte">{t('registrarbajamodal.muerte')}</option>
            <option value="venta">{t('registrarbajamodal.venta')}</option>
            <option value="sacrificio">{t('registrarbajamodal.sacrificio')}</option>
            <option value="perdida">{t('registrarbajamodal.perdida')}</option>
            <option value="descarte_sanitario">{t('registrarbajamodal.descarte_sanitario')}</option>
          </FormSelect>

          <Input
            label={t('registrarbajamodal.fecha_de_baja')} required type="date" max={HOY}
            error={errors.fecha_baja?.message ?? errorServidor(saveError, 'fecha_baja')}
            {...register('fecha_baja', { required: t('registrarbajamodal.la_fecha_es_obligatoria') })}
          />

          {esPoblacional && (
            <Input
              label={t('registrarbajamodal.cantidad_afectada')} type="number" min={1} max={cantidadDisponible ?? undefined}
              placeholder="Vacío = baja total del lote"
              error={errors.cantidad_afectada?.message ?? errorServidor(saveError, 'cantidad_afectada')}
              {...register('cantidad_afectada', {
                validate: (v) => {
                  if (!v) return true;
                  const n = Number(v);
                  if (!Number.isInteger(n) || n < 1) return t('registrarbajamodal.cantidad_minima');
                  return cantidadDisponible == null || n <= cantidadDisponible
                    || t('registrarbajamodal.cantidad_maxima', { max: cantidadDisponible });
                },
              })}
            />
          )}

          <FormTextArea
            label={t('registrarbajamodal.motivo_de_la_baja')} required error={errors.motivo_baja?.message ?? errorServidor(saveError, 'motivo_baja')}
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
      )}
    </ModalShell>
  );
}
