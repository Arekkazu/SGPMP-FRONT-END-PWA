// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M03-135-G01 RF-49: especies compatibles de un sensor |
import { useCallback, useState } from 'react';
import { especiesCompatiblesApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';

/** RF-49 R3: lista blanca de especies del sensor que M02 valida al asociarlo a un animal. */
export function useEspeciesCompatibles() {
  const [ids, setIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idSensor: number) => {
    setLoading(true);
    setError(null);
    setSaveError(null);
    try {
      setIds((await especiesCompatiblesApi.obtener(idSensor)).especies.map((e) => e.id_especie));
    } catch (e) {
      setIds([]);
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (idSensor: number, idsEspecies: number[]): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      setIds((await especiesCompatiblesApi.reemplazar(idSensor, idsEspecies)).especies.map((e) => e.id_especie));
      avisarExito('guardado');
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { ids, loading, saving, error, saveError, cargar, guardar };
}
