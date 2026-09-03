import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { History } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { Alert } from '../../shared/design-system/Alert';
import { useHistorial } from '../hooks/useHistorial';
import { HistorialFiltros, HISTORIAL_FILTROS_DEFAULT, type HistorialFiltrosState } from '../components/HistorialFiltros';
import { EstadisticasCards } from '../components/EstadisticasCards';
import { HistorialChart } from '../components/HistorialChart';
import { HistorialTable } from '../components/HistorialTable';
import { ExportarModal } from '../components/ExportarModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_HISTORIAL, ACCION_R, ACCION_E } from '../rbac';
import type { HistorialFiltros as HistorialFiltrosDTO, EstadoDato, OrigenDato, FormatoExportHistorial } from '../types';

export function HistorialView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const puedeExportar = usePermission(RECURSO_HISTORIAL, ACCION_E);

  const { items, estadisticas, paginacion, loading, error, exportando, exportError, cargar, exportar } = useHistorial();
  const [filtros, setFiltros] = useState<HistorialFiltrosState>(HISTORIAL_FILTROS_DEFAULT);
  const [modalExport, setModalExport] = useState(false);

  const build = useCallback(
    (pagina: number): HistorialFiltrosDTO => {
      const f: HistorialFiltrosDTO = {
        fecha_inicio: filtros.fecha_inicio,
        fecha_fin: filtros.fecha_fin,
        pagina,
        por_pagina: 100,
        orden: 'DESC',
        incluir_alertas: true,
      };
      if (filtros.tipo_variable) f.tipo_variable = filtros.tipo_variable.trim();
      if (filtros.categoria_variable) f.categoria_variable = filtros.categoria_variable;
      if (filtros.id_infraestructura) f.id_infraestructura = Number(filtros.id_infraestructura);
      if (filtros.especie) f.especie = filtros.especie.trim();
      if (filtros.estado_dato) f.estado_dato = filtros.estado_dato as EstadoDato;
      if (filtros.origen_dato) f.origen_dato = filtros.origen_dato as OrigenDato;
      return f;
    },
    [filtros]
  );

  useEffect(() => { if (puedeVer) cargar(build(1)); }, [puedeVer]); // eslint-disable-line react-hooks/exhaustive-deps

  const unidadChart = useMemo(() => {
    const unidades = new Set(items.map((i) => i.unidad_medida));
    return unidades.size === 1 ? items[0]?.unidad_medida : undefined;
  }, [items]);

  const doExportar = async (formato: FormatoExportHistorial) => { await exportar(build(paginacion.pagina), formato); };

  if (!puedeVer) return <PermissionDenied seccion="Historial de lecturas" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <History size={20} aria-hidden />{t('historialview.historial_de_lecturas')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          {loading ? 'Cargando…' : `${paginacion.totalRegistros} lectura(s)`}
        </p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {error && (
          <Alert
            variant={error.status === 403 ? 'warning' : 'error'}
            title={error.status === 403 ? 'Sin acceso al historial' : error.status === 400 ? 'Parámetros inválidos' : 'Error al cargar el historial'}
            description={error.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <HistorialFiltros
          value={filtros}
          onChange={setFiltros}
          onAplicar={() => cargar(build(1))}
          onExportar={() => setModalExport(true)}
          puedeExportar={puedeExportar}
        />

        {!loading && items.length > 0 && (
          <>
            <EstadisticasCards estadisticas={estadisticas} />
            <HistorialChart items={items} unidad={unidadChart} />
          </>
        )}

        <HistorialTable items={items} loading={loading} />

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => cargar(build(p))}
        />
      </div>

      {modalExport && (
        <ExportarModal
          exportando={exportando}
          exportError={exportError}
          onExportar={doExportar}
          onClose={() => setModalExport(false)}
        />
      )}
    </div>
  );
}
