// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: comparte permisos y recupera transiciones rechazadas |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 4.1.3 RF-57: contadores de alertas en región aria-live |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-19: filtros de alertas por área, activo y tipo con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-150 RF-57 a11y 4.1.3/2.4.3: refresco cada 60 s, anuncios y foco de regreso |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo RF-57: las tarjetas del resumen filtran por estado |
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { BellRing, Clock, TimerOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Anunciador } from '../../shared/design-system/Anunciador';
import { Button } from '../../shared/design-system/Button';
import { useAccionesAlerta } from '../hooks/useAccionesAlerta';
import { accionesAlerta } from '../lib/accionesAlerta';
import { useAlertas } from '../hooks/useAlertas';
import { useAlertaDetalle } from '../hooks/useAlertaDetalle';
import { AlertasFiltros, ALERTAS_FILTROS_VACIO, type AlertasFiltrosState } from '../components/AlertasFiltros';
import { AlertasTable } from '../components/AlertasTable';
import { useAreas } from '../hooks/useAreas';
import { useActivos } from '../hooks/useActivos';
import { AlertaDetalleModal } from '../components/AlertaDetalleModal';
import { etiquetaEstadoAlerta } from '../components/EstadoAlertaPill';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { CambiarEstadoAlertaModal } from '../components/CambiarEstadoAlertaModal';
import { Paginacion } from '../components/Paginacion';
import { KpiCard } from '../components/KpiCard';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_ALERTAS, ACCION_R } from '../rbac';
import type { AlertaSchema, ListarAlertasFiltros, NuevoEstadoAlerta } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

/** Mismo ciclo que la bandeja de notificaciones: el panel se refresca solo (RF-57 tiempo real). */
const REFRESCO_MS = 60_000;

