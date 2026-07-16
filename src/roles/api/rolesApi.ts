import { http } from '../../shared/api/http';
import type {
  RolConPermisosResponse,
  RecursoResponse,
  AccionResponse,
  PermisoResponse,
  CrearRolDTO,
  EditarRolDTO,
  AsignarPermisoDTO,
} from '../types';
import type { MessageResponse } from '../../auth/types';

export const rolesApi = {
  async listar(): Promise<RolConPermisosResponse[]> {
    const res = await http.get<RolConPermisosResponse[]>('/roles/');
    return res.data;
  },

  async obtener(id: number): Promise<RolConPermisosResponse> {
    const res = await http.get<RolConPermisosResponse>(`/roles/${id}`);
    return res.data;
  },

  async crear(dto: CrearRolDTO): Promise<RolConPermisosResponse> {
    const res = await http.post<RolConPermisosResponse>('/roles/', dto);
    return res.data;
  },

  async editar(id: number, dto: EditarRolDTO): Promise<MessageResponse> {
    const res = await http.put<MessageResponse>(`/roles/${id}`, dto);
    return res.data;
  },

  async eliminar(id: number): Promise<MessageResponse> {
    const res = await http.delete<MessageResponse>(`/roles/${id}`);
    return res.data;
  },

  async listarRecursos(): Promise<RecursoResponse[]> {
    const res = await http.get<RecursoResponse[]>('/roles/catalogo/recursos');
    return res.data;
  },

  async listarAcciones(): Promise<AccionResponse[]> {
    const res = await http.get<AccionResponse[]>('/roles/catalogo/acciones');
    return res.data;
  },

  async obtenerPermisos(idRol: number): Promise<PermisoResponse[]> {
    const res = await http.get<PermisoResponse[]>(`/roles/${idRol}/permisos`);
    return res.data;
  },

  async asignarPermiso(idRol: number, dto: AsignarPermisoDTO): Promise<PermisoResponse> {
    const res = await http.post<PermisoResponse>(`/roles/${idRol}/permisos`, dto);
    return res.data;
  },

  async retirarPermiso(idRol: number, idPermiso: number): Promise<MessageResponse> {
    const res = await http.delete<MessageResponse>(`/roles/${idRol}/permisos/${idPermiso}`);
    return res.data;
  },
};
