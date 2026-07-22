import { useState, useCallback } from 'react';
import { especiesApi } from '../api/especiesApi';
import { cacheEspecies, getEspeciesCache } from '../db/especiesTable';
import type { EspecieResponse, RegistrarEspecieDTO, EditarEspecieDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useEspecies() {
  const [especies, setEspecies] = useState<EspecieResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (soloActivas = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await especiesApi.listar(soloActivas);
      const data: EspecieResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setEspecies(data);
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheEspecies(
          data.map((e) => ({
            id_especie: e.id_especie,
            nombre: e.nombre,
            descripcion: e.descripcion,
            es_activo: e.es_activo,
            cachedAt: now,
          }))
        );
      } catch {
        // cache failure is non-critical
      }
    } catch (e) {
      const cached = await getEspeciesCache();
      if (cached.length > 0) {
        setEspecies(
          cached.map((c) => ({
            id_especie: c.id_especie,
            nombre: c.nombre,
            descripcion: c.descripcion,
            es_activo: c.es_activo,
            fecha_creacion: '',
            fecha_actualizacion: null,
          }))
        );
        setFromCache(true);
      } else {
        setError(e as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarEspecieDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await especiesApi.registrar(dto);
      setEspecies((prev) => [...prev, nueva]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarEspecieDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await especiesApi.editar(id, dto);
      setEspecies((prev) => prev.map((e) => (e.id_especie === id ? actualizada : e)));
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
      const actualizada = await especiesApi.desactivar(id);
      setEspecies((prev) => prev.map((e) => (e.id_especie === id ? actualizada : e)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const reactivar = useCallback(async (id: number): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await especiesApi.reactivar(id);
      setEspecies((prev) => prev.map((e) => (e.id_especie === id ? actualizada : e)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    especies,
    loading,
    saving,
    error,
    saveError,
    fromCache,
    cargar,
    registrar,
    editar,
    desactivar,
    reactivar,
  };
}
