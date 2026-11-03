// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-02 RF-64: variables y especies del catálogo real |
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo RF-64: el encabezado dice cuántas están activas y la versión del catálogo |
// | 2026-11-03 | Arekkazu | QA-M04 ronda 2 CU01 H-02/H-09/H-13 RF-64: filtros en vivo, versión del catálogo completo y sin editar desde caché |
import React, { useEffect, useMemo, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Stethoscope, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePatologias } from '../hooks/usePatologias';
import { useCatalogosPatologia } from '../hooks/useCatalogosPatologia';
import { PatologiasFiltros, PATOLOGIAS_FILTROS_VACIO, type PatologiasFiltrosState } from '../components/PatologiasFiltros';
import { PatologiasTable } from '../components/PatologiasTable';
import { PatologiaFormModal, type PatologiaFormValues } from '../components/PatologiaFormModal';
import { PatologiaDetalleModal } from '../components/PatologiaDetalleModal';
import { ModalShell } from '../components/ModalShell';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_PATOLOGIAS, ACCION_R, ACCION_C, ACCION_U, ACCION_D } from '../rbac';
import type { PatologiaM04Response } from '../types';

/** Espacios repetidos cuentan como uno, igual que la validación del nombre en el backend. */
const normalizar = (s: string) => s.trim().split(/\s+/).join(' ').toLowerCase();

