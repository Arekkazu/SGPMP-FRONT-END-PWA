// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-95..102: tipos de la API /integracion |

export type Canal = 'IDENTIDAD_M2M' | 'CONSULTA_AAEF';
export type EstadoCliente = 'ACTIVO' | 'SUSPENDIDO' | 'REVOCADO';

export interface ClienteExterno {
  id_cliente_externo: number; codigo: string; nombre: string; identificador_publico: string; estado: EstadoCliente;
  tipo: string; ip_permitida: string | null; ttl_token_canal_minutos: number;
  canales: Array<{ canal: Canal; limite_por_minuto: number }>; fecha_actualizacion: string;
  credencial: { fecha_emision: string; fecha_expiracion: string } | null;
}
export interface ClienteRegistrado extends ClienteExterno { client_id: string; client_secret: string }
export interface ConfiguracionCliente {
  canales: Array<{ canal: Canal; limite_por_minuto: number }>; ip_permitida: string | null; ttl_token_canal_minutos: number;
}
export interface ClientePayload extends ConfiguracionCliente {
  codigo: string; nombre: string; identificador_publico: string; fecha_vencimiento: string; client_secret?: string;
}

export interface Anexo {
  id_mapeo_anexo_aaef: number; codigo_anexo: string; version_anexo: string; ruta_documento: string; sha256_documento: string;
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | string; fecha_aprobacion_interna: string | null; fecha_aprobacion: string | null;
}
export interface Contrato {
  id_version_contrato_aaef: number; contrato_version: string; tipo_cambio: 'MAJOR' | 'MINOR'; fecha_vigencia: string;
  id_mapeo_anexo_aaef: number | null; mapeadores: string[]; periodo_gracia_dias: number | null; descripcion: string | null;
  estado: 'PENDIENTE' | 'ACTIVO' | 'DEPRECADO' | 'INACTIVO' | string; fecha_activacion: string | null;
  fecha_deprecacion: string | null; fecha_inactivacion: string | null;
}

export interface EventoIntegracion {
  id_evento_integracion: string; tipo_evento: string; severidad: string; tipo_actor: string; fecha_evento: string;
  endpoint: string | null; metodo_http: string | null; codigo_http: number | null; codigo_resultado: string | null;
  latencia_ms: number | null; ip_origen: string | null; numero_id_tributaria: string | null; fecha_desde: string | null;
  fecha_hasta: string | null; version_contrato: string | null; tamano_payload_bytes: number | null;
  correo_usuario: string | null; nombre_cliente: string | null; integridad: 'INTEGRO' | 'CORRUPTO';
}
export interface PaginaEventos { items: EventoIntegracion[]; pagina: number; tamano: number; total: number }
export interface FiltrosAuditoria { tipo_evento?: string; desde?: string; hasta?: string; codigo_http?: number }

// Documento AAEF tal como lo recibe AgroFusion (RF-97 5.4).
export interface LineaAaef { Code: string; Name: string; Description: string; accounting_account: string[]; Value: number }
export interface DocumentoAaef {
  Header: { DocumentId: string; Prefix: string; Serial: string; Type: { Code: string; Name: string }; IssueDate: string; DueDate: string };
  ThirdParty: { NIT: string | null; Name: string };
  Totals: { Subtotal: number; TotalPayment: number; OutstandingBalance: number };
  Lines: LineaAaef[];
}
export interface EnvelopeAaef {
  metadata: { ExchangeId: string; GeneratedAt: string; RequestedPeriod: { From: string; To: string }; SourceSystem: { SystemNIT: string } };
  summary: { TotalInvoices: number; TotalGrossAmount: number; TotalNet: number; Currency: string };
  invoices: DocumentoAaef[];
}
export interface VistaPrevia { envelope: EnvelopeAaef; version: string; hash: string; texto: string }
