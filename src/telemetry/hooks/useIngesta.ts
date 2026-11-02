// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-07 RF-53: monitor de ingesta paginado con indicadores de hoy |
import { useCallback, useState } from 'react';
import { ingestaApi } from '../api/ingestaApi';
import type { ApiError } from '../../shared/api/errors';
import type { FiltrosIngesta, IndicadoresIngesta, LecturaIngesta } from '../types';

export const POR_PAGINA_INGESTA = 50;

export function useIngesta() {
  const [items, setItems] = useState<LecturaIngesta[]>([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [indicadores, setIndicadores] = useState<IndicadoresIngesta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (filtros: FiltrosIngesta, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      const r = await ingestaApi.listar({ ...filtros, pagina, por_pagina: POR_PAGINA_INGESTA });
      setItems(r.items);
      setPaginacion({ pagina: r.pagina, totalRegistros: r.total, totalPaginas: Math.max(1, Math.ceil(r.total / r.por_pagina)) });
    } catch (e) {
      setError(e as ApiError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarIndicadores = useCallback(async () => {
    try { setIndicadores(await ingestaApi.indicadores()); } catch { setIndicadores(null); }
  }, []);

  return { items, paginacion, indicadores, loading, error, cargar, cargarIndicadores };
}
