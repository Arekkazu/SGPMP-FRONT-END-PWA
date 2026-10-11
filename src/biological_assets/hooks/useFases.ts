import { useState, useCallback } from 'react';
import { fasesApi } from '../api/fasesApi';
import type { CicloProductivoAsignable, GestionFaseResponse, CambiarFaseDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useFases(idActivo: number) {
  const [fases, setFases] = useState<GestionFaseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [ciclos, setCiclos] = useState<CicloProductivoAsignable[]>([]);
  const [ciclosLoading, setCiclosLoading] = useState(false);

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

  // #288: los ciclos salen del activo (filtrados por su especie), no de los
  // ciclos biológicos de M09, cuyo ID no es un id_ciclo_productiva.
  const cargarCiclos = useCallback(async () => {
    setCiclosLoading(true);
    try {
      setCiclos(await fasesApi.ciclosProductivos(idActivo));
    } catch (e) {
      setSaveError(e as ApiError);
    } finally {
      setCiclosLoading(false);
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

  return { fases, loading, saving, error, saveError, cargar, cambiarFase, setSaveError, ciclos, ciclosLoading, cargarCiclos };
}
