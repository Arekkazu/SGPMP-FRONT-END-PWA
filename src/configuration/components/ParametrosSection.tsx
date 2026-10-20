import React, { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { RefreshCw, Clock, Activity, Globe } from 'lucide-react';
import { formatearFechaHora, formatearNumero, useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import type { ApiError } from '../../shared/api/errors';
import { useParametrosGlobales } from '../hooks/useParametrosGlobales';
import styles from './ParametrosSection.module.css';

interface FormValues {
  frecuencia_muestreo: number;
  heartbeat: number;
}
const CAMPOS = ['frecuencia_muestreo', 'heartbeat'] as const;
const enteroPositivo = (v: number) => Number.isSafeInteger(v) && v > 0;

interface ParametrosSectionProps {
  onEditStateChange?: (state: { dirty: boolean; busy: boolean }) => void;
}

function ParamCard({ label, value, unit, description, signal = false }: {
  label: string; value: number; unit: string; description: string; signal?: boolean;
}) {
  const Icon = signal ? Activity : Clock;
  return (
    <div className={[styles.card, signal ? styles.signal : ''].join(' ')}>
      <span className={styles.cardIcon}><Icon size={20} aria-hidden /></span>
      <div>
        <div className={styles.cardLabel}>{label}</div>
        <div className={styles.cardValue}>{formatearNumero(value)} <span>{unit}</span></div>
        <p className={styles.hint}>{description}</p>
      </div>
    </div>
  );
}

export function ParametrosSection({ onEditStateChange }: ParametrosSectionProps = {}) {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeLeer = usePermission(21, 2);
  const puedeEditar = usePermission(21, 3);
  const puedeCrear = usePermission(21, 1);
  const { config, loading, saving, error, saveError, cargar, crear, actualizar } = useParametrosGlobales();
  const [confirmarRecarga, setConfirmarRecarga] = useState(false);
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<FormValues>({ mode: 'onBlur' });
  const puedeGuardar = config ? puedeEditar : puedeCrear;

  const errorFormulario = useMemo(() => saveError && ({
    ...saveError,
    fields: saveError.fields?.map((f) => ({
      ...f, field: f.field.split('.').pop() === 'umbral_sin_senal' ? 'heartbeat' : f.field,
    })),
  }), [saveError]);
  const mostrarErrorGeneral = useErroresDeServidor(errorFormulario, setError, CAMPOS);

  useEffect(() => { if (puedeLeer) void cargar(); }, [cargar, puedeLeer]);
  useEffect(() => {
    if (loading || error) return;
    reset(config
      ? { frecuencia_muestreo: config.frecuencia_muestreo, heartbeat: config.heartbeat }
      : { frecuencia_muestreo: undefined, heartbeat: undefined });
  }, [config, loading, error, reset]);
  useEffect(() => {
    onEditStateChange?.({ dirty: isDirty, busy: saving });
    return () => onEditStateChange?.({ dirty: false, busy: false });
  }, [isDirty, saving, onEditStateChange]);
  useEffect(() => {
    if (!isDirty && !saving) return;
    const proteger = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', proteger);
    return () => window.removeEventListener('beforeunload', proteger);
  }, [isDirty, saving]);

  const mensajeCampo = (e?: FieldError) => e?.message
    ? e.type === 'server' ? e.message : t('parametrossection.' + e.message)
    : undefined;
  const mensajeError = (e: ApiError) => {
    if (e.code === 'CONTRATO_CONFIGURACION_INVALIDO') return t('parametrossection.respuesta_invalida');
    if (e.status === 0) return t('parametrossection.conexion_fallida');
    if (e.status >= 500) return t('parametrossection.servicio_no_disponible');
    return e.message;
  };

  const onSubmit = async (data: FormValues) => {
    if (!online || !puedeGuardar || loading || saving || error || saveError?.status === 412) return;
    // heartbeat es el alias aceptado por DEV-14 y servidores anteriores.
    // PATCH requiere ambos valores y el token; no es una actualización parcial.
    if (config) {
      await actualizar(config.id_configuracion_global, { ...data, fecha_actualizacion: config.fecha_actualizacion });
    } else {
      await crear(data);
    }
  };

  if (!puedeLeer) return (
    <Alert variant="warning" title={t('parametrossection.sin_acceso')}
      description={t('parametrossection.solo_los_administradores_pueden_gestionar')} />
  );

  return (
    <section className={styles.section} aria-labelledby="parametros-titulo" aria-busy={loading || saving}>
      <header className={styles.header}>
        <div>
          <h2 id="parametros-titulo">{t('parametrossection.parametros_operativos_del_sistema')}</h2>
          <p className={styles.hint}>{t('parametrossection.configuracion_global_aplica_a_todos_los')}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={!online || loading || saving}
          onClick={() => isDirty ? setConfirmarRecarga(true) : void cargar()}
          aria-label={t('parametrossection.recargar_parametros')}>
          <RefreshCw size={18} aria-hidden />
        </Button>
      </header>

      {!online && <Alert variant="warning" title={t('parametrossection.sin_conexion')}
        description={t('parametrossection.las_acciones_de_escritura_estan')} />}
      {error && <Alert variant="error" title={t('parametrossection.error_al_cargar')} description={mensajeError(error)} />}

      {loading && !config && <div className={styles.cards} role="status" aria-label={t('parametrossection.cargando')}>
        <div className={styles.skeleton} /><div className={styles.skeleton} />
      </div>}

      {config && <>
        <div className={styles.status}>
          <Globe size={22} aria-hidden />
          <div>
            <strong>{t('parametrossection.configuracion_global_del_sistema')}</strong>
            <div className={styles.badges}>
              <span className={styles.scope}>{t('parametrossection.alcance_global_todos_los_dispositivos')}</span>
              {config.es_activo && <span className={styles.active}>{t('parametrossection.configuracion_activa')}</span>}
            </div>
            <p className={styles.hint}>{t('parametrossection.actualizado_por', { usuario: config.nombre_usuario ?? '#' + config.id_usuario })}</p>
          </div>
          <div className={styles.updated}>
            <span className={styles.hint}>{t('parametrossection.ultima_actualizacion')}</span>
            <time dateTime={config.fecha_actualizacion}>{formatearFechaHora(config.fecha_actualizacion)}</time>
          </div>
        </div>
        <div className={styles.cards}>
          <ParamCard label={t('parametrossection.frecuencia_de_muestreo')} value={config.frecuencia_muestreo}
            unit={t('parametrossection.unidad_minutos')} description={t('parametrossection.intervalo_esperado_de_recepcion_de_datos_de')} />
          <ParamCard signal label={t('parametrossection.umbral_sin_senal')} value={config.heartbeat}
            unit={t('parametrossection.unidad_minutos')} description={t('parametrossection.umbral_descripcion')} />
        </div>
      </>}

      {!loading && !config && !error && <Alert variant="info" title={t('parametrossection.sin_configuracion')}
        description={t('parametrossection.no_existe_una_configuracion_operativa')} />}

      {(!loading || config) && (!error || config) && puedeGuardar && <div className={styles.editor}>
        <h3 className={styles.editorTitle}>{t(config ? 'parametrossection.actualizar_parametros' : 'parametrossection.crear_configuracion')}</h3>
        <div className={styles.editorBody}>
          {(mostrarErrorGeneral || saveError?.status === 412) && saveError && <Alert variant="error"
            title={t(saveError.status === 412 ? 'parametrossection.conflicto_de_edicion_detectado' : 'parametrossection.error_al_guardar')}
            description={saveError.status === 412 ? t('parametrossection.conflicto_descripcion') : mensajeError(saveError)} />}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <fieldset disabled={!online || loading || saving || !!error || saveError?.status === 412} className={styles.fields}>
              <Input id="parametros-frecuencia" label={t('parametrossection.frecuencia_label')} type="number" min={1} step={1}
                required hint={t('parametrossection.entero_positivo_define_cada_cuantos_minutos')}
                error={mensajeCampo(errors.frecuencia_muestreo)}
                {...register('frecuencia_muestreo', {
                  required: 'campo_obligatorio', valueAsNumber: true,
                  validate: (v) => enteroPositivo(v) || 'entero_positivo', deps: ['heartbeat'],
                })} />
              <Input id="parametros-umbral" label={t('parametrossection.umbral_label')} type="number" min={1} step={1}
                required hint={t('parametrossection.umbral_descripcion')} error={mensajeCampo(errors.heartbeat)}
                {...register('heartbeat', {
                  required: 'campo_obligatorio', valueAsNumber: true,
                  validate: {
                    entero: (v) => enteroPositivo(v) || 'entero_positivo',
                    relacion: (v, all) => v >= all.frecuencia_muestreo || 'debe_ser_mayor_o_igual_a_la_frecuencia_de',
                  },
                })} />
            </fieldset>
            {isDirty && <p role="status" className={styles.hint}>{t('parametrossection.cambios_pendientes')}</p>}
            <div className={styles.actions}>
              {config && <Button type="button" variant="secondary" disabled={saving || !isDirty}
                onClick={() => reset({ frecuencia_muestreo: config.frecuencia_muestreo, heartbeat: config.heartbeat })}>
                {t('parametrossection.restablecer')}
              </Button>}
              <Button type="submit" loading={saving}
                disabled={!online || loading || saving || !!error || (!isDirty && !!config) || saveError?.status === 412}>
                {t(config ? 'parametrossection.guardar_configuracion' : 'parametrossection.crear_configuracion')}
              </Button>
            </div>
          </form>
        </div>
      </div>}

      {confirmarRecarga && <ModalShell title={t('parametrossection.cambios_sin_guardar')} maxWidth={440}
        onClose={() => setConfirmarRecarga(false)} footer={<>
          <Button variant="secondary" onClick={() => setConfirmarRecarga(false)}>{t('parametrossection.seguir_editando')}</Button>
          <Button onClick={() => { setConfirmarRecarga(false); void cargar(); }}>{t('parametrossection.descartar_recargar')}</Button>
        </>}>
        <p>{t('parametrossection.descartar_descripcion')}</p>
      </ModalShell>}
    </section>
  );
}
