import { useState, useCallback } from 'react';
import { auditoriaApi } from '../api/auditoriaApi';
import type { AuditoriaItemResponse, FiltrosAuditoria } from '../types';
import type { ApiError } from '../../shared/api/errors';

const DEFAULT_FILTROS: FiltrosAuditoria = { pagina: 1, tamano: 20 };

export function useAuditoria() {
  const [eventos, setEventos] = useState<AuditoriaItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(DEFAULT_FILTROS);

  const cargar = useCallback(async (f: FiltrosAuditoria = filtros) => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditoriaApi.consultar(f);
      setEventos(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const actualizarFiltros = useCallback((nuevos: Partial<FiltrosAuditoria>) => {
    const actualizados = { ...filtros, ...nuevos, pagina: nuevos.pagina ?? 1 };
    setFiltros(actualizados);
    cargar(actualizados);
  }, [filtros, cargar]);

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
    cargar(DEFAULT_FILTROS);
  }, [cargar]);

  return { eventos, total, loading, error, filtros, cargar, actualizarFiltros, resetFiltros };
}
