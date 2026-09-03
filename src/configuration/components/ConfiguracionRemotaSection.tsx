import React, { useEffect, useState } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Settings2, ChevronLeft, RefreshCw, Send } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useConfiguracionRemota } from '../hooks/useConfiguracionRemota';
import type { DispositivoIotResponse, ConfiguracionRemotaResponse } from '../types';

// ── Styles ────────────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
  fontSize: '13px',
};

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return formatearFechaHora(iso, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function EstadoCfgBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    APLICADA:  { bg: 'var(--sem-success-bg)', color: 'var(--sem-success)', border: 'var(--sem-success-border)', label: 'APLICADA' },
    PENDIENTE: { bg: 'var(--sem-warning-bg, #fffbe6)', color: 'var(--sem-warning, #b45309)', border: 'var(--sem-warning-border, #fde68a)', label: 'PENDIENTE' },
    NO_CONF:   { bg: 'var(--sem-error-bg)', color: 'var(--sem-error)', border: 'var(--sem-error-border)', label: 'NO CONF.' },
  };
  const s = map[estado?.toUpperCase()] ?? map['PENDIENTE'];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
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
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s7) 0' }}>{t('configuracionremotasection.no_hay_dispositivos_activos_registralos_en')}</p>;
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
            <span style={{ fontSize: 20 }}>📡</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)' }}>{d.serial}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--sem-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--s1)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)', display: 'inline-block' }} />{t('configuracionremotasection.activo')}</div>
        </button>
      ))}
    </div>
  );
}

// ── History table ─────────────────────────────────────────────────────────────

