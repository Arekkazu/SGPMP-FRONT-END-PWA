import { useState, useCallback } from 'react';
import { consultasApi } from '../api/consultasApi';
import type { IndicadoresActivoResponse, ConsultarIndicadoresFiltros } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useIndicadores(idActivo: number) {
  const [data, setData] = useState<IndicadoresActivoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(
    async (filtros: ConsultarIndicadoresFiltros = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await consultasApi.indicadores(idActivo, filtros);
        setData(res);
      } catch (e) {
        setError(e as ApiError);
      } finally {
        setLoading(false);
      }
    },
    [idActivo]
  );

  return { data, loading, error, cargar };
}
