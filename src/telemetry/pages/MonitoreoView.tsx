// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/M3-08/M3-11: área por nombre, contadores de todo el alcance y estado vacío sin filtros |
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SensorDetalleModal } from '../components/SensorDetalleModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { horaCaptura } from '../lib/sensorEscala';
import { RECURSO_MONITOREO, ACCION_R } from '../rbac';
import type { EstadoSensorSchema, DashboardFiltros } from '../types';

const REFRESH_MS = 30000;
/** FA-07: el backend devuelve a lo sumo 50 sensores por vista. */
const POR_PAGINA = 50;

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 'var(--s4)',
  marginTop: 'var(--s3)',
};

function Kpi({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 120, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

export function MonitoreoView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_MONITOREO, ACCION_R);
  const online = useOnlineStatus();
  const { sensores, unidades, total, conteo, loading, refreshing, error, fromCache, actualizadoEn, cargar } = useMonitoreo();
  const areas = useAreas();

  const [autoRefresh, setAutoRefresh] = useState(true);
  // T-18: el área se elige por nombre; antes era un campo «ID infra».
  const [area, setArea] = useState('');
  const [idArea, setIdArea] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<EstadoSensorSchema | null>(null);

  const filtros = useMemo<DashboardFiltros>(() => {
    const f: DashboardFiltros = { pagina, por_pagina: POR_PAGINA };
    if (idArea != null) f.id_infraestructura = idArea;
    return f;
  }, [idArea, pagina]);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  // Carga inicial + al cambiar filtro de infraestructura.
  useEffect(() => { if (puedeVer) cargar(filtros); }, [puedeVer, filtros, cargar]);

  // Polling silencioso (no hay websockets — el "tiempo real" es polling).
  useEffect(() => {
    if (!puedeVer || !autoRefresh || !online) return;
    const id = window.setInterval(() => cargar(filtrosRef.current, true), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [puedeVer, autoRefresh, online, cargar]);

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
          <Button variant="ghost" size="sm" onClick={() => cargar(filtros)} aria-label={t('monitoreoview.refrescar_ahora')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {!online && (
          <Alert variant="warning" title={t('monitoreoview.sin_conexion')} description={t('monitoreoview.mostrando_el_ultimo_dashboard_cacheado_el')} style={{ marginBottom: 'var(--s4)' }} />
        )}
        {fromCache && online && (
          <Alert variant="info" title={t('monitoreoview.datos_desde_cache')} description="No se pudo actualizar el dashboard; se muestran los últimos datos disponibles." style={{ marginBottom: 'var(--s4)' }} />
        )}
        {error && !fromCache && (
          <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('monitoreoview.sin_acceso_al_monitoreo') : t('monitoreoview.error_al_cargar_el_dashboard')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
        )}

        {/* KPIs globales */}
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<Radio size={18} aria-hidden />} valor={kpis.total} etiqueta="Sensores" color="var(--brand-500)" />
          <Kpi icon={<CheckCircle2 size={18} aria-hidden />} valor={kpis.verde} etiqueta="Normales" color="var(--sem-success)" />
          <Kpi icon={<AlertTriangle size={18} aria-hidden />} valor={kpis.amarillo} etiqueta="En advertencia" color="var(--sem-warning)" />
          <Kpi icon={<AlertOctagon size={18} aria-hidden />} valor={kpis.rojo} etiqueta="Fuera de rango" color="var(--sem-error)" />
          <Kpi icon={<CircleOff size={18} aria-hidden />} valor={kpis.gris} etiqueta="Sin señal" color="var(--text-muted)" />
        </div>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
            {unidades.map((u) => {
              const grupo = sensoresPorUnidad.get(u.id_infraestructura) ?? [];
              return (
                <section key={u.id_infraestructura}>
                  <UnidadCard unidad={u} />
                  <div style={GRID}>
                    {grupo.map((s) => <SensorCard key={s.id_sensor} sensor={s} onAbrir={setSeleccionado} />)}
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