export function PatologiasView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_PATOLOGIAS, ACCION_R);
  const puedeCrear = usePermission(RECURSO_PATOLOGIAS, ACCION_C);
  const puedeEditar = usePermission(RECURSO_PATOLOGIAS, ACCION_U);
  const puedeDesactivar = usePermission(RECURSO_PATOLOGIAS, ACCION_D);
  const online = useOnlineStatus();

  const { patologias, loading, saving, error, saveError, fromCache, cargar, detalle, crear, editar, desactivar, limpiarSaveError } = usePatologias();
  // CU01 H-13: con datos de caché el catálogo puede estar incompleto; no se opera sobre él.
  const operable = online && !fromCache;
  const catalogos = useCatalogosPatologia();

  const [filtros, setFiltros] = useState<PatologiasFiltrosState>(PATOLOGIAS_FILTROS_VACIO);
  const [formMode, setFormMode] = useState<'crear' | 'editar' | null>(null);
  const [editando, setEditando] = useState<PatologiaM04Response | null>(null);
  const [detalleSel, setDetalleSel] = useState<PatologiaM04Response | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [aDesactivar, setADesactivar] = useState<PatologiaM04Response | null>(null);

  useEffect(() => { if (puedeVer) cargar({}); }, [puedeVer, cargar]);

  // CU01 H-02: antes unos filtros iban al backend al pulsar Aplicar y otros se
  // aplicaban al instante en cliente, y la lista intermedia mezclaba ambos. El
  // catálogo es corto: se carga completo y todos los filtros se aplican al elegirlos.
  const visibles = useMemo(() => {
    const q = normalizar(filtros.busqueda);
    return patologias.filter((p) =>
      (!q || normalizar(p.nombre_patologia).includes(q))
      && (!filtros.especie || p.especie_aplicable === filtros.especie)
      && (!filtros.estado || p.es_activo === (filtros.estado === 'activas'))
      && (!filtros.tipo || p.es_base === (filtros.tipo === 'base')));
  }, [patologias, filtros]);
  // CU01 H-09: la versión es la del catálogo, no la más alta entre las filas filtradas.
  const versionCatalogo = patologias.length > 0 ? Math.max(...patologias.map((p) => p.version_catalogo)) : null;

  const aplicar = () => cargar({});
  const limpiar = () => { setFiltros(PATOLOGIAS_FILTROS_VACIO); cargar({}); };

  const abrirCrear = () => { limpiarSaveError(); setEditando(null); setFormMode('crear'); };
  const abrirEditar = (p: PatologiaM04Response) => { limpiarSaveError(); setEditando(p); setFormMode('editar'); };
  const cerrarForm = () => { setFormMode(null); setEditando(null); };

  const abrirDetalle = async (p: PatologiaM04Response) => {
    setDetalleSel(p);
    setDetalleLoading(true);
    const full = await detalle(p.id_patologia);
    if (full) setDetalleSel(full);
    setDetalleLoading(false);
  };

  const enviarForm = async (v: PatologiaFormValues) => {
    let ok: PatologiaM04Response | null = null;
    if (formMode === 'crear') {
      ok = await crear({
        nombre_patologia: v.nombre,
        especie_aplicable: v.especie,
        variables_sensoricas_asociadas: v.variables,
        descripcion_clinica: v.descripcion,
      });
    } else if (formMode === 'editar' && editando) {
      ok = await editar(editando.id_patologia, {
        nombre_patologia: v.nombre,
        descripcion_clinica: v.descripcion,
        variables_sensoricas_asociadas: v.variables,
        fecha_actualizacion: editando.fecha_actualizacion,
      });
    }
    if (ok) { cerrarForm(); aplicar(); }
  };

  const confirmarDesactivar = async () => {
    if (!aDesactivar) return;
    const ok = await desactivar(aDesactivar.id_patologia);
    if (ok) { setADesactivar(null); aplicar(); }
  };

  if (!puedeVer) return <PermissionDenied seccion="Catálogo de patologías" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Stethoscope size={20} aria-hidden />{t('patologiasview.catalogo_de_patologias')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : t('conteo.patologias', { count: visibles.length, n: formatearNumero(visibles.length) })}
            {/* Prototipo M04: activas y versión del catálogo, que sube con cada cambio. */}
            {!loading && versionCatalogo != null && ` · ${t('patologiasview.activas_version', {
              activas: formatearNumero(visibles.filter((p) => p.es_activo).length),
              version: versionCatalogo,
            })}`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={aplicar} aria-label={t('patologiasview.recargar')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          <Button variant="primary" size="sm" disabled={!puedeCrear || !operable} onClick={abrirCrear}>
            <Plus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('patologiasview.nueva_patologia')}</Button>
        </div>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {!online && <Alert variant="warning" title={t('patologiasview.sin_conexion')} description={t('patologiasview.mostrando_catalogo_cacheado_la_edicion_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('patologiasview.datos_desde_cache')} description="No se pudo conectar; se muestra el último catálogo disponible." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('patologiasview.sin_acceso_al_catalogo') : t('patologiasview.error_al_cargar_patologias')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <PatologiasFiltros especies={catalogos.especies} value={filtros} onChange={setFiltros} onAplicar={aplicar} onLimpiar={limpiar} />

        <PatologiasTable
          patologias={visibles}
          loading={loading}
          puedeEditar={puedeEditar && operable}
          puedeDesactivar={puedeDesactivar && operable}
          onVer={abrirDetalle}
          onEditar={abrirEditar}
          onDesactivar={setADesactivar}
        />
      </div>

      {formMode && (
        <PatologiaFormModal
          catalogoVariables={catalogos.variables}
          especies={catalogos.especies}
          mode={formMode}
          inicial={editando}
          saving={saving}
          saveError={saveError}
          online={operable}
          onSubmit={enviarForm}
          onClose={cerrarForm}
        />
      )}

      {detalleSel && (
        <PatologiaDetalleModal patologia={detalleSel} loading={detalleLoading} onClose={() => setDetalleSel(null)} />
      )}

      {aDesactivar && (
        <ModalShell
          title={t('patologiasview.inactivar_patologia')}
          onClose={() => setADesactivar(null)}
          maxWidth={460}
          footer={
            <>
              <Button variant="secondary" onClick={() => setADesactivar(null)} disabled={saving}>{t('patologiasview.cancelar')}</Button>
              <Button variant="danger" onClick={confirmarDesactivar} loading={saving} disabled={!operable}>{t('patologiasview.inactivar')}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} aria-hidden style={{ color: 'var(--sem-warning)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{t('patologiasview.se_inactivara')}{' '}<strong>{aDesactivar.nombre_patologia}</strong>{t('patologiasview.dejara_de_estar_disponible_para_nuevas')}</p>
              {saveError && <p role="alert" style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--sem-error)' }}>{saveError.message}</p>}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
