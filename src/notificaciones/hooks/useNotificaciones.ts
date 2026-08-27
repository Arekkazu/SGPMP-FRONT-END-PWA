import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../../shared/api/errors';
import { notificacionesApi } from '../api/notificacionesApi';
import {
  actualizarLecturaCache,
  guardarNotificacionesCache,
  obtenerNotificacionesCache,
  reemplazarNotificacionesCache,
} from '../db/notificacionesTable';
import type { NotificacionInternaResponse } from '../types';

const TAMANO_PAGINA = 20;
const INTERVALO_ACTUALIZACION_MS = 60_000;

function comoApiError(error: unknown): ApiError {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error as ApiError;
  }
  return {
    code: 'NOTIFICACIONES_NO_DISPONIBLES',
    message: 'No fue posible consultar las notificaciones.',
    status: 0,
  };
}

function combinarSinDuplicados(
  actuales: NotificacionInternaResponse[],
  nuevas: NotificacionInternaResponse[],
): NotificacionInternaResponse[] {
  const porId = new Map(actuales.map((item) => [item.id_notificacion, item]));
  nuevas.forEach((item) => porId.set(item.id_notificacion, item));
  return Array.from(porId.values());
}

export function useNotificaciones(idUsuario: number | null) {
  const [notificaciones, setNotificaciones] = useState<NotificacionInternaResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [marcandoIds, setMarcandoIds] = useState<Set<number>>(new Set());
  const idUsuarioActual = useRef(idUsuario);
  const solicitudActual = useRef(0);
  const marcandoIdsActuales = useRef<Set<number>>(new Set());

  useEffect(() => {
    idUsuarioActual.current = idUsuario;
    solicitudActual.current += 1;
    setNotificaciones([]);
    setTotal(0);
    setNoLeidas(0);
    setPagina(1);
    setError(null);
    setFromCache(false);
    setMarcandoIds(new Set());
    marcandoIdsActuales.current.clear();
  }, [idUsuario]);

  const cargar = useCallback(async (silencioso = false): Promise<void> => {
    if (idUsuario == null || marcandoIdsActuales.current.size > 0) return;
    const usuarioSolicitado = idUsuario;
    const idSolicitud = ++solicitudActual.current;
    if (!silencioso) setLoading(true);
    setError(null);

    try {
      const respuesta = await notificacionesApi.listar({
        pagina: 1,
        tamano: TAMANO_PAGINA,
      });
      if (
        idUsuarioActual.current !== usuarioSolicitado
        || solicitudActual.current !== idSolicitud
      ) return;

      setNotificaciones(respuesta.items);
      setTotal(respuesta.total);
      setNoLeidas(respuesta.no_leidas);
      setPagina(1);
      setFromCache(false);
      try {
        await reemplazarNotificacionesCache(usuarioSolicitado, respuesta.items);
      } catch {
        // La caché offline no debe impedir mostrar una respuesta remota válida.
      }
    } catch (requestError) {
      if (silencioso || idUsuarioActual.current !== usuarioSolicitado) return;
      try {
        const cache = await obtenerNotificacionesCache(usuarioSolicitado);
        if (idUsuarioActual.current !== usuarioSolicitado) return;
        if (cache.length > 0) {
          setNotificaciones(cache);
          setTotal(cache.length);
          setNoLeidas(cache.filter((item) => !item.es_leido).length);
          setPagina(Math.max(1, Math.ceil(cache.length / TAMANO_PAGINA)));
          setFromCache(true);
        } else {
          setError(comoApiError(requestError));
        }
      } catch {
        if (idUsuarioActual.current === usuarioSolicitado) {
          setError(comoApiError(requestError));
        }
      }
    } finally {
      if (idUsuarioActual.current === usuarioSolicitado && !silencioso) {
        setLoading(false);
      }
    }
  }, [idUsuario]);

  useEffect(() => {
    if (idUsuario == null) return;
    void cargar();

    const refrescar = () => void cargar(true);
    const intervalo = window.setInterval(refrescar, INTERVALO_ACTUALIZACION_MS);
    window.addEventListener('focus', refrescar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', refrescar);
    };
  }, [cargar, idUsuario]);

  const cargarMas = useCallback(async (): Promise<void> => {
    if (
      idUsuario == null
      || loadingMore
      || notificaciones.length >= total
      || fromCache
      || marcandoIdsActuales.current.size > 0
    ) return;
    const siguientePagina = pagina + 1;
    const usuarioSolicitado = idUsuario;
    setLoadingMore(true);
    setError(null);

    try {
      const respuesta = await notificacionesApi.listar({
        pagina: siguientePagina,
        tamano: TAMANO_PAGINA,
      });
      if (idUsuarioActual.current !== usuarioSolicitado) return;
      setNotificaciones((actuales) => combinarSinDuplicados(actuales, respuesta.items));
      setTotal(respuesta.total);
      setNoLeidas(respuesta.no_leidas);
      setPagina(siguientePagina);
      try {
        await guardarNotificacionesCache(usuarioSolicitado, respuesta.items);
      } catch {
        // La lista remota sigue siendo utilizable aunque falle IndexedDB.
      }
    } catch (requestError) {
      if (idUsuarioActual.current === usuarioSolicitado) {
        setError(comoApiError(requestError));
      }
    } finally {
      if (idUsuarioActual.current === usuarioSolicitado) setLoadingMore(false);
    }
  }, [fromCache, idUsuario, loadingMore, notificaciones.length, pagina, total]);

  const marcarComoLeida = useCallback(async (idNotificacion: number): Promise<boolean> => {
    const anterior = notificaciones.find((item) => item.id_notificacion === idNotificacion);
    if (
      !anterior
      || anterior.es_leido
      || idUsuario == null
      || marcandoIdsActuales.current.has(idNotificacion)
    ) {
      return anterior?.es_leido ?? false;
    }

    marcandoIdsActuales.current.add(idNotificacion);
    solicitudActual.current += 1;
    setError(null);
    setMarcandoIds((actuales) => new Set(actuales).add(idNotificacion));
    setNotificaciones((items) => items.map((item) => (
      item.id_notificacion === idNotificacion ? { ...item, es_leido: true } : item
    )));
    setNoLeidas((cantidad) => Math.max(0, cantidad - 1));

    try {
      const actualizada = await notificacionesApi.marcarComoLeida(idNotificacion);
      if (idUsuarioActual.current !== idUsuario) return false;
      setNotificaciones((items) => items.map((item) => (
        item.id_notificacion === idNotificacion ? actualizada : item
      )));
      try {
        await actualizarLecturaCache(idUsuario, actualizada);
      } catch {
        // El backend ya confirmó la lectura; el próximo refresco reparará la caché.
      }
      return true;
    } catch (requestError) {
      if (idUsuarioActual.current === idUsuario) {
        setNotificaciones((items) => items.map((item) => (
          item.id_notificacion === idNotificacion ? anterior : item
        )));
        setNoLeidas((cantidad) => cantidad + 1);
        setError(comoApiError(requestError));
      }
      return false;
    } finally {
      if (idUsuarioActual.current === idUsuario) {
        marcandoIdsActuales.current.delete(idNotificacion);
        setMarcandoIds((actuales) => {
          const siguientes = new Set(actuales);
          siguientes.delete(idNotificacion);
          return siguientes;
        });
      }
    }
  }, [idUsuario, notificaciones]);

  const clearError = useCallback(() => setError(null), []);

  return {
    notificaciones,
    total,
    noLeidas,
    loading,
    loadingMore,
    error,
    fromCache,
    marcandoIds,
    hasMore: !fromCache && notificaciones.length < total,
    cargar,
    cargarMas,
    marcarComoLeida,
    clearError,
  };
}
