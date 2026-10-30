// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-01/M3-13 RF-59: 7 días por defecto, rangos rápidos consultan, exportación deshabilitada con motivo |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre en el filtro |
// | 2026-10-26 | Arekkazu | INC-M03-180/184-G111/G113 RF-59: el 422 de parámetros inválidos se muestra como tal |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.6 RF-59: una gráfica por variable, sin mezclar unidades en un eje |
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { History } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { Alert } from '../../shared/design-system/Alert';
import { useHistorial } from '../hooks/useHistorial';
import { useAreas } from '../hooks/useAreas';
import { HistorialFiltros, HISTORIAL_FILTROS_DEFAULT, type HistorialFiltrosState } from '../components/HistorialFiltros';
import { EstadisticasCards } from '../components/EstadisticasCards';
import { HistorialChart } from '../components/HistorialChart';
import { HistorialTable } from '../components/HistorialTable';
import { ExportarModal } from '../components/ExportarModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_HISTORIAL, ACCION_R, ACCION_E } from '../rbac';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import type { HistorialFiltros as HistorialFiltrosDTO, EstadoDato, OrigenDato, FormatoExportHistorial } from '../types';

export function HistorialView() {
  const { t } = useT('telemetry');
  const puedeVer = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const puedeExportar = usePermission(RECURSO_HISTORIAL, ACCION_E);

  const { items, estadisticas, paginacion, truncado, vacios, loading, error, exportando, exportError, cargar, exportar } = useHistorial();
  const [filtrosActuales, setFiltros] = useState<HistorialFiltrosState>(HISTORIAL_FILTROS_DEFAULT);
  const areas = useAreas();
  const [modalExport, setModalExport] = useState(false);

  const build = useCallback(
    (pagina: number, filtros: HistorialFiltrosState = filtrosActuales): HistorialFiltrosDTO => {
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
    [filtrosActuales]
  );

  useEffect(() => { if (puedeVer) cargar(build(1)); }, [puedeVer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prototipo 13.6 (M3-09): una gráfica por variable. En un solo eje, pH (0–14) y
  // conductividad (cientos) se aplastaban y la escala no tenía unidad.
  const porVariable = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) map.set(it.tipo_variable, [...(map.get(it.tipo_variable) ?? []), it]);
    return [...map].map(([variable, lecturas]) => {
      const unidades = new Set(lecturas.map((l) => l.unidad_medida));
      return { variable, lecturas, unidad: unidades.size === 1 ? lecturas[0].unidad_medida : undefined };
    });
  }, [items]);

  const doExportar = async (formato: FormatoExportHistorial) => { await exportar(build(paginacion.pagina), formato); };

  if (!puedeVer) return <PermissionDenied seccion="Historial de lecturas" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <History size={20} aria-hidden />{t('historialview.historial_de_lecturas')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          {loading
            ? 'Cargando…'
            : error
              ? '—'
              : truncado.truncado
                ? t('historialview.lecturas_truncadas', { mostradas: formatearNumero(paginacion.totalRegistros), total: formatearNumero(truncado.totalEncontrado) })
                : t('conteo.lecturas', { count: paginacion.totalRegistros, n: formatearNumero(paginacion.totalRegistros) })}
        </p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {error && (
          <Alert
            variant={error.status === 403 ? 'warning' : 'error'}
            title={error.status === 403 ? t('historialview.sin_acceso_al_historial') : error.status === 400 || error.status === 422 ? t('historialview.parametros_invalidos') : t('historialview.error_al_cargar_el_historial')}
            description={error.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        {/* RF-59 E6 / CA-19 (FE-11): más de 10 000 registros llegan truncados con aviso. */}
        {!loading && truncado.truncado && (
          <Alert
            variant="warning"
            title={t('historialview.resultado_truncado')}
            description={t('historialview.resultado_truncado_detalle', { total: formatearNumero(truncado.totalEncontrado), mostradas: formatearNumero(paginacion.totalRegistros) })}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}
        {/* RF-59 E7 / CA-17: el periodo tiene intervalos sin lecturas. */}
        {!loading && vacios.length > 0 && (
          <Alert
            variant="info"
            title={t('historialview.periodo_con_vacios', { count: vacios.length })}
            description={t('historialview.periodo_con_vacios_detalle')}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <HistorialFiltros
          areas={areas}
          value={filtrosActuales}
          onChange={setFiltros}
          onAplicar={(v) => cargar(build(1, v))}
          onExportar={() => setModalExport(true)}
          puedeExportar={puedeExportar}
        />

        {!loading && items.length > 0 && (
          <>
            <EstadisticasCards estadisticas={estadisticas} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', columnGap: 'var(--s4)' }}>
              {porVariable.map(({ variable, lecturas, unidad }) => (
                <HistorialChart
                  key={variable}
                  titulo={unidad ? `${etiquetaCodigo(variable)} (${unidad})` : etiquetaCodigo(variable)}
                  items={lecturas}
                  unidad={unidad}
                  vacios={vacios.filter((v) => v.tipo_variable === variable)}
                  alto={porVariable.length > 1 ? 200 : 280}
                />
              ))}
            </div>
          </>
        )}

        {/* M3-01: con error no se muestra además "Sin lecturas para el rango". */}
        {!error && <HistorialTable items={items} loading={loading} vacios={vacios} />}

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
