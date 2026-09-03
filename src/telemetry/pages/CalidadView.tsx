import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ShieldCheck, RefreshCcw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useCalidad } from '../hooks/useCalidad';
import { CalidadFiltros, CALIDAD_FILTROS_VACIO, type CalidadFiltrosState } from '../components/CalidadFiltros';
import { CalidadTable } from '../components/CalidadTable';
import { CalidadDetalleModal } from '../components/CalidadDetalleModal';
import { ReevaluarModal } from '../components/ReevaluarModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_CALIDAD, ACCION_R, ACCION_E } from '../rbac';
import type { CalidadFiltros as CalidadFiltrosDTO, TelemetriaCalidadSchema } from '../types';
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

export function CalidadView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_CALIDAD, ACCION_R);
  const puedeEjecutar = usePermission(RECURSO_CALIDAD, ACCION_E);
  const online = useOnlineStatus();

  const { items, paginacion, loading, error, saving, saveError, reevaluacion, resumen, cargar, cargarResumen, evaluar, reevaluar, limpiarReevaluacion } = useCalidad();
  const [filtros, setFiltros] = useState<CalidadFiltrosState>(CALIDAD_FILTROS_VACIO);
  const [seleccionada, setSeleccionada] = useState<TelemetriaCalidadSchema | null>(null);
  const [modalReeval, setModalReeval] = useState(false);

  const build = useCallback(
    (pagina: number): CalidadFiltrosDTO => {
      const f: CalidadFiltrosDTO = { pagina, por_pagina: 50 };
      if (filtros.id_sensor) f.id_sensor = Number(filtros.id_sensor);
      if (filtros.clasificacion) f.clasificacion = filtros.clasificacion;
      if (filtros.estado_evaluacion) f.estado_evaluacion = filtros.estado_evaluacion.trim();
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtros]
  );

  useEffect(() => { if (puedeVer) { cargar({ pagina: 1, por_pagina: 50 }); cargarResumen(); } }, [puedeVer, cargar, cargarResumen]);

  const doEvaluar = async (idTelemetria: number) => {
    const upd = await evaluar(idTelemetria);
    if (upd) { setSeleccionada(upd); cargarResumen(); }
  };

  const doReevaluar = async (dto: Parameters<typeof reevaluar>[0]) => {
    const r = await reevaluar(dto);
    if (r) { cargar(build(paginacion.pagina)); cargarResumen(); }
  };

  const cerrarReeval = () => { setModalReeval(false); limpiarReevaluacion(); };

  if (!puedeVer) return <PermissionDenied seccion="Calidad de telemetría" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <ShieldCheck size={20} aria-hidden />{t('calidadview.calidad_de_datos_de_telemetria')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} evaluación(es)`}
          </p>
        </div>
        {puedeEjecutar && (
          <Button variant="secondary" size="sm" disabled={!online} onClick={() => setModalReeval(true)}>
            <RefreshCcw size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('calidadview.solicitar_re_evaluacion')}</Button>
        )}
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('calidadview.sin_conexion')} description={t('calidadview.evaluar_y_re_evaluar_estan_deshabilitados')} style={{ marginBottom: 'var(--s4)' }} />}
        {error && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('calidadview.sin_acceso_a_calidad') : t('calidadview.error_al_cargar_calidad')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<CheckCircle2 size={18} aria-hidden />} valor={resumen?.apto ?? null} etiqueta="Aptas" color="var(--sem-success)" />
          <Kpi icon={<AlertTriangle size={18} aria-hidden />} valor={resumen?.conReserva ?? null} etiqueta="Con reservas" color="var(--sem-warning)" />
          <Kpi icon={<XCircle size={18} aria-hidden />} valor={resumen?.noApto ?? null} etiqueta="No aptas" color="var(--sem-error)" />
          <Kpi icon={<HelpCircle size={18} aria-hidden />} valor={resumen?.indeterminada ?? null} etiqueta="Indeterminadas" color="var(--text-muted)" />
        </div>

        <CalidadFiltros
          value={filtros}
          onChange={setFiltros}
          onAplicar={() => cargar(build(1))}
          onLimpiar={() => { setFiltros(CALIDAD_FILTROS_VACIO); cargar({ pagina: 1, por_pagina: 50 }); }}
        />

        <CalidadTable items={items} loading={loading} onAbrir={setSeleccionada} />

        <Paginacion pagina={paginacion.pagina} totalPaginas={paginacion.totalPaginas} totalRegistros={paginacion.totalRegistros} onCambiar={(p) => cargar(build(p))} />
      </div>

      {seleccionada && (
        <CalidadDetalleModal
          item={seleccionada}
          puedeEjecutar={puedeEjecutar}
          online={online}
          saving={saving}
          saveError={saveError}
          onEvaluar={doEvaluar}
          onClose={() => setSeleccionada(null)}
        />
      )}

      {modalReeval && (
        <ReevaluarModal saving={saving} saveError={saveError} reevaluacion={reevaluacion} onConfirm={doReevaluar} onClose={cerrarReeval} />
      )}
    </div>
  );
}
