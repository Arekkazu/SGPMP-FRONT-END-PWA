// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-62: observaciones de visión evaluadas (antes datos de ejemplo) |
import { useCallback, useState } from 'react';
import { calidadApi } from '../api/calidadApi';
import type { ApiError } from '../../shared/api/errors';
import type { FiltrosCalidadVision, ListaCalidadVision } from '../types';

export const POR_PAGINA_VISION = 25;

export function useCalidadVision() {
  const [datos, setDatos] = useState<ListaCalidadVision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (filtros: FiltrosCalidadVision, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      setDatos(await calidadApi.vision(filtros, pagina, POR_PAGINA_VISION));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  return { datos, loading, error, cargar };
}
