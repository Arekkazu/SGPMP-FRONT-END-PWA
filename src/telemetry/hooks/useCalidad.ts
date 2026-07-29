import { useState, useCallback } from 'react';
import { calidadApi } from '../api/calidadApi';
import type {
  TelemetriaCalidadSchema,
  CalidadFiltros,
  SolicitarReevaluacionDTO,
  ReevaluacionResponseSchema,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export interface ResumenCalidad {
  apto: number;
  conReserva: number;
  noApto: number;
  indeterminada: number;
}

export function useCalidad() {
  const [items, setItems] = useState<TelemetriaCalidadSchema[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [resumen, setResumen] = useState<ResumenCalidad | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [reevaluacion, setReevaluacion] = useState<ReevaluacionResponseSchema | null>(null);

  const cargar = useCallback(async (filtros: CalidadFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await calidadApi.listar({ por_pagina: 50, ...filtros });
      const its = data.items ?? [];
      const porPagina = data.por_pagina || 50;
      setItems(its);
      setPaginacion({
        pagina: data.pagina ?? 1,
        totalRegistros: data.total ?? its.length,
        totalPaginas: Math.max(1, Math.ceil((data.total ?? its.length) / porPagina)),
      });
    } catch (e) {
      setError(e as ApiError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** KPIs por clasificación vía conteos ligeros (por_pagina=1, se lee `total`). */
  const cargarResumen = useCallback(async () => {
    try {
      const [a, r, n, i] = await Promise.all([
        calidadApi.listar({ clasificacion: 'APTO', por_pagina: 1 }),
        calidadApi.listar({ clasificacion: 'APTO_CON_RESERVA', por_pagina: 1 }),
        calidadApi.listar({ clasificacion: 'NO_APTO', por_pagina: 1 }),
        calidadApi.listar({ clasificacion: 'INDETERMINADA', por_pagina: 1 }),
      ]);
      setResumen({ apto: a.total ?? 0, conReserva: r.total ?? 0, noApto: n.total ?? 0, indeterminada: i.total ?? 0 });
    } catch {
      setResumen(null);
    }
  }, []);

  const evaluar = useCallback(async (idTelemetria: number): Promise<TelemetriaCalidadSchema | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const ev0 = await calidadApi.evaluar(idTelemetria);
      setItems((prev) => prev.map((x) => (x.id_telemetria === idTelemetria ? ev0 : x)));
      return ev0;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const reevaluar = useCallback(async (dto: SolicitarReevaluacionDTO): Promise<ReevaluacionResponseSchema | null> => {
    setSaving(true);
    setSaveError(null);
    setReevaluacion(null);
    try {
      const r = await calidadApi.reevaluar(dto);
      setReevaluacion(r);
      return r;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const limpiarReevaluacion = useCallback(() => { setReevaluacion(null); setSaveError(null); }, []);

  return { items, paginacion, loading, error, saving, saveError, reevaluacion, resumen, cargar, cargarResumen, evaluar, reevaluar, limpiarReevaluacion };
}
