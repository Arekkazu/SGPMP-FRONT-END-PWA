// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-69: avisos de registro automático y solo lectura, intentos de registro no admitidos |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo RF-69/RF-70: franja «En producción» por tipo de modelo y nota de mínimos |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M4-07 RF-69: clases de la matriz de confusión por nombre |
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatearFecha, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Boxes, RefreshCw, Rocket, AlertTriangle, Info } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useModelos } from '../hooks/useModelos';
import { modelosApi } from '../api/modelosApi';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { MINIMO_F1, MINIMO_RECALL_RIESGO_ALTO } from '../components/ModelosTable';
import { ModelosFiltros, MODELOS_FILTROS_VACIO, type ModelosFiltrosState } from '../components/ModelosFiltros';
import { ModelosTable } from '../components/ModelosTable';
import { ModeloDetalleModal } from '../components/ModeloDetalleModal';
import { usePatologias } from '../hooks/usePatologias';
import { ModalShell } from '../components/ModalShell';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { IntentosRegistroTable } from '../components/IntentosRegistroTable';
import { RECURSO_MODELOS, RECURSO_AUDITORIA, RECURSO_OTA, ACCION_R, ACCION_U, ACCION_E } from '../rbac';
import { PARADIGMA_POR_TIPO, TIPO_MODELO_LABEL, type ListarModelosFiltros, type TipoModelo, type VersionModeloResponse } from '../types';

const TIPOS = Object.keys(TIPO_MODELO_LABEL) as TipoModelo[];
const pct = (v: number) => formatearNumero(v, { style: 'percent', maximumFractionDigits: 0 });

