import { useState, useCallback } from 'react';
import { modelosApi } from '../api/modelosApi';
import { cacheModelos, getModelosCache } from '../db/prediccionTables';
import type {
  VersionModeloResponse,
  ListarModelosFiltros,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

const LIMIT = 20;

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

/**
 * RF-69 · Ciclo de vida de versiones de modelos IA.
 * Lista paginada (limit/offset) con caché read-only, detalle, notas y activación.
 */
export function useModelos() {
  const [modelos, setModelos] = useState<VersionModeloResponse[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (filtros: ListarModelosFiltros = {}, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await modelosApi.listar({ ...filtros, limit: LIMIT, offset: (pagina - 1) * LIMIT });
      const items = data.items ?? [];
      setModelos(items);
      setPaginacion({
        pagina,
        totalRegistros: data.total ?? items.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? items.length) / LIMIT)),
      });
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheModelos(
          items.map((m) => ({
            id_version_modelo: m.id_version_modelo,
            nombre_version: m.nombre_version,
            tipo_modelo: m.tipo_modelo,
            estado_version: m.estado_version,
            f1_score: m.f1_score,
            recall_clase_riesgo_alto: m.recall_clase_riesgo_alto,
            esta_produccion: m.esta_produccion,
            fecha_entrenamiento: m.fecha_entrenamiento,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      if (pagina === 1) {
        const cached = await getModelosCache();
        if (cached.length > 0) {
          setModelos(
            cached.map((c) => ({
              id_version_modelo: c.id_version_modelo,
              nombre_version: c.nombre_version,
              tipo_modelo: c.tipo_modelo as VersionModeloResponse['tipo_modelo'],
              estado_version: c.estado_version as VersionModeloResponse['estado_version'],
              formato_artefacto: null, tamanio_artefacto_bytes: null, hash_artefacto_sha256: null,
              dataset_entrenamiento_hash: null, id_proceso_rf71: null, version_referencia: null,
              f1_score: c.f1_score, recall_clase_riesgo_alto: c.recall_clase_riesgo_alto,
              precision_modelo: null, accuracy: null, roc_auc_score: null,
              recall_por_clase: null, matriz_confusion: null, compatibilidad_variables: null,
              notas_validacion: null, detalle_validacion: null,
              esta_produccion: c.esta_produccion,
              fecha_entrenamiento: c.fecha_entrenamiento, fecha_registro: null, fecha_despliegue: null,
            }))
          );
          setPaginacion({ pagina: 1, totalPaginas: 1, totalRegistros: cached.length });
          setFromCache(true);
          return;
        }
      }
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const detalle = useCallback(async (id: number): Promise<VersionModeloResponse | null> => {
    try {
      return await modelosApi.detalle(id);
    } catch {
      return null;
    }
  }, []);

  const guardarNotas = useCallback(async (id: number, notas: string): Promise<VersionModeloResponse | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await modelosApi.registrarNotas(id, { notas_validacion: notas });
      setModelos((prev) => prev.map((m) => (m.id_version_modelo === id ? actualizado : m)));
      return actualizado;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const activar = useCallback(async (id: number): Promise<VersionModeloResponse | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const actualizado = await modelosApi.activar(id);
      setModelos((prev) => prev.map((m) => (m.id_version_modelo === id ? actualizado : m)));
      return actualizado;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const limpiarSaveError = useCallback(() => setSaveError(null), []);

  return {
    modelos, paginacion, loading, saving, error, saveError, fromCache,
    cargar, detalle, guardarNotas, activar, limpiarSaveError,
  };
}