function Historial({ historial, loading }: { historial: ConfiguracionRemotaResponse[]; loading: boolean }) {
  const { t } = useT('configuration');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginTop: 'var(--s4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (historial.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: 'var(--s5) 0' }}>{t('configuracionremotasection.sin_historial_de_configuraciones')}</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-hover)' }}>
            {['Fecha/Hora', 'Frec. captura', 'Interv. transmisión', 'Estado cfg.', 'Mensaje'].map((h) => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {historial.map((c) => (
            <tr key={c.id_configuracion_remota} style={{ background: 'var(--surface-card)' }}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatTs(c.fecha_creacion)}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{c.frecuencia_captura} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>min</span></td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{c.intervalo_transmision} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>min</span></td>
              <td style={TD}><EstadoCfgBadge estado={c.estado} /></td>
              <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '12px', maxWidth: 200 }}>{c.mensaje ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Config form ───────────────────────────────────────────────────────────────

interface FormValues { frecuencia_captura: number; intervalo_transmision: number; }

function ConfigForm({ dispositivo, onBack, encolada, saving, saveError, ultima, historial, loadingHist, onSubmit, onReload }: {
  dispositivo: DispositivoIotResponse;
  onBack: () => void;
  encolada: boolean;
  saving: boolean;
  saveError: { message: string } | null;
  ultima: ConfiguracionRemotaResponse | null;
  historial: ConfiguracionRemotaResponse[];
  loadingHist: boolean;
  onSubmit: (dto: { frecuencia_captura: number; intervalo_transmision: number }) => void;
  onReload: () => void;
}) {
  const { t } = useT('configuration');
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      frecuencia_captura: ultima?.frecuencia_captura ?? 5,
      intervalo_transmision: ultima?.intervalo_transmision ?? 15,
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Button variant="ghost" size="sm" onClick={onBack} aria-label={t('configuracionremotasection.cambiar_dispositivo')}>
            <ChevronLeft size={16} aria-hidden />{t('configuracionremotasection.cambiar_dispositivo')}</Button>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReload} aria-label={t('configuracionremotasection.recargar_historial')}>
          <RefreshCw size={14} aria-hidden />
        </Button>
      </div>

      {encolada && (
        <Alert
          variant="info"
          title={t('configuracionremotasection.configuracion_encolada')}
          description={t('configuracionremotasection.el_dispositivo_no_esta_disponible_en_este')}
          style={{ marginBottom: 'var(--s5)' }}
        />
      )}
      {saveError && (
        <Alert variant="error" title={t('configuracionremotasection.error_al_configurar')} description={saveError.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      {/* Current stats */}
      {ultima && (
        <div style={{ display: 'flex', gap: 'var(--s4)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
          {[
            { label: 'Frec. captura actual', value: `${ultima.frecuencia_captura} min` },
            { label: 'Interv. transmisión actual', value: `${ultima.intervalo_transmision} min` },
            { label: 'Estado', value: ultima.estado },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, minWidth: 120, background: 'var(--surface-hover)', borderRadius: 'var(--r-lg)', padding: 'var(--s3) var(--s4)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{item.label}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', marginBottom: 'var(--s6)' }}>
        <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: '1px solid var(--surface-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('configuracionremotasection.programar_configuracion_del_dispositivo')}</span>
        </div>
        <div style={{ padding: 'var(--s5)' }}>
          <form onSubmit={handleSubmit((d) => onSubmit({ frecuencia_captura: Number(d.frecuencia_captura), intervalo_transmision: Number(d.intervalo_transmision) }))} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s5)', marginBottom: 'var(--s5)' }}>
              {/* Frecuencia captura */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('configuracionremotasection.frecuencia_de_captura')}<span aria-hidden="true" style={{ color: 'var(--sem-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="5"
                    aria-required="true"
                    style={{
                      width: '100%', padding: 'var(--s3)', paddingRight: 44,
                      borderRadius: 'var(--r-md)', border: `1.5px solid ${errors.frecuencia_captura ? 'var(--sem-error)' : 'var(--surface-border)'}`,
                      background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                    }}
                    {...register('frecuencia_captura', {
                      required: 'Obligatorio.',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Mínimo 1 minuto.' },
                    })}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>min</span>
                </div>
                {errors.frecuencia_captura && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)', margin: 0 }}>{errors.frecuencia_captura.message}</p>}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('configuracionremotasection.cada_cuantos_minutos_el_dispositivo_captura')}</p>
              </div>

              {/* Intervalo transmision */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('configuracionremotasection.intervalo_de_transmision')}<span aria-hidden="true" style={{ color: 'var(--sem-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="15"
                    aria-required="true"
                    style={{
                      width: '100%', padding: 'var(--s3)', paddingRight: 44,
                      borderRadius: 'var(--r-md)', border: `1.5px solid ${errors.intervalo_transmision ? 'var(--sem-error)' : 'var(--surface-border)'}`,
                      background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                    }}
                    {...register('intervalo_transmision', {
                      required: 'Obligatorio.',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Mínimo 1 minuto.' },
                      validate: (v) =>
                        v >= getValues('frecuencia_captura') ||
                        'Debe ser mayor o igual a la frecuencia de captura.',
                    })}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>min</span>
                </div>
                {errors.intervalo_transmision && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)', margin: 0 }}>{errors.intervalo_transmision.message}</p>}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('configuracionremotasection.cada_cuantos_minutos_transmite_datos_al')}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" size="md" loading={saving}>
                <Send size={14} aria-hidden style={{ marginRight: 'var(--s2)' }} />{t('configuracionremotasection.enviar_configuracion')}</Button>
            </div>
          </form>
        </div>
      </div>

      {/* History */}
      <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-hover)', padding: 'var(--s3) var(--s5)', borderBottom: '1px solid var(--surface-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historial de configuraciones · {dispositivo.serial}
          </span>
        </div>
        <Historial historial={historial} loading={loadingHist} />
      </div>
    </div>
  );
}

// ── ConfiguracionRemotaSection ────────────────────────────────────────────────

export function ConfiguracionRemotaSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeConfigurar = usePermission(11, 3);

  const { dispositivos, loading: loadingDisp, cargar: cargarDisp } = useDispositivosIot();
  const { historial, ultima, loading: loadingHist, saving, saveError, encolada, cargar, configurar } = useConfiguracionRemota();

  const [dispositivo, setDispositivo] = useState<DispositivoIotResponse | null>(null);

  useEffect(() => { cargarDisp(); }, [cargarDisp]);

  const handleSelect = (d: DispositivoIotResponse) => {
    setDispositivo(d);
    cargar(d.id_dispositivo_iot);
  };

  const handleBack = () => setDispositivo(null);

  const handleSubmit = async (dto: { frecuencia_captura: number; intervalo_transmision: number }) => {
    if (!dispositivo) return;
    const ok = await configurar(dispositivo.id_dispositivo_iot, dto);
    if (ok) cargar(dispositivo.id_dispositivo_iot);
  };

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <Settings2 size={18} color="var(--brand-500)" aria-hidden />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('configuracionremotasection.configuracion_remota_iot')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('configuracionremotasection.frecuencia_de_captura_e_intervalo_de')}</p>
        </div>
      </div>

      {!online && <Alert variant="warning" title={t('configuracionremotasection.sin_conexion')} description={t('configuracionremotasection.la_configuracion_remota_requiere_conexion')} style={{ marginBottom: 'var(--s4)' }} />}
      {!puedeConfigurar && <Alert variant="warning" title={t('configuracionremotasection.sin_permiso')} description={t('configuracionremotasection.no_tienes_permiso_para_configurar')} style={{ marginBottom: 'var(--s4)' }} />}

      {puedeConfigurar && (
        !dispositivo ? (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('configuracionremotasection.selecciona_el_dispositivo_a_configurar')}</p>
            <DispSelector dispositivos={dispositivos} loading={loadingDisp} onSelect={handleSelect} />
          </>
        ) : (
          <ConfigForm
            dispositivo={dispositivo}
            onBack={handleBack}
            encolada={encolada}
            saving={saving}
            saveError={saveError}
            ultima={ultima}
            historial={historial}
            loadingHist={loadingHist}
            onSubmit={handleSubmit}
            onReload={() => cargar(dispositivo.id_dispositivo_iot)}
          />
        )
      )}
    </div>
  );
}
