import http from '../../shared/api/http';
import type { SsoLoginResponse, SsoPerfilPropio, CompletarPerfilSsoDTO } from '../types';

export const ssoApi = {
  async canjearToken(sso_token: string): Promise<SsoLoginResponse> {
    const res = await http.post<SsoLoginResponse>('/sesiones/sso', { sso_token });
    return res.data;
  },
  async obtenerPerfilPropio(): Promise<SsoPerfilPropio> {
    const res = await http.get<SsoPerfilPropio>('/usuarios/me');
    return res.data;
  },
  async completarPerfil(id_usuario: number, dto: CompletarPerfilSsoDTO): Promise<SsoPerfilPropio> {
    const res = await http.patch<SsoPerfilPropio>(`/usuarios/${id_usuario}`, dto);
    return res.data;
  },
};
