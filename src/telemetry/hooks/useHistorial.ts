import { useState, useCallback } from 'react';
import { monitoreoApi } from '../api/monitoreoApi';
import type {
  LecturaHistoricaSchema,
  ResumenEstadisticoSchema,
  HistorialFiltros,
  FormatoExportHistorial,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function useHistorial() {
  const [items, setItems] = useState<LecturaHistoricaSchema[]>([]);
  const [estadisticas, setEstadisticas] = useState<ResumenEstadisticoSchema[]>([]);
  const [rangoReal, setRangoReal] = useState<Record<string, unknown>>({});
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (filtros: HistorialFiltros) => {
    setLoading(true);
    setError(null);
    try {
      const data = await monitoreoApi.historial(filtros);
      setItems(data.items ?? []);
      setEstadisticas(data.estadisticas ?? []);
      setRangoReal(data.rango_real_datos ?? {});
      setPaginacion({
        pagina: data.pagina ?? 1,
        totalPaginas: data.paginas_totales ?? 1,
        totalRegistros: data.total ?? (data.items?.length ?? 0),
      });
    } catch (e) {
      setError(e as ApiError);
      setItems([]);
      setEstadisticas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exportar historial. ⚠️ El backend responde SIEMPRE 503 (stub M08); se maneja
   * el error de forma elegante. Si algún día M08 existe, ya descarga el Blob.
   */
  const exportar = useCallback(
    async (filtros: HistorialFiltros, formato: FormatoExportHistorial): Promise<boolean> => {
      setExportando(true);
      setExportError(null);
      try {
        const { incluir_alertas, orden, ...rest } = filtros;
        void incluir_alertas; void orden;
        const blob = await monitoreoApi.exportarHistorial(rest, formato);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_telemetria.${formato === 'PDF' ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      } catch (e) {
        setExportError(e as ApiError);
        return false;
      } finally {
        setExportando(false);
      }
    },
    []
  );

  return { items, estadisticas, rangoReal, paginacion, loading, error, exportando, exportError, cargar, exportar };
}
