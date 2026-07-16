import http from '../../shared/api/http';
import type { LoginDTO, LoginResponse, MessageResponse, UsuarioCreateDTO } from '../types';

export const authApi = {
  async login(dto: LoginDTO): Promise<LoginResponse> {
    const res = await http.post<LoginResponse>('/sesiones/', dto);
    return res.data;
  },

  async logout(): Promise<void> {
    await http.delete('/sesiones/');
  },

  async crearUsuario(dto: UsuarioCreateDTO): Promise<MessageResponse> {
    const res = await http.post<MessageResponse>('/usuarios/', dto);
    return res.data;
  },

  async activarCuenta(token: string): Promise<MessageResponse> {
    const res = await http.get<MessageResponse>(`/usuarios/activar/${token}`);
    return res.data;
  },

  async reenviarToken(correo_electronico: string): Promise<MessageResponse> {
    const res = await http.post<MessageResponse>('/usuarios/activar/reenviar', {
      correo_electronico,
    });
    return res.data;
  },
};
