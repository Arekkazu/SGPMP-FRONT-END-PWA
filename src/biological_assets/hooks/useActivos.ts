import { useState, useCallback } from 'react';
import { activosApi } from '../api/activosApi';
import { cacheActivos, getActivosCache } from '../db/activosTable';
import type {
  ActivoListItem,
  ListarActivosFiltros,
  RegistrarActivoDTO,
  ActivoBiologicoResponse,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function useActivos() {
  const [activos, setActivos] = useState<ActivoListItem[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionState>({
    pagina: 1,
    totalPaginas: 1,
    totalRegistros: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (filtros: ListarActivosFiltros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const pagina = await activosApi.listar(filtros);
      const registros = pagina.registros ?? [];
      setActivos(registros);
      setPaginacion({
        pagina: pagina.pagina_actual ?? 1,
        totalPaginas: pagina.total_paginas ?? 1,
        totalRegistros: pagina.total_registros ?? registros.length,
      });
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheActivos(
          registros.map((a) => ({
            id_activo_biologico: a.id_activo_biologico,
            tipo: String(a.tipo),
            identificador: a.identificador,
            id_especie: a.id_especie,
            nombre_especie: a.nombre_especie ?? null,
            id_estado: a.id_estado,
            nombre_estado: a.nombre_estado ?? null,
            id_infraestructura: a.id_infraestructura ?? null,
            nombre_infraestructura: a.nombre_infraestructura ?? null,
            cachedAt: now,
          }))
        );
      } catch {
        // cache failure is non-critical
      }
    } catch (e) {
      const cached = await getActivosCache();
      if (cached.length > 0) {
        setActivos(
          cached.map((c) => ({
            id_activo_biologico: c.id_activo_biologico,
            tipo: c.tipo,
            identificador: c.identificador,
            id_especie: c.id_especie,
            nombre_especie: c.nombre_especie,
            id_estado: c.id_estado,
            nombre_estado: c.nombre_estado,
            id_infraestructura: c.id_infraestructura,
            nombre_infraestructura: c.nombre_infraestructura,
          }))
        );
        setFromCache(true);
      } else {
        setError(e as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const registrar = useCallback(
    async (dto: RegistrarActivoDTO): Promise<ActivoBiologicoResponse | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        const nuevo = await activosApi.registrar(dto);
        return nuevo;
      } catch (e) {
        setSaveError(e as ApiError);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    activos,
    paginacion,
    loading,
    saving,
    error,
    saveError,
    fromCache,
    cargar,
    registrar,
  };
}
