// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/M3-08/M3-11: área por nombre, contadores de todo el alcance y estado vacío sin filtros |
// | 2026-10-29 | Arekkazu | TC-DIS-152 RF-58 R1 / G98 CA-11: degradación nivel 2/3 anunciada y panel de alertas activas |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: resumen que filtra, áreas por gravedad y plegables, medidor solo para problemas |
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { RefreshCw, Radio, CheckCircle2, AlertTriangle, AlertOctagon, CircleOff } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useMonitoreo } from '../hooks/useMonitoreo';
import { useAreas } from '../hooks/useAreas';
import { SelectorArea } from '../components/SelectorArea';
import { Paginacion } from '../components/Paginacion';
import { UnidadCard } from '../components/UnidadCard';
import { SensorCard } from '../components/SensorCard';
import { SensorFila } from '../components/SensorFila';
import { KpiCard } from '../components/KpiCard';
import { etiquetaSemaforo } from '../components/SemaforoPill';
import { SensorDetalleModal } from '../components/SensorDetalleModal';
import { PanelAlertasActivas } from '../components/PanelAlertasActivas';
import { PermissionDenied } from '../components/PermissionDenied';
import { horaCaptura } from '../lib/sensorEscala';
import { conProblema, gravedad, porGravedad, semaforo, sinDatos, titularArea } from '../lib/enVivo';
import { RECURSO_MONITOREO, ACCION_R } from '../rbac';
import type { EstadoSensorSchema, DashboardFiltros, EstadoSemaforo } from '../types';

const REFRESH_MS = 30000;
/** RF-58 Restricción 1, Nivel 2: el refresco responde, pero tarda más de 2 s. */
const LATENCIA_RETRASO_MS = 2000;
/** FA-07: el backend devuelve a lo sumo 50 sensores por vista. */
const POR_PAGINA = 50;

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 'var(--s4)',
  marginTop: 'var(--s3)',
};

const LISTA: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginTop: 'var(--s3)' };

