export interface NotificacionInternaResponse {
  id_notificacion: number;
  id_evento: number;
  tipo_evento: number;
  mensaje: string;
  fecha_envio: string;
  es_leido: boolean;
}

export interface NotificacionesPaginadasResponse {
  total: number;
  no_leidas: number;
  pagina: number;
  tamano: number;
  items: NotificacionInternaResponse[];
}

export interface FiltrosNotificaciones {
  pagina?: number;
  tamano?: number;
  solo_no_leidas?: boolean;
}

export interface FcmTokenDTO {
  token: string;
}

export interface MessageResponse {
  message: string;
}
