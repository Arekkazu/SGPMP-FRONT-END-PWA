import React, { useEffect, useRef, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Radio, ChevronLeft, Check, RefreshCw, Cpu, ArrowRight } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { Stepper } from '../../shared/design-system/Stepper';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useSensores } from '../hooks/useSensores';
import { useFincas } from '../hooks/useFincas';
import { useInfraestructuras } from '../hooks/useInfraestructuras';
import type { AsociacionActivoSuperada, DispositivoIotResponse, SensorResponse, FincaResponse, InfraestructuraResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { iconoCategoriaSensor, iconoTipoArea } from '../iconos';
import { useModalA11y } from '../../shared/hooks/useModalA11y';

type WizardStep = 'dispositivo' | 'sensor' | 'area' | 'confirmar';

// ── Step 1: Dispositivo selector ──────────────────────────────────────────────

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
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s7) 0' }}>{t('sensoressection.no_hay_dispositivos_iot_activos_registralos')}</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
      {activos.map((d) => (
        <OptionCard key={d.id_dispositivo_iot} onClick={() => onSelect(d)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
            <span className="ds-option__icono"><Cpu size={20} strokeWidth={1.5} aria-hidden /></span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)' }}>{d.serial}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '11px', color: 'var(--sem-success)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)', display: 'inline-block' }} />
            Activo · #{d.id_dispositivo_iot}
          </div>
        </OptionCard>
      ))}
    </div>
  );
}

// ── Step 2: Sensor selector ───────────────────────────────────────────────────

