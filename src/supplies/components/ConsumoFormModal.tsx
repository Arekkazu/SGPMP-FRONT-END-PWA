// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75: formulario de registro de consumo de alimento |
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Combobox } from '../../shared/design-system/Combobox';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import { hoyLocal } from '../../shared/lib/fecha';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo, formatoMoneda } from '../lib/formato';
import type { ActivoOpcion, RegistrarConsumoPayload, TipoAlimento } from '../types';
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
  tiposAlimento: TipoAlimento[];
  cargandoTipos: boolean;
  enviando: boolean;
  error: ApiError | null;
  onGuardar: (payload: RegistrarConsumoPayload) => void;
  onCerrar: () => void;
}

export function ConsumoFormModal({ activos, cargandoActivos, tiposAlimento, cargandoTipos, enviando, error, onGuardar, onCerrar }: Props) {
  const { t } = useT('supplies');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const catalogo = useMemo(() => tiposAlimento.map((a) => ({ id: a.id_tipo_alimento, nombre: a.nombre })), [tiposAlimento]);
  const opcionesAlimento = useMemo(() => tiposAlimento.map((a) => ({
    valor: etiquetaDeCatalogo(a.nombre, a.id_tipo_alimento),
    detalle: `${formatoMoneda(a.costo_unitario)} / ${a.unidad_medida}`,
  })), [tiposAlimento]);
  const { register, control, handleSubmit, watch, setError, getValues, setValue, formState: { errors } } = useForm<Form>({
    mode: 'onBlur',
    defaultValues: { activo: '', id_tipo_alimento: '', fecha_consumo: hoyLocal(), hora_suministro: '', cantidad_alimento: '', costo_unitario: '', observaciones: '' },
  });
  const alertaGeneral = useErroresDeServidor(error, setError, CAMPOS);
  const alimento = tiposAlimento.find((a) => a.id_tipo_alimento === idDeCatalogo(watch('id_tipo_alimento'), catalogo));
  const cantidad = decimalPositivo(watch('cantidad_alimento'));
  const costo = decimalPositivo(watch('costo_unitario'));
  // Vista previa: el costo total autoritativo lo calcula la BD (trigger) al guardar.
  const totalEstimado = cantidad && costo ? Number(cantidad) * Number(costo) : null;

  const enviar = (f: Form) => onGuardar({
    id_activo_biologico: idActivo as number,
    id_tipo_alimento: idDeCatalogo(f.id_tipo_alimento, catalogo) as number,
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
        <Controller
          name="id_tipo_alimento"
          control={control}
          rules={{ validate: (v) => idDeCatalogo(v, catalogo) !== null || t('consumo.tipo_alimento_invalido') }}
          render={({ field }) => (
            <Combobox
              id="consumo-tipo"
              label={t('consumo.tipo_alimento')}
              opciones={opcionesAlimento}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onSelect={(o) => {
                // El costo del catálogo es solo una sugerencia: el RF pide registrar el precio real.
                const elegido = tiposAlimento.find((a) => a.id_tipo_alimento === idDeCatalogo(o.valor, catalogo));
                if (elegido && !getValues('costo_unitario')) setValue('costo_unitario', String(Number(elegido.costo_unitario)));
              }}
              required
              placeholder={cargandoTipos ? t('comun.cargando') : undefined}
              hint={!cargandoTipos && tiposAlimento.length === 0 ? t('consumo.sin_tipos') : t('consumo.tipo_alimento_hint')}
              error={errors.id_tipo_alimento?.message}
            />
          )}
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
            id="consumo-cantidad" label={t('consumo.cantidad', { unidad: alimento?.unidad_medida ?? 'kg' })} type="number" step="any" min={0} required
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
