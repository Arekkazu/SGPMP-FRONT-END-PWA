// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-78: registro de servicio veterinario o inseminación en el ciclo |
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import { hoyLocal } from '../../shared/lib/fecha';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo, formatoMoneda } from '../lib/formato';
import { nuevaClaveIdempotencia } from '../lib/idempotencia';
import { TIPOS_SUMINISTRO_DIRECTO, type RegistrarSuministroDirectoPayload } from '../types';
import { AreaTexto } from './AreaTexto';

interface Form {
  tipo_suministro: string;
  cantidad: string;
  unidad_medida: string;
  precio_unitario: string;
  fecha_aplicacion: string;
  justificacion_precio: string;
  observacion: string;
}

const CAMPOS = ['tipo_suministro', 'cantidad', 'unidad_medida', 'precio_unitario', 'fecha_aplicacion', 'justificacion_precio', 'observacion'] as const;

interface Props {
  idActivo: number;
  nombreActivo: string;
  enviando: boolean;
  error: ApiError | null;
  onGuardar: (payload: RegistrarSuministroDirectoPayload) => void;
  onCerrar: () => void;
}

/** Alimento y medicamento entran al ciclo desde RF-75/RF-76; aquí solo los costos directos. */
export function SuministroDirectoFormModal({ idActivo, nombreActivo, enviando, error, onGuardar, onCerrar }: Props) {
  const { t } = useT('supplies');
  // Una clave por apertura del formulario: si la red falla y se reintenta, el backend no duplica.
  const clave = useMemo(nuevaClaveIdempotencia, []);
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<Form>({
    mode: 'onBlur',
    defaultValues: { tipo_suministro: '', cantidad: '1', unidad_medida: 'servicio', precio_unitario: '', fecha_aplicacion: hoyLocal(), justificacion_precio: '', observacion: '' },
  });
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);
  const cantidad = decimalPositivo(watch('cantidad'));
  const precio = decimalPositivo(watch('precio_unitario'));

  const enviar = (f: Form) => onGuardar({
    id_activo_biologico: idActivo,
    tipo_suministro: f.tipo_suministro,
    id_idempotencia: clave,
    cantidad: decimalPositivo(f.cantidad) as string,
    unidad_medida: f.unidad_medida.trim(),
    precio_unitario: decimalPositivo(f.precio_unitario) as string,
    fecha_aplicacion: f.fecha_aplicacion,
    justificacion_precio: f.justificacion_precio.trim(),
    observacion: f.observacion.trim() || null,
  });

  return (
    <ModalShell
      title={t('costeo.registrar_titulo', { activo: nombreActivo })}
      onClose={onCerrar}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={handleSubmit(enviar)}>{t('comun.guardar_registro')}</Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        <Alert variant="info" title={t('costeo.solo_directos')} description={t('costeo.solo_directos_detalle')} />
        {alertaGeneral && error && <Alert variant={error.status === 409 ? 'error' : 'warning'} title={error.message} />}
        <Select id="costeo-tipo" label={t('costeo.tipo')} required error={errors.tipo_suministro?.message} {...register('tipo_suministro', { required: t('costeo.tipo_requerido') })}>
          <option value="">{t('comun.seleccionar')}</option>
          {TIPOS_SUMINISTRO_DIRECTO.map((x) => <option key={x} value={x}>{t(`tipo.${x}`)}</option>)}
        </Select>
        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Input id="costeo-cantidad" label={t('costeo.cantidad')} type="number" step="any" min={0} required error={errors.cantidad?.message}
            {...register('cantidad', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })} />
          <Input id="costeo-unidad" label={t('costeo.unidad')} required maxLength={20} error={errors.unidad_medida?.message}
            {...register('unidad_medida', { validate: (v) => !!v.trim() || t('costeo.unidad_requerida') })} />
          <Input id="costeo-precio" label={t('costeo.precio')} type="number" step="any" min={0} required error={errors.precio_unitario?.message}
            {...register('precio_unitario', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })} />
          <Input id="costeo-fecha" label={t('costeo.fecha')} type="date" required max={hoyLocal()} error={errors.fecha_aplicacion?.message}
            {...register('fecha_aplicacion', { required: t('comun.fecha_requerida'), validate: (v) => v <= hoyLocal() || t('comun.fecha_futura') })} />
        </div>
        <p aria-live="polite" style={{ margin: 0, fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
          {t('costeo.costo_registro')}{' '}
          <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{cantidad && precio ? formatoMoneda(Number(cantidad) * Number(precio)) : '—'}</strong>
        </p>
        <AreaTexto id="costeo-justificacion" label={t('costeo.justificacion')} required maxLength={500} hint={t('costeo.justificacion_hint')}
          error={errors.justificacion_precio?.message}
          {...register('justificacion_precio', { validate: (v) => v.trim().length >= 20 || t('comun.motivo_corto', { min: 20, faltan: 20 - v.trim().length }) })} />
        <AreaTexto id="costeo-obs" label={t('comun.observaciones')} maxLength={500} hint={t('comun.opcional')} {...register('observacion')} />
      </form>
    </ModalShell>
  );
}
