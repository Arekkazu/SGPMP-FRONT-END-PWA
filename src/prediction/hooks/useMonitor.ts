// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | PEND-456 RF-66/RF-68: monitor y contagio con datos del backend |
// | 2026-11-02 | Arekkazu | RF-66/RF-68: últimas de cada animal o lote (por_activo) para que ninguno desaparezca |
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: monitor paginado y filtros nuevos |
import { useCallback, useEffect, useState } from 'react';
import { monitorApi } from '../api/monitorApi';
import { aInferencia, type Inferencia } from '../lib/inferencias';
import type { ApiError } from '../../shared/api/errors';
import type { IndicadoresInferencias, RiesgoContagioMonitorResponse } from '../types';
import type { FiltrosMonitorPaginado } from '../api/monitorApi';

function useLectura<T>(leer: () => Promise<T[]>) {
  const [datos, setDatos] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDatos(await leer());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [leer]);
  useEffect(() => { cargar(); }, [cargar]);
  return { datos, loading, error, cargar };
}

/**
 * Las pantallas por animal o lote piden las últimas de cada uno: las cámaras emiten una ventana cada
 * 20 s, y en las 200 más recientes de todo el alcance un animal sin eventos recientes no aparecía.
 * 30 alcanzan para la tendencia de 24 h.
 */
const POR_ACTIVO = 30;
const leerInferencias = async () => (await monitorApi.inferencias()).map(aInferencia);
const leerUltimasPorActivo = async () => (await monitorApi.inferencias({ por_activo: POR_ACTIVO })).map(aInferencia);
const leerContagio = () => monitorApi.riesgoContagio({ por_activo: POR_ACTIVO });

/** RF-66: resultados del motor de inferencia en las fincas del usuario; `porActivo`: las últimas de cada uno. */
export function useInferencias(porActivo = false) {
  const { datos, ...resto } = useLectura<Inferencia>(porActivo ? leerUltimasPorActivo : leerInferencias);
  return { inferencias: datos, ...resto };
}

/** RF-68: cálculos de riesgo de contagio, los últimos de cada lote. */
export function useRiesgoContagio() {
  const { datos, ...resto } = useLectura<RiesgoContagioMonitorResponse>(leerContagio);
  return { calculos: datos, ...resto };
}

/** AJF-10: 25 por página en el monitor. */
export const POR_PAGINA_MONITOR = 25;

/** AJF-10: monitor paginado con filtros (animal, tipo, nivel, fechas, solo con alerta, pruebas). */
export function useMonitorPaginado() {
  const [inferencias, setInferencias] = useState<Inferencia[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresInferencias | null>(null);
  const [paginacion, setPaginacion] = useState({ pagina: 1, totalPaginas: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const cargar = useCallback(async (filtros: FiltrosMonitorPaginado, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      const r = await monitorApi.inferenciasPaginadas({ ...filtros, pagina, por_pagina: POR_PAGINA_MONITOR });
      setInferencias(r.items.map(aInferencia));
      setIndicadores(r.indicadores);
      setPaginacion({ pagina: r.pagina, total: r.total, totalPaginas: Math.max(1, Math.ceil(r.total / r.por_pagina)) });
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);
  return { inferencias, indicadores, paginacion, loading, error, cargar };
}
