import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Stethoscope, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePatologias } from '../hooks/usePatologias';
import { PatologiasFiltros, PATOLOGIAS_FILTROS_VACIO, type PatologiasFiltrosState } from '../components/PatologiasFiltros';
import { PatologiasTable } from '../components/PatologiasTable';
import { PatologiaFormModal, type PatologiaFormValues } from '../components/PatologiaFormModal';
import { PatologiaDetalleModal } from '../components/PatologiaDetalleModal';
import { ModalShell } from '../components/ModalShell';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_PATOLOGIAS, ACCION_R, ACCION_C, ACCION_U, ACCION_D } from '../rbac';
import type { ListarPatologiasFiltros, PatologiaM04Response } from '../types';

export function PatologiasView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_PATOLOGIAS, ACCION_R);
  const puedeCrear = usePermission(RECURSO_PATOLOGIAS, ACCION_C);
  const puedeEditar = usePermission(RECURSO_PATOLOGIAS, ACCION_U);
  const puedeDesactivar = usePermission(RECURSO_PATOLOGIAS, ACCION_D);
  const online = useOnlineStatus();

  const { patologias, total, loading, saving, error, saveError, fromCache, cargar, detalle, crear, editar, desactivar, limpiarSaveError } = usePatologias();

  const [filtros, setFiltros] = useState<PatologiasFiltrosState>(PATOLOGIAS_FILTROS_VACIO);
  const [formMode, setFormMode] = useState<'crear' | 'editar' | null>(null);
  const [editando, setEditando] = useState<PatologiaM04Response | null>(null);
  const [detalleSel, setDetalleSel] = useState<PatologiaM04Response | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [aDesactivar, setADesactivar] = useState<PatologiaM04Response | null>(null);

  const build = useCallback((f: PatologiasFiltrosState): ListarPatologiasFiltros => {
    const api: ListarPatologiasFiltros = {};
    if (f.especie) api.especie_aplicable = f.especie;
    if (f.estado === 'activas') api.solo_activas = true;
    if (f.tipo === 'base') api.solo_base = true;
    return api;
  }, []);

  useEffect(() => { if (puedeVer) cargar({}); }, [puedeVer, cargar]);

  // Filtros que el backend no soporta directamente → se aplican en cliente.
  const visibles = useMemo(() => {
    let lista = patologias;
    if (filtros.busqueda.trim()) {
      const q = filtros.busqueda.trim().toLowerCase();
      lista = lista.filter((p) => p.nombre_patologia.toLowerCase().includes(q));
    }
    if (filtros.estado === 'inactivas') lista = lista.filter((p) => !p.es_activo);
    if (filtros.tipo === 'personalizada') lista = lista.filter((p) => !p.es_base);
    return lista;
  }, [patologias, filtros]);

  const aplicar = () => cargar(build(filtros));
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
            {loading ? 'Cargando…' : `${total} patología(s)`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={aplicar} aria-label={t('patologiasview.recargar')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          <Button variant="primary" size="sm" disabled={!puedeCrear || !online} onClick={abrirCrear}>
            <Plus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('patologiasview.nueva_patologia')}</Button>
        </div>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('patologiasview.sin_conexion')} description={t('patologiasview.mostrando_catalogo_cacheado_la_edicion_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('patologiasview.datos_desde_cache')} description="No se pudo conectar; se muestra el último catálogo disponible." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('patologiasview.sin_acceso_al_catalogo') : t('patologiasview.error_al_cargar_patologias')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <PatologiasFiltros value={filtros} onChange={setFiltros} onAplicar={aplicar} onLimpiar={limpiar} />

        <PatologiasTable
          patologias={visibles}
          loading={loading}
          puedeEditar={puedeEditar && online}
          puedeDesactivar={puedeDesactivar && online}
          onVer={abrirDetalle}
          onEditar={abrirEditar}
          onDesactivar={setADesactivar}
        />
      </div>

      {formMode && (
        <PatologiaFormModal
          mode={formMode}
          inicial={editando}
          saving={saving}
          saveError={saveError}
          online={online}
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
              <Button variant="danger" onClick={confirmarDesactivar} loading={saving} disabled={!online}>{t('patologiasview.inactivar')}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} aria-hidden style={{ color: 'var(--sem-warning)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{t('patologiasview.se_inactivara')}<strong>{aDesactivar.nombre_patologia}</strong>{t('patologiasview.dejara_de_estar_disponible_para_nuevas')}</p>
              {saveError && <p role="alert" style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--sem-error)' }}>{saveError.message}</p>}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
