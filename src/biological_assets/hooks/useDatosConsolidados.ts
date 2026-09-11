import { useState, useCallback } from 'react';
import { consultasApi } from '../api/consultasApi';
import type { DatosConsolidadosResponse, DatosConsolidadosFiltros } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useDatosConsolidados(idActivo: number) {
  const [data, setData] = useState<DatosConsolidadosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(
    async (filtros: DatosConsolidadosFiltros = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await consultasApi.datosConsolidados(idActivo, filtros);
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
