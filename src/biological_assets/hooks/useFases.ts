import { useState, useCallback } from 'react';
import { fasesApi } from '../api/fasesApi';
import type { GestionFaseResponse, CambiarFaseDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useFases(idActivo: number) {
  const [fases, setFases] = useState<GestionFaseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fasesApi.historial(idActivo);
      setFases(data.fases ?? []);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [idActivo]);

  const cambiarFase = useCallback(
    async (dto: CambiarFaseDTO): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        await fasesApi.cambiarFase(idActivo, dto);
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

  return { fases, loading, saving, error, saveError, cargar, cambiarFase, setSaveError };
}
