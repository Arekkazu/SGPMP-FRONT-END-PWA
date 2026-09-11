import { useState, useCallback } from 'react';
import { auditoriaApi } from '../api/auditoriaApi';
import { cacheAuditoria, getAuditoriaCache } from '../db/prediccionTables';
import type {
  EventoAuditoriaM04Response,
  ListarAuditoriaFiltros,
  ExportarAuditoriaFiltros,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  porPagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export interface ResumenAuditoria {
  total: number;
  warnings: number;
  errores: number;
  criticos: number;
}

/**
 * RF-73 · Bitácora de auditoría M04 (solo Admin).
 * Lista paginada por número de página, detalle, resumen por severidad y export blob.
 */
export function useAuditoria() {
  const [eventos, setEventos] = useState<EventoAuditoriaM04Response[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, porPagina: 50, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [resumen, setResumen] = useState<ResumenAuditoria | null>(null);

  const cargar = useCallback(async (filtros: ListarAuditoriaFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditoriaApi.listar({ por_pagina: 50, ...filtros });
      const items = data.items ?? [];
      const porPagina = data.por_pagina || 50;
      setEventos(items);
      setPaginacion({
        pagina: data.pagina ?? 1,
        porPagina,
        totalRegistros: data.total ?? items.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? items.length) / porPagina)),
      });
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheAuditoria(
          items.map((e) => ({
            id_evento: e.id_evento,
            tipo_evento: e.tipo_evento,
            severidad_evento: e.severidad_evento,
            fecha_evento: e.fecha_evento,
            tipo_actor: e.tipo_actor,
            resultado_operacion: e.resultado_operacion,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      const cached = await getAuditoriaCache();
      if (cached.length > 0) {
        setEventos(
          cached.map((c) => ({
            id_evento: c.id_evento,
            tipo_evento: c.tipo_evento,
            modulo: 'prediccion',
            fecha_evento: c.fecha_evento,
            tipo_actor: c.tipo_actor as EventoAuditoriaM04Response['tipo_actor'],
            correlacion_id: null,
            payload_evento: null,
            es_payload_truncado: false,
            severidad_evento: c.severidad_evento as EventoAuditoriaM04Response['severidad_evento'],
            origen_registro: null, id_usuario: null, id_sistema: null, id_referencia: null,
            entidad_referencia: null, resultado_operacion: c.resultado_operacion, codigo_error: null,
            descripcion_error: null, origen_dato: null, version_modelo: null, latencia_ms: null, hash_evento: null,
          }))
        );
        setFromCache(true);
        return;
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarResumen = useCallback(async (filtros: ListarAuditoriaFiltros = {}) => {
    try {
      const [total, warn, err, crit] = await Promise.all([
        auditoriaApi.listar({ ...filtros, por_pagina: 1 }),
        auditoriaApi.listar({ ...filtros, severidad_evento: 'WARNING', por_pagina: 1 }),
        auditoriaApi.listar({ ...filtros, severidad_evento: 'ERROR', por_pagina: 1 }),
        auditoriaApi.listar({ ...filtros, severidad_evento: 'CRITICAL', por_pagina: 1 }),
      ]);
      setResumen({
        total: total.total ?? 0,
        warnings: warn.total ?? 0,
        errores: err.total ?? 0,
        criticos: crit.total ?? 0,
      });
    } catch {
      setResumen(null);
    }
  }, []);

  const detalle = useCallback(async (id: string): Promise<EventoAuditoriaM04Response | null> => {
    try {
      return await auditoriaApi.detalle(id);
    } catch {
      return null;
    }
  }, []);

  const exportar = useCallback(async (filtros: ExportarAuditoriaFiltros): Promise<boolean> => {
    setExporting(true);
    try {
      const blob = await auditoriaApi.exportar(filtros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_m04.${filtros.formato === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  return { eventos, paginacion, loading, exporting, error, fromCache, resumen, cargar, cargarResumen, detalle, exportar };
}
