import { useState, useCallback } from 'react';
import { fincasApi } from '../api/fincasApi';
import { cacheFincas, getFincasCache } from '../db/fincasTable';
import type { FincaResponse, RegistrarFincaDTO, EditarFincaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useFincas() {
  const [fincas, setFincas] = useState<FincaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (soloActivas = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fincasApi.listar(soloActivas);
      const data: FincaResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setFincas(data);
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheFincas(
          data.map((f) => ({
            id_finca: f.id_finca,
            nombre: f.nombre,
            departamento: f.ubicacion.departamento,
            municipio: f.ubicacion.municipio,
            es_activo: f.es_activo,
            cachedAt: now,
          }))
        );
      } catch {
        // cache failure is non-critical
      }
    } catch (e) {
      const cached = await getFincasCache();
      if (cached.length > 0) {
        setFincas(
          cached.map((c) => ({
            id_finca: c.id_finca,
            nombre: c.nombre,
            ubicacion: { departamento: c.departamento, municipio: c.municipio, vereda: '', latitud: 0, longitud: 0 },
            tamano_h: 0,
            es_activo: c.es_activo,
            fecha_creacion: '',
            fecha_actualizacion: '',
            id_usuario: null,
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

  const registrar = useCallback(async (dto: RegistrarFincaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await fincasApi.registrar(dto);
      setFincas((prev) => [...prev, nueva]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarFincaDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizada = await fincasApi.editar(id, dto);
      setFincas((prev) => prev.map((f) => (f.id_finca === id ? actualizada : f)));
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
      const actualizada = await fincasApi.desactivar(id);
      setFincas((prev) => prev.map((f) => (f.id_finca === id ? actualizada : f)));
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
      const actualizada = await fincasApi.reactivar(id);
      setFincas((prev) => prev.map((f) => (f.id_finca === id ? actualizada : f)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { fincas, loading, saving, error, saveError, fromCache, cargar, registrar, editar, desactivar, reactivar };
}
