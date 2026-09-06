import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useHistory } from 'react-router-dom';
import { Plus, RefreshCw, ClipboardList } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useActivos } from '../hooks/useActivos';
import { ActivosFiltros, type FiltrosState } from '../components/ActivosFiltros';
import { ActivosTable } from '../components/ActivosTable';
import { ESTADO_ID } from '../types';
import type { ListarActivosFiltros } from '../types';
import { RECURSO_ACTIVOS, RECURSO_AUDITORIA_M02, ACCION_C, ACCION_R } from '../rbac';

export function RegistryView() {
  const { t } = useT('biologicalAssets');
  const history = useHistory();
  const online = useOnlineStatus();
  const puedeCrear = usePermission(RECURSO_ACTIVOS, ACCION_C);
  const puedeVerAuditoria = usePermission(RECURSO_AUDITORIA_M02, ACCION_R);

  const { activos, paginacion, loading, error, fromCache, cargar } = useActivos();
  const [filtros, setFiltros] = useState<FiltrosState>({ tipo: '', estado: '', busqueda: '' });

  // Filtros de servidor (tipo, estado) — recargan al backend.
  useEffect(() => {
    const params: ListarActivosFiltros = {};
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.estado) params.id_estado = ESTADO_ID[filtros.estado];
    cargar(params);
  }, [filtros.tipo, filtros.estado, cargar]);

  // Búsqueda cliente-side (identificador / especie).
  const visibles = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    if (!q) return activos;
    return activos.filter(
      (a) =>
        (a.identificador ?? '').toLowerCase().includes(q) ||
        (a.nombre_especie ?? '').toLowerCase().includes(q)
    );
  }, [activos, filtros.busqueda]);

  const recargar = () => {
    const params: ListarActivosFiltros = {};
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.estado) params.id_estado = ESTADO_ID[filtros.estado];
    cargar(params);
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      {/* Header */}
      <div
        style={{
          padding: 'var(--s5) var(--s7)',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--s4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('registryview.gestion_de_activos_biologicos')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} activo(s)`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={recargar} aria-label={t('registryview.recargar_lista')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeVerAuditoria && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => history.push('/activos-biologicos/auditoria')}
            >
              <ClipboardList size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('registryview.auditoria')}</Button>
          )}
          {puedeCrear && (
            <Button
              variant="primary"
              size="sm"
              disabled={!online}
              onClick={() => history.push('/activos-biologicos/nuevo')}
            >
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('registryview.registrar_activo')}</Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--s7)' }}>
        {!online && (
          <Alert
            variant="warning"
            title={t('registryview.sin_conexion')}
            description={t('registryview.mostrando_datos_cacheados_el_registro_esta')}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}
        {fromCache && online && (
          <Alert
            variant="info"
            title={t('registryview.datos_desde_cache')}
            description={t('registryview.no_se_pudo_conectar_con_el_servidor_se')}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}
        {error && !fromCache && (
          <Alert
            variant="error"
            title={t('registryview.error_al_cargar_activos')}
            description={`${error.message}${error.status === 404 ? ' (verificar el endpoint de listado — ver TASKS.md)' : ''}`}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <ActivosFiltros value={filtros} onChange={setFiltros} />

        <ActivosTable
          activos={visibles}
          loading={loading}
          onAbrir={(id) => history.push(`/activos-biologicos/${id}`)}
        />
      </div>
    </div>
  );
}
