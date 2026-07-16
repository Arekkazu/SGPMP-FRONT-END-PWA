import { useState, useCallback } from 'react';
import { usuariosApi } from '../api/usuariosApi';
import { cacheUsuarios, getUsuariosCache } from '../db/usuariosTable';
import type { UsuarioListadoResponse, FiltrosUsuarios } from '../types';
import type { ApiError } from '../../shared/api/errors';

const DEFAULT_FILTROS: FiltrosUsuarios = { pagina: 1, tamano: 20 };

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioListadoResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [filtros, setFiltros] = useState<FiltrosUsuarios>(DEFAULT_FILTROS);
  const [fromCache, setFromCache] = useState(false);

  const cargar = useCallback(async (f: FiltrosUsuarios = filtros) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usuariosApi.listar(f);
      setUsuarios(res.items);
      setTotal(res.total);
      setFromCache(false);
      const now = Date.now();
      try {
        await cacheUsuarios(
          res.items.map((u) => ({
            id_usuario: u.id_usuario,
            nombre_usuario: u.nombre_usuario,
            correo_electronico: u.correo_electronico,
            nombre_rol: u.nombre_rol,
            estado_cuenta: u.estado_cuenta,
            cachedAt: now,
          }))
        );
      } catch {
        // Falla de caché no crítica; los datos ya están en pantalla
      }
      return;
    } catch (e) {
      const cached = await getUsuariosCache();
      if (cached.length > 0) {
        setUsuarios(
          cached.map((c) => ({
            id_usuario: c.id_usuario,
            nombre_usuario: c.nombre_usuario,
            correo_electronico: c.correo_electronico,
            nombre_rol: c.nombre_rol,
            estado_cuenta: c.estado_cuenta,
          }))
        );
        setTotal(cached.length);
        setFromCache(true);
      } else {
        setError(e as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const actualizarFiltros = useCallback((nuevos: Partial<FiltrosUsuarios>) => {
    const actualizados = { ...filtros, ...nuevos, pagina: nuevos.pagina ?? 1 };
    setFiltros(actualizados);
    cargar(actualizados);
  }, [filtros, cargar]);

  return { usuarios, total, loading, error, filtros, fromCache, cargar, actualizarFiltros };
}