export function AlertasView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_ALERTAS, ACCION_R);
  const permisosAcciones = useAccionesAlerta();
  const { puedeGestionar, puedeDescartar } = permisosAcciones;
  const online = useOnlineStatus();

  const { alertas, paginacion, loading, saving, error, saveError, fromCache, resumen, cargar, cargarResumen, cambiarEstado, limpiarSaveError } = useAlertas();
  const detalleHook = useAlertaDetalle();

  const [filtrosActuales, setFiltros] = useState<AlertasFiltrosState>(ALERTAS_FILTROS_VACIO);
  const areas = useAreas();
  const activos = useActivos();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [accion, setAccion] = useState<NuevoEstadoAlerta | null>(null);
  // a11y 4.1.3 (TC-DIS-150): alerta crítica nueva (assertive) y cambios de estado (polite).
  const [anuncioCritico, setAnuncioCritico] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const alertasRef = useRef<AlertaSchema[]>([]);
  alertasRef.current = alertas;
  // 2.4.3: el foco vuelve a la fila que abrió el detalle, no a <body>.
  const origenFoco = useRef<HTMLElement | null>(null);

  const build = useCallback(
    (pagina: number, filtros: AlertasFiltrosState = filtrosActuales): ListarAlertasFiltros => {
      const f: ListarAlertasFiltros = { pagina, por_pagina: 50 };
      if (filtros.estado) f.estado = filtros.estado;
      if (filtros.severidad) f.severidad = filtros.severidad;
      if (filtros.origen_evento) f.origen_evento = filtros.origen_evento;
      if (filtros.tipo_alerta) f.tipo_alerta = filtros.tipo_alerta.trim();
      if (filtros.id_infraestructura) f.id_infraestructura = Number(filtros.id_infraestructura);
      if (filtros.id_activo_biologico) f.id_activo_biologico = Number(filtros.id_activo_biologico);
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtrosActuales]
  );

  // Prototipo M03: tocar "Activas" deja solo las activas; tocarla otra vez quita el filtro.
  const filtrarEstado = (estado: string) => {
    const nuevos = { ...filtrosActuales, estado: filtrosActuales.estado === estado ? '' : estado };
    setFiltros(nuevos);
    cargar(build(1, nuevos));
  };

  useEffect(() => { if (puedeVer) { cargar({ pagina: 1, por_pagina: 50 }); cargarResumen(); } }, [puedeVer, cargar, cargarResumen]);

  const refrescar = useCallback(async () => {
    const antes = new Map(alertasRef.current.map((a) => [a.id_alerta, a.estado_alerta]));
    const ahora = await cargar(build(paginacion.pagina), true);
    cargarResumen();
    if (!ahora) return;
    const criticas = ahora.filter((a) => !antes.has(a.id_alerta) && a.severidad === 'CRITICO' && a.estado_alerta === 'ACTIVA');
    if (criticas.length) {
      setAnuncioCritico(criticas.map((a) => t('alertasview.anuncio_critica', {
        tipo: etiquetaCodigo(a.tipo_alerta), valor: a.valor != null ? ` (${a.valor} ${a.unidad ?? ''})`.trimEnd() : '',
      })).join('. '));
    }
    const cambios = ahora.filter((a) => antes.has(a.id_alerta) && antes.get(a.id_alerta) !== a.estado_alerta);
    if (cambios.length) {
      setAnuncio(cambios.map((a) => t('alertasview.anuncio_estado', { id: a.id_alerta, estado: etiquetaEstadoAlerta(a.estado_alerta) })).join('. '));
    }
  }, [cargar, build, paginacion.pagina, cargarResumen, t]);

  useEffect(() => {
    if (!puedeVer || !online) return undefined;
    const id = window.setInterval(() => { void refrescar(); }, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [puedeVer, online, refrescar]);

  const abrir = (id: number) => {
    origenFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(id); detalleHook.cargar(id);
  };
  const cerrarDetalle = () => {
    setSelectedId(null); detalleHook.limpiar();
    // Tras cerrar el diálogo (y re-renderizar), el foco vuelve a la fila.
    window.setTimeout(() => { if (origenFoco.current?.isConnected) origenFoco.current.focus(); }, 0);
  };

  useEffect(() => {
    if (saveError?.status === 422 && selectedId != null) void detalleHook.cargar(selectedId, true);
  }, [saveError, selectedId, detalleHook.cargar]);

  const elegirAccion = (estado: NuevoEstadoAlerta) => {
    if (!online || saving || !detalleHook.detalle || !accionesAlerta(detalleHook.detalle.estado_alerta, permisosAcciones).includes(estado)) return;
    limpiarSaveError(); setAccion(estado);
  };

  const confirmarCambio = async (dto: Parameters<typeof cambiarEstado>[1]) => {
    if (selectedId == null || saving || !online || detalleHook.loading || !detalleHook.detalle
      || !accionesAlerta(detalleHook.detalle.estado_alerta, permisosAcciones).includes(dto.nuevo_estado)) return;
    const ok = await cambiarEstado(selectedId, dto);
    if (ok) {
      setAccion(null);
      cerrarDetalle();
      setAnuncio(t('alertasview.anuncio_estado', { id: selectedId, estado: etiquetaEstadoAlerta(dto.nuevo_estado) }));
      // Silenciosa: las filas no se desmontan y el foco puede volver a la suya.
      cargar(build(paginacion.pagina), true);
      cargarResumen();
    }
  };

  if (!puedeVer) return <PermissionDenied seccion="Alertas" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <BellRing size={20} aria-hidden />{t('alertasview.alertas_ambientales_y_sanitarias')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : t('conteo.alertas', { count: paginacion.totalRegistros, n: formatearNumero(paginacion.totalRegistros) })}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { cargar(build(paginacion.pagina)); cargarResumen(); }} aria-label={t('alertasview.recargar')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {!online && <Alert variant="warning" title={t('alertasview.sin_conexion')} description={t('alertasview.mostrando_alertas_cacheadas_la_gestion_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('alertasview.datos_desde_cache')} description="No se pudo conectar; se muestran las últimas alertas disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('alertasview.sin_acceso_a_las_alertas') : t('alertasview.error_al_cargar_alertas')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <Anunciador mensaje={anuncioCritico} urgente />
        <Anunciador mensaje={anuncio} />
        {/* a11y 4.1.3 (TC-DIS-150): los contadores se anuncian al cambiar, así una alerta nueva no pasa inadvertida. */}
        <div aria-live="polite" style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<BellRing size={18} aria-hidden />} valor={resumen?.activas ?? '—'} etiqueta="Activas ahora" color="var(--sem-error)" onClick={() => filtrarEstado('ACTIVA')} activo={filtrosActuales.estado === 'ACTIVA'} />
          <KpiCard icon={<Clock size={18} aria-hidden />} valor={resumen?.enAtencion ?? '—'} etiqueta="En atención" color="var(--sem-warning)" onClick={() => filtrarEstado('EN_ATENCION')} activo={filtrosActuales.estado === 'EN_ATENCION'} />
          <KpiCard icon={<TimerOff size={18} aria-hidden />} valor={resumen?.vencidas ?? '—'} etiqueta="Vencidas" color="var(--sem-error)" onClick={() => filtrarEstado('VENCIDA')} activo={filtrosActuales.estado === 'VENCIDA'} />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={resumen?.resueltasHoy ?? '—'} etiqueta="Resueltas hoy" color="var(--sem-success)" />
        </div>

        <AlertasFiltros
          areas={areas}
          activos={activos}
          value={filtrosActuales}
          onChange={setFiltros}
          onAplicar={() => cargar(build(1))}
          onLimpiar={() => { setFiltros(ALERTAS_FILTROS_VACIO); cargar({ pagina: 1, por_pagina: 50 }); }}
        />

        <AlertasTable alertas={alertas} loading={loading} onAbrir={abrir} />

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => cargar(build(p))}
        />
      </div>

      {selectedId != null && (
        <AlertaDetalleModal
          detalle={detalleHook.detalle}
          loading={detalleHook.loading}
          error={detalleHook.error}
          puedeGestionar={puedeGestionar}
          puedeDescartar={puedeDescartar}
          online={online}
          onAccion={elegirAccion}
          onClose={cerrarDetalle}
        />
      )}

      {accion && detalleHook.detalle && (
        <CambiarEstadoAlertaModal
          alerta={detalleHook.detalle}
          estado={accion}
          saving={saving}
          autorizada={online && !detalleHook.loading && accionesAlerta(detalleHook.detalle.estado_alerta, permisosAcciones).includes(accion)}
          saveError={saveError}
          onConfirm={confirmarCambio}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  );
}
