import { useState, useCallback } from 'react';
import { umbralesApi } from '../api/especiesConfigApi';
import type { UmbralAmbientalResponse, RegistrarUmbralDTO, EditarUmbralDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useUmbralesAmbientales() {
  const [umbrales, setUmbrales] = useState<UmbralAmbientalResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (idEspecie: number, soloActivos = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await umbralesApi.listar(idEspecie, soloActivos);
      const data: UmbralAmbientalResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setUmbrales(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarUmbralDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nuevo = await umbralesApi.registrar(dto);
      setUmbrales((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarUmbralDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await umbralesApi.editar(id, dto);
      setUmbrales((prev) => prev.map((u) => (u.id_umbral_ambiental === id ? actualizado : u)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const desactivar = useCallback(async (id: number): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await umbralesApi.desactivar(id);
      setUmbrales((prev) => prev.map((u) => (u.id_umbral_ambiental === id ? actualizado : u)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { umbrales, loading, saving, error, saveError, cargar, registrar, editar, desactivar };
}
