// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: aplica permisos y transiciones en móvil |
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-11: el último dato muestra el día cuando no es de hoy + T-19 códigos legibles |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-15/T-22: agrupada por área, buscador, problemas primero y formato de Monitoreo |
import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Radio, BellRing, Smartphone, BatteryMedium, SignalHigh } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Buscador } from '../../shared/design-system/Buscador';
import { useBusqueda } from '../../shared/hooks/useBusqueda';
import { formatearNumero } from '../../shared/i18n/formato';
import { nivelSenal } from '../components/DispositivosLista';
import { useMonitoreo } from '../hooks/useMonitoreo';
import { useAccionesAlerta } from '../hooks/useAccionesAlerta';
import { useAlertaDetalle } from '../hooks/useAlertaDetalle';
import { accionesAlerta } from '../lib/accionesAlerta';
import { useAlertas } from '../hooks/useAlertas';
import { EstadoSensorPills } from '../components/EstadoLecturaPill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { EstadoAlertaPill } from '../components/EstadoAlertaPill';
import { CambiarEstadoAlertaModal } from '../components/CambiarEstadoAlertaModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { momentoCaptura, valorConUnidad } from '../lib/sensorEscala';
import { RECURSO_MONITOREO, RECURSO_ALERTAS, ACCION_R } from '../rbac';
import type { AlertaSchema, EstadoSensorSchema, NuevoEstadoAlerta } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

type Tab = 'monitoreo' | 'alertas';

// M3-15: en campo interesa primero lo que está mal.
const GRAVEDAD: Record<string, number> = { ROJO: 0, AMARILLO: 1, GRIS: 2, VERDE: 3 };
const gravedad = (s: EstadoSensorSchema) => GRAVEDAD[(s.estado_semaforo ?? '').toUpperCase()] ?? 2;

interface GrupoArea { nombre: string; sensores: EstadoSensorSchema[]; peor: number }

/** Sensores por área, con las áreas y los sensores con problemas primero. */
export function agruparPorArea(sensores: EstadoSensorSchema[]): GrupoArea[] {
  const grupos = new Map<string, GrupoArea>();
  for (const s of sensores) {
    const nombre = [s.nombre_finca, s.nombre_infraestructura].filter(Boolean).join(' › ') || '—';
    const g = grupos.get(nombre) ?? { nombre, sensores: [], peor: 3 };
    g.sensores.push(s);
    g.peor = Math.min(g.peor, gravedad(s));
    grupos.set(nombre, g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, sensores: g.sensores.slice().sort((a, b) => gravedad(a) - gravedad(b)) }))
    .sort((a, b) => a.peor - b.peor || a.nombre.localeCompare(b.nombre));
}

