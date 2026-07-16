import { http } from '../../shared/api/http';
import type { PerfilResponse, EditarPerfilDTO, CambiarContrasenaDTO } from '../types';
import type { MessageResponse } from '../../auth/types';

export const perfilApi = {
  async obtener(): Promise<PerfilResponse> {
    const res = await http.get<PerfilResponse>('/usuarios/me');
    return res.data;
  },

  async editar(id: number, dto: EditarPerfilDTO): Promise<PerfilResponse> {
    const res = await http.patch<PerfilResponse>(`/usuarios/${id}`, dto);
    return res.data;
  },

  async cambiarContrasena(id: number, dto: CambiarContrasenaDTO): Promise<MessageResponse> {
    const res = await http.put<MessageResponse>(`/contrasena/usuarios/${id}`, dto);
    return res.data;
  },
};
