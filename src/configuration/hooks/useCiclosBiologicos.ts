import { useState, useCallback } from 'react';
import { ciclosApi } from '../api/especiesConfigApi';
import { cacheCiclos, getCiclosCache } from '../db/ciclosTable';
import { enqueue, registerSyncHandler } from '../../shared/sync/syncQueue';
import type { CicloBiologicoResponse, RegistrarCicloDTO, EditarCicloDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

// #54 (RF-16): CU-03 exige almacenamiento local y sincronización diferida al
// reconectar para este módulo — "Nuevo ciclo" estaba deshabilitado offline sin
// ninguna cola de por medio. Registrado una sola vez (efecto de carga del
// módulo): useSyncOnReconnect() dispara replay() con esto ya cargado.
registerSyncHandler('ciclos_biologicos', async (accion, payload) => {
  if (accion === 'crear') {
    await ciclosApi.registrar(payload as RegistrarCicloDTO);
    return;
  }
  if (accion === 'editar') {
    const { id, dto } = payload as { id: number; dto: EditarCicloDTO };
    await ciclosApi.editar(id, dto);
    return;
  }
  if (accion === 'desactivar') {
    const { id } = payload as { id: number };
    await ciclosApi.desactivar(id);
  }
});

export function useCiclosBiologicos() {
  const [ciclos, setCiclos] = useState<CicloBiologicoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (idEspecie: number, soloActivos = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await ciclosApi.listar(idEspecie, soloActivos);
      const data: CicloBiologicoResponse[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
      setCiclos(data);
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheCiclos(idEspecie, data.map((c) => ({
          id_ciclo_biologico: c.id_ciclo_biologico,
          nombre: c.nombre,
          descripcion: c.descripcion,
          duracion_dias: c.duracion_dias,
          id_especie: c.id_especie,
          es_activo: c.es_activo,
          fecha_actualizacion: c.fecha_actualizacion,
          cachedAt: now,
        })));
      } catch {
        // cache failure is non-critical
      }
    } catch (e) {
      const cached = await getCiclosCache(idEspecie);
      if (cached.length > 0) {
        setCiclos(cached.map((c) => ({
          id_ciclo_biologico: c.id_ciclo_biologico,
          nombre: c.nombre,
          descripcion: c.descripcion,
          duracion_dias: c.duracion_dias,
          id_especie: c.id_especie,
          es_activo: c.es_activo,
          fecha_actualizacion: c.fecha_actualizacion,
        })));
        setFromCache(true);
      } else {
        setError(e as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(async (dto: RegistrarCicloDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    if (!navigator.onLine) {
      await enqueue('ciclos_biologicos', 'crear', dto);
      setCiclos((prev) => [...prev, {
        id_ciclo_biologico: -Date.now(),
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        duracion_dias: dto.duracion_dias,
        id_especie: dto.id_especie,
        es_activo: true,
        fecha_actualizacion: null,
        pendienteSync: true,
      }]);
      setSaving(false);
      return true;
    }
    try {
      const nuevo = await ciclosApi.registrar(dto);
      setCiclos((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const editar = useCallback(async (id: number, dto: EditarCicloDTO): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    if (!navigator.onLine) {
      await enqueue('ciclos_biologicos', 'editar', { id, dto });
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id
        ? { ...c, nombre: dto.nombre, descripcion: dto.descripcion ?? null, duracion_dias: dto.duracion_dias, pendienteSync: true }
        : c)));
      setSaving(false);
      return true;
    }
    try {
      const actualizado = await ciclosApi.editar(id, dto);
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id ? actualizado : c)));
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
    if (!navigator.onLine) {
      await enqueue('ciclos_biologicos', 'desactivar', { id });
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id ? { ...c, es_activo: false, pendienteSync: true } : c)));
      setSaving(false);
      return true;
    }
    try {
      const actualizado = await ciclosApi.desactivar(id);
      setCiclos((prev) => prev.map((c) => (c.id_ciclo_biologico === id ? actualizado : c)));
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { ciclos, loading, saving, error, saveError, fromCache, cargar, registrar, editar, desactivar };
}
