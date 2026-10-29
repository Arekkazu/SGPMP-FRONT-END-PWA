// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-29 | Arekkazu | INC-M03-82-G192 RF-62: política de visión configurable desde M09   |
import { useCallback, useState } from 'react';
import { politicaVisionApi, type ParametroPolitica } from '../api/politicaVisionApi';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

export function usePoliticaVision() {
  const [parametros, setParametros] = useState<ParametroPolitica[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setParametros(await politicaVisionApi.obtener());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (cambios: Record<string, number>): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      setParametros(await politicaVisionApi.actualizar(cambios));
      avisarExito('guardado');
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { parametros, loading, saving, error, saveError, cargar, guardar };
}
