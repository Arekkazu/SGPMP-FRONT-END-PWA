import { useState, useCallback, useRef } from 'react';
import { historialApi } from '../api/historialApi';
import { cacheHistorialEventos, getHistorialEventosCache } from '../db/prediccionTables';
import type {
  EventoHistorialResponse,
  ConsultarHistorialFiltros,
  ActivoSelectorItem,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

/**
 * RF-67 · Historial diagnóstico de un activo (read-only, paginación por cursor).
 * Acumula eventos con "Cargar más" y cachea la última consulta (read-only offline).
 */
export function useHistorial() {
  const [eventos, setEventos] = useState<EventoHistorialResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMas, setLoadingMas] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [activos, setActivos] = useState<ActivoSelectorItem[]>([]);
  const [activosError, setActivosError] = useState(false);

  const ultimaConsulta = useRef<{ id: number; filtros: ConsultarHistorialFiltros } | null>(null);

  const cargarActivos = useCallback(async () => {
    try {
      setActivos(await historialApi.listarActivos());
      setActivosError(false);
    } catch {
      setActivos([]);
      setActivosError(true); // el filtro degrada a input numérico manual
    }
  }, []);

  const consultar = useCallback(async (idActivo: number, filtros: ConsultarHistorialFiltros) => {
    setLoading(true);
    setError(null);
    ultimaConsulta.current = { id: idActivo, filtros };
    try {
      const data = await historialApi.consultar(idActivo, filtros);
      const items = data.eventos ?? [];
      setEventos(items);
      setCursor(data.cursor_siguiente);
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheHistorialEventos(
          items.map((e) => ({
            id_evento: e.id_evento,
            id_activo_biologico: e.id_activo_biologico,
            tipo_evento: e.tipo_evento,
            fecha_evento: e.fecha_evento,
            id_resultado_inferencia: e.id_resultado_inferencia,
            payload: e.payload,
            cachedAt: now,
          }))
        );
      } catch {
        // caché no crítica
      }
    } catch (e) {
      const cached = (await getHistorialEventosCache()).filter((c) => c.id_activo_biologico === idActivo);
      if (cached.length > 0) {
        setEventos(cached.map((c) => ({
          id_evento: c.id_evento,
          tipo_evento: c.tipo_evento,
          id_activo_biologico: c.id_activo_biologico,
          fecha_evento: c.fecha_evento,
          id_resultado_inferencia: c.id_resultado_inferencia,
          payload: c.payload,
        })));
        setCursor(null);
        setFromCache(true);
        return;
      }
      setEventos([]);
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarMas = useCallback(async () => {
    if (!cursor || !ultimaConsulta.current) return;
    setLoadingMas(true);
    try {
      const { id, filtros } = ultimaConsulta.current;
      const data = await historialApi.consultar(id, { ...filtros, cursor_paginacion: cursor });
      setEventos((prev) => [...prev, ...(data.eventos ?? [])]);
      setCursor(data.cursor_siguiente);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoadingMas(false);
    }
  }, [cursor]);

  const limpiar = useCallback(() => {
    setEventos([]);
    setCursor(null);
    setError(null);
    setFromCache(false);
    ultimaConsulta.current = null;
  }, []);

  return {
    eventos, cursor, loading, loadingMas, error, fromCache, activos, activosError,
    cargarActivos, consultar, cargarMas, limpiar,
  };
}
