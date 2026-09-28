import { useState, useCallback } from 'react';
import { especiesApi } from '../api/especiesApi';
import { cacheEspecies, getEspeciesCache } from '../db/especiesTable';
import { enqueue, registerSyncHandler, getConflictos, removeFromQueue } from '../../shared/sync/syncQueue';
import type { EspecieResponse, RegistrarEspecieDTO, EditarEspecieDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import type { SyncOperation } from '../../shared/db/db';

const MODULO = 'config_especies';

// #115 (RF-15): CU exige almacenamiento local y sincronización diferida al
// reconectar — "Nueva especie" estaba deshabilitado offline sin ninguna cola
// de por medio. Registrado una sola vez (efecto de carga del módulo):
// useSyncOnReconnect() (montado en App.tsx) dispara replay() con esto ya cargado.
registerSyncHandler(MODULO, async (accion, payload) => {
  if (accion === 'crear') {
    const { dto } = payload as { tempId: number; dto: RegistrarEspecieDTO };
    await especiesApi.registrar(dto);
  }
});

export function useEspecies() {
  const [especies, setEspecies] = useState<EspecieResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [conflictos, setConflictos] = useState<SyncOperation[]>([]);

  const cargarConflictos = useCallback(async () => {
    setConflictos(await getConflictos(MODULO));
  }, []);

  const cargar = useCallback(async (soloActivas = false) => {
    setLoading(true);
    setError(null);
    await cargarConflictos();
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
  }, [cargarConflictos]);

  const registrar = useCallback(async (dto: RegistrarEspecieDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    if (!navigator.onLine) {
      const tempId = -Date.now();
      await enqueue(MODULO, 'crear', { tempId, dto });
      setEspecies((prev) => [...prev, {
        id_especie: tempId,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        es_activo: true,
        fecha_creacion: '',
        fecha_actualizacion: null,
        pendienteSync: true,
      }]);
      setSaving(false);
      return true;
    }
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

  /** #115 (RF-15): descarta una creación offline que el backend rechazó en firme al sincronizar (ver `syncQueue.replay`). */
  const resolverConflicto = useCallback(async (op: SyncOperation): Promise<void> => {
    if (op.id === undefined) return;
    await removeFromQueue(op.id);
    if (op.accion === 'crear') {
      const { tempId } = op.payload as { tempId: number };
      setEspecies((prev) => prev.filter((e) => e.id_especie !== tempId));
    }
    await cargarConflictos();
  }, [cargarConflictos]);

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
    conflictos,
    cargar,
    registrar,
    editar,
    desactivar,
    reactivar,
    resolverConflicto,
  };
}
