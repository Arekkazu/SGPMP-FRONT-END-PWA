// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75: formulario de registro de consumo de alimento |
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import { hoyLocal } from '../../shared/lib/fecha';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo, formatoMoneda } from '../lib/formato';
import type { ActivoOpcion, RegistrarConsumoPayload } from '../types';
import { SelectorActivo } from './SelectorActivo';
import { AreaTexto } from './AreaTexto';

interface Form {
  activo: string;
  id_tipo_alimento: string;
  fecha_consumo: string;
  hora_suministro: string;
  cantidad_alimento: string;
  costo_unitario: string;
  observaciones: string;
}

const CAMPOS = ['id_tipo_alimento', 'fecha_consumo', 'hora_suministro', 'cantidad_alimento', 'costo_unitario', 'observaciones'] as const;

interface Props {
  activos: ActivoOpcion[];
  cargandoActivos: boolean;
  enviando: boolean;
  error: ApiError | null;
  onGuardar: (payload: RegistrarConsumoPayload) => void;
  onCerrar: () => void;
}

export function ConsumoFormModal({ activos, cargandoActivos, enviando, error, onGuardar, onCerrar }: Props) {
  const { t } = useT('supplies');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const { register, control, handleSubmit, watch, setError, formState: { errors } } = useForm<Form>({
    mode: 'onBlur',
    defaultValues: { activo: '', id_tipo_alimento: '', fecha_consumo: hoyLocal(), hora_suministro: '', cantidad_alimento: '', costo_unitario: '', observaciones: '' },
  });
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);
  const cantidad = decimalPositivo(watch('cantidad_alimento'));
  const costo = decimalPositivo(watch('costo_unitario'));
  // Vista previa: el costo total autoritativo lo calcula la BD (trigger) al guardar.
  const totalEstimado = cantidad && costo ? Number(cantidad) * Number(costo) : null;

  const enviar = (f: Form) => onGuardar({
    id_activo_biologico: idActivo as number,
    id_tipo_alimento: Number(f.id_tipo_alimento),
    fecha_consumo: f.fecha_consumo,
    hora_suministro: f.hora_suministro || null,
    cantidad_alimento: decimalPositivo(f.cantidad_alimento) as string,
    costo_unitario: decimalPositivo(f.costo_unitario) as string,
    observaciones: f.observaciones.trim() || null,
  });

  return (
    <ModalShell
      title={t('consumo.registrar')}
      onClose={onCerrar}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={handleSubmit(enviar)}>{t('comun.guardar_registro')}</Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        {alertaGeneral && error && <Alert variant={error.status === 409 ? 'error' : 'warning'} title={error.message} />}
        <Controller
          name="activo"
          control={control}
          rules={{ validate: () => idActivo !== null || t('comun.activo_requerido') }}
          render={({ field }) => (
            <SelectorActivo
              id="consumo-activo"
              activos={activos}
              cargando={cargandoActivos}
              value={field.value}
              onChange={(texto, id) => { field.onChange(texto); setIdActivo(id); }}
              onBlur={field.onBlur}
              required
              error={errors.activo?.message}
            />
          )}
        />
        <Input
          id="consumo-tipo"
          label={t('consumo.tipo_alimento')}
          type="number" step={1} min={1} required
          hint={t('consumo.tipo_alimento_hint')}
          error={errors.id_tipo_alimento?.message}
          {...register('id_tipo_alimento', { validate: (v) => Number.isInteger(Number(v)) && Number(v) > 0 || t('consumo.tipo_alimento_invalido') })}
        />
        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Input
            id="consumo-fecha" label={t('consumo.fecha')} type="date" required max={hoyLocal()}
            error={errors.fecha_consumo?.message}
            {...register('fecha_consumo', {
              required: t('comun.fecha_requerida'),
              validate: (v) => v <= hoyLocal() || t('comun.fecha_futura'),
            })}
          />
          <Input id="consumo-hora" label={t('consumo.hora')} type="time" hint={t('comun.opcional')} {...register('hora_suministro')} />
          <Input
            id="consumo-cantidad" label={t('consumo.cantidad')} type="number" step="any" min={0} required
            error={errors.cantidad_alimento?.message}
            {...register('cantidad_alimento', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })}
          />
          <Input
            id="consumo-costo" label={t('consumo.costo_unitario')} type="number" step="any" min={0} required
            error={errors.costo_unitario?.message}
            {...register('costo_unitario', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })}
          />
        </div>
        <p aria-live="polite" style={{ margin: 0, fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
          {t('consumo.total_estimado')}{' '}
          <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{totalEstimado === null ? '—' : formatoMoneda(totalEstimado)}</strong>
        </p>
        <AreaTexto id="consumo-obs" label={t('comun.observaciones')} maxLength={500} hint={t('comun.opcional')} error={errors.observaciones?.message} {...register('observaciones')} />
      </form>
    </ModalShell>
  );
}
