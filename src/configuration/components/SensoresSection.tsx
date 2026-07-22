import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Radio, ChevronLeft, Check, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useSensores } from '../hooks/useSensores';
import { useFincas } from '../hooks/useFincas';
import { useInfraestructuras } from '../hooks/useInfraestructuras';
import type { DispositivoIotResponse, SensorResponse, FincaResponse, InfraestructuraResponse } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIA_EMOJI: Record<string, string> = {
  TEMPERATURA: '🌡️',
  HUMEDAD: '💧',
  OXIGENO: '💨',
  PH: '⚗️',
  AMONIACO: '☁️',
  SALINIDAD: '🧂',
  LUMINOSIDAD: '☀️',
};

const TIPO_EMOJI: Record<string, string> = {
  'Galpón': '🏚️',
  'Corral': '🐄',
  'Potrero': '🌿',
  'Estanque': '🐟',
  'Invernadero': '🌱',
};

// ── Step indicator ────────────────────────────────────────────────────────────

type WizardStep = 'dispositivo' | 'sensor' | 'area' | 'confirmar';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'dispositivo', label: 'Dispositivo' },
  { id: 'sensor',      label: 'Sensor' },
  { id: 'area',        label: 'Área destino' },
  { id: 'confirmar',   label: 'Confirmar' },
];

