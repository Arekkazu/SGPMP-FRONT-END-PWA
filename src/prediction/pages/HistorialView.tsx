import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { History, ShieldCheck, Download, Clock, TrendingUp } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useHistorial } from '../hooks/useHistorial';
import { usePatologias } from '../hooks/usePatologias';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { HistorialFiltros, historialFiltrosVacio, type HistorialFiltrosState } from '../components/HistorialFiltros';
import { HistorialTimeline } from '../components/HistorialTimeline';
import { LineChartPrediccion } from '../components/LineChartPrediccion';
import { RetroalimentacionFormModal, type RetroContexto } from '../components/RetroalimentacionFormModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { extraerNivelRiesgo } from '../lib/riesgo';
import { RECURSO_HISTORIAL, RECURSO_RETRO, ACCION_R, ACCION_C } from '../rbac';
import type { ConsultarHistorialFiltros, EventoHistorialResponse } from '../types';

type TabId = 'timeline' | 'tendencia';

export function HistorialView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const puedeRetroalimentar = usePermission(RECURSO_RETRO, ACCION_C);
  const online = useOnlineStatus();

  const { eventos, cursor, loading, loadingMas, error, fromCache, activos, activosError, cargarActivos, consultar, cargarMas, limpiar } = useHistorial();
  const patologiasHook = usePatologias();
  const retro = useRetroalimentacion();

  const [filtros, setFiltros] = useState<HistorialFiltrosState>(historialFiltrosVacio());
  const [tab, setTab] = useState<TabId>('timeline');
  const [retroEvento, setRetroEvento] = useState<EventoHistorialResponse | null>(null);
  const [retroOk, setRetroOk] = useState(false);

  useEffect(() => {
    if (puedeVer) { cargarActivos(); patologiasHook.cargar({ solo_activas: true }); }
  }, [puedeVer, cargarActivos]); // eslint-disable-line react-hooks/exhaustive-deps

  const patologiasOpciones = useMemo(
    () => patologiasHook.patologias.map((p) => ({ id: p.id_patologia, nombre: p.nombre_patologia })),
    [patologiasHook.patologias]
  );

  const consultarHistorial = () => {
    if (!filtros.idActivo) return;
    const api: ConsultarHistorialFiltros = {
      fecha_inicio: filtros.fecha_inicio,
      fecha_fin: filtros.fecha_fin,
      incluir_alertas: filtros.incluir_alertas,
    };
    if (filtros.nivel_riesgo) api.nivel_riesgo = Number(filtros.nivel_riesgo);
    if (filtros.id_patologia) api.id_patologia = Number(filtros.id_patologia);
    consultar(Number(filtros.idActivo), api);
  };

  const onLimpiar = () => { setFiltros(historialFiltrosVacio()); limpiar(); };

  const chartData = useMemo(() => {
    return [...eventos]
      .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento))
      .map((e) => ({
        fecha: new Date(e.fecha_evento).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
        nivel: extraerNivelRiesgo(e.payload),
      }))
      .filter((d) => d.nivel != null);
  }, [eventos]);

  const exportarLocal = () => {
    const blob = new Blob([JSON.stringify(eventos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_activo_${filtros.idActivo || 'x'}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const enviarRetro = async (dto: Parameters<typeof retro.registrar>[0]) => {
    const ok = await retro.registrar(dto);
    if (ok) { setRetroEvento(null); setRetroOk(true); setTimeout(() => setRetroOk(false), 4000); }
  };

  if (!puedeVer) return <PermissionDenied seccion="Historial diagnóstico" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <History size={20} aria-hidden />{t('historialview.historial_diagnostico')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('historialview.evolucion_del_riesgo_sanitario_y')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <Alert variant="info" title="Registro inmutable (NIC-41)" description={t('historialview.los_resultados_de_inferencia_no_se')} style={{ marginBottom: 'var(--s5)' }} />

        {retroOk && <Alert variant="success" title={t('historialview.retroalimentacion_registrada')} description={t('historialview.gracias_la_evaluacion_clinica_quedo')} style={{ marginBottom: 'var(--s4)' }} />}
        {!online && <Alert variant="warning" title={t('historialview.sin_conexion')} description={t('historialview.mostrando_historial_cacheado_del_ultimo')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('historialview.datos_desde_cache')} description="No se pudo conectar; se muestra el último historial disponible." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso al historial' : 'Error al consultar'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <HistorialFiltros
          value={filtros}
          activos={activos}
          activosError={activosError}
          patologias={patologiasOpciones}
          onChange={setFiltros}
          onConsultar={consultarHistorial}
          onLimpiar={onLimpiar}
          loading={loading}
        />

        {/* Tabs */}
        <div role="tablist" aria-label={t('historialview.vista_de_historial')} style={{ display: 'flex', gap: 'var(--s2)', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s5)' }}>
          {([['timeline', 'Línea de tiempo', <Clock size={15} aria-hidden key="i" />], ['tendencia', 'Tendencia de riesgo', <TrendingUp size={15} aria-hidden key="j" />]] as const).map(([id, label, icon]) => {
            const activo = id === tab;
            return (
              <button key={id} role="tab" aria-selected={activo} onClick={() => setTab(id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', border: 'none', borderBottom: `2px solid ${activo ? 'var(--brand-500)' : 'transparent'}`, background: 'transparent', color: activo ? 'var(--brand-600)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activo ? 700 : 600, cursor: 'pointer' }}>
                {icon}{label}
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" disabled={eventos.length === 0} onClick={exportarLocal} title="Exportación local (el backend aún no expone exportación de historial)">
            <ShieldCheck size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            <Download size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialview.exportar')}</Button>
        </div>

        {tab === 'timeline' ? (
          <>
            {loading ? (
              <div style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('historialview.consultando_historial')}</div>
            ) : (
              <HistorialTimeline eventos={eventos} puedeRetroalimentar={puedeRetroalimentar && online} onRetroalimentar={setRetroEvento} />
            )}
            {cursor && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--s5)' }}>
                <Button variant="secondary" size="sm" loading={loadingMas} onClick={cargarMas}>{t('historialview.cargar_mas')}</Button>
              </div>
            )}
          </>
        ) : (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('historialview.evolucion_del_nivel_de_riesgo_sanitario')}</h3>
            <LineChartPrediccion
              data={chartData}
              xKey="fecha"
              series={[{ dataKey: 'nivel', name: 'Nivel de riesgo' }]}
              yDomain={[0, 3]}
              referencias={[{ y: 2, label: 'Umbral alto', color: 'var(--sem-error)' }]}
              height={280}
            />
          </div>
        )}
      </div>

      {retroEvento && retroEvento.id_resultado_inferencia && (
        <RetroalimentacionFormModal
          contexto={{
            id_resultado_inferencia: retroEvento.id_resultado_inferencia,
            id_activo_biologico: retroEvento.id_activo_biologico,
            resumen: `Evento: ${retroEvento.tipo_evento}`,
          } as RetroContexto}
          patologiasOpciones={patologiasOpciones}
          saving={retro.saving}
          saveError={retro.saveError}
          online={online}
          onSubmit={enviarRetro}
          onClose={() => { retro.limpiarSaveError(); setRetroEvento(null); }}
        />
      )}
    </div>
  );
}
