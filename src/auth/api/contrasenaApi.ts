import http from '../../shared/api/http';
import type { MessageResponse, SolicitarRecuperacionDTO, RestablecerContrasenaDTO } from '../types';

export const contrasenaApi = {
  async recuperar(dto: SolicitarRecuperacionDTO): Promise<MessageResponse> {
    const res = await http.post<MessageResponse>('/contrasena/recuperar', dto);
    return res.data;
  },

  async restablecer(dto: RestablecerContrasenaDTO): Promise<MessageResponse> {
    const res = await http.post<MessageResponse>('/contrasena/restablecer', dto);
    return res.data;
  },
};
