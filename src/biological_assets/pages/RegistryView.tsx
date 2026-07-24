import React, { useEffect, useMemo, useState } from 'react';
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
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Gestión de Activos Biológicos
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} activo(s)`}
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={recargar} aria-label="Recargar lista">
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeVerAuditoria && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => history.push('/activos-biologicos/auditoria')}
            >
              <ClipboardList size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Auditoría
            </Button>
          )}
          {puedeCrear && (
            <Button
              variant="primary"
              size="sm"
              disabled={!online}
              onClick={() => history.push('/activos-biologicos/nuevo')}
            >
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Registrar activo
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--s7)' }}>
        {!online && (
          <Alert
            variant="warning"
            title="Sin conexión"
            description="Mostrando datos cacheados. El registro está deshabilitado."
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}
        {fromCache && online && (
          <Alert
            variant="info"
            title="Datos desde caché"
            description="No se pudo conectar con el servidor. Se muestran los últimos datos disponibles."
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}
        {error && !fromCache && (
          <Alert
            variant="error"
            title="Error al cargar activos"
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
