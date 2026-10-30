// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-29 | Arekkazu | INC-M03-82-G192 RF-62: política de visión configurable desde M09   |
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: mismo contrato para la ventana de retroalimentación |
import { useCallback, useState } from 'react';
import { politicaVisionApi, ventanaRetroalimentacionApi, type ParametroPolitica, type ParametrosApi } from '../api/politicaVisionApi';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

/** Consulta y guarda un grupo de parámetros DEV-14 (política de visión, ventana RF-72). */
export function useParametrosConfigurables(api: ParametrosApi) {
  const [parametros, setParametros] = useState<ParametroPolitica[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setParametros(await api.obtener());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const guardar = useCallback(async (cambios: Record<string, number>): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      setParametros(await api.actualizar(cambios));
      avisarExito('guardado');
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, [api]);

  return { parametros, loading, saving, error, saveError, cargar, guardar };
}

export const usePoliticaVision = () => useParametrosConfigurables(politicaVisionApi);
export const useVentanaRetroalimentacion = () => useParametrosConfigurables(ventanaRetroalimentacionApi);
