import { useState, useCallback } from 'react';
import { auditoriaApi } from '../api/auditoriaApi';
import type {
  EventoAuditoriaIotSchema,
  AuditoriaFiltros,
  VerificacionIntegridadSchema,
  FormatoExportBitacora,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function useAuditoriaIot() {
  const [items, setItems] = useState<EventoAuditoriaIotSchema[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<ApiError | null>(null);

  const [verificando, setVerificando] = useState(false);
  const [verificacion, setVerificacion] = useState<VerificacionIntegridadSchema | null>(null);
  const [verificarError, setVerificarError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (filtros: AuditoriaFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditoriaApi.listar({ por_pagina: 50, ...filtros });
      const its = data.items ?? [];
      const porPagina = data.por_pagina || 50;
      setItems(its);
      setPaginacion({
        pagina: data.pagina ?? 1,
        totalRegistros: data.total ?? its.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? its.length) / porPagina)),
      });
    } catch (e) {
      setError(e as ApiError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportar = useCallback(async (filtros: AuditoriaFiltros, formato: FormatoExportBitacora): Promise<boolean> => {
    setExportando(true);
    setExportError(null);
    try {
      const blob = await auditoriaApi.exportar(filtros, formato);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitacora_auditoria_iot.${formato}`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      setExportError(e as ApiError);
      return false;
    } finally {
      setExportando(false);
    }
  }, []);

  const verificar = useCallback(async (fechaDesde?: string, fechaHasta?: string): Promise<void> => {
    setVerificando(true);
    setVerificarError(null);
    setVerificacion(null);
    try {
      const r = await auditoriaApi.verificarIntegridad(fechaDesde, fechaHasta);
      setVerificacion(r);
    } catch (e) {
      setVerificarError(e as ApiError);
    } finally {
      setVerificando(false);
    }
  }, []);

  const limpiarVerificacion = useCallback(() => { setVerificacion(null); setVerificarError(null); }, []);

  return {
    items, paginacion, loading, error,
    exportando, exportError, exportar,
    verificando, verificacion, verificarError, verificar, limpiarVerificacion,
    cargar,
  };
}