export function ModelosView() {
  // M4-07: nombres de las clases de la matriz de confusión (patologías del catálogo).
  const patologiasHook = usePatologias();
  const cargarPatologias = patologiasHook.cargar;
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_MODELOS, ACCION_R);
  const puedeEditar = usePermission(RECURSO_MODELOS, ACCION_U);
  const puedeEjecutar = usePermission(RECURSO_MODELOS, ACCION_E);
  const puedeVerAuditoria = usePermission(RECURSO_AUDITORIA, ACCION_R);
  const puedeVerOta = usePermission(RECURSO_OTA, ACCION_R);
  const online = useOnlineStatus();

  const { modelos, paginacion, loading, saving, error, saveError, fromCache, cargar, detalle, guardarNotas, activar, limpiarSaveError, intentos, intentosError, cargarIntentos, transiciones, despliegues, cargarContexto } = useModelos();

  const [filtros, setFiltros] = useState<ModelosFiltrosState>(MODELOS_FILTROS_VACIO);
  const [detalleSel, setDetalleSel] = useState<VersionModeloResponse | null>(null);
  useEffect(() => { if (detalleSel) void cargarPatologias({}); }, [detalleSel?.id_version_modelo, cargarPatologias]); // eslint-disable-line react-hooks/exhaustive-deps
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [confirmarActivar, setConfirmarActivar] = useState(false);
  // Prototipo M04: qué versión responde hoy por cada tipo. Se consulta aparte porque la
  // tabla está paginada y filtrada; sin respuesta, la franja no se muestra.
  const [activos, setActivos] = useState<VersionModeloResponse[] | null>(null);

  const build = useCallback((f: ModelosFiltrosState): ListarModelosFiltros => {
    const api: ListarModelosFiltros = {};
    if (f.tipo) api.tipo_modelo = f.tipo;
    if (f.estado) api.estado = f.estado;
    return api;
  }, []);

  useEffect(() => { if (puedeVer) cargar({}, 1); }, [puedeVer, cargar]);
  useEffect(() => {
    if (!puedeVer || !online) return;
    modelosApi.listar({ estado: 'ACTIVO', limit: 50 }).then((r) => setActivos(r.items), () => setActivos(null));
  }, [puedeVer, online, detalleSel?.estado_version]);
  useEffect(() => { if (puedeVer && puedeVerAuditoria && online) cargarIntentos(); }, [puedeVer, puedeVerAuditoria, online, cargarIntentos]);

  const visibles = useMemo(() => {
    if (!filtros.busqueda.trim()) return modelos;
    const q = filtros.busqueda.trim().toLowerCase();
    return modelos.filter((m) => m.nombre_version.toLowerCase().includes(q));
  }, [modelos, filtros.busqueda]);

  const aplicar = () => cargar(build(filtros), 1);
  const limpiar = () => { setFiltros(MODELOS_FILTROS_VACIO); cargar({}, 1); };

  const abrirDetalle = async (m: VersionModeloResponse) => {
    limpiarSaveError();
    setDetalleSel(m);
    setDetalleLoading(true);
    if (online) cargarContexto(m.id_version_modelo, { auditoria: puedeVerAuditoria, ota: puedeVerOta });
    const full = await detalle(m.id_version_modelo);
    if (full) setDetalleSel(full);
    setDetalleLoading(false);
  };

  const onGuardarNotas = async (notas: string) => {
    if (!detalleSel) return;
    const ok = await guardarNotas(detalleSel.id_version_modelo, notas);
    if (ok) setDetalleSel(ok);
  };

  const onConfirmarActivar = async () => {
    if (!detalleSel) return;
    const ok = await activar(detalleSel.id_version_modelo);
    if (ok) { setDetalleSel(ok); setConfirmarActivar(false); }
  };

  if (!puedeVer) return <PermissionDenied seccion="Versiones de modelos IA" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Boxes size={20} aria-hidden />{t('modelosview.gestion_de_modelos_de_ia')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : t('conteo.versiones', { count: paginacion.totalRegistros, n: formatearNumero(paginacion.totalRegistros) })}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={aplicar} aria-label={t('modelosview.recargar')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {!online && <Alert variant="warning" title={t('modelosview.sin_conexion')} description={t('modelosview.mostrando_versiones_cacheadas_las_acciones')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('modelosview.datos_desde_cache')} description="No se pudo conectar; se muestran las últimas versiones disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('modelosview.sin_acceso_a_los_modelos') : t('modelosview.error_al_cargar_versiones')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', marginBottom: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', color: 'var(--text-primary)', fontSize: '13px' }}>
          <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{t('modelosview.registro_automatico_titulo')}</strong> {t('modelosview.registro_automatico_texto')}
            {!puedeEditar && !puedeEjecutar && <> {t('modelosview.solo_lectura_texto')}</>}
          </span>
        </div>

        {activos && (
          <section aria-labelledby="modelos-produccion" style={{ marginBottom: 'var(--s5)' }}>
            <h2 id="modelos-produccion" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('modelosview.en_produccion')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: 'var(--s3)' }}>
              {TIPOS.map((tipo) => {
                const m = activos.find((a) => a.tipo_modelo === tipo);
                const titulo = <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{TIPO_MODELO_LABEL[tipo]}</span>;
                if (!m) {
                  return (
                    <div key={tipo} style={{ padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px dashed var(--surface-border)' }}>
                      {titulo}
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>{t('modelosview.sin_modelo_activo')}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{t('modelosview.sin_predicciones_tipo')}</span>
                    </div>
                  );
                }
                return (
                  <OptionCard key={tipo} onClick={() => abrirDetalle(m)} style={{ padding: 'var(--s3) var(--s4)' }}>
                    {titulo}
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {m.nombre_version} · {PARADIGMA_POR_TIPO[tipo] === 'POBLACIONAL' || m.f1_score == null ? t('modelosview.poblacional') : t('modelosview.f1', { valor: pct(m.f1_score) })}
                    </span>
                    {m.fecha_despliegue && <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{t('modelosview.desde', { fecha: formatearFecha(new Date(m.fecha_despliegue)) })}</span>}
                  </OptionCard>
                );
              })}
            </div>
          </section>
        )}

        <ModelosFiltros value={filtros} onChange={setFiltros} onAplicar={aplicar} onLimpiar={limpiar} />

        <ModelosTable modelos={visibles} loading={loading} onVer={abrirDetalle} />

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s3) 0 0' }}>
          {t('modelosview.nota_minimos', { f1: pct(MINIMO_F1), recall: pct(MINIMO_RECALL_RIESGO_ALTO) })}
        </p>

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => cargar(build(filtros), p)}
        />

        {puedeVerAuditoria && online && <IntentosRegistroTable intentos={intentos} error={intentosError} />}
      </div>

      {detalleSel && (
        <ModeloDetalleModal
          modelo={detalleSel}
          loading={detalleLoading}
          puedeEditar={puedeEditar && online}
          puedeEjecutar={puedeEjecutar}
          online={online}
          saving={saving}
          saveError={saveError}
          transiciones={transiciones}
          despliegues={despliegues}
          onGuardarNotas={onGuardarNotas}
          onSolicitarActivar={() => setConfirmarActivar(true)}
          onClose={() => { setDetalleSel(null); setConfirmarActivar(false); }}
          nombrePatologia={(id) => patologiasHook.patologias.find((p) => String(p.id_patologia) === id)?.nombre_patologia}
        />
      )}

      {confirmarActivar && detalleSel && (
        <ModalShell
          title={t('modelosview.confirmar_activacion_en_produccion')}
          onClose={() => setConfirmarActivar(false)}
          maxWidth={480}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmarActivar(false)} disabled={saving}>{t('modelosview.cancelar')}</Button>
              <Button variant="primary" onClick={onConfirmarActivar} loading={saving} disabled={!online}>
                <Rocket size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('modelosview.activar')}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} aria-hidden style={{ color: 'var(--sem-warning)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                <strong>{detalleSel.nombre_version}</strong>{' '}{t('modelosview.pasara_a_produccion_y_reemplazara_la')}</p>
              {saveError && <p role="alert" style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--sem-error)' }}>{saveError.message}</p>}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
