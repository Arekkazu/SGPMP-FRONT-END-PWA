import { useState, useCallback } from 'react';
import { variablesAmbientalesApi } from '../api/especiesConfigApi';
import type { VariableAmbientalCatalogo } from '../types';
import type { ApiError } from '../../shared/api/errors';

/** Catálogo de variables ambientales (RF-17) — el mismo para toda la sesión, se carga una vez. */
export function useVariablesAmbientales() {
  const [variables, setVariables] = useState<VariableAmbientalCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVariables(await variablesAmbientalesApi.listar());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  return { variables, loading, error, cargar };
}
