import { useState, useCallback } from 'react';
import { consultasApi } from '../api/consultasApi';
import type { FichaIntegralResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useFichaIntegral(idActivo: number) {
  const [ficha, setFicha] = useState<FichaIntegralResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await consultasApi.fichaIntegral(idActivo);
      setFicha(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [idActivo]);

  return { ficha, loading, error, cargar };
}
