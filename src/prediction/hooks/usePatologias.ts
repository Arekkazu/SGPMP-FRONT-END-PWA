import { useState, useCallback } from 'react';
import { patologiasApi } from '../api/patologiasApi';
import { cachePatologias, getPatologiasCache } from '../db/prediccionTables';
import type {
  PatologiaM04Response,
  ListarPatologiasFiltros,
  RegistrarPatologiaDTO,
  EditarPatologiaDTO,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/**
 * RF-64 · Catálogo de patologías.
 * Orquesta lista (con caché Dexie read-only), detalle y mutaciones CRUD.
 */
export function usePatologias() {
  const [patologias, setPatologias] = useState<PatologiaM04Response[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (filtros: ListarPatologiasFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await patologiasApi.listar(filtros);
      const items = data.items ?? [];
      setPatologias(items);
      setTotal(data.total ?? items.length);
      setFromCache(false);
      const now = Date.now();
      try {
        await cachePatologias(
          items.map((p) => ({
            id_patologia: p.id_patologia,
            nombre_patologia: p.nombre_patologia,
            especie_aplicable: p.especie_aplicable,
            es_base: p.es_base,
            es_activo: p.es_activo,
            version_catalogo: p.version_catalogo,
            fecha_actualizacion: p.fecha_actualizacion,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      const cached = await getPatologiasCache();
      if (cached.length > 0) {
        setPatologias(
          cached.map((c) => ({
            id_patologia: c.id_patologia,
            nombre_patologia: c.nombre_patologia,
            especie_aplicable: c.especie_aplicable,
            descripcion_clinica: '',
            es_base: c.es_base,
            es_activo: c.es_activo,
            version_catalogo: c.version_catalogo,
            variables_sensoricas_asociadas: [],
            fecha_creacion_m04: '',
            fecha_actualizacion: c.fecha_actualizacion,
          }))
        );
        setTotal(cached.length);
        setFromCache(true);
        return;
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const detalle = useCallback(async (id: number): Promise<PatologiaM04Response | null> => {
    try {
      return await patologiasApi.detalle(id);
    } catch {
      return null;
    }
  }, []);

  const crear = useCallback(async (dto: RegistrarPatologiaDTO): Promise<PatologiaM04Response | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      return await patologiasApi.registrar(dto);
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(
    async (id: number, dto: EditarPatologiaDTO): Promise<PatologiaM04Response | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        return await patologiasApi.editar(id, dto);
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const desactivar = useCallback(async (id: number): Promise<PatologiaM04Response | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      return await patologiasApi.desactivar(id);
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

  return {
    patologias, total, loading, saving, error, saveError, fromCache,
    cargar, detalle, crear, editar, desactivar, limpiarSaveError,
  };
}
