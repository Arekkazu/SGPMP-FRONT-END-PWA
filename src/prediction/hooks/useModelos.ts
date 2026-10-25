// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-69: intentos de registro rechazados que quedan en la bitácora M04 |
import { useState, useCallback } from 'react';
import { modelosApi } from '../api/modelosApi';
import { auditoriaApi } from '../api/auditoriaApi';
import { otaApi } from '../api/otaApi';
import { cacheModelos, getModelosCache } from '../db/prediccionTables';
import type {
  DespliegueOtaResponse,
  EventoAuditoriaM04Response,
  VersionModeloResponse,
  ListarModelosFiltros,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

const LIMIT = 20;

/** Rechazos de registro que sí dejan evento (E1b origen no autorizado, E2a hash inválido). */
const EVENTOS_INTENTO = ['INTENTO_CARGA_MODELO_EXTERNO', 'HASH_INVALIDO_DETECTADO'];

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
  const [intentos, setIntentos] = useState<EventoAuditoriaM04Response[]>([]);
  const [intentosError, setIntentosError] = useState<ApiError | null>(null);
  // Contexto del detalle: null = no se pudo consultar (sin permiso o sin red), no "vacío".
  const [transiciones, setTransiciones] = useState<EventoAuditoriaM04Response[] | null>(null);
  const [despliegues, setDespliegues] = useState<DespliegueOtaResponse[] | null>(null);

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
              paradigma: null, componente: null, metricas_poblacionales: null,
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

  /** Pide lectura de auditoría (recurso 46); los rechazos E1, E1c y E2 no dejan evento. */
  const cargarIntentos = useCallback(async () => {
    setIntentosError(null);
    try {
      const listas = await Promise.all(EVENTOS_INTENTO.map((tipo_evento) => auditoriaApi.listar({ tipo_evento, por_pagina: 50 })));
      setIntentos(listas.flatMap((l) => l.items ?? []).sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento)));
    } catch (e) {
      setIntentos([]);
      setIntentosError(e as ApiError);
    }
  }, []);

  /**
   * Historial de transiciones (bitácora M04, recurso 46) y estado OTA de la versión
   * (recurso 44). Cada uno es opcional según permisos y no bloquea el detalle.
   */
  const cargarContexto = useCallback(async (idVersion: number, permisos: { auditoria: boolean; ota: boolean }) => {
    setTransiciones(null);
    setDespliegues(null);
    await Promise.all([
      permisos.auditoria && auditoriaApi.listar({ id_referencia: String(idVersion), por_pagina: 100 })
        .then((d) => setTransiciones((d.items ?? []).filter((e) => e.entidad_referencia === 'version_modelo')))
        .catch(() => setTransiciones(null)),
      permisos.ota && otaApi.estadoPorVersion(idVersion)
        .then((d) => setDespliegues(d.despliegues ?? []))
        .catch(() => setDespliegues(null)),
    ]);
  }, []);

  return {
    modelos, paginacion, loading, saving, error, saveError, fromCache,
    cargar, detalle, guardarNotas, activar, limpiarSaveError,
    intentos, intentosError, cargarIntentos,
    transiciones, despliegues, cargarContexto,
  };
}
