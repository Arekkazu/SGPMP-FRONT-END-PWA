// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Combobox } from '../../shared/design-system/Combobox';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { normalizar } from '../../shared/hooks/useBusqueda';
import { formatearNumero } from '../../shared/i18n/formato';
import { ModalShell } from './ModalShell';
import { FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { MetricaActivo, RegistrarEventoProductivoDTO } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  producto: string;
  cantidad_producida: string;
  fecha_evento: string;
  condiciones_produccion: string;
  observaciones: string;
}

interface Props {
  /** Métricas de la especie; solo se ofrecen las habilitadas en la fase activa (RF-43 E-04). */
  metricas: MetricaActivo[];
  metricasLoading: boolean;
  metricasError: boolean;
  onReintentar: () => void;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoProductivoDTO) => Promise<boolean>;
}


const num = (v: string | number | null): number | null => (v === null || v === '' ? null : Number(v));

/**
 * RF-43: el producto se elige de las métricas de la especie (RF-16) habilitadas
 * en la fase activa, y de ella salen la unidad y el rango de la cantidad. Antes
 * era texto libre y el usuario tenía que adivinar el valor que aceptaba el backend.
 */
export function EventoProductivoForm({
  metricas, metricasLoading, metricasError, onReintentar, saving, saveError, onClose, onConfirmar,
}: Props) {
  const { t } = useT('biologicalAssets');
  const { register, control, handleSubmit, watch, getValues, setValue, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { producto: '', fecha_evento: hoyLocal() },
  });

  const habilitadas = metricas.filter((m) => m.habilitada_en_fase);
  const buscar = (texto: string) => habilitadas.find((m) => normalizar(m.nombre) === normalizar(texto ?? ''));
  const metrica = buscar(watch('producto'));
  // Con un solo producto en la fase no hay nada que elegir: queda puesto.
  const unico = habilitadas.length === 1 ? habilitadas[0].nombre : null;
  React.useEffect(() => {
    if (unico && !getValues('producto')) setValue('producto', unico);
  }, [unico, getValues, setValue]);
  const entero = metrica?.tipo_dato === 'ENTERO';
  const min = num(metrica?.valor_min ?? null);
  const max = num(metrica?.valor_max ?? null);

  const rango = [
    min !== null && max !== null
      ? t('eventoproductivoform.rango_entre', { min: formatearNumero(min), max: formatearNumero(max) })
      : min !== null ? t('eventoproductivoform.rango_desde', { min: formatearNumero(min) })
      : max !== null ? t('eventoproductivoform.rango_hasta', { max: formatearNumero(max) })
      : '',
    entero ? t('eventoproductivoform.numero_entero') : '',
  ].filter(Boolean).join(' · ');

  // El backend señala el campo del rechazo (E-03/E-04 en el producto, E-06 en la cantidad).
  const delServidor = (campo: string) => (saveError?.field === campo ? saveError.message : undefined);

  const validarCantidad = (v: string) => {
    const n = Number(v);
    if (!(n > 0)) return t('eventoproductivoform.debe_ser_mayor_a_0');
    if (entero && !Number.isInteger(n)) return t('eventoproductivoform.debe_ser_entero');
    if (min !== null && n < min) return t('eventoproductivoform.no_puede_ser_menor', { min: formatearNumero(min) });
    if (max !== null && n > max) return t('eventoproductivoform.no_puede_superar', { max: formatearNumero(max) });
    return true;
  };

  const submit = async (v: FormValues) => {
    const elegida = buscar(v.producto);
    if (!elegida) return;
    const dto: RegistrarEventoProductivoDTO = {
      id_metrica_produccion: elegida.id_metrica_produccion,
      cantidad_producida: Number(v.cantidad_producida),
      unidad_medida: elegida.unidad_medida,
      fecha_evento: v.fecha_evento,
      condiciones_produccion: v.condiciones_produccion.trim() || null,
      observaciones: v.observaciones.trim() || null,
    };
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  // Sin productos que elegir no hay nada que llenar: se explica por qué y quién lo resuelve.
  const vacio = !metricasLoading && (metricasError || habilitadas.length === 0);
  if (vacio) {
    return (
      <ModalShell title={t('eventoproductivoform.registrar_evento_productivo')} onClose={onClose} maxWidth={520}>
        {metricasError ? (
          <Alert
            variant="error"
            title={t('eventoproductivoform.error_productos_titulo')}
            description={t('eventoproductivoform.error_productos_detalle')}
          />
        ) : (
          <Alert
            variant="info"
            title={t('eventoproductivoform.sin_productos_titulo')}
            description={metricas.length === 0
              ? t('eventoproductivoform.sin_productos_especie')
              : t('eventoproductivoform.sin_productos_fase')}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          {metricasError && (
            <Button type="button" variant="secondary" size="md" onClick={onReintentar}>{t('eventoproductivoform.reintentar')}</Button>
          )}
          <Button type="button" variant="primary" size="md" onClick={onClose}>{t('eventoproductivoform.cerrar')}</Button>
        </div>
      </ModalShell>
    );
  }

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
          <Controller
            name="producto"
            control={control}
            rules={{
              required: t('eventoproductivoform.el_tipo_de_producto_es_obligatorio'),
              validate: (v) => !!buscar(v) || t('eventoproductivoform.elige_un_producto_de_la_lista'),
            }}
            render={({ field }) => (
              <Combobox
                id="evento-productivo-producto"
                label={t('eventoproductivoform.tipo_de_producto')}
                required
                name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
                disabled={metricasLoading}
                opciones={habilitadas.map((m) => ({ valor: m.nombre, detalle: m.unidad_medida }))}
                placeholder={metricasLoading ? t('eventoproductivoform.cargando_productos') : t('eventoproductivoform.elige_o_escribe')}
                hint={metrica ? undefined : t('eventoproductivoform.productos_de_la_fase')}
                error={errors.producto?.message ?? delServidor('id_metrica_produccion')}
              />
            )}
          />
          <Input
            id="evento-productivo-cantidad"
            label={metrica
              ? t('eventoproductivoform.cantidad_producida_en', { unidad: metrica.unidad_medida })
              : t('eventoproductivoform.cantidad_producida')}
            required type="number" inputMode={entero ? 'numeric' : 'decimal'}
            min={min ?? 0} max={max ?? undefined} step={entero ? 1 : 'any'}
            disabled={!metrica}
            hint={metrica ? rango || undefined : t('eventoproductivoform.elige_primero_el_producto')}
            error={errors.cantidad_producida?.message ?? delServidor('cantidad_producida')}
            {...register('cantidad_producida', {
              required: t('eventoproductivoform.la_cantidad_es_obligatoria'),
              validate: validarCantidad,
            })}
          />
          <Input
            label={t('eventoproductivoform.fecha_del_evento')} required type="date" max={hoyLocal()}
            error={errors.fecha_evento?.message ?? delServidor('fecha_evento')}
            {...register('fecha_evento', { required: t('eventoproductivoform.la_fecha_es_obligatoria') })}
          />
          <FormTextArea label={t('eventoproductivoform.condiciones_de_produccion')} placeholder={t('eventoproductivoform.opcional')} {...register('condiciones_produccion')} />
          <FormTextArea label={t('eventoproductivoform.observaciones')} placeholder={t('eventoproductivoform.opcional')} {...register('observaciones')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('eventoproductivoform.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={metricasLoading}>{t('eventoproductivoform.registrar')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
