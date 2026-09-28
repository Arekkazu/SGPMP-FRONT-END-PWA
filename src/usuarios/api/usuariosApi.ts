import { http } from '../../shared/api/http';
import type {
  UsuarioListadoPaginadoResponse,
  UsuarioDetalleResponse,
  FiltrosUsuarios,
  EditarPerfilAdminDTO,
  GestionarCuentaDTO,
  AsignarFincasDTO,
} from '../types';
import type { MessageResponse } from '../../auth/types';

export const usuariosApi = {
  async listar(filtros: FiltrosUsuarios): Promise<UsuarioListadoPaginadoResponse> {
    const params: Record<string, string | number> = {
      pagina: filtros.pagina,
      tamano: filtros.tamano,
    };
    if (filtros.nombre) params.nombre = filtros.nombre;
    if (filtros.correo) params.correo = filtros.correo;
    if (filtros.id_estado != null) params.id_estado = filtros.id_estado;
    if (filtros.id_rol != null) params.id_rol = filtros.id_rol;
    const res = await http.get<UsuarioListadoPaginadoResponse>('/usuarios/admin', { params });
    return res.data;
  },

  async obtenerDetalle(id: number): Promise<UsuarioDetalleResponse> {
    const res = await http.get<UsuarioDetalleResponse>(`/usuarios/${id}/detalle`);
    return res.data;
  },

  async editar(id: number, dto: EditarPerfilAdminDTO): Promise<UsuarioDetalleResponse> {
    const res = await http.patch<UsuarioDetalleResponse>(`/usuarios/${id}`, dto);
    return res.data;
  },

  async gestionar(id: number, dto: GestionarCuentaDTO): Promise<MessageResponse> {
    const res = await http.post<MessageResponse>(`/usuarios/${id}/gestionar`, dto);
    return res.data;
  },

  async asignarFincas(id: number, dto: AsignarFincasDTO): Promise<MessageResponse> {
    const res = await http.put<MessageResponse>(`/usuarios/${id}/fincas`, dto);
    return res.data;
  },
};
