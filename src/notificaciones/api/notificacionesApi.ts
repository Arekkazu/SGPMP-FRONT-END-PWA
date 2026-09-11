import { http } from '../../shared/api/http';
import type {
  FcmTokenDTO,
  FiltrosNotificaciones,
  MessageResponse,
  NotificacionInternaResponse,
  NotificacionesPaginadasResponse,
} from '../types';

async function listar(
  filtros: FiltrosNotificaciones = {},
): Promise<NotificacionesPaginadasResponse> {
  const response = await http.get<NotificacionesPaginadasResponse>('/notificaciones', {
    params: filtros,
  });
  return response.data;
}

async function marcarComoLeida(
  idNotificacion: number,
): Promise<NotificacionInternaResponse> {
  const response = await http.patch<NotificacionInternaResponse>(
    `/notificaciones/${idNotificacion}/leida`,
  );
  return response.data;
}

async function registrarTokenFcm(dto: FcmTokenDTO): Promise<MessageResponse> {
  const response = await http.post<MessageResponse>('/usuarios/me/fcm-token', dto);
  return response.data;
}

export const notificacionesApi = {
  listar,
  marcarComoLeida,
  registrarTokenFcm,
};
