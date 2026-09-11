import { useState, useCallback } from 'react';
import { rolesApi } from '../api/rolesApi';
import type {
  RolConPermisosResponse,
  RecursoResponse,
  AccionResponse,
  CrearRolDTO,
  EditarRolDTO,
  AsignarPermisoDTO,
} from '../types';
import type { ApiError } from '../../shared/api/errors';

export function useRoles() {
  const [roles, setRoles] = useState<RolConPermisosResponse[]>([]);
  const [recursos, setRecursos] = useState<RecursoResponse[]>([]);
  const [acciones, setAcciones] = useState<AccionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, recursosRes, accionesRes] = await Promise.all([
        rolesApi.listar(),
        rolesApi.listarRecursos(),
        rolesApi.listarAcciones(),
      ]);
      setRoles(rolesRes);
      setRecursos(recursosRes);
      setAcciones(accionesRes);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearRol = useCallback(async (dto: CrearRolDTO): Promise<boolean> => {
    try {
      const nuevo = await rolesApi.crear(dto);
      setRoles((prev) => [...prev, nuevo]);
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    }
  }, []);

  const editarRol = useCallback(async (id: number, dto: EditarRolDTO): Promise<boolean> => {
    try {
      await rolesApi.editar(id, dto);
      setRoles((prev) =>
        prev.map((r) =>
          r.id_rol === id ? { ...r, nombre_rol: dto.nombre_rol ?? r.nombre_rol, descripcion: dto.descripcion ?? r.descripcion } : r
        )
      );
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    }
  }, []);

  const eliminarRol = useCallback(async (id: number): Promise<boolean> => {
    try {
      await rolesApi.eliminar(id);
      setRoles((prev) => prev.filter((r) => r.id_rol !== id));
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    }
  }, []);

  const asignarPermiso = useCallback(async (idRol: number, dto: AsignarPermisoDTO): Promise<boolean> => {
    try {
      const permiso = await rolesApi.asignarPermiso(idRol, dto);
      setRoles((prev) =>
        prev.map((r) => r.id_rol === idRol ? { ...r, permisos: [...r.permisos, permiso] } : r)
      );
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    }
  }, []);

  const retirarPermiso = useCallback(async (idRol: number, idPermiso: number): Promise<boolean> => {
    try {
      await rolesApi.retirarPermiso(idRol, idPermiso);
      setRoles((prev) =>
        prev.map((r) =>
          r.id_rol === idRol ? { ...r, permisos: r.permisos.filter((p) => p.id_permiso !== idPermiso) } : r
        )
      );
      return true;
    } catch (e) {
      setError(e as ApiError);
      return false;
    }
  }, []);

  const limpiarError = useCallback(() => setError(null), []);

  return { roles, recursos, acciones, loading, error, cargar, crearRol, editarRol, eliminarRol, asignarPermiso, retirarPermiso, limpiarError };
}
