import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Boxes, RefreshCw, Rocket, AlertTriangle } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useModelos } from '../hooks/useModelos';
import { ModelosFiltros, MODELOS_FILTROS_VACIO, type ModelosFiltrosState } from '../components/ModelosFiltros';
import { ModelosTable } from '../components/ModelosTable';
import { ModeloDetalleModal } from '../components/ModeloDetalleModal';
import { ModalShell } from '../components/ModalShell';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_MODELOS, ACCION_R, ACCION_U, ACCION_E } from '../rbac';
import type { ListarModelosFiltros, VersionModeloResponse } from '../types';

export function ModelosView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_MODELOS, ACCION_R);
  const puedeEditar = usePermission(RECURSO_MODELOS, ACCION_U);
  const puedeEjecutar = usePermission(RECURSO_MODELOS, ACCION_E);
  const online = useOnlineStatus();

  const { modelos, paginacion, loading, saving, error, saveError, fromCache, cargar, detalle, guardarNotas, activar, limpiarSaveError } = useModelos();

  const [filtros, setFiltros] = useState<ModelosFiltrosState>(MODELOS_FILTROS_VACIO);
  const [detalleSel, setDetalleSel] = useState<VersionModeloResponse | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [confirmarActivar, setConfirmarActivar] = useState(false);

  const build = useCallback((f: ModelosFiltrosState): ListarModelosFiltros => {
    const api: ListarModelosFiltros = {};
    if (f.tipo) api.tipo_modelo = f.tipo;
    if (f.estado) api.estado = f.estado;
    return api;
  }, []);

  useEffect(() => { if (puedeVer) cargar({}, 1); }, [puedeVer, cargar]);

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
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} versión(es)`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={aplicar} aria-label={t('modelosview.recargar')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('modelosview.sin_conexion')} description={t('modelosview.mostrando_versiones_cacheadas_las_acciones')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('modelosview.datos_desde_cache')} description="No se pudo conectar; se muestran las últimas versiones disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso a los modelos' : 'Error al cargar versiones'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <ModelosFiltros value={filtros} onChange={setFiltros} onAplicar={aplicar} onLimpiar={limpiar} />

        <ModelosTable modelos={visibles} loading={loading} onVer={abrirDetalle} />

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => cargar(build(filtros), p)}
        />
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
          onGuardarNotas={onGuardarNotas}
          onSolicitarActivar={() => setConfirmarActivar(true)}
          onClose={() => { setDetalleSel(null); setConfirmarActivar(false); }}
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
                <strong>{detalleSel.nombre_version}</strong>{t('modelosview.pasara_a_produccion_y_reemplazara_la')}</p>
              {saveError && <p role="alert" style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--sem-error)' }}>{saveError.message}</p>}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
