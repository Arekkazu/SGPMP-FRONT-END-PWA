import { useState, useCallback, useEffect, useRef } from 'react';
import { especiesApi } from '../api/especiesApi';
import { cacheEspecies, getEspeciesCache } from '../db/especiesTable';
import {
  enqueue, registerSyncHandler, getConflictos, getQueue, removeFromQueue, SYNC_REPLAY_TERMINADO,
} from '../../shared/sync/syncQueue';
import type { EspecieResponse, RegistrarEspecieDTO, EditarEspecieDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import type { SyncOperation } from '../../shared/db/db';
import { avisarExito } from '../../shared/hooks/useToast';

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

const filaPendiente = (tempId: number, dto: RegistrarEspecieDTO): EspecieResponse => ({
  id_especie: tempId,
  nombre: dto.nombre,
  descripcion: dto.descripcion ?? null,
  es_activo: true,
  fecha_creacion: '',
  fecha_actualizacion: null,
  pendienteSync: true,
});

/**
 * #450 (RF-15): creaciones offline que siguen en cola sin conflicto. Al recargar la
 * lista hay que volver a mostrarlas -- `cargar` reemplaza la lista entera, y sin esto
 * una especie todavía pendiente de sincronizar desaparecería de la tabla. La más
 * reciente primero, igual que al crearla.
 */
async function pendientesDeCola(): Promise<EspecieResponse[]> {
  try {
    const cola = await getQueue();
    return cola
      .filter((op) => op.modulo === MODULO && op.accion === 'crear' && !op.conflicto)
      .map((op) => {
        const { tempId, dto } = op.payload as { tempId: number; dto: RegistrarEspecieDTO };
        return filaPendiente(tempId, dto);
      })
      .reverse();
  } catch {
    return []; // IndexedDB no disponible: se muestra la lista sin las pendientes
  }
}

export function useEspecies() {
  const [especies, setEspecies] = useState<EspecieResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [conflictos, setConflictos] = useState<SyncOperation[]>([]);
  // `soloActivas` de la última carga; `null` = esta instancia todavía no cargó nada.
  const ultimaCargaRef = useRef<boolean | null>(null);

  const cargarConflictos = useCallback(async () => {
    setConflictos(await getConflictos(MODULO));
  }, []);

  const cargar = useCallback(async (soloActivas = false) => {
    ultimaCargaRef.current = soloActivas;
    setLoading(true);
    setError(null);
    await cargarConflictos();
    try {
      const data = await especiesApi.listar(soloActivas);
      setEspecies([...(await pendientesDeCola()), ...data]);
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
        setEspecies([
          ...(await pendientesDeCola()),
          ...cached.map((c) => ({
            id_especie: c.id_especie,
            nombre: c.nombre,
            descripcion: c.descripcion,
            es_activo: c.es_activo,
            fecha_creacion: '',
            fecha_actualizacion: null,
          })),
        ]);
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
      // Al inicio, no al final: la tabla está paginada y al final la fila quedaría en la
      // última página, fuera de la vista donde el usuario acaba de crearla (#450).
      setEspecies((prev) => [filaPendiente(tempId, dto), ...prev]);
      setSaving(false);
      avisarExito('pendiente_sync', dto.nombre);
      return true;
    }
    try {
      const nueva = await especiesApi.registrar(dto);
      // T-02: al inicio, como la fila offline (#450), para que no quede perdida en la última página.
      setEspecies((prev) => [nueva, ...prev]);
      avisarExito('registrado', nueva.nombre);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // #450 (RF-15): `replay()` corre fuera de React; al terminar avisa por evento y acá se
  // recarga (lo que sincronizó deja de ser "pendiente" y los rechazos en firme muestran
  // su alerta de conflicto). Solo si esta instancia ya cargó, y con el mismo `soloActivas`.
  useEffect(() => {
    const alTerminarReplay = () => {
      if (ultimaCargaRef.current !== null) void cargar(ultimaCargaRef.current);
    };
    window.addEventListener(SYNC_REPLAY_TERMINADO, alTerminarReplay);
    return () => window.removeEventListener(SYNC_REPLAY_TERMINADO, alTerminarReplay);
  }, [cargar]);

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
      avisarExito('guardado', actualizada.nombre);
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
      avisarExito('desactivado', actualizada.nombre);
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
      avisarExito('reactivado', actualizada.nombre);
      return true;
    } catch (e) {
      setSaveError(e as ApiError);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

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
    limpiarSaveError,
  };
}
