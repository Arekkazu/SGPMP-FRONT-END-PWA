import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Download, ListChecks, AlertOctagon, Layers } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useAuditoria } from '../hooks/useAuditoria';
import { AuditoriaFiltros, AUDITORIA_FILTROS_VACIO, type AuditoriaFiltrosState } from '../components/AuditoriaFiltros';
import { AuditoriaTable } from '../components/AuditoriaTable';
import { EventoAuditoriaModal } from '../components/EventoAuditoriaModal';
import { ExportarAuditoriaModal } from '../components/ExportarAuditoriaModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_AUDITORIA, ACCION_R, ACCION_E } from '../rbac';
import type { ListarAuditoriaFiltros, EventoAuditoriaM04Response } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

type TabId = 'todos' | 'criticos' | 'tipo';

function Kpi({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number | null; etiqueta: string; color: string }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor ?? '—'}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

export function AuditoriaView() {
  const puedeVer = usePermission(RECURSO_AUDITORIA, ACCION_R);
  const puedeExportar = usePermission(RECURSO_AUDITORIA, ACCION_E);
  const online = useOnlineStatus();

  const { eventos, paginacion, loading, exporting, error, fromCache, resumen, cargar, cargarResumen, detalle, exportar } = useAuditoria();

  const [filtros, setFiltros] = useState<AuditoriaFiltrosState>(AUDITORIA_FILTROS_VACIO);
  const [tab, setTab] = useState<TabId>('todos');
  const [sel, setSel] = useState<EventoAuditoriaM04Response | null>(null);
  const [selLoading, setSelLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const build = useCallback((f: AuditoriaFiltrosState, pagina = 1): ListarAuditoriaFiltros => {
    const api: ListarAuditoriaFiltros = { pagina, por_pagina: 50 };
    if (f.tipo_evento) api.tipo_evento = f.tipo_evento;
    if (f.severidad) api.severidad_evento = f.severidad;
    if (f.id_referencia.trim()) api.id_referencia = f.id_referencia.trim();
    if (f.fecha_desde) api.fecha_desde = inicioDelDiaUtc(f.fecha_desde);
    if (f.fecha_hasta) api.fecha_hasta = finDelDiaUtc(f.fecha_hasta);
    return api;
  }, []);

  useEffect(() => {
    if (puedeVer) { cargar({ pagina: 1, por_pagina: 50 }); cargarResumen(); }
  }, [puedeVer, cargar, cargarResumen]);

  const aplicar = () => { cargar(build(filtros, 1)); cargarResumen(build(filtros)); };
  const limpiar = () => { setFiltros(AUDITORIA_FILTROS_VACIO); cargar({ pagina: 1, por_pagina: 50 }); cargarResumen(); };

  const abrirDetalle = async (e: EventoAuditoriaM04Response) => {
    setSel(e);
    setSelLoading(true);
    const full = await detalle(e.id_evento);
    if (full) setSel(full);
    setSelLoading(false);
  };

  const visibles = useMemo(() => {
    if (tab === 'criticos') return eventos.filter((e) => e.severidad_evento === 'ERROR' || e.severidad_evento === 'CRITICAL');
    return eventos;
  }, [eventos, tab]);

  const correlacionados = useMemo(() => {
    if (!sel?.correlacion_id) return [];
    return eventos
      .filter((e) => e.correlacion_id === sel.correlacion_id)
      .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento));
  }, [eventos, sel]);

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    eventos.forEach((e) => map.set(e.tipo_evento, (map.get(e.tipo_evento) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [eventos]);

  const criticosCount = (resumen?.errores ?? 0) + (resumen?.criticos ?? 0);

  if (!puedeVer) return <PermissionDenied seccion="Bitácora de auditoría" />;

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'todos', label: 'Todos los eventos' },
    { id: 'criticos', label: 'Eventos críticos', badge: criticosCount },
    { id: 'tipo', label: 'Por tipo de evento' },
  ];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <ClipboardList size={20} aria-hidden />
            Bitácora de Auditoría
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            Registro inmutable de eventos del módulo de predicción
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={aplicar} aria-label="Recargar">
            <RefreshCw size={15} aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" disabled={!puedeExportar || !online} onClick={() => setExportOpen(true)}>
            <Download size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Exportar
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title="Sin conexión" description="Mostrando bitácora cacheada." style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title="Datos desde caché" description="No se pudo conectar; se muestran los últimos eventos disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Solo el administrador puede consultar la auditoría' : 'Error al cargar la bitácora'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<ListChecks size={18} aria-hidden />} valor={resumen?.total ?? null} etiqueta="Eventos totales" color="var(--brand-500)" />
          <Kpi icon={<AlertOctagon size={18} aria-hidden />} valor={resumen?.warnings ?? null} etiqueta="Warnings" color="var(--sem-warning)" />
          <Kpi icon={<AlertOctagon size={18} aria-hidden />} valor={resumen?.errores ?? null} etiqueta="Errores" color="var(--sem-error)" />
          <Kpi icon={<AlertOctagon size={18} aria-hidden />} valor={resumen?.criticos ?? null} etiqueta="Críticos" color="var(--sem-error)" />
        </div>

        <AuditoriaFiltros value={filtros} onChange={setFiltros} onAplicar={aplicar} onLimpiar={limpiar} />

        {/* Tabs */}
        <div role="tablist" aria-label="Vista de eventos" style={{ display: 'flex', gap: 'var(--s2)', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s5)' }}>
          {TABS.map((item) => {
            const activo = item.id === tab;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={activo}
                onClick={() => setTab(item.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)',
                  border: 'none', borderBottom: `2px solid ${activo ? 'var(--brand-500)' : 'transparent'}`,
                  background: 'transparent', color: activo ? 'var(--brand-600)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: activo ? 700 : 600, cursor: 'pointer',
                }}
              >
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '0 var(--s2)', borderRadius: 'var(--r-full)', background: 'var(--sem-error-bg)', color: 'var(--sem-error)' }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'tipo' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {porTipo.length === 0 && <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)' }}>Sin eventos en esta página.</div>}
            {porTipo.map(([tipo, count]) => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s3) var(--s4)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Layers size={15} aria-hidden style={{ color: 'var(--text-muted)' }} /> {tipo}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <AuditoriaTable eventos={visibles} loading={loading} onVer={abrirDetalle} />
            {tab === 'todos' && (
              <Paginacion
                pagina={paginacion.pagina}
                totalPaginas={paginacion.totalPaginas}
                totalRegistros={paginacion.totalRegistros}
                onCambiar={(p) => cargar(build(filtros, p))}
              />
            )}
          </>
        )}
      </div>

      {sel && (
        <EventoAuditoriaModal evento={sel} loading={selLoading} correlacionados={correlacionados} onClose={() => setSel(null)} />
      )}

      {exportOpen && (
        <ExportarAuditoriaModal
          exporting={exporting}
          onExportar={async (formato) => { const ok = await exportar({ ...build(filtros), formato }); if (ok) setExportOpen(false); }}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
