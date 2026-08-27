import { useState, useCallback, useRef } from 'react';
import { auditoriaApi } from '../api/auditoriaApi';
import type {
  AuditoriaExportacionResponse,
  AuditoriaItemResponse,
  FiltrosAuditoria,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

const DEFAULT_FILTROS: FiltrosAuditoria = { pagina: 1, tamano: 20 };
export const MAX_REGISTROS_EXPORTACION = 10_000;
const TAMANO_PAGINA_EXPORTACION = 50;
const PAGINAS_POR_LOTE = 5;

function fechaHastaParaExportacion(fechaHasta?: string): string {
  const ahora = new Date();
  if (!fechaHasta) return ahora.toISOString();

  const fechaConfigurada = new Date(fechaHasta);
  if (!Number.isNaN(fechaConfigurada.getTime()) && fechaConfigurada > ahora) {
    return ahora.toISOString();
  }

  return fechaHasta;
}

export function useAuditoria() {
  const [eventos, setEventos] = useState<AuditoriaItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<ApiError | null>(null);
  const exportandoRef = useRef(false);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(DEFAULT_FILTROS);

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

  const actualizarFiltros = useCallback((nuevos: Partial<FiltrosAuditoria>) => {
    const actualizados = { ...filtros, ...nuevos, pagina: nuevos.pagina ?? 1 };
    setFiltros(actualizados);
    cargar(actualizados);
  }, [filtros, cargar]);

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
    cargar(DEFAULT_FILTROS);
  }, [cargar]);

  const exportarTodos = useCallback(async (
    limite = MAX_REGISTROS_EXPORTACION
  ): Promise<AuditoriaExportacionResponse | null> => {
    if (exportandoRef.current) return null;

    const limiteSeguro = Number.isFinite(limite)
      ? Math.max(1, Math.floor(limite))
      : MAX_REGISTROS_EXPORTACION;
    const filtrosExportacion: FiltrosAuditoria = {
      ...filtros,
      pagina: 1,
      tamano: TAMANO_PAGINA_EXPORTACION,
      // Consultar auditoría también genera un evento. Este corte congela el
      // conjunto para que esos eventos nuevos no desplacen las páginas siguientes.
      fecha_hasta: fechaHastaParaExportacion(filtros.fecha_hasta),
    };

    exportandoRef.current = true;
    setExportando(true);
    setExportError(null);

    try {
      const primeraPagina = await auditoriaApi.consultar(filtrosExportacion);
      const cantidadObjetivo = Math.min(primeraPagina.total, limiteSeguro);
      const totalPaginas = Math.ceil(cantidadObjetivo / TAMANO_PAGINA_EXPORTACION);
      const eventosPorId = new Map(
        primeraPagina.items.map((evento) => [evento.id_evento, evento])
      );

      for (let paginaInicial = 2; paginaInicial <= totalPaginas; paginaInicial += PAGINAS_POR_LOTE) {
        const paginas = Array.from(
          { length: Math.min(PAGINAS_POR_LOTE, totalPaginas - paginaInicial + 1) },
          (_, indice) => paginaInicial + indice
        );
        const respuestas = await Promise.all(
          paginas.map((pagina) => auditoriaApi.consultar({ ...filtrosExportacion, pagina }))
        );

        respuestas.forEach((respuesta) => {
          respuesta.items.forEach((evento) => eventosPorId.set(evento.id_evento, evento));
        });
      }

      const items = Array.from(eventosPorId.values()).slice(0, cantidadObjetivo);
      return {
        items,
        total: primeraPagina.total,
        truncado: items.length < primeraPagina.total,
        limite: limiteSeguro,
      };
    } catch (e) {
      setExportError(e as ApiError);
      return null;
    } finally {
      exportandoRef.current = false;
      setExportando(false);
    }
  }, [filtros]);

  return {
    eventos,
    total,
    loading,
    error,
    filtros,
    cargar,
    actualizarFiltros,
    resetFiltros,
    exportarTodos,
    exportando,
    exportError,
  };
}
