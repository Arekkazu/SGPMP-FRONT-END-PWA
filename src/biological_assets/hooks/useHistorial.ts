import { useState, useCallback } from 'react';
import { consultasApi } from '../api/consultasApi';
import type { RegistroHistorialResponse, ConsultarHistorialFiltros } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function useHistorial(idActivo: number) {
  const [registros, setRegistros] = useState<RegistroHistorialResponse[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(
    async (filtros: ConsultarHistorialFiltros = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await consultasApi.historial(idActivo, filtros);
        setRegistros(res.registros ?? []);
        setPaginacion({
          pagina: res.pagina_actual ?? 1,
          totalPaginas: res.total_paginas ?? 1,
          totalRegistros: res.total_registros ?? (res.registros?.length ?? 0),
        });
      } catch (e) {
        setError(e as ApiError);
      } finally {
        setLoading(false);
      }
    },
    [idActivo]
  );

  return { registros, paginacion, loading, error, cargar };
}
