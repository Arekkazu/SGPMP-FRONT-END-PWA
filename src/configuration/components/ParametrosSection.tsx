import React, { useEffect } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { RefreshCw, Clock, Activity, Globe } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useParametrosGlobales } from '../hooks/useParametrosGlobales';

interface FormValues {
  frecuencia_muestreo: number;
  heartbeat: number;
}

function formatFecha(iso: string): string {
  try {
    return formatearFechaHora(iso, {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Card de parámetro actual ──────────────────────────────────────────────────
function ParamCard({
  label, value, unit, icon, accentColor, iconBg, iconColor, description,
}: {
  label: string; value: number; unit: string;
  icon: React.ReactNode; accentColor: string; iconBg: string; iconColor: string;
  description: string;
}) {
  return (
    <div style={{ position: 'relative', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      {/* accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s4)', marginTop: 'var(--s1)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s1)' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: iconColor, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{unit}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s2)', lineHeight: 1.4 }}>{description}</div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ParametrosSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeLeer      = usePermission(21, 2);
  const puedeEditar    = usePermission(21, 3);
  const puedeCrear     = usePermission(21, 1);

  const { config, loading, saving, error, saveError, cargar, crear, actualizar } = useParametrosGlobales();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (config) {
      reset({ frecuencia_muestreo: config.frecuencia_muestreo, heartbeat: config.heartbeat });
    }
  }, [config, reset]);

  if (!puedeLeer && !puedeCrear && !puedeEditar) {
    return (
      <Alert
        variant="warning"
        title={t('parametrossection.sin_acceso')}
        description={t('parametrossection.solo_los_administradores_pueden_gestionar')}
      />
    );
  }

  const onSubmit = async (data: FormValues) => {
    const frecuencia_muestreo = Number(data.frecuencia_muestreo);
    const heartbeat = Number(data.heartbeat);

    if (config) {
      await actualizar(config.id_configuracion_global, {
        frecuencia_muestreo,
        heartbeat,
        fecha_actualizacion: config.fecha_actualizacion,
      });
    } else {
      await crear({ frecuencia_muestreo, heartbeat });
    }
  };

  return (
    <div>
      {/* Header de sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s6)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('parametrossection.parametros_operativos_del_sistema')}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('parametrossection.configuracion_global_aplica_a_todos_los')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('parametrossection.recargar_parametros')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      {/* Alertas */}
      {!online && (
        <Alert variant="warning" title={t('parametrossection.sin_conexion')} description={t('parametrossection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s5)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('parametrossection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {/* Status banner */}
      {config && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', padding: 'var(--s4) var(--s5)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-xl)', background: 'var(--brand-50,#f0f7ee)', border: '1px solid var(--brand-200,#b2d8b5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Globe size={22} color="var(--brand-600)" aria-hidden />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('parametrossection.configuracion_global_del_sistema')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '10px', fontWeight: 700, background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{t('parametrossection.alcance_global_todos_los_dispositivos')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: 'var(--sem-success-bg)', border: '1px solid var(--sem-success-border)', color: 'var(--sem-success)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} />{t('parametrossection.configuracion_activa')}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
              Última actualización por usuario #{config.id_usuario}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t('parametrossection.ultima_actualizacion')}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {formatFecha(config.fecha_actualizacion)}
            </div>
          </div>
        </div>
      )}

      {/* Skeleton cargando */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      )}

      {/* Param cards (valores actuales) */}
      {!loading && config && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
          <ParamCard
            label={t('parametrossection.frecuencia_de_muestreo')}
            value={config.frecuencia_muestreo}
            unit="min"
            icon={<Clock size={20} aria-hidden />}
            accentColor="linear-gradient(90deg, var(--brand-400), var(--brand-600))"
            iconBg="var(--brand-50,#f0f7ee)"
            iconColor="var(--brand-600)"
            description={t('parametrossection.intervalo_esperado_de_recepcion_de_datos_de')}
          />
          <ParamCard
            label="Tiempo máximo sin datos (Heartbeat)"
            value={config.heartbeat}
            unit="min"
            icon={<Activity size={20} aria-hidden />}
            accentColor="linear-gradient(90deg, #1a6abf, #3b82f6)"
            iconBg="var(--sem-info-bg,#eef4ff)"
            iconColor="var(--sem-info,#1a6abf)"
            description={t('parametrossection.tiempo_maximo_sin_recepcion_antes_de')}
          />
        </div>
      )}

      {/* Estado vacío — sin config */}
      {!loading && !config && !error && (
        <Alert
          variant="info"
          title={t('parametrossection.sin_configuracion')}
          description={t('parametrossection.no_existe_una_configuracion_operativa')}
          style={{ marginBottom: 'var(--s5)' }}
        />
      )}

      {/* Formulario de edición */}
      {!loading && (puedeEditar || puedeCrear) && (
        <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {config ? 'ACTUALIZAR PARÁMETROS OPERATIVOS' : 'CREAR CONFIGURACIÓN INICIAL'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontSize: '10px', fontWeight: 600, color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>
              <Globe size={10} aria-hidden />{t('parametrossection.config_global_unica')}</span>
          </div>

          <div style={{ padding: 'var(--s6)' }}>
            {saveError && (
              <Alert
                variant="error"
                title={saveError.status === 412 ? 'Conflicto de edición detectado' : 'Error al guardar'}
                description={saveError.status === 412
                  ? 'Otro administrador modificó los parámetros mientras editabas. Recarga la página para obtener los valores actuales antes de guardar.'
                  : saveError.message}
                style={{ marginBottom: 'var(--s5)' }}
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--s5)', marginBottom: 'var(--s5)' }}>
                <div>
                  <Input
                    label="Frecuencia de muestreo (minutos)"
                    type="number"
                    required
                    aria-required="true"
                    placeholder="Ej: 5"
                    error={errors.frecuencia_muestreo?.message}
                    disabled={!online}
                    {...register('frecuencia_muestreo', {
                      required: 'Campo obligatorio.',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Mínimo 1 minuto.' },
                      validate: (v) => Number.isInteger(Number(v)) || 'Debe ser un entero positivo.',
                    })}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('parametrossection.entero_positivo_define_cada_cuantos_minutos')}</p>
                </div>

                <div>
                  <Input
                    label="Heartbeat — tiempo máx. sin datos (minutos)"
                    type="number"
                    required
                    aria-required="true"
                    placeholder="Ej: 15"
                    error={errors.heartbeat?.message}
                    disabled={!online}
                    {...register('heartbeat', {
                      required: 'Campo obligatorio.',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Mínimo 1 minuto.' },
                      validate: (v, all) =>
                        Number(v) >= Number(all.frecuencia_muestreo) ||
                        'Debe ser mayor o igual a la frecuencia de muestreo.',
                    })}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('parametrossection.debe_ser_mayor_o_igual_a_la_frecuencia_de')}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
                {config && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => reset({ frecuencia_muestreo: config.frecuencia_muestreo, heartbeat: config.heartbeat })}
                    disabled={saving || !isDirty}
                  >{t('parametrossection.restablecer')}</Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={!online || (!isDirty && !!config)}
                >
                  {config ? 'Guardar configuración' : 'Crear configuración inicial'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
