import { useState, useCallback, useRef, useEffect } from 'react';
import { auditoriaApi } from '../api/auditoriaApi';
import type {
  AuditoriaExportacion,
  AuditoriaItemResponse,
  FiltrosAuditoria,
  TipoEvento,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

const DEFAULT_FILTROS: FiltrosAuditoria = { pagina: 1, tamano: 20 };

// Cuando el volumen obliga a pasar por la cola, el backend procesa en un poller
// que corre cada 15 s por defecto; consultamos algo más seguido para no sumar
// esa latencia entera a la espera del usuario.
const INTERVALO_SONDEO_MS = 3_000;
const INTENTOS_SONDEO_MAX = 100;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAuditoria() {
  const [eventos, setEventos] = useState<AuditoriaItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<ApiError | null>(null);
  const [exportProgreso, setExportProgreso] = useState<string | null>(null);
  const exportandoRef = useRef(false);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(DEFAULT_FILTROS);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);

  const cargar = useCallback(async (f: FiltrosAuditoria = filtros) => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditoriaApi.consultar(f);
      setEventos(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // El catálogo cambia poquísimo: se pide una vez por montaje. Si falla, la
  // tabla y el filtro caen al id numérico en vez de romperse.
  useEffect(() => {
    let vigente = true;
    auditoriaApi
      .tiposEvento()
      .then((tipos) => { if (vigente) setTiposEvento(tipos); })
      .catch(() => { /* degradación silenciosa: se muestra el id */ });
    return () => { vigente = false; };
  }, []);

  const actualizarFiltros = useCallback((nuevos: Partial<FiltrosAuditoria>) => {
    const actualizados = { ...filtros, ...nuevos, pagina: nuevos.pagina ?? 1 };
    setFiltros(actualizados);
    cargar(actualizados);
  }, [filtros, cargar]);

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
    cargar(DEFAULT_FILTROS);
  }, [cargar]);

  /** Encola la exportación, espera a que el worker la genere y la descarga. */
  const exportarPorCola = useCallback(async (): Promise<AuditoriaExportacion> => {
    const { id_cola } = await auditoriaApi.solicitarExportacion(filtros);
    setExportProgreso('La exportación es grande y se está preparando en segundo plano…');

    for (let intento = 0; intento < INTENTOS_SONDEO_MAX; intento++) {
      await esperar(INTERVALO_SONDEO_MS);
      const estado = await auditoriaApi.consultarExportacion(id_cola);
      if (estado.descargable) return auditoriaApi.descargarExportacion(id_cola);
      if (estado.estado === 'FALLIDO') {
        throw {
          code: 'EXPORTACION_FALLIDA',
          message: estado.error ?? 'La exportación no pudo completarse. Intenta nuevamente.',
          status: 500,
        } as ApiError;
      }
    }

    throw {
      code: 'EXPORTACION_DEMORADA',
      message:
        'La exportación sigue en proceso. Puedes cerrar esta vista y volver a ' +
        'intentarlo en unos minutos; el archivo se sigue generando.',
      status: 408,
    } as ApiError;
  }, [filtros]);

  const exportarTodos = useCallback(async (): Promise<AuditoriaExportacion | null> => {
    if (exportandoRef.current) return null;
    exportandoRef.current = true;
    setExportando(true);
    setExportError(null);
    setExportProgreso(null);

    try {
      return await auditoriaApi.exportar(filtros);
    } catch (e) {
      const apiError = e as ApiError;
      // Por encima del umbral el backend rechaza la descarga inmediata y pide
      // usar la cola. No es un error para el usuario: es el otro camino.
      if (apiError?.code === 'EXPORTACION_REQUIERE_MODO_ASINCRONO') {
        try {
          return await exportarPorCola();
        } catch (eCola) {
          setExportError(eCola as ApiError);
          return null;
        }
      }
      setExportError(apiError);
      return null;
    } finally {
      exportandoRef.current = false;
      setExportando(false);
      setExportProgreso(null);
    }
  }, [filtros, exportarPorCola]);

  return {
    eventos,
    total,
    loading,
    error,
    filtros,
    tiposEvento,
    cargar,
    actualizarFiltros,
    resetFiltros,
    exportarTodos,
    exportando,
    exportProgreso,
    exportError,
  };
}
