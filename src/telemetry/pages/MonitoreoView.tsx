import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Radio, CheckCircle2, AlertTriangle, AlertOctagon, CircleOff, Filter } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useMonitoreo } from '../hooks/useMonitoreo';
import { UnidadCard } from '../components/UnidadCard';
import { SensorCard } from '../components/SensorCard';
import { SensorDetalleModal } from '../components/SensorDetalleModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { horaCaptura } from '../lib/sensorEscala';
import { RECURSO_MONITOREO, ACCION_R } from '../rbac';
import type { EstadoSensorSchema, DashboardFiltros } from '../types';

const REFRESH_MS = 30000;

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
  const puedeVer = usePermission(RECURSO_MONITOREO, ACCION_R);
  const online = useOnlineStatus();
  const { sensores, unidades, loading, refreshing, error, fromCache, actualizadoEn, cargar } = useMonitoreo();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filtroInfra, setFiltroInfra] = useState('');
  const [seleccionado, setSeleccionado] = useState<EstadoSensorSchema | null>(null);

  const filtros = useMemo<DashboardFiltros>(() => {
    const f: DashboardFiltros = {};
    if (filtroInfra.trim()) f.id_infraestructura = Number(filtroInfra.trim());
    return f;
  }, [filtroInfra]);

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

  const kpis = useMemo(() => {
    let verde = 0, amarillo = 0, rojo = 0, gris = 0;
    for (const s of sensores) {
      switch ((s.estado_semaforo ?? '').toUpperCase()) {
        case 'VERDE': verde++; break;
        case 'AMARILLO': amarillo++; break;
        case 'ROJO': rojo++; break;
        default: gris++; break;
      }
    }
    return { total: sensores.length, verde, amarillo, rojo, gris };
  }, [sensores]);

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
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Radio size={20} aria-hidden />
            Monitoreo en Tiempo Real
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${kpis.total} sensor(es)`}
            {actualizadoEn && ` · actualizado ${horaCaptura(new Date(actualizadoEn).toISOString())}`}
            {refreshing && ' · refrescando…'}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: '2px var(--s2)' }}>
            <Filter size={13} aria-hidden style={{ color: 'var(--text-muted)' }} />
            <input
              aria-label="Filtrar por ID de infraestructura"
              placeholder="ID infra."
              type="number"
              value={filtroInfra}
              onChange={(e) => setFiltroInfra(e.target.value)}
              style={{ width: 78, border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </span>
          <Button variant={autoRefresh ? 'secondary' : 'ghost'} size="sm" onClick={() => setAutoRefresh((v) => !v)} title="Auto-refresco cada 30 s">
            <RefreshCw size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => cargar(filtros)} aria-label="Refrescar ahora">
            <RefreshCw size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && (
          <Alert variant="warning" title="Sin conexión" description="Mostrando el último dashboard cacheado. El auto-refresco está pausado." style={{ marginBottom: 'var(--s4)' }} />
        )}
        {fromCache && online && (
          <Alert variant="info" title="Datos desde caché" description="No se pudo actualizar el dashboard; se muestran los últimos datos disponibles." style={{ marginBottom: 'var(--s4)' }} />
        )}
        {error && !fromCache && (
          <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso al monitoreo' : 'Error al cargar el dashboard'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
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
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay sensores para mostrar con los filtros actuales.</p>
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
          </div>
        )}
      </div>

      {seleccionado && <SensorDetalleModal sensor={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  );
}
