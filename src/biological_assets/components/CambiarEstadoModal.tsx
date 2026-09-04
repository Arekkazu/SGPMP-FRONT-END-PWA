import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { EstadoPill } from './EstadoPill';
import { TRANSICIONES_VALIDAS } from '../types';
import type { ApiError } from '../../shared/api/errors';
import type { CambiarEstadoDTO, EstadoActivoNombre } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  estado_nuevo: EstadoActivoNombre | '';
  fecha_cambio_estado: string;
  motivo_cambio: string;
}

interface Props {
  estadoActual: string | null;
  saving: boolean;
  error: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: CambiarEstadoDTO) => Promise<boolean>;
}

const SELECT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  height: 44,
  cursor: 'pointer',
};

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

const ESTADO_LABEL: Record<EstadoActivoNombre, string> = {
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', EN_TRATAMIENTO: 'En tratamiento',
  AISLADO: 'Aislado', CERRADO: 'Cerrado', BAJA: 'Baja',
};

const HOY = hoyLocal();

function normalizar(estado: string | null | undefined): EstadoActivoNombre | null {
  if (!estado) return null;
  const up = estado.toUpperCase().replace(/\s+/g, '_');
  return up in TRANSICIONES_VALIDAS ? (up as EstadoActivoNombre) : null;
}

export function CambiarEstadoModal({ estadoActual, saving, error, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
  const actual = normalizar(estadoActual);
  // CERRADO se gestiona por "Cerrar ciclo" (endpoint dedicado); se excluye aquí.
  const destinos = (actual ? TRANSICIONES_VALIDAS[actual] : []).filter((e) => e !== 'CERRADO');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { estado_nuevo: '', fecha_cambio_estado: HOY, motivo_cambio: '' },
  });

  const submit = async (v: FormValues) => {
    if (!v.estado_nuevo) return;
    const ok = await onConfirmar({
      estado_nuevo: v.estado_nuevo,
      fecha_cambio_estado: v.fecha_cambio_estado,
      motivo_cambio: v.motivo_cambio.trim(),
    });
    if (ok) onClose();
  };

  return (
    <ModalShell title={t('cambiarestadomodal.cambiar_estado_del_activo')} onClose={onClose}>
      {error && (
        <Alert
          variant={error.status >= 500 ? 'error' : 'warning'}
          title={t('cambiarestadomodal.no_se_pudo_cambiar_el_estado')}
          description={error.status === 409 ? `Transición no permitida. ${error.message}` : error.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('cambiarestadomodal.estado_actual')}</span>
        <EstadoPill estado={estadoActual} size="md" />
      </div>

      {destinos.length === 0 ? (
        <Alert
          variant="info"
          title={t('cambiarestadomodal.sin_transiciones_disponibles')}
          description={actual === 'BAJA' ? t('cambiarestadomodal.el_estado_baja_es_terminal') : t('cambiarestadomodal.no_hay_cambios_de_estado_manuales')}
        />
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="estado-nuevo">{t('cambiarestadomodal.nuevo_estado')}<span aria-hidden="true">*</span>
              </label>
              <select
                id="estado-nuevo"
                style={SELECT}
                {...register('estado_nuevo', { required: t('cambiarestadomodal.selecciona_el_nuevo_estado') })}
              >
                <option value="">{t('cambiarestadomodal.seleccionar')}</option>
                {destinos.map((e) => (
                  <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                ))}
              </select>
              {errors.estado_nuevo && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
                  {errors.estado_nuevo.message}
                </p>
              )}
            </div>

            <Input
              label={t('cambiarestadomodal.fecha_del_cambio')} required type="date" max={HOY}
              error={errors.fecha_cambio_estado?.message}
              {...register('fecha_cambio_estado', {
                required: t('cambiarestadomodal.la_fecha_es_obligatoria'),
                validate: (val) => val <= HOY || 'No puede ser una fecha futura.',
              })}
            />

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-cambio">{t('cambiarestadomodal.motivo_del_cambio')}<span aria-hidden="true">*</span>
              </label>
              <textarea
                id="motivo-cambio"
                style={TEXTAREA}
                placeholder={t('cambiarestadomodal.describe_la_razon_del_cambio_de_estado')}
                {...register('motivo_cambio', {
                  required: t('cambiarestadomodal.el_motivo_es_obligatorio'),
                  validate: (val) => val.trim().length > 0 || 'El motivo no puede estar vacío.',
                })}
              />
              {errors.motivo_cambio && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
                  {errors.motivo_cambio.message}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('cambiarestadomodal.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>{t('cambiarestadomodal.cambiar_estado')}</Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
