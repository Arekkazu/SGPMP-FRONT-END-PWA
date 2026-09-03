import React, { useEffect, useState } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { ShieldCheck, ChevronLeft, Check, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useSensores } from '../hooks/useSensores';
import { useCalibracion } from '../hooks/useCalibracion';
import type { DispositivoIotResponse, SensorResponse, CalibracionResponse } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIA_EMOJI: Record<string, string> = {
  TEMPERATURA: '🌡️', HUMEDAD: '💧', OXIGENO: '💨', PH: '⚗️',
  AMONIACO: '☁️', SALINIDAD: '🧂', LUMINOSIDAD: '☀️',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)', textAlign: 'left',
  fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = { padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', fontSize: '13px' };

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return formatearFechaHora(iso, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

// ── Step indicator ────────────────────────────────────────────────────────────

type WizardStep = 'dispositivo' | 'sensor' | 'calibrar';
const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'dispositivo', label: 'Dispositivo' },
  { id: 'sensor',      label: 'Sensor' },
  { id: 'calibrar',    label: 'Registrar calibración' },
];

function Stepper({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s2)' }}>
      {STEPS.map((s, i) => {
        const done = i < idx; const active = i === idx;
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, background: done ? 'var(--sem-success)' : active ? 'var(--brand-500)' : 'var(--surface-hover)', color: done || active ? '#fff' : 'var(--text-muted)', border: i > idx ? '2px solid var(--surface-border)' : 'none' }}>
                {done ? <Check size={12} aria-hidden /> : i + 1}
              </div>
              <span style={{ fontSize: '12px', fontWeight: active ? 700 : 500, color: done ? 'var(--sem-success)' : active ? 'var(--brand-600)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: '1 1 16px', height: 2, background: done ? 'var(--sem-success)' : 'var(--surface-border)', minWidth: 12 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Device selector ───────────────────────────────────────────────────────────

function DispSelector({ dispositivos, loading, onSelect }: {
  dispositivos: DispositivoIotResponse[]; loading: boolean; onSelect: (d: DispositivoIotResponse) => void;
}) {
  const { t } = useT('configuration');
  const activos = dispositivos.filter((d) => d.es_activo);
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 90, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (activos.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s7) 0' }}>{t('calibracionsection.no_hay_dispositivos_activos_disponibles')}</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
      {activos.map((d) => (
        <button key={d.id_dispositivo_iot} type="button" onClick={() => onSelect(d)}
          style={{ background: 'var(--surface-card)', border: '1.5px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
            <span style={{ fontSize: 20 }}>📡</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)' }}>{d.serial}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--sem-success)', fontWeight: 600 }}>{t('calibracionsection.solo_dispositivos_activos_son_calibrables')}</div>
        </button>
      ))}
    </div>
  );
}

// ── Sensor selector ───────────────────────────────────────────────────────────

function SensorSelector({ sensores, loading, error, onSelect, onBack }: {
  sensores: SensorResponse[]; loading: boolean; error: { message: string } | null;
  onSelect: (s: SensorResponse) => void; onBack: () => void;
}) {
  const { t } = useT('configuration');
  const activos = sensores.filter((s) => s.es_activo);
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label={t('calibracionsection.cambiar_dispositivo')}>
        <ChevronLeft size={16} aria-hidden />{t('calibracionsection.cambiar_dispositivo')}</Button>
      {error && <Alert variant="error" title={t('calibracionsection.error_al_cargar_sensores')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : activos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s6) 0' }}>{t('calibracionsection.este_dispositivo_no_tiene_sensores_activos')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
          {activos.map((s) => {
            const emoji = s.categoria ? (CATEGORIA_EMOJI[s.categoria] ?? '📡') : '📡';
            return (
              <button key={s.id_sensores} type="button" onClick={() => onSelect(s)}
                style={{ background: 'var(--surface-card)', border: '1.5px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--brand-400)'; b.style.background = 'var(--brand-50)'; }}
                onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--surface-border)'; b.style.background = 'var(--surface-card)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s2)' }}>
                  <span style={{ fontSize: 24 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{s.categoria ?? 'Sin categoría'}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Calibration history ───────────────────────────────────────────────────────

function HistorialCalibraciones({ calibraciones, loading, sensor }: { calibraciones: CalibracionResponse[]; loading: boolean; sensor: SensorResponse }) {
  const { t } = useT('configuration');
  if (loading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginTop: 'var(--s4)' }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 36, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}<style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style></div>;
  }
  return (
    <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', marginTop: 'var(--s5)' }}>
      <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: calibraciones.length > 0 ? '1px solid var(--surface-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Historial de calibraciones · {sensor.nombre}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{calibraciones.length} calibraciones</span>
      </div>
      {calibraciones.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: 'var(--s5) 0' }}>{t('calibracionsection.sin_calibraciones_registradas_para_este')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                {['Fecha/Hora', 'Valor ref.', 'Observaciones', 'Usuario'].map((h) => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {calibraciones.map((c) => (
                <tr key={c.id_calibracion} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatTs(c.fecha_calibracion)}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{c.valor_referencia.toFixed(4)}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', maxWidth: 240 }}>{c.observaciones ?? '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{c.id_usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Calibration form ──────────────────────────────────────────────────────────

interface FormValues {
  valor_referencia: number;
  fecha_calibracion: string;
  observaciones: string;
}

function CalibracionForm({ dispositivo, sensor, saving, saveError, asociacion, loadingAsoc, calibraciones, loadingCal, onSubmit, onBack }: {
  dispositivo: DispositivoIotResponse;
  sensor: SensorResponse;
  saving: boolean;
  saveError: { message: string } | null;
  asociacion: { id_infraestructura: number } | null;
  loadingAsoc: boolean;
  calibraciones: CalibracionResponse[];
  loadingCal: boolean;
  onSubmit: (dto: { valor_referencia: number; fecha_calibracion: string; observaciones?: string }) => void;
  onBack: () => void;
}) {
  const { t } = useT('configuration');
  const emoji = sensor.categoria ? (CATEGORIA_EMOJI[sensor.categoria] ?? '📡') : '📡';
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { valor_referencia: 0, fecha_calibracion: localIso, observaciones: '' },
  });
  const obs = watch('observaciones', '');

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s5)' }} aria-label={t('calibracionsection.cambiar_sensor')}>
        <ChevronLeft size={16} aria-hidden />{t('calibracionsection.cambiar_sensor')}</Button>

      {saveError && <Alert variant="error" title={t('calibracionsection.error_al_registrar_calibracion')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />}

      {/* Context header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', background: 'var(--surface-hover)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sensor.nombre}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {sensor.categoria ?? 'Sin categoría'} · Dispositivo: {dispositivo.serial}
          </div>
        </div>
        {loadingAsoc ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('calibracionsection.verificando_asociacion')}</span>
        ) : !asociacion ? (
          <span style={{ fontSize: '11px', color: 'var(--sem-error)', fontWeight: 600 }}>{t('calibracionsection.sin_area_asignada')}</span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--sem-success)', fontWeight: 600 }}>{t('calibracionsection.area_asignada')}</span>
        )}
      </div>

      {!asociacion && !loadingAsoc && (
        <Alert variant="warning" title={t('calibracionsection.sensor_sin_area_asignada')} description={t('calibracionsection.este_sensor_debe_estar_asociado_a_un_area')} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {/* Form */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', marginBottom: 'var(--s5)' }}>
        <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: '1px solid var(--surface-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('calibracionsection.datos_de_calibracion')}</span>
        </div>
        <div style={{ padding: 'var(--s5)' }}>
          <form onSubmit={handleSubmit((d) => onSubmit({
            valor_referencia: Number(d.valor_referencia),
            fecha_calibracion: new Date(d.fecha_calibracion).toISOString(),
            observaciones: d.observaciones.trim() || undefined,
          }))} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s5)', marginBottom: 'var(--s5)' }}>
              {/* Valor de referencia */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('calibracionsection.valor_de_referencia')}<span aria-hidden="true" style={{ color: 'var(--sem-error)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  aria-required="true"
                  style={{ width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors.valor_referencia ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                  {...register('valor_referencia', {
                    required: t('calibracionsection.el_valor_de_referencia_es_obligatorio'),
                    valueAsNumber: true,
                    validate: (v) => !isNaN(v) || 'Debe ser un número válido.',
                  })}
                />
                {errors.valor_referencia && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)', margin: 0 }}>{errors.valor_referencia.message}</p>}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('calibracionsection.hasta_4_decimales_solo_afecta_mediciones')}</p>
              </div>

              {/* Fecha calibración */}
              <div>
                <Input
                  label={t('calibracionsection.fecha_y_hora_de_calibracion')}
                  type="datetime-local"
                  required
                  aria-required="true"
                  error={errors.fecha_calibracion?.message}
                  {...register('fecha_calibracion', { required: t('calibracionsection.la_fecha_de_calibracion_es_obligatoria') })}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('calibracionsection.observaciones')}<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={3}
                  placeholder={t('calibracionsection.condiciones_de_calibracion_motivo_drift')}
                  style={{ width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors.observaciones ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  {...register('observaciones', { maxLength: { value: 200, message: t('calibracionsection.maximo_200_caracteres') } })}
                />
                <span style={{ position: 'absolute', bottom: 'var(--s2)', right: 'var(--s3)', fontSize: '11px', color: (obs?.length ?? 0) > 180 ? 'var(--sem-warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {obs?.length ?? 0}/200
                </span>
              </div>
              {errors.observaciones && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)', margin: 0 }}>{errors.observaciones.message}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" size="md" loading={saving} disabled={!asociacion && !loadingAsoc}>
                <Check size={14} aria-hidden style={{ marginRight: 'var(--s2)' }} />{t('calibracionsection.registrar_calibracion')}</Button>
            </div>
          </form>
        </div>
      </div>

      <HistorialCalibraciones calibraciones={calibraciones} loading={loadingCal} sensor={sensor} />
    </div>
  );
}

// ── CalibracionSection ────────────────────────────────────────────────────────

export function CalibracionSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCalibar = usePermission(12, 5);

  const { dispositivos, loading: loadingDisp, cargar: cargarDisp } = useDispositivosIot();
  const { sensores, loading: loadingSensores, error: errorSensores, cargar: cargarSensores } = useSensores();
  const { calibraciones, asociacion, loading: loadingCal, loadingAsoc, saving, saveError, cargarCalibraciones, cargarAsociacion, registrar } = useCalibracion();

  const [step, setStep] = useState<WizardStep>('dispositivo');
  const [dispositivo, setDispositivo] = useState<DispositivoIotResponse | null>(null);
  const [sensor, setSensor]           = useState<SensorResponse | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  useEffect(() => { cargarDisp(); }, [cargarDisp]);

  const handleSelectDisp = (d: DispositivoIotResponse) => {
    setDispositivo(d); setSensor(null); setSuccessMsg(null);
    setStep('sensor');
    cargarSensores(d.id_dispositivo_iot);
  };

  const handleSelectSensor = (s: SensorResponse) => {
    setSensor(s);
    setStep('calibrar');
    cargarCalibraciones(s.id_sensores);
    cargarAsociacion(s.id_sensores);
  };

  const handleBackToDisp = () => { setStep('dispositivo'); setDispositivo(null); setSensor(null); };
  const handleBackToSensor = () => { setSensor(null); setStep('sensor'); };

  const handleSubmit = async (dto: { valor_referencia: number; fecha_calibracion: string; observaciones?: string }) => {
    if (!sensor || !dispositivo || !asociacion) return;
    const ok = await registrar(sensor.id_sensores, {
      id_dispositivo_iot: dispositivo.id_dispositivo_iot,
      id_infraestructura: asociacion.id_infraestructura,
      valor_referencia: dto.valor_referencia,
      fecha_calibracion: dto.fecha_calibracion,
      observaciones: dto.observaciones,
    });
    if (ok) {
      setSuccessMsg(`Calibración de "${sensor.nombre}" registrada correctamente. Solo afecta mediciones futuras.`);
      cargarCalibraciones(sensor.id_sensores);
    }
  };

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <ShieldCheck size={18} color="var(--brand-500)" aria-hidden />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('calibracionsection.calibracion_de_sensores_iot')}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('calibracionsection.ajuste_del_valor_de_referencia_por_sensor')}</p>
          </div>
        </div>
        {step !== 'dispositivo' && (
          <Button variant="ghost" size="sm" onClick={() => { handleBackToDisp(); cargarDisp(); }}>
            <RefreshCw size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('calibracionsection.reiniciar')}</Button>
        )}
      </div>

      {!online && <Alert variant="warning" title={t('calibracionsection.sin_conexion')} description={t('calibracionsection.la_calibracion_requiere_conexion_al_servidor')} style={{ marginBottom: 'var(--s4)' }} />}
      {successMsg && <Alert variant="success" title={t('calibracionsection.calibracion_registrada')} description={successMsg} style={{ marginBottom: 'var(--s4)' }} />}
      {!puedeCalibar && <Alert variant="warning" title={t('calibracionsection.sin_permiso')} description={t('calibracionsection.no_tienes_permiso_para_registrar')} style={{ marginBottom: 'var(--s4)' }} />}

      {puedeCalibar && online && (
        <>
          <Stepper current={step} />

          {step === 'dispositivo' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('calibracionsection.selecciona_el_dispositivo_que_contiene_el')}</p>
              <DispSelector dispositivos={dispositivos} loading={loadingDisp} onSelect={handleSelectDisp} />
            </>
          )}

          {step === 'sensor' && dispositivo && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('calibracionsection.selecciona_el_sensor_de')}<strong style={{ fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</strong>{t('calibracionsection.a_calibrar')}</p>
              <SensorSelector sensores={sensores} loading={loadingSensores} error={errorSensores} onSelect={handleSelectSensor} onBack={handleBackToDisp} />
            </>
          )}

          {step === 'calibrar' && dispositivo && sensor && (
            <CalibracionForm
              dispositivo={dispositivo}
              sensor={sensor}
              saving={saving}
              saveError={saveError}
              asociacion={asociacion}
              loadingAsoc={loadingAsoc}
              calibraciones={calibraciones}
              loadingCal={loadingCal}
              onSubmit={handleSubmit}
              onBack={handleBackToSensor}
            />
          )}
        </>
      )}
    </div>
  );
}