export function MonitoreoView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_MONITOREO, ACCION_R);
  const online = useOnlineStatus();
  const { sensores, unidades, total, conteo, panelAlertas, loading, refreshing, error, fromCache, actualizadoEn, cargar } = useMonitoreo();
  const areas = useAreas();

  const [autoRefresh, setAutoRefresh] = useState(true);
  // T-18: el área se elige por nombre; antes era un campo «ID infra».
  const [area, setArea] = useState('');
  const [idArea, setIdArea] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<EstadoSensorSchema | null>(null);
  // Prototipo 13.4: tocar una tarjeta del resumen deja solo los sensores en ese estado.
  const [filtro, setFiltro] = useState<EstadoSemaforo | null>(null);
  // Lo que el usuario abrió o cerró a mano; sin entrada, el área se abre si tiene problemas.
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});

  const filtros = useMemo<DashboardFiltros>(() => {
    const f: DashboardFiltros = { pagina, por_pagina: POR_PAGINA };
    if (idArea != null) f.id_infraestructura = idArea;
    return f;
  }, [idArea, pagina]);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const [latenciaMs, setLatenciaMs] = useState(0);
  const recargar = useCallback(async (silencioso: boolean) => {
    const inicio = Date.now();
    await cargar(filtrosRef.current, silencioso);
    setLatenciaMs(Date.now() - inicio);
  }, [cargar]);

  // Carga inicial + al cambiar filtro de infraestructura.
  useEffect(() => { if (puedeVer) void recargar(false); }, [puedeVer, filtros, recargar]);

  // Polling silencioso (no hay websockets — el "tiempo real" es polling).
  useEffect(() => {
    if (!puedeVer || !autoRefresh || !online) return;
    const id = window.setInterval(() => { void recargar(true); }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [puedeVer, autoRefresh, online, recargar]);

  // RF-58 R1: Nivel 3 sin red o sin respuesta del backend (se ve la caché); Nivel 2 con retraso.
  const nivelDegradacion = !online || fromCache ? 3 : latenciaMs > LATENCIA_RETRASO_MS ? 2 : 0;
  const ultimoDato = t('monitoreoview.ultimo_dato', {
    hora: actualizadoEn ? horaCaptura(new Date(actualizadoEn).toISOString()) : '—',
  });

  // M3-08: decía "50 sensores" (el tamaño de la página) en áreas de 60 y 200. El total
  // y el semáforo vienen del backend para todo el alcance; sin ellos (caché) se cuenta
  // lo que hay en pantalla.
  const kpis = useMemo(() => {
    let verde = 0, amarillo = 0, rojo = 0, gris = 0;
    if (conteo) {
      ({ VERDE: verde = 0, AMARILLO: amarillo = 0, ROJO: rojo = 0, GRIS: gris = 0 } = conteo);
    } else {
      for (const s of sensores) {
        switch ((s.estado_semaforo ?? '').toUpperCase()) {
          case 'VERDE': verde++; break;
          case 'AMARILLO': amarillo++; break;
          case 'ROJO': rojo++; break;
          default: gris++; break;
        }
      }
    }
    return { total: Math.max(total, sensores.length), verde, amarillo, rojo, gris };
  }, [sensores, total, conteo]);
  const totalPaginas = Math.max(1, Math.ceil(kpis.total / POR_PAGINA));

  const sensoresPorUnidad = useMemo(() => {
    const map = new Map<number, EstadoSensorSchema[]>();
    for (const s of sensores) {
      const arr = map.get(s.id_infraestructura) ?? [];
      arr.push(s);
      map.set(s.id_infraestructura, arr);
    }
    return map;
  }, [sensores]);

  // Prototipo 13.4: primero el área en peor estado y, dentro, el peor sensor.
  const grupos = useMemo(() => unidades
    .map((u) => {
      const todos = [...(sensoresPorUnidad.get(u.id_infraestructura) ?? [])].sort(porGravedad);
      return { u, todos, visibles: filtro ? todos.filter((s) => semaforo(s.estado_semaforo) === filtro) : todos };
    })
    .filter((g) => !filtro || g.visibles.length > 0)
    .sort((a, b) => gravedad(a.u.estado_general) - gravedad(b.u.estado_general)), [unidades, sensoresPorUnidad, filtro]);
  const abierta = (id: number, estado: string) =>
    abiertas[id] ?? (filtro != null || grupos.length === 1 || gravedad(estado) < gravedad('GRIS'));

  if (!puedeVer) return <PermissionDenied seccion="Monitoreo en tiempo real" />;

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Header */}
      <div style={{ padding: 'var(--s5) var(--page-pad)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Radio size={20} aria-hidden />{t('monitoreoview.monitoreo_en_tiempo_real')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading
              ? t('monitoreoview.cargando')
              : kpis.total > sensores.length
                ? t('monitoreoview.sensores_de_total', { count: kpis.total, visibles: formatearNumero(sensores.length), n: formatearNumero(kpis.total) })
                : t('conteo.sensores', { count: kpis.total, n: formatearNumero(kpis.total) })}
            {actualizadoEn && ` · actualizado ${horaCaptura(new Date(actualizadoEn).toISOString())}`}
            {refreshing && ' · refrescando…'}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220 }}>
            <SelectorArea
              id="monitoreo-area"
              areas={areas}
              value={area}
              onChange={(texto, id) => { setArea(texto); setIdArea(id); setPagina(1); }}
            />
          </div>
          <Button variant={autoRefresh ? 'secondary' : 'ghost'} size="sm" onClick={() => setAutoRefresh((v) => !v)} title={t('monitoreoview.auto_refresco_cada_30_s')}>
            <RefreshCw size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { void recargar(false); }} aria-label={t('monitoreoview.refrescar_ahora')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {/* role="alert" del Alert: el cambio de nivel se anuncia sin mover el foco (4.1.3). */}
        {nivelDegradacion === 3 && (
          <Alert variant="warning" title={t('monitoreoview.trabajando_sin_conexion')} description={`${ultimoDato} ${t('monitoreoview.datos_desde_cache_detalle')}`} style={{ marginBottom: 'var(--s4)' }} />
        )}
        {nivelDegradacion === 2 && (
          <Alert variant="info" title={t('monitoreoview.actualizacion_con_retraso')} description={ultimoDato} style={{ marginBottom: 'var(--s4)' }} />
        )}
        {error && !fromCache && (
          <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('monitoreoview.sin_acceso_al_monitoreo') : t('monitoreoview.error_al_cargar_el_dashboard')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
        )}

        {/* M3-08: los totales son de todo el alcance. Prototipo 13.4: cada tarjeta filtra. */}
        <div role="group" aria-label={t('monitoreoview.resumen_filtra')} style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Radio size={18} aria-hidden />} valor={kpis.total} etiqueta="Sensores" color="var(--brand-500)" onClick={() => setFiltro(null)} activo={filtro === null} />
          <KpiCard icon={<AlertOctagon size={18} aria-hidden />} valor={kpis.rojo} etiqueta="Fuera de rango" color="var(--sem-error)" onClick={() => setFiltro((f) => (f === 'ROJO' ? null : 'ROJO'))} activo={filtro === 'ROJO'} />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={kpis.amarillo} etiqueta="Cerca del límite" color="var(--sem-warning)" onClick={() => setFiltro((f) => (f === 'AMARILLO' ? null : 'AMARILLO'))} activo={filtro === 'AMARILLO'} />
          <KpiCard icon={<CircleOff size={18} aria-hidden />} valor={kpis.gris} etiqueta="Sin datos" color="var(--text-muted)" onClick={() => setFiltro((f) => (f === 'GRIS' ? null : 'GRIS'))} activo={filtro === 'GRIS'} />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={kpis.verde} etiqueta="Normales" color="var(--sem-success)" onClick={() => setFiltro((f) => (f === 'VERDE' ? null : 'VERDE'))} activo={filtro === 'VERDE'} />
        </div>

        {panelAlertas && <PanelAlertasActivas panel={panelAlertas} />}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 220, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : sensores.length === 0 && !error ? (
          // M3-11: sin filtro no hay "filtros actuales" que culpar.
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {idArea != null ? t('monitoreoview.no_hay_sensores_para_mostrar_con_los') : t('monitoreoview.sin_sensores_en_tus_fincas')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            {filtro && grupos.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('monitoreoview.ninguno_con_filtro', { estado: etiquetaSemaforo(filtro) })}</p>
            )}
            {grupos.map(({ u, todos, visibles }) => {
              const id = u.id_infraestructura;
              const abre = abierta(id, u.estado_general);
              const vacios = visibles.filter(sinDatos);
              const problemas = visibles.filter((s) => !sinDatos(s) && conProblema(s));
              const normales = visibles.filter((s) => !sinDatos(s) && !conProblema(s));
              return (
                <section key={id}>
                  <UnidadCard
                    unidad={u}
                    titular={titularArea(todos)}
                    abierta={abre}
                    onAlternar={() => setAbiertas((m) => ({ ...m, [id]: !abre }))}
                    idContenido={`area-${id}`}
                  />
                  <div id={`area-${id}`} hidden={!abre}>
                    {problemas.length > 0 && (
                      <div style={GRID}>{problemas.map((s) => <SensorCard key={s.id_sensor} sensor={s} onAbrir={setSeleccionado} />)}</div>
                    )}
                    {normales.length > 0 && (
                      <div style={LISTA}>{normales.map((s) => <SensorFila key={s.id_sensor} sensor={s} onAbrir={setSeleccionado} />)}</div>
                    )}
                    {/* Prototipo 13.4: los que no reportan se agrupan; abiertos si son todo lo que hay. */}
                    {vacios.length > 0 && (
                      <details open={vacios.length === visibles.length} style={{ marginTop: 'var(--s3)' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {t('monitoreoview.sensores_sin_datos', { count: vacios.length, n: formatearNumero(vacios.length) })}
                        </summary>
                        <div style={LISTA}>{vacios.map((s) => <SensorFila key={s.id_sensor} sensor={s} onAbrir={setSeleccionado} />)}</div>
                      </details>
                    )}
                  </div>
                </section>
              );
            })}
            {totalPaginas > 1 && (
              <Paginacion pagina={pagina} totalPaginas={totalPaginas} totalRegistros={kpis.total} onCambiar={setPagina} />
            )}
          </div>
        )}
      </div>

      {seleccionado && <SensorDetalleModal sensor={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  );
}
