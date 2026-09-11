import { useState, useCallback } from 'react';
import { consultasApi } from '../api/consultasApi';
import type { ConsultaAsociacionResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useInfraestructuraActivo(idActivo: number) {
  const [data, setData] = useState<ConsultaAsociacionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(
    async (tipoConsulta: 'ACTIVA' | 'HISTORIAL' = 'ACTIVA') => {
      setLoading(true);
      setError(null);
      try {
        const res = await consultasApi.infraestructura(idActivo, tipoConsulta);
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
