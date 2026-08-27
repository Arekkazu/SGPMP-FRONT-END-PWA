export interface AuditoriaItemResponse {
  id_evento: number;
  tipo_evento: number;
  fecha_evento: string;
  modulo: string;
  resultado: string;
  detalle: unknown;
  id_usuario: number;
  categoria: string;
  estado: string;
  id_sesion?: number;
  integridad_ok: boolean;
  nombre_usuario?: string;
  descripcion?: string;
  ip?: string;
  hash?: string;
}

export interface AuditoriaPaginadaResponse {
  total: number;
  pagina: number;
  tamano: number;
  items: AuditoriaItemResponse[];
}

export interface AuditoriaExportacionResponse {
  items: AuditoriaItemResponse[];
  total: number;
  truncado: boolean;
  limite: number;
}

export interface FiltrosAuditoria {
  id_usuario?: number;
  tipo_evento?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina: number;
  tamano: number;
}