function SensorSelector({ sensores, loading, error, onSelect, onBack }: {
  sensores: SensorResponse[]; loading: boolean; error: { message: string } | null;
  onSelect: (s: SensorResponse) => void; onBack: () => void;
}) {
  const { t } = useT('configuration');
  const activos = sensores.filter((s) => s.es_activo);
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label={t('sensoressection.cambiar_dispositivo')}>
        <ChevronLeft size={16} aria-hidden />{t('sensoressection.cambiar_dispositivo')}</Button>
      {error && <Alert variant="error" title={t('sensoressection.error_al_cargar_sensores')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : activos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s6) 0' }}>{t('sensoressection.este_dispositivo_no_tiene_sensores_activos')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
          {activos.map((s) => {
            const Icono = iconoCategoriaSensor(s.categoria);
            return (
              <OptionCard key={s.id_sensores} onClick={() => onSelect(s)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                  <span className="ds-option__icono"><Icono size={20} strokeWidth={1.5} aria-hidden /></span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.categoria ?? 'Sin categoría'} · #{s.id_sensores}
                    </div>
                  </div>
                </div>
              </OptionCard>
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
  const { t } = useT('configuration');
  const activas = infraestructuras.filter((i) => i.es_activo);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label={t('sensoressection.cambiar_sensor')}>
        <ChevronLeft size={16} aria-hidden />{t('sensoressection.cambiar_sensor')}</Button>

      {/* Finca filter pills */}
      <div style={{ marginBottom: 'var(--s4)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s3)' }}>
          {fincaSeleccionada ? `Áreas de ${fincaSeleccionada.nombre}:` : 'Selecciona la finca:'}
        </p>
        {loadingFincas ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('sensoressection.cargando_fincas')}</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
            {fincas.filter((f) => f.es_activo).map((f) => (
              <OptionCard
                key={f.id_finca}
                variant="pill"
                selected={fincaSeleccionada?.id_finca === f.id_finca}
                onClick={() => onSelectFinca(f)}
              >
                {fincaSeleccionada?.id_finca === f.id_finca && <Check size={14} strokeWidth={2} aria-hidden />}
                {f.nombre}
              </OptionCard>
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
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s5) 0' }}>{t('sensoressection.esta_finca_no_tiene_areas_productivas')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
            {activas.map((infra) => {
              const Icono = iconoTipoArea(infra.tipo_area);
              return (
                <OptionCard key={infra.id_infraestructura} onClick={() => onSelectArea(infra)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s3)' }}>
                    <span className="ds-option__icono"><Icono size={20} strokeWidth={1.5} aria-hidden /></span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{infra.nombre_infraestructura}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {infra.tipo_area} · {fincaSeleccionada.nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {formatearNumero(infra.superficie)} m²
                      </div>
                    </div>
                  </div>
                </OptionCard>
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
  saveError: ApiError | null;
  onBack: () => void;
  onConfirm: (punto: string) => void;
}) {
  const { t } = useT('configuration');
  const { register, handleSubmit, formState: { errors } } = useForm<ConfirmFormValues>({ mode: 'onBlur' });
  const IconoSensor = iconoCategoriaSensor(sensor.categoria);
  const IconoArea = iconoTipoArea(area.tipo_area);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s5)' }} aria-label={t('sensoressection.cambiar_area')}>
        <ChevronLeft size={16} aria-hidden />{t('sensoressection.cambiar_area')}</Button>

      {saveError && saveError.code !== 'REASIGNACION_REQUIERE_CONFIRMACION' && (
        <Alert variant="error" title={t('sensoressection.error_al_asociar')} description={saveError.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        {/* Sensor node */}
        <div style={{ flex: 1, minWidth: 160, background: 'var(--brand-50)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'center' }}>
          <span className="ds-option__icono" style={{ marginBottom: 'var(--s2)' }}><IconoSensor size={20} strokeWidth={1.5} aria-hidden /></span>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{t('sensoressection.sensor')}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{sensor.nombre}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</div>
        </div>

        {/* Arrow */}
        <ArrowRight size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />

        {/* Area node */}
        <div style={{ flex: 1, minWidth: 160, background: 'var(--sem-success-bg)', border: '1px solid var(--sem-success-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s4)', textAlign: 'center' }}>
          <span className="ds-option__icono" style={{ marginBottom: 'var(--s2)' }}><IconoArea size={20} strokeWidth={1.5} aria-hidden /></span>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{t('sensoressection.area_productiva')}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-700)' }}>{area.nombre_infraestructura}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{finca.nombre}</div>
        </div>
      </div>

      {/* Punto instalacion form */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: '1px solid var(--surface-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('sensoressection.datos_de_la_asociacion')}</span>
        </div>
        <div style={{ padding: 'var(--s5)' }}>
          <form onSubmit={handleSubmit((d) => onConfirm(d.punto_instalacion))} noValidate>
            <Input
              label={t('sensoressection.punto_de_instalacion_fisica')}
              required
              aria-required="true"
              placeholder={t('sensoressection.ej_centro_del_galpon_cerca_al_bebedero')}
              error={errors.punto_instalacion?.message}
              {...register('punto_instalacion', {
                required: t('sensoressection.indica_el_punto_de_instalacion_del_sensor'),
                minLength: { value: 5, message: t('sensoressection.minimo_5_caracteres') },
                maxLength: { value: 100, message: t('sensoressection.maximo_100_caracteres') },
              })}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s2)', marginBottom: 'var(--s5)' }}>{t('sensoressection.describe_la_ubicacion_fisica_exacta_del')}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onBack} disabled={saving}>{t('sensoressection.atras')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>
                <Check size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('sensoressection.confirmar_asociacion')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Reasignación: confirmación (RF-22 FA "Conflicto de reasignación") ──────────

function ConfirmReasignarModal({ mensaje, saving, onCancel, onConfirm }: {
  mensaje: string; saving: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialogRef = useModalA11y(onCancel);
  const { t } = useT('configuration');
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reasignar-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <h2 id="reasignar-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
          {t('sensoressection.confirmar_reasignacion_titulo')}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{mensaje}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('sensoressection.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('sensoressection.reasignar')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── SensoresSection ───────────────────────────────────────────────────────────

export function SensoresSection() {
  const { t } = useT('configuration');
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
  const [pendingPunto, setPendingPunto] = useState<string | null>(null);
  const [showReasignarConfirm, setShowReasignarConfirm] = useState(false);
  // #290: asociaciones sensor→activo que la reasignación dejó superadas; se
  // muestran para que el usuario las re-asocie desde la ficha del activo (RF-49).
  const [superadas, setSuperadas] = useState<AsociacionActivoSuperada[]>([]);

  useEffect(() => { cargarDisp(); cargarFincas(); }, [cargarDisp, cargarFincas]);

  // WCAG 2.4.3: al cambiar de paso el contenido anterior desaparece y el foco
  // caeria en <body>; se lleva a la instruccion del paso nuevo.
  const instruccionRef = useRef<HTMLParagraphElement>(null);
  const pasoPrevio = useRef(step);
  useEffect(() => {
    if (pasoPrevio.current !== step) instruccionRef.current?.focus();
    pasoPrevio.current = step;
  }, [step]);

  // El wizard ya envió la petición al llegar aquí (ese es el primer intento, sin
  // `confirmar`); un 409 con este codigo especifico pide reasignar, no es un error final.
  useEffect(() => {
    if (saveError?.code === 'REASIGNACION_REQUIERE_CONFIRMACION') setShowReasignarConfirm(true);
  }, [saveError]);

  const handleSelectDisp = (d: DispositivoIotResponse) => {
    setDispositivo(d);
    setSensor(null);
    setFinca(null);
    setArea(null);
    setSuccessMsg(null);
    setSuperadas([]);
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

  const resetWizard = () => {
    setStep('dispositivo');
    setDispositivo(null);
    setSensor(null);
    setFinca(null);
    setArea(null);
    setPendingPunto(null);
    setShowReasignarConfirm(false);
  };

  const handleConfirm = async (punto: string) => {
    if (!sensor || !dispositivo || !area) return;
    setPendingPunto(punto);
    const res = await asociar(sensor.id_sensores, {
      id_dispositivo_iot: dispositivo.id_dispositivo_iot,
      id_infraestructura: area.id_infraestructura,
      punto_instalacion: punto,
    });
    if (res) {
      setSuperadas(res.asociaciones_activo_superadas ?? []);
      setSuccessMsg(`Sensor "${sensor.nombre}" asociado a "${area.nombre_infraestructura}" correctamente.`);
      resetWizard();
    }
  };

  const handleConfirmarReasignacion = async () => {
    if (!sensor || !dispositivo || !area || pendingPunto === null) return;
    const res = await asociar(sensor.id_sensores, {
      id_dispositivo_iot: dispositivo.id_dispositivo_iot,
      id_infraestructura: area.id_infraestructura,
      punto_instalacion: pendingPunto,
      confirmar: true,
    });
    setShowReasignarConfirm(false);
    if (res) {
      setSuperadas(res.asociaciones_activo_superadas ?? []);
      setSuccessMsg(`Sensor "${sensor.nombre}" reasignado a "${area.nombre_infraestructura}" correctamente.`);
      resetWizard();
    }
  };

  const handleCancelarReasignacion = () => setShowReasignarConfirm(false);

  const handleBackToDisp = () => {
    resetWizard();
  };

  const handleBackToSensor = () => {
    setSensor(null);
    setFinca(null);
    setArea(null);
    setPendingPunto(null);
    setShowReasignarConfirm(false);
    setStep('sensor');
  };

  const handleBackToArea = () => {
    setArea(null);
    setPendingPunto(null);
    setShowReasignarConfirm(false);
    setStep('area');
  };

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Radio size={18} color="var(--brand-500)" aria-hidden />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('sensoressection.asociacion_de_sensores_a_areas')}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('sensoressection.vincula_cada_sensor_a_la_zona_fisica_de_la')}</p>
          </div>
        </div>
        {step !== 'dispositivo' && (
          <Button variant="ghost" size="sm" onClick={() => { handleBackToDisp(); cargarDisp(); }}>
            <RefreshCw size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('sensoressection.reiniciar')}</Button>
        )}
      </div>

      {/* Alerts */}
      {!online && <Alert variant="warning" title={t('sensoressection.sin_conexion')} description={t('sensoressection.la_asociacion_de_sensores_requiere_conexion')} style={{ marginBottom: 'var(--s4)' }} />}
      {successMsg && <Alert variant="success" title={t('sensoressection.asociacion_registrada')} description={successMsg} style={{ marginBottom: 'var(--s4)' }} />}
      {superadas.length > 0 && (
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Alert
            variant="warning"
            title={t('sensoressection.activos_sin_monitoreo_titulo')}
            description={t('sensoressection.activos_sin_monitoreo', { count: superadas.length })}
          />
          <ul style={{ margin: 'var(--s2) 0 0', paddingLeft: 'var(--s6)', fontSize: '13px' }}>
            {superadas.map((s) => (
              <li key={s.id_asociacion_activo_sensor}>
                {s.id_activo_biologico !== null ? (
                  <Link to={`/activos-biologicos/${s.id_activo_biologico}`}>
                    {t('sensoressection.activo_superado', { id: s.id_activo_biologico, tipo: t(`sensoressection.tipo_asociacion_${s.tipo}`, { defaultValue: s.tipo }) })}
                  </Link>
                ) : (
                  t(`sensoressection.tipo_asociacion_${s.tipo}`, { defaultValue: s.tipo })
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!puedeAsociar ? (
        <Alert variant="warning" title={t('sensoressection.sin_permiso')} description={t('sensoressection.no_tienes_permiso_para_asociar_sensores_a')} />
      ) : !online ? null : (
        <>
          <Stepper
            aria-label={t('sensoressection.pasos_de_la_asociacion')}
            actual={step}
            pasos={[
              { id: 'dispositivo', label: t('sensoressection.paso_dispositivo') },
              { id: 'sensor', label: t('sensoressection.paso_sensor') },
              { id: 'area', label: t('sensoressection.paso_area_destino') },
              { id: 'confirmar', label: t('sensoressection.paso_confirmar') },
            ]}
          />

          <p key={step} ref={instruccionRef} tabIndex={-1} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
            {step === 'dispositivo' && t('sensoressection.paso_1_elige_el_dispositivo_que_contiene_el')}
            {step === 'sensor' && dispositivo && (
              <>{t('sensoressection.paso_2_elige_el_sensor_de')}{' '}<strong style={{ fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</strong>{' '}{t('sensoressection.a_asociar')}</>
            )}
            {step === 'area' && sensor && (
              <>{t('sensoressection.paso_3_elige_el_area_productiva_destino_para')}{' '}<strong>{sensor.nombre}</strong>:</>
            )}
            {step === 'confirmar' && t('sensoressection.paso_4_confirma_la_asociacion')}
          </p>

          {step === 'dispositivo' && (
            <DispSelector dispositivos={dispositivos} loading={loadingDisp} onSelect={handleSelectDisp} />
          )}

          {step === 'sensor' && dispositivo && (
            <SensorSelector
              sensores={sensores}
              loading={loadingSensores}
              error={errorSensores}
              onSelect={handleSelectSensor}
              onBack={handleBackToDisp}
            />
          )}

          {step === 'area' && dispositivo && sensor && (
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

          {showReasignarConfirm && saveError && (
            <ConfirmReasignarModal
              mensaje={saveError.message}
              saving={saving}
              onCancel={handleCancelarReasignacion}
              onConfirm={handleConfirmarReasignacion}
            />
          )}
        </>
      )}
    </div>
  );
}
