// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-20 | Arekkazu | FE-09 RF-17: marcar o desmarcar una variable como crítica (RFC-016) |
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

  // RFC-016 B.7: el resultado reemplaza la variable en la lista; ante error se informa y no cambia nada.
  const [guardando, setGuardando] = useState<number | null>(null);
  const [errorCritica, setErrorCritica] = useState<ApiError | null>(null);
  const marcarCritica = useCallback(async (id: number, esCritica: boolean) => {
    setGuardando(id);
    setErrorCritica(null);
    try {
      const actualizada = await variablesAmbientalesApi.marcarCritica(id, esCritica);
      setVariables((vs) => vs.map((v) => (v.id_variable_ambiental === id ? { ...v, ...actualizada } : v)));
      return true;
    } catch (e) {
      setErrorCritica(e as ApiError);
      return false;
    } finally {
      setGuardando(null);
    }
  }, []);

  return { variables, loading, error, cargar, marcarCritica, guardando, errorCritica };
}
