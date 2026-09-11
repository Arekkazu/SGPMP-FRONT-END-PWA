import { useState, useCallback } from 'react';
import { activosApi } from '../api/activosApi';
import type { ActivoBiologicoResponse, ActualizarActivoIndividualDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useActivoDetalle(idActivo: number) {
  const [activo, setActivo] = useState<ActivoBiologicoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activosApi.consultar(idActivo);
      setActivo(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [idActivo]);

  const actualizarIndividual = useCallback(
    async (dto: ActualizarActivoIndividualDTO): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        const actualizado = await activosApi.actualizarIndividual(idActivo, dto);
        setActivo(actualizado);
        return true;
      } catch (e) {
        setSaveError(e as ApiError);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [idActivo]
  );

  return { activo, loading, saving, error, saveError, cargar, actualizarIndividual, setActivo };
}
