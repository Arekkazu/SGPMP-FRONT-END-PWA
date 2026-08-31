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
  direccion_ip?: string;
  user_agent?: string;
  // INTEGRO | LEGADO (anterior a la política de hash) | MANIPULADO.
  integridad: string;
}

export interface AuditoriaPaginadaResponse {
  total: number;
  pagina: number;
  tamano: number;
  items: AuditoriaItemResponse[];
}

// El CSV lo genera el backend; `total`/`exportados` vienen en las cabeceras
// X-Total-Registros y X-Registros-Exportados.
export interface AuditoriaExportacion {
  csv: string;
  total: number;
  exportados: number;
  truncado: boolean;
}

// Catálogo de modulo1.tipos_eventos servido por el backend, para que el cliente
// no mantenga su propia copia de las etiquetas.
export interface TipoEvento {
  id_tipo_evento: number;
  nombre: string;
  accion?: string | null;
  categoria?: 'AUTENTICACION' | 'MODIFICACION' | 'CONSULTA' | null;
}

// Exportación diferida: el backend responde 422 EXPORTACION_REQUIERE_MODO_ASINCRONO
// cuando el volumen supera el umbral y hay que pasar por la cola.
export interface ExportacionEncolada {
  id_cola: number;
  estado: string;
  mensaje: string;
}

export interface EstadoExportacion {
  id_cola: number;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO';
  intentos: number;
  error?: string | null;
  total_exportado?: number | null;
  total_disponible?: number | null;
  descargable: boolean;
}

export interface FiltrosAuditoria {
  id_usuario?: number;
  tipo_evento?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina: number;
  tamano: number;
}
