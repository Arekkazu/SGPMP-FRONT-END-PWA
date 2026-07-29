import { useState, useCallback } from 'react';
import { vinculacionesApi } from '../api/vinculacionesApi';
import type {
  VinculacionLecturaSchema,
  VinculacionesFiltros,
  ResolverVinculacionDTO,
  CorregirVinculacionDTO,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function useVinculaciones() {
  const [items, setItems] = useState<VinculacionLecturaSchema[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({ pagina: 1, totalPaginas: 1, totalRegistros: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const cargar = useCallback(async (filtros: VinculacionesFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await vinculacionesApi.listar({ por_pagina: 50, ...filtros });
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

  const resolver = useCallback(async (id: number, dto: ResolverVinculacionDTO): Promise<VinculacionLecturaSchema | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const upd = await vinculacionesApi.resolver(id, dto);
      setItems((prev) => prev.map((v) => (v.id_vinculacion_lectura === id ? upd : v)));
      return upd;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const corregir = useCallback(async (id: number, dto: CorregirVinculacionDTO): Promise<VinculacionLecturaSchema | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const nueva = await vinculacionesApi.corregir(id, dto);
      return nueva;
    } catch (e) {
      setSaveError(e as ApiError);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return { items, paginacion, loading, saving, error, saveError, cargar, resolver, corregir };
}
