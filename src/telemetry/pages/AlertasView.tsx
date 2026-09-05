import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { BellRing, Clock, TimerOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useAlertas } from '../hooks/useAlertas';
import { useAlertaDetalle } from '../hooks/useAlertaDetalle';
import { AlertasFiltros, ALERTAS_FILTROS_VACIO, type AlertasFiltrosState } from '../components/AlertasFiltros';
import { AlertasTable } from '../components/AlertasTable';
import { AlertaDetalleModal } from '../components/AlertaDetalleModal';
import { CambiarEstadoAlertaModal } from '../components/CambiarEstadoAlertaModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_ALERTAS, ACCION_R, ACCION_U } from '../rbac';
import type { ListarAlertasFiltros, NuevoEstadoAlerta } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

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

export function AlertasView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_ALERTAS, ACCION_R);
  const puedeGestionar = usePermission(RECURSO_ALERTAS, ACCION_U);
  const online = useOnlineStatus();

  const { alertas, paginacion, loading, saving, error, saveError, fromCache, resumen, cargar, cargarResumen, cambiarEstado } = useAlertas();
  const detalleHook = useAlertaDetalle();

  const [filtros, setFiltros] = useState<AlertasFiltrosState>(ALERTAS_FILTROS_VACIO);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [accion, setAccion] = useState<NuevoEstadoAlerta | null>(null);

  const build = useCallback(
    (pagina: number): ListarAlertasFiltros => {
      const f: ListarAlertasFiltros = { pagina, por_pagina: 50 };
      if (filtros.estado) f.estado = filtros.estado;
      if (filtros.severidad) f.severidad = filtros.severidad;
      if (filtros.origen_evento) f.origen_evento = filtros.origen_evento;
      if (filtros.tipo_alerta) f.tipo_alerta = filtros.tipo_alerta.trim();
      if (filtros.id_sensor) f.id_sensor = Number(filtros.id_sensor);
      if (filtros.id_activo_biologico) f.id_activo_biologico = Number(filtros.id_activo_biologico);
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtros]
  );

  useEffect(() => { if (puedeVer) { cargar({ pagina: 1, por_pagina: 50 }); cargarResumen(); } }, [puedeVer, cargar, cargarResumen]);

  const abrir = (id: number) => { setSelectedId(id); detalleHook.cargar(id); };
  const cerrarDetalle = () => { setSelectedId(null); detalleHook.limpiar(); };

  const confirmarCambio = async (dto: Parameters<typeof cambiarEstado>[1]) => {
    if (selectedId == null) return;
    const ok = await cambiarEstado(selectedId, dto);
    if (ok) {
      setAccion(null);
      cerrarDetalle();
      cargar(build(paginacion.pagina));
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
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} alerta(s)`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { cargar(build(paginacion.pagina)); cargarResumen(); }} aria-label={t('alertasview.recargar')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('alertasview.sin_conexion')} description={t('alertasview.mostrando_alertas_cacheadas_la_gestion_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('alertasview.datos_desde_cache')} description="No se pudo conectar; se muestran las últimas alertas disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('alertasview.sin_acceso_a_las_alertas') : t('alertasview.error_al_cargar_alertas')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<BellRing size={18} aria-hidden />} valor={resumen?.activas ?? null} etiqueta="Activas ahora" color="var(--sem-error)" />
          <Kpi icon={<Clock size={18} aria-hidden />} valor={resumen?.enAtencion ?? null} etiqueta="En atención" color="var(--sem-warning)" />
          <Kpi icon={<TimerOff size={18} aria-hidden />} valor={resumen?.vencidas ?? null} etiqueta="Vencidas" color="var(--sem-error)" />
          <Kpi icon={<CheckCircle2 size={18} aria-hidden />} valor={resumen?.resueltasHoy ?? null} etiqueta="Resueltas hoy" color="var(--sem-success)" />
        </div>

        <AlertasFiltros
          value={filtros}
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
          online={online}
          onAccion={setAccion}
          onClose={cerrarDetalle}
        />
      )}

      {accion && detalleHook.detalle && (
        <CambiarEstadoAlertaModal
          alerta={detalleHook.detalle}
          estado={accion}
          saving={saving}
          saveError={saveError}
          onConfirm={confirmarCambio}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  );
}
