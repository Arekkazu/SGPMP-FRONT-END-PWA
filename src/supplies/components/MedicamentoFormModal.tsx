// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-76: formulario de aplicación de medicamento |
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import { hoyLocal } from '../../shared/lib/fecha';
import { humanizar } from '../../shared/lib/etiquetas';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo } from '../lib/formato';
import { VIAS_ADMINISTRACION, type ActivoOpcion, type RegistrarMedicamentoPayload } from '../types';
import { SelectorActivo } from './SelectorActivo';
import { AreaTexto } from './AreaTexto';

interface Form {
  activo: string;
  nombre_medicamento: string;
  fecha_aplicacion: string;
  hora_aplicacion: string;
  via_administracion: string;
  dosis_aplicada: string;
  unidad_dosis: string;
  periodo_retiro_dias: string;
  costo_unitario: string;
  nombre_veterinario: string;
  motivo_aplicacion: string;
  lote: string;
  fecha_vencimiento_lote: string;
  observaciones: string;
}

const CAMPOS = [
  'nombre_medicamento', 'fecha_aplicacion', 'hora_aplicacion', 'via_administracion', 'dosis_aplicada', 'unidad_dosis',
  'periodo_retiro_dias', 'costo_unitario', 'nombre_veterinario', 'motivo_aplicacion', 'lote', 'fecha_vencimiento_lote', 'observaciones',
] as const;

interface Props {
  activos: ActivoOpcion[];
  cargandoActivos: boolean;
  enviando: boolean;
  error: ApiError | null;
  onGuardar: (payload: RegistrarMedicamentoPayload) => void;
  onCerrar: () => void;
}

const ahora = () => new Date().toTimeString().slice(0, 5);

export function MedicamentoFormModal({ activos, cargandoActivos, enviando, error, onGuardar, onCerrar }: Props) {
  const { t } = useT('supplies');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Form>({
    mode: 'onBlur',
    defaultValues: {
      activo: '', nombre_medicamento: '', fecha_aplicacion: hoyLocal(), hora_aplicacion: ahora(), via_administracion: '',
      dosis_aplicada: '', unidad_dosis: '', periodo_retiro_dias: '0', costo_unitario: '', nombre_veterinario: '',
      motivo_aplicacion: '', lote: '', fecha_vencimiento_lote: '', observaciones: '',
    },
  });
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);

  const enviar = (f: Form) => onGuardar({
    id_activo_biologico: idActivo as number,
    nombre_medicamento: f.nombre_medicamento.trim(),
    fecha_aplicacion: f.fecha_aplicacion,
    hora_aplicacion: f.hora_aplicacion,
    via_administracion: f.via_administracion,
    dosis_aplicada: decimalPositivo(f.dosis_aplicada) as string,
    unidad_dosis: f.unidad_dosis.trim(),
    periodo_retiro_dias: Number(f.periodo_retiro_dias || 0),
    motivo_aplicacion: f.motivo_aplicacion.trim(),
    costo_unitario: decimalPositivo(f.costo_unitario) as string,
    nombre_veterinario: f.nombre_veterinario.trim(),
    lote: f.lote.trim() || null,
    fecha_vencimiento_lote: f.fecha_vencimiento_lote || null,
    observaciones: f.observaciones.trim() || null,
  });

  return (
    <ModalShell
      title={t('medicamento.registrar')}
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
              id="medicamento-activo" activos={activos} cargando={cargandoActivos} value={field.value}
              onChange={(texto, id) => { field.onChange(texto); setIdActivo(id); }}
              onBlur={field.onBlur} required error={errors.activo?.message}
            />
          )}
        />
        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Input
            id="medicamento-nombre" label={t('medicamento.nombre')} required maxLength={50}
            error={errors.nombre_medicamento?.message}
            {...register('nombre_medicamento', { validate: (v) => !!v.trim() || t('medicamento.nombre_requerido') })}
          />
          <Select
            id="medicamento-via" label={t('medicamento.via')} required error={errors.via_administracion?.message}
            {...register('via_administracion', { required: t('medicamento.via_requerida') })}
          >
            <option value="">{t('comun.seleccionar')}</option>
            {VIAS_ADMINISTRACION.map((v) => <option key={v} value={v}>{t(`via.${v}`, { defaultValue: humanizar(v) })}</option>)}
          </Select>
          <Input
            id="medicamento-fecha" label={t('medicamento.fecha')} type="date" required max={hoyLocal()}
            error={errors.fecha_aplicacion?.message}
            {...register('fecha_aplicacion', { required: t('comun.fecha_requerida'), validate: (v) => v <= hoyLocal() || t('comun.fecha_futura') })}
          />
          <Input
            id="medicamento-hora" label={t('medicamento.hora')} type="time" required
            error={errors.hora_aplicacion?.message}
            {...register('hora_aplicacion', { required: t('medicamento.hora_requerida') })}
          />
          <Input
            id="medicamento-dosis" label={t('medicamento.dosis')} type="number" step="any" min={0} required
            error={errors.dosis_aplicada?.message}
            {...register('dosis_aplicada', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })}
          />
          <Input
            id="medicamento-unidad" label={t('medicamento.unidad')} required maxLength={20} placeholder="ml"
            error={errors.unidad_dosis?.message}
            {...register('unidad_dosis', { validate: (v) => !!v.trim() || t('medicamento.unidad_requerida') })}
          />
          <Input
            id="medicamento-costo" label={t('medicamento.costo_unitario')} type="number" step="any" min={0} required
            hint={t('medicamento.costo_unitario_hint')} error={errors.costo_unitario?.message}
            {...register('costo_unitario', { validate: (v) => !!decimalPositivo(v) || t('comun.mayor_que_cero') })}
          />
          <Input
            id="medicamento-retiro" label={t('medicamento.retiro')} type="number" step={1} min={0}
            hint={t('medicamento.retiro_hint')} error={errors.periodo_retiro_dias?.message}
            {...register('periodo_retiro_dias', { validate: (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0) || t('medicamento.retiro_invalido') })}
          />
        </div>
        <Input
          id="medicamento-vet" label={t('medicamento.veterinario')} required maxLength={150}
          error={errors.nombre_veterinario?.message}
          {...register('nombre_veterinario', { validate: (v) => !!v.trim() || t('medicamento.veterinario_requerido') })}
        />
        <AreaTexto
          id="medicamento-motivo" label={t('medicamento.motivo')} required maxLength={500}
          hint={t('medicamento.motivo_hint')} error={errors.motivo_aplicacion?.message}
          {...register('motivo_aplicacion', { validate: (v) => v.trim().length >= 10 || t('medicamento.motivo_corto') })}
        />
        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Input id="medicamento-lote" label={t('medicamento.lote')} maxLength={60} hint={t('comun.opcional')} {...register('lote')} />
          <Input id="medicamento-vence" label={t('medicamento.vence_lote')} type="date" hint={t('comun.opcional')} error={errors.fecha_vencimiento_lote?.message} {...register('fecha_vencimiento_lote')} />
        </div>
        <AreaTexto id="medicamento-obs" label={t('comun.observaciones')} maxLength={500} hint={t('comun.opcional')} {...register('observaciones')} />
      </form>
    </ModalShell>
  );
}
