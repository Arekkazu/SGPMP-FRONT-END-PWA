// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-78 E7: corrección aditiva de un registro del ciclo |
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo, formatoCantidad, formatoMoneda } from '../lib/formato';
import { nuevaClaveIdempotencia } from '../lib/idempotencia';
import type { CorreccionSuministroPayload, LineaHistorial } from '../types';
import { AreaTexto } from './AreaTexto';

interface Form { cantidad: string; precio_unitario: string; justificacion_precio: string; motivo_correccion: string }
const CAMPOS = ['cantidad', 'precio_unitario', 'justificacion_precio', 'motivo_correccion'] as const;

interface Props {
  original: LineaHistorial;
  enviando: boolean;
  error: ApiError | null;
  onGuardar: (payload: CorreccionSuministroPayload) => void;
  onCerrar: () => void;
}

export function CorreccionSuministroModal({ original, enviando, error, onGuardar, onCerrar }: Props) {
  const { t } = useT('supplies');
  const clave = useMemo(nuevaClaveIdempotencia, []);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Form>({
    mode: 'onBlur',
    defaultValues: { cantidad: original.cantidad, precio_unitario: original.precio_unitario, justificacion_precio: '', motivo_correccion: '' },
  });
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);
  const minimo = (min: number) => (v: string) => v.trim().length >= min || t('comun.motivo_corto', { min, faltan: min - v.trim().length });

  const enviar = (f: Form) => onGuardar({
    id_idempotencia: clave,
    cantidad: decimalPositivo(f.cantidad) as string,
    precio_unitario: decimalPositivo(f.precio_unitario) as string,
    justificacion_precio: f.justificacion_precio.trim(),
    motivo_correccion: f.motivo_correccion.trim(),
  });

  return (
    <ModalShell
      title={t('costeo.corregir_titulo')}
      onClose={onCerrar}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={handleSubmit(enviar)}>{t('costeo.registrar_correccion')}</Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-base)' }}>
          {t('costeo.corregir_detalle', {
            descripcion: original.descripcion,
            cantidad: `${formatoCantidad(original.cantidad)} ${original.unidad_medida}`,
            costo: formatoMoneda(original.costo_registro),
          })}
        </p>
        {alertaGeneral && error && <Alert variant={error.status === 409 ? 'error' : 'warning'} title={error.message} />}
        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Input id="correccion-cantidad" label={t('costeo.cantidad_correcta')} type="number" step="any" min={0} required error={errors.cantidad?.message}
            {...register('cantidad', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })} />
          <Input id="correccion-precio" label={t('costeo.precio_correcto')} type="number" step="any" min={0} required error={errors.precio_unitario?.message}
            {...register('precio_unitario', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })} />
        </div>
        <AreaTexto id="correccion-justificacion" label={t('costeo.justificacion')} required maxLength={500} error={errors.justificacion_precio?.message}
          {...register('justificacion_precio', { validate: minimo(20) })} />
        <AreaTexto id="correccion-motivo" label={t('costeo.motivo_correccion')} required maxLength={500} hint={t('costeo.motivo_correccion_hint')}
          error={errors.motivo_correccion?.message} {...register('motivo_correccion', { validate: minimo(20) })} />
      </form>
    </ModalShell>
  );
}
