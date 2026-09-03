import { useState, useCallback } from 'react';
import { plantillasApi } from '../api/plantillasApi';
import type { PlantillaResponse, RegistrarPlantillaDTO, VersionarPlantillaDTO, AplicarPlantillaDTO, AplicacionPlantillaResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState<PlantillaResponse[]>([]);
  const [historial, setHistorial] = useState<AplicacionPlantillaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const listar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await plantillasApi.listar();
      const data: PlantillaResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setPlantillas(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarPlantillaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await plantillasApi.registrar(dto);
      setPlantillas((prev) => [nueva, ...prev]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const versionar = useCallback(async (id: number, dto: VersionarPlantillaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await plantillasApi.versionar(id, dto);
      // La versión anterior sigue en la lista: el RF exige que una actualización
      // genere una versión nueva, no que sobreescriba la original.
      setPlantillas((prev) => [nueva, ...prev]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const aplicar = useCallback(async (id: number, dto: AplicarPlantillaDTO): Promise<AplicacionPlantillaResponse | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await plantillasApi.aplicar(id, dto);
      return result;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const raw = await plantillasApi.listarHistorial();
      const data: AplicacionPlantillaResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setHistorial(data);
    } catch {
      // historial is optional display
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  return { plantillas, historial, loading, loadingHistorial, saving, error, saveError, listar, registrar, versionar, aplicar, cargarHistorial };
}
