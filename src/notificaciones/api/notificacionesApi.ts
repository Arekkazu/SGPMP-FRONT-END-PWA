// | Fecha      | Nombre   | Que se hizo                                       |
// |------------|----------|---------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-105: atender y descartar una notificación   |
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

/** T-08: marca como leídas todas las notificaciones internas del usuario. */
async function marcarTodasLeidas(): Promise<{ marcadas: number }> {
  const response = await http.patch<{ marcadas: number }>('/notificaciones/leidas');
  return response.data;
}

/** RF-105: cierra la notificación con lo que se hizo (obligatorio en una crítica). */
async function marcarAtendida(idNotificacion: number, accionDocumentada?: string): Promise<NotificacionInternaResponse> {
  const response = await http.patch<NotificacionInternaResponse>(`/notificaciones/${idNotificacion}/atendida`, {
    accion_documentada: accionDocumentada?.trim() || null,
  });
  return response.data;
}

/** RF-105: saca una advertencia o informativa del panel principal (una crítica responde 422). */
async function descartar(idNotificacion: number): Promise<NotificacionInternaResponse> {
  const response = await http.patch<NotificacionInternaResponse>(`/notificaciones/${idNotificacion}/descartada`);
  return response.data;
}

async function registrarTokenFcm(dto: FcmTokenDTO): Promise<MessageResponse> {
  const response = await http.post<MessageResponse>('/usuarios/me/fcm-token', dto);
  return response.data;
}

export const notificacionesApi = {
  listar,
  marcarComoLeida,
  marcarTodasLeidas,
  marcarAtendida,
  descartar,
  registrarTokenFcm,
};