function Stepper({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--s6)', flexWrap: 'wrap', gap: 'var(--s2)' }}>
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const pending = i > idx;
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, flexShrink: 0,
                background: done ? 'var(--sem-success)' : active ? 'var(--brand-500)' : 'var(--surface-hover)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                border: pending ? '2px solid var(--surface-border)' : 'none',
              }}>
                {done ? <Check size={12} aria-hidden /> : i + 1}
              </div>
              <span style={{
                fontSize: '12px', fontWeight: active ? 700 : 500,
                color: done ? 'var(--sem-success)' : active ? 'var(--brand-600)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: '1 1 16px', height: 2, background: done ? 'var(--sem-success)' : 'var(--surface-border)', minWidth: 12 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 1: Dispositivo selector ──────────────────────────────────────────────

function DispSelector({ dispositivos, loading, onSelect }: {
  dispositivos: DispositivoIotResponse[]; loading: boolean; onSelect: (d: DispositivoIotResponse) => void;
}) {
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
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s7) 0' }}>No hay dispositivos IoT activos. Regístralos primero en la sección "Dispositivos IoT".</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
      {activos.map((d) => (
        <button
          key={d.id_dispositivo_iot}
          type="button"
          onClick={() => onSelect(d)}
          style={{ background: 'var(--surface-card)', border: '1.5px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
            <span style={{ fontSize: 22 }}>📡</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)' }}>{d.serial}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '11px', color: 'var(--sem-success)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)', display: 'inline-block' }} />
            Activo · #{d.id_dispositivo_iot}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Step 2: Sensor selector ───────────────────────────────────────────────────

function SensorSelector({ sensores, loading, error, onSelect, onBack }: {
  sensores: SensorResponse[]; loading: boolean; error: { message: string } | null;
  onSelect: (s: SensorResponse) => void; onBack: () => void;
}) {
  const activos = sensores.filter((s) => s.es_activo);
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label="Cambiar dispositivo">
        <ChevronLeft size={16} aria-hidden /> Cambiar dispositivo
      </Button>
      {error && <Alert variant="error" title="Error al cargar sensores" description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : activos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s6) 0' }}>
          Este dispositivo no tiene sensores activos registrados.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
          {activos.map((s) => {
            const emoji = s.categoria ? (CATEGORIA_EMOJI[s.categoria] ?? '📡') : '📡';
            return (
              <button
                key={s.id_sensores}
                type="button"
                onClick={() => onSelect(s)}
                style={{ background: 'var(--surface-card)', border: '2px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--brand-400)'; b.style.background = 'var(--brand-50)'; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--surface-border)'; b.style.background = 'var(--surface-card)'; b.style.transform = 'none'; b.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s2)' }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.categoria ?? 'Sin categoría'} · #{s.id_sensores}
                    </div>
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

// ── Step 3: Area selector ─────────────────────────────────────────────────────

function AreaDestSelector({ fincas, infraestructuras, loadingFincas, loadingInfras, fincaSeleccionada, onSelectFinca, onSelectArea, onBack }: {
  fincas: FincaResponse[];
  infraestructuras: InfraestructuraResponse[];
  loadingFincas: boolean;
  loadingInfras: boolean;
  fincaSeleccionada: FincaResponse | null;
  onSelectFinca: (f: FincaResponse) => void;
  onSelectArea: (i: InfraestructuraResponse) => void;
  onBack: () => void;
}) {
  const activas = infraestructuras.filter((i) => i.es_activo);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label="Cambiar sensor">
        <ChevronLeft size={16} aria-hidden /> Cambiar sensor
      </Button>

      {/* Finca filter pills */}
      <div style={{ marginBottom: 'var(--s4)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s3)' }}>
          {fincaSeleccionada ? `Áreas de ${fincaSeleccionada.nombre}:` : 'Selecciona la finca:'}
        </p>
        {loadingFincas ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cargando fincas…</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
            {fincas.filter((f) => f.es_activo).map((f) => (
              <button
                key={f.id_finca}
                type="button"
                onClick={() => onSelectFinca(f)}
                style={{
                  padding: 'var(--s2) var(--s3)',
                  borderRadius: 'var(--r-full)',
                  border: `1.5px solid ${fincaSeleccionada?.id_finca === f.id_finca ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                  background: fincaSeleccionada?.id_finca === f.id_finca ? 'var(--brand-50)' : 'var(--surface-card)',
                  color: fincaSeleccionada?.id_finca === f.id_finca ? 'var(--brand-700)' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Areas grid */}
      {fincaSeleccionada && (
        loadingInfras ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 100, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : activas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s5) 0' }}>
            Esta finca no tiene áreas productivas activas.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
            {activas.map((infra) => {
              const emoji = TIPO_EMOJI[infra.tipo_area] ?? '🏗️';
              return (
                <button
                  key={infra.id_infraestructura}
                  type="button"
                  onClick={() => onSelectArea(infra)}
                  style={{ background: 'var(--surface-card)', border: '2px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'left', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--brand-500)'; b.style.background = 'var(--brand-50)'; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--surface-border)'; b.style.background = 'var(--surface-card)'; b.style.transform = 'none'; b.style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-500)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s3)', marginTop: 'var(--s2)' }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{infra.nombre_infraestructura}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {infra.tipo_area} · {fincaSeleccionada.nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {infra.superficie.toLocaleString('es-CO')} m²
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

interface ConfirmFormValues {
  punto_instalacion: string;
}

function ConfirmStep({ dispositivo, sensor, finca, area, saving, saveError, onBack, onConfirm }: {
  dispositivo: DispositivoIotResponse;
  sensor: SensorResponse;
  finca: FincaResponse;
  area: InfraestructuraResponse;
  saving: boolean;
  saveError: { message: string } | null;
  onBack: () => void;
  onConfirm: (punto: string) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ConfirmFormValues>({ mode: 'onBlur' });
  const emoji = sensor.categoria ? (CATEGORIA_EMOJI[sensor.categoria] ?? '📡') : '📡';
  const areaEmoji = TIPO_EMOJI[area.tipo_area] ?? '🏗️';

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s5)' }} aria-label="Cambiar área">
        <ChevronLeft size={16} aria-hidden /> Cambiar área
      </Button>

      {saveError && (
        <Alert variant="error" title="Error al asociar" description={saveError.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        {/* Sensor node */}
        <div style={{ flex: 1, minWidth: 160, background: 'var(--brand-50)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 'var(--s2)' }}>{emoji}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>Sensor</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{sensor.nombre}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</div>
        </div>

        {/* Arrow */}
        <div style={{ fontSize: 20, color: 'var(--brand-500)', fontWeight: 700 }}>→</div>

        {/* Area node */}
        <div style={{ flex: 1, minWidth: 160, background: 'var(--sem-success-bg)', border: '1px solid var(--sem-success-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 'var(--s2)' }}>{areaEmoji}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>Área productiva</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-700)' }}>{area.nombre_infraestructura}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{finca.nombre}</div>
        </div>
      </div>

      {/* Punto instalacion form */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: '1px solid var(--surface-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Datos de la asociación
          </span>
        </div>
        <div style={{ padding: 'var(--s5)' }}>
          <form onSubmit={handleSubmit((d) => onConfirm(d.punto_instalacion))} noValidate>
            <Input
              label="Punto de instalación física"
              required
              aria-required="true"
              placeholder="Ej: Centro del galpón, cerca al bebedero"
              error={errors.punto_instalacion?.message}
              {...register('punto_instalacion', {
                required: 'Indica el punto de instalación del sensor.',
                minLength: { value: 5, message: 'Mínimo 5 caracteres.' },
                maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
              })}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s2)', marginBottom: 'var(--s5)' }}>
              Describe la ubicación física exacta del sensor dentro del área.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onBack} disabled={saving}>Atrás</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>
                <Check size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
                Confirmar asociación
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── SensoresSection ───────────────────────────────────────────────────────────

export function SensoresSection() {
  const online = useOnlineStatus();
  const puedeAsociar = usePermission(12, 1);

  const { dispositivos, loading: loadingDisp, cargar: cargarDisp } = useDispositivosIot();
  const { sensores, loading: loadingSensores, error: errorSensores, saving, saveError, cargar: cargarSensores, asociar } = useSensores();
  const { fincas, loading: loadingFincas, cargar: cargarFincas } = useFincas();
  const { infraestructuras, loading: loadingInfras, cargar: cargarInfras } = useInfraestructuras();

  const [step, setStep] = useState<WizardStep>('dispositivo');
  const [dispositivo, setDispositivo] = useState<DispositivoIotResponse | null>(null);
  const [sensor, setSensor]           = useState<SensorResponse | null>(null);
  const [finca, setFinca]             = useState<FincaResponse | null>(null);
  const [area, setArea]               = useState<InfraestructuraResponse | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  useEffect(() => { cargarDisp(); cargarFincas(); }, [cargarDisp, cargarFincas]);

  const handleSelectDisp = (d: DispositivoIotResponse) => {
    setDispositivo(d);
    setSensor(null);
    setFinca(null);
    setArea(null);
    setSuccessMsg(null);
    setStep('sensor');
    cargarSensores(d.id_dispositivo_iot);
  };

  const handleSelectSensor = (s: SensorResponse) => {
    setSensor(s);
    setFinca(null);
    setArea(null);
    setStep('area');
  };

  const handleSelectFinca = (f: FincaResponse) => {
    setFinca(f);
    setArea(null);
    cargarInfras(f.id_finca);
  };

  const handleSelectArea = (i: InfraestructuraResponse) => {
    setArea(i);
    setStep('confirmar');
  };

  const handleConfirm = async (punto: string) => {
    if (!sensor || !dispositivo || !area) return;
    const ok = await asociar(sensor.id_sensores, {
      id_dispositivo_iot: dispositivo.id_dispositivo_iot,
      id_infraestructura: area.id_infraestructura,
      punto_instalacion: punto,
    });
    if (ok) {
      setSuccessMsg(`Sensor "${sensor.nombre}" asociado a "${area.nombre_infraestructura}" correctamente.`);
      // reset wizard
      setStep('dispositivo');
      setDispositivo(null);
      setSensor(null);
      setFinca(null);
      setArea(null);
    }
  };

  const handleBackToDisp = () => {
    setStep('dispositivo');
    setDispositivo(null);
    setSensor(null);
    setFinca(null);
    setArea(null);
  };

  const handleBackToSensor = () => {
    setSensor(null);
    setFinca(null);
    setArea(null);
    setStep('sensor');
  };

  const handleBackToArea = () => {
    setArea(null);
    setStep('area');
  };

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Radio size={18} color="var(--brand-500)" aria-hidden />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Asociación de Sensores a Áreas
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Vincula cada sensor a la zona física de la finca que debe monitorear
            </p>
          </div>
        </div>
        {step !== 'dispositivo' && (
          <Button variant="ghost" size="sm" onClick={() => { handleBackToDisp(); cargarDisp(); }}>
            <RefreshCw size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Reiniciar
          </Button>
        )}
      </div>

      {/* Alerts */}
      {!online && <Alert variant="warning" title="Sin conexión" description="La asociación de sensores requiere conexión al servidor." style={{ marginBottom: 'var(--s4)' }} />}
      {successMsg && <Alert variant="success" title="Asociación registrada" description={successMsg} style={{ marginBottom: 'var(--s4)' }} />}

      {!puedeAsociar ? (
        <Alert variant="warning" title="Sin permiso" description="No tienes permiso para asociar sensores a áreas productivas." />
      ) : !online ? null : (
        <>
          <Stepper current={step} />

          {step === 'dispositivo' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                Paso 1 — Elige el dispositivo que contiene el sensor a vincular:
              </p>
              <DispSelector dispositivos={dispositivos} loading={loadingDisp} onSelect={handleSelectDisp} />
            </>
          )}

          {step === 'sensor' && dispositivo && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                Paso 2 — Elige el sensor de <strong style={{ fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</strong> a asociar:
              </p>
              <SensorSelector
                sensores={sensores}
                loading={loadingSensores}
                error={errorSensores}
                onSelect={handleSelectSensor}
                onBack={handleBackToDisp}
              />
            </>
          )}

          {step === 'area' && dispositivo && sensor && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                Paso 3 — Elige el área productiva destino para <strong>{sensor.nombre}</strong>:
              </p>
              <AreaDestSelector
                fincas={fincas}
                infraestructuras={infraestructuras}
                loadingFincas={loadingFincas}
                loadingInfras={loadingInfras}
                fincaSeleccionada={finca}
                onSelectFinca={handleSelectFinca}
                onSelectArea={handleSelectArea}
                onBack={handleBackToSensor}
              />
            </>
          )}

          {step === 'confirmar' && dispositivo && sensor && finca && area && (
            <ConfirmStep
              dispositivo={dispositivo}
              sensor={sensor}
              finca={finca}
              area={area}
              saving={saving}
              saveError={saveError}
              onBack={handleBackToArea}
              onConfirm={handleConfirm}
            />
          )}
        </>
      )}
    </div>
  );
}
