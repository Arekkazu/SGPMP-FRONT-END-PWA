// | Fecha      | Nombre   | Que se hizo                                                     |
// |------------|----------|-----------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-105: nivel, estado, módulo, ocurrencias y filtros         |
export interface NotificacionInternaResponse {
  id_notificacion: number;
  id_evento: number;
  tipo_evento: number;
  mensaje: string;
  fecha_envio: string;
  es_leido: boolean;
  // RF-105. `modulo` es una clave (telemetria, finanzas…); el nombre visible lo pone el front.
  nivel?: NivelNotificacion;
  estado?: EstadoNotificacion;
  modulo?: ModuloNotificacion | null;
  url?: string | null;
  ocurrencias?: number;
  fecha_ultima_ocurrencia?: string | null;
  fecha_lectura?: string | null;
  fecha_atencion?: string | null;
  accion_documentada?: string | null;
  puede_descartarse?: boolean;
  puede_atenderse?: boolean;
}

export type NivelNotificacion = 'CRITICA' | 'ADVERTENCIA' | 'INFORMATIVA';
export type EstadoNotificacion = 'NUEVA' | 'LEIDA' | 'ATENDIDA' | 'DESCARTADA';
export const MODULOS_NOTIFICACION = ['cuentas', 'activos', 'telemetria', 'prediccion', 'suministros', 'finanzas',
  'integracion', 'reportes', 'configuracion'] as const;
export type ModuloNotificacion = typeof MODULOS_NOTIFICACION[number];

export interface NotificacionesPaginadasResponse {
  total: number;
  no_leidas: number;
  /** Críticas sin atender: el dashboard muestra un aviso fijo mientras haya alguna. */
  criticas_pendientes?: number;
  pagina: number;
  tamano: number;
  items: NotificacionInternaResponse[];
}

export interface FiltrosNotificaciones {
  pagina?: number;
  tamano?: number;
  solo_no_leidas?: boolean;
  nivel?: NivelNotificacion;
  /** Sin estado: nuevas y leídas (panel principal). */
  estado?: EstadoNotificacion;
  modulo?: ModuloNotificacion;
  incluir_archivadas?: boolean;
}

export interface FcmTokenDTO {
  token: string;
}

export interface MessageResponse {
  message: string;
}