export function MovilView() {
  const { t } = useT('telemetry');
  const puedeMonitoreo = usePermission(RECURSO_MONITOREO, ACCION_R);
  const puedeAlertas = usePermission(RECURSO_ALERTAS, ACCION_R);
  const permisosAcciones = useAccionesAlerta();
  const online = useOnlineStatus();

  const monitoreo = useMonitoreo();
  const alertas = useAlertas();
  const detalleHook = useAlertaDetalle();
  const [tab, setTab] = useState<Tab>(puedeMonitoreo ? 'monitoreo' : 'alertas');
  const [sel, setSel] = useState<AlertaSchema | null>(null);
  const [accion, setAccion] = useState<NuevoEstadoAlerta | null>(null);
  const { consulta, setConsulta, filtrados } = useBusqueda(
    monitoreo.sensores, (s) => `${s.nombre_sensor} ${s.tipo_variable} ${s.nombre_infraestructura} ${s.nombre_finca}`,
  );
  const grupos = useMemo(() => agruparPorArea(filtrados), [filtrados]);

  useEffect(() => { if (puedeMonitoreo) monitoreo.cargar(); }, [puedeMonitoreo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (puedeAlertas) alertas.cargar({ estado: 'ACTIVA', por_pagina: 50 }); }, [puedeAlertas]); // eslint-disable-line react-hooks/exhaustive-deps

  const idSeleccionada = sel?.id_alerta;
  useEffect(() => {
    if (alertas.saveError?.status === 422 && idSeleccionada != null) {
      void detalleHook.cargar(idSeleccionada, true).then((actual) => { if (actual) setSel(actual); });
    }
  }, [alertas.saveError, idSeleccionada, detalleHook.cargar]);

  const elegirAccion = (a: AlertaSchema, estado: NuevoEstadoAlerta) => {
    if (!online || alertas.saving || !accionesAlerta(a.estado_alerta, permisosAcciones).includes(estado)) return;
    detalleHook.limpiar(); alertas.limpiarSaveError(); setSel(a); setAccion(estado);
  };

  const confirmar = async (dto: Parameters<typeof alertas.cambiarEstado>[1]) => {
    if (!sel || !online || alertas.saving || detalleHook.loading
      || !accionesAlerta(sel.estado_alerta, permisosAcciones).includes(dto.nuevo_estado)) return;
    const ok = await alertas.cambiarEstado(sel.id_alerta, dto);
    if (ok) { setAccion(null); setSel(null); alertas.cargar({ estado: 'ACTIVA', por_pagina: 50 }); }
  };

  if (!puedeMonitoreo && !puedeAlertas) return <PermissionDenied seccion="Vista móvil" />;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'monitoreo', label: 'Monitoreo', icon: <Radio size={16} aria-hidden />, show: puedeMonitoreo },
    { key: 'alertas', label: 'Alertas', icon: <BellRing size={16} aria-hidden />, show: puedeAlertas },
  ];

  return (
    <div style={{ minHeight: '100%', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ padding: 'var(--s5) var(--s5) 0' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Smartphone size={18} aria-hidden />{t('movilview.nombre_de_la_vista')}</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 var(--s4)' }}>{t('movilview.monitoreo_y_alertas')}</p>

        {/* Segmented control */}
        <div role="tablist" style={{ display: 'flex', gap: 'var(--s1)', background: 'var(--surface-hover)', borderRadius: 'var(--r-full)', padding: 3, marginBottom: 'var(--s4)' }}>
          {TABS.filter((item) => item.show).map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s1)',
                border: 'none', borderRadius: 'var(--r-full)', padding: 'var(--s2)', cursor: 'pointer', minHeight: 40,
                background: tab === item.key ? 'var(--surface-card)' : 'transparent',
                color: tab === item.key ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: tab === item.key ? 700 : 600, fontSize: '13px',
                boxShadow: tab === item.key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 var(--s5) var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('movilview.sin_conexion')} description={t('movilview.datos_cacheados_la_gestion_esta')} style={{ marginBottom: 'var(--s3)' }} />}

        {tab === 'monitoreo' && (
          monitoreo.loading ? <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('movilview.cargando')}</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {/* M3-15: antes era una lista plana de cientos de sensores sin buscador. */}
            <Buscador id="campo-buscar" label={t('movilview.buscar')} value={consulta} onChange={setConsulta} resultados={filtrados.length} />
            {grupos.map((g) => (
              <section key={g.nombre} aria-label={g.nombre} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', margin: 'var(--s2) 0 0' }}>
                  {g.nombre} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {t('conteo.sensores', { count: g.sensores.length, n: formatearNumero(g.sensores.length) })}</span>
                </h2>
                {g.sensores.map((s) => {
                  const senal = nivelSenal(s.calidad_senal_rssi);
                  return (
                    <div key={s.id_sensor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s3) var(--s4)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.nombre_sensor}>{s.nombre_sensor}</div>
                        {/* T-22: "85.50%" y "-72.00" sin rótulo; ahora dicen qué son. */}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                          {s.nivel_bateria_pct != null && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <BatteryMedium size={12} aria-hidden />{t('movilview.bateria', { valor: formatearNumero(Number(s.nivel_bateria_pct) / 100, { style: 'percent' }) })}
                            </span>
                          )}
                          {senal && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <SignalHigh size={12} aria-hidden />{t('movilview.senal', { nivel: t(`dispositivoslista.senal_${senal}`) })}
                            </span>
                          )}
                          <span>{momentoCaptura(s.ultimo_timestamp_captura)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {valorConUnidad(s.ultimo_valor, s.ultima_unidad)}
                        </div>
                        <EstadoSensorPills sensor={s} />
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
            {monitoreo.sensores.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('movilview.sin_sensores')}</p>}
          </div>
        )}

        {tab === 'alertas' && (
          alertas.loading ? <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('movilview.cargando')}</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {alertas.alertas.map((a) => (
              <div key={a.id_alerta} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{etiquetaCodigo(a.tipo_alerta)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{etiquetaCodigo(a.tipo_variable)} · {valorConUnidad(a.valor, a.unidad)}</div>
                  </div>
                  <SeveridadBadge severidad={a.severidad} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--s3)', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                  <EstadoAlertaPill estado={a.estado_alerta} />
                  <div style={{ display: 'flex', gap: 'var(--s1)' }}>
                    {accionesAlerta(a.estado_alerta, permisosAcciones).map((estado) => (
                      <Button key={estado} variant={estado === 'DESCARTADA' ? 'danger' : estado === 'RESUELTA' ? 'primary' : 'secondary'} size="sm" disabled={!online || alertas.saving} onClick={() => elegirAccion(a, estado)}>
                        {t(estado === 'DESCARTADA' ? 'movilview.descartar' : estado === 'RESUELTA' ? 'movilview.resolver' : 'movilview.tomar')}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {alertas.alertas.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('movilview.sin_alertas_activas')}</p>}
          </div>
        )}
      </div>

      {accion && sel && (
        <CambiarEstadoAlertaModal alerta={sel} estado={accion} saving={alertas.saving} autorizada={online && !detalleHook.loading && accionesAlerta(sel.estado_alerta, permisosAcciones).includes(accion)} saveError={alertas.saveError} onConfirm={confirmar} onClose={() => { detalleHook.limpiar(); setAccion(null); }} />
      )}
    </div>
  );
}
