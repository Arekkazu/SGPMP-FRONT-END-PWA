// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: tipos de reporte, contratos del API y recursos RBAC |

/** Los 18 reportes de RF-104. Cada uno tiene el recurso `reporte_<tipo>` con la acción Ejecutar. */
export const TIPOS_REPORTE = [
  'REPORTE_INVENTARIO_BIOLOGICO', 'REPORTE_COSTOS_SUMINISTROS', 'REPORTE_PRODUCTIVIDAD', 'REPORTE_BAJAS_Y_SALIDAS',
  'REPORTE_VALORACION_NIC41', 'REPORTE_ESTADO_EXPORTACIONES', 'REPORTE_VARIACION_PERIODOS',
  'REPORTE_HISTORICO_SANITARIO', 'REPORTE_FICHA_ANIMAL', 'REPORTE_VACUNACION_MEDICAMENTOS', 'REPORTE_RIESGO_SANITARIO',
  'REPORTE_TELEMETRIA', 'REPORTE_ESTADO_DISPOSITIVOS', 'REPORTE_CALIBRACION_SENSORES', 'REPORTE_ALERTAS_SENSORES',
  'REPORTE_EJECUTIVO_CONSOLIDADO', 'REPORTE_RENTABILIDAD_FINCA', 'REPORTE_COMPARATIVO_PERIODOS',
] as const;

export type TipoReporte = (typeof TIPOS_REPORTE)[number];
export const RECURSOS_REPORTES = TIPOS_REPORTE.map((t) => t.toLowerCase());
export const ACCION_EJECUTAR = 5;

/** Grupo en que se muestra cada reporte (quién lo usa); el rótulo lo traduce el front. */
export const GRUPO_REPORTE: Record<TipoReporte, 'produccion' | 'contable' | 'sanitario' | 'iot' | 'gerencial'> = {
  REPORTE_INVENTARIO_BIOLOGICO: 'produccion', REPORTE_COSTOS_SUMINISTROS: 'produccion',
  REPORTE_PRODUCTIVIDAD: 'produccion', REPORTE_BAJAS_Y_SALIDAS: 'produccion',
  REPORTE_VALORACION_NIC41: 'contable', REPORTE_ESTADO_EXPORTACIONES: 'contable', REPORTE_VARIACION_PERIODOS: 'contable',
  REPORTE_HISTORICO_SANITARIO: 'sanitario', REPORTE_FICHA_ANIMAL: 'sanitario',
  REPORTE_VACUNACION_MEDICAMENTOS: 'sanitario', REPORTE_RIESGO_SANITARIO: 'sanitario',
  REPORTE_TELEMETRIA: 'iot', REPORTE_ESTADO_DISPOSITIVOS: 'iot', REPORTE_CALIBRACION_SENSORES: 'iot',
  REPORTE_ALERTAS_SENSORES: 'iot',
  REPORTE_EJECUTIVO_CONSOLIDADO: 'gerencial', REPORTE_RENTABILIDAD_FINCA: 'gerencial',
  REPORTE_COMPARATIVO_PERIODOS: 'gerencial',
};

export type TipoFiltro = 'fecha' | 'lista' | 'finca' | 'especie' | 'activo' | 'lote' | 'infraestructura' | 'sensor' | 'periodo';

export interface FiltroCatalogo {
  nombre: string;
  etiqueta: string;
  tipo: TipoFiltro;
  obligatorio: boolean;
  valores: string[];
}

export interface ReporteCatalogo {
  tipo_reporte: TipoReporte;
  titulo: string;
  periodo_cerrado: boolean;
  compara_periodos: boolean;
  limite_sincrono: number;
  filtros: FiltroCatalogo[];
}

export type TipoColumna = 'TEXTO' | 'ENTERO' | 'NUMERO' | 'MONEDA' | 'PORCENTAJE' | 'FECHA' | 'FECHA_HORA';

export interface TablaPrevia {
  titulo: string;
  nota: string | null;
  total_filas: number;
  columnas: { clave: string; titulo: string; tipo: TipoColumna }[];
  filas: Record<string, string | number | null>[];
}

export interface VistaPrevia {
  tipo_reporte: TipoReporte;
  titulo: string;
  encabezado: { dato: string; valor: string }[];
  numero_registros: number;
  en_segundo_plano: boolean;
  sin_datos: boolean;
  mensaje: string | null;
  resumen: TablaPrevia[];
  detalle: TablaPrevia | null;
  secciones: { titulo: string; textos: string[]; tablas: TablaPrevia[] }[];
  finales: TablaPrevia[];
  advertencias: string[];
  aclaraciones: string[];
}

export type EstadoReporte = 'EN_PROCESO' | 'GENERADO' | 'FALLIDO' | 'CANCELADO' | 'EXPIRADO';
export type FormatoReporte = 'PDF' | 'EXCEL';

export interface Reporte {
  id_reporte: string;
  tipo_reporte: TipoReporte;
  titulo: string;
  formato: FormatoReporte;
  estado: EstadoReporte;
  filtros_aplicados: Record<string, unknown>;
  numero_registros: number | null;
  tamano_archivo_kb: number | null;
  checksum_sha256: string | null;
  mensaje: string | null;
  fecha_solicitud: string | null;
  fecha_generacion: string | null;
  fecha_expiracion: string | null;
  partes: { numero_parte: number; nombre_archivo: string; tamano_bytes: number; checksum_sha256: string }[];
}

export type ValoresFiltros = Record<string, string | number>;
