// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: tipos de dominio del módulo de suministros |
// =====================================================================
// Módulo 5 — Suministros · Tipos de dominio
// Contrato: OpenAPI de src/supplies (rama integracion/rfc012-016).
// Decimal del backend → string (se formatea al mostrar, nunca se suma en float).
// =====================================================================

export type Decimal = string;
export type EstadoRegistro = 'VALIDADO' | 'ANULADO' | string;

// ── Selector de activo (GET /activos-biologicos) ─────────────────────
export interface ActivoOpcion {
  id_activo_biologico: number;
  tipo: string;
  identificador: string | null;
  nombre_especie: string | null;
  nombre_infraestructura: string | null;
  nombre_estado: string | null;
}

export interface InstanciaCiclo {
  id_gestion_fases: number | null;
  nombre_ciclo: string;
  nombre_fase_actual: string | null;
  fecha_inicio: string;
  fecha_finalizacion: string | null;
  es_activa: boolean;
}

// ── RF-75 Consumo de alimentos ───────────────────────────────────────
export interface ConsumoAlimento {
  id_consumo_alimeto: number;
  id_activo_biologico: number;
  id_tipo_alimento: number;
  tipo_alimento: string;
  tipo_unidad: string;
  cantidad_suministrada: Decimal;
  costo_unitario: Decimal | null;
  costo_total: Decimal | null;
  consumo_por_individuo_kg: Decimal | null;
  observacion: string | null;
  fecha_consumo: string | null;
  hora_suministro: string | null;
  estado_registro: EstadoRegistro;
  id_usuario: number | null;
  fecha_registro: string | null;
  justificacion_anulacion: string | null;
  fecha_hora_anulacion: string | null;
}

export interface RegistrarConsumoPayload {
  id_activo_biologico: number;
  id_tipo_alimento: number;
  fecha_consumo: string;
  hora_suministro?: string | null;
  cantidad_alimento: string;
  costo_unitario: string;
  observaciones?: string | null;
}

export interface TipoAlimento {
  id_tipo_alimento: number;
  nombre: string;
  unidad_medida: string;
  costo_unitario: Decimal;
  estado: string | null;
}

export interface FiltrosRegistros {
  id_activo_biologico?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado_registro?: string;
  tipo_alimento?: string;
}

export interface Lista<T> { total: number; items: T[] }

// ── RF-76 Medicamentos ───────────────────────────────────────────────
export const VIAS_ADMINISTRACION = ['ORAL', 'INTRAMUSCULAR', 'INTRAVENOSA', 'SUBCUTANEA', 'TOPICA', 'INTRAMAMARIA'] as const;

export interface Medicamento {
  id_registro_medicamento: number;
  id_activo_biologico: number;
  nombre_medicamento: string;
  via_aplicacion: string | null;
  unidad_dosis: string;
  cantidad: Decimal;
  dosis_por_individuo: Decimal | null;
  fecha_aplicacion: string;
  hora_aplicacion: string | null;
  periodo_retiro_dias: number | null;
  fecha_fin_retiro: string | null;
  costo_unitario_medicamento: Decimal;
  costo_total_medicamento: Decimal | null;
  motivo_aplicacion: string | null;
  nombre_veterinario: string | null;
  observaciones?: string | null;
  estado_registro: EstadoRegistro;
  justificacion_anulacion: string | null;
  fecha_hora_anulacion: string | null;
}

export interface RegistroMedicamentoRespuesta {
  medicamento: Medicamento;
  fecha_fin_retiro_vigente: string | null;
  tratamientos_activos: number;
  mensaje: string;
}

export interface RegistrarMedicamentoPayload {
  id_activo_biologico: number;
  nombre_medicamento: string;
  fecha_aplicacion: string;
  hora_aplicacion: string;
  via_administracion: string;
  dosis_aplicada: string;
  unidad_dosis: string;
  periodo_retiro_dias: number;
  motivo_aplicacion: string;
  costo_unitario: string;
  nombre_veterinario: string;
  id_evento_sanitario?: number | null;
  observaciones?: string | null;
  lote?: string | null;
  fecha_vencimiento_lote?: string | null;
}

// ── RF-74 Eficiencia alimenticia (ICA) ───────────────────────────────
export type PeriodoEvaluacion = 'SEMANAL' | 'MENSUAL' | 'POR_CICLO';
export const PERIODOS_ICA: PeriodoEvaluacion[] = ['SEMANAL', 'MENSUAL', 'POR_CICLO'];

export interface ResultadoIca {
  id_resultado_ica: number | null;
  id_activo_biologico: number;
  periodo_evaluacion: string;
  fecha_inicio_periodo: string;
  fecha_fin_periodo: string;
  estado_resultado: string;
  es_vigente: boolean;
  intento: number;
  alimento_consumido_total_kg: Decimal | null;
  ganancia_peso_kg: Decimal | null;
  ca_calculado: Decimal | null;
  clasificacion_ca: string | null;
  data_quality_score: number;
  causa_no_calculo: string | null;
  mensaje?: string | null;
  tipo_calculo: string;
  fecha_calculo: string | null;
}

export interface ConsultaVigenteIca {
  id_activo_biologico: number;
  periodo_evaluacion: string;
  tiene_resultado: boolean;
  mensaje: string | null;
  resultado: ResultadoIca | null;
}

export interface EstadoBatchIca {
  id_ejecucion: number | null;
  estado: string;
  tipo_disparo: string;
  hora_inicio: string;
  hora_fin: string | null;
  cantidad_activos_total: number;
  cantidad_activos_procesados: number;
  cantidad_activos_pendientes: number;
  cantidad_fallidos: number;
  causa_interrupcion: string | null;
  num_workers: number;
}

export interface FalloIca {
  id_fallo: number | null;
  id_activo_biologico: number;
  periodo_evaluacion: string | null;
  causa_fallo: string;
  intentos: number;
  resuelto: boolean;
  timestamp_ultimo_intento: string | null;
}

export interface ItemColaIca {
  id_cola: number | null;
  id_activo_biologico: number;
  prioridad: number;
  estado: string;
  motivo: string | null;
  fecha_encolado: string | null;
}

// ── RF-78 Costeo directo ─────────────────────────────────────────────
export const TIPOS_SUMINISTRO_DIRECTO = ['SERVICIO_VETERINARIO', 'INSEMINACION'] as const;

export interface AcumuladoCiclo {
  id_activo_biologico: number;
  id_ciclo_productivo: number;
  id_gestion_fases: number;
  acumulado_total_ciclo: Decimal;
  acumulado_por_categoria: Record<string, Decimal>;
  version_acumulado: number;
  estado: string;
  fecha_ultima_actualizacion: string | null;
}

export interface RegistrarSuministroDirectoPayload {
  id_activo_biologico: number;
  tipo_suministro: string;
  id_idempotencia: string;
  cantidad: string;
  unidad_medida: string;
  precio_unitario: string;
  fecha_aplicacion: string;
  justificacion_precio: string;
  observacion?: string | null;
}

export interface CorreccionSuministroPayload {
  id_idempotencia: string;
  cantidad: string;
  precio_unitario: string;
  justificacion_precio?: string | null;
  motivo_correccion: string;
}

export interface ResultadoRegistroSuministro {
  estado: string;
  id_registro_suministro: string | null;
  mensaje: string;
}

// ── RF-79 Provisión NIC-41 ───────────────────────────────────────────
export interface RegistroConsolidado {
  id_registro_suministro: string;
  tipo_suministro: string;
  tipo_operacion: string;
  cantidad: Decimal;
  unidad_medida: string;
  precio_unitario_resuelto: Decimal;
  costo_registro: Decimal;
  origen_precio: string;
  fecha_aplicacion: string;
  motivo_correccion: string | null;
}

export interface ProvisionNic41 {
  id_provision: number | null;
  id_activo_biologico: number;
  id_ciclo_productivo: number | null;
  id_gestion_fases: number | null;
  modalidad: string;
  monto_provision: Decimal;
  desglose_categoria: Record<string, Decimal>;
  lista_registros: RegistroConsolidado[];
  total_registros: number;
  version_reporte: number;
  id_reporte_anterior: number | null;
  motivo_correccion: string | null;
  es_reporte_potencialmente_incompleto: boolean;
  estado: string;
  hash_integridad: string | null;
  fecha_generacion: string | null;
  fecha_entrega_m06: string | null;
}

// ── RF-77 Reporte de gastos ──────────────────────────────────────────
export type GranularidadDesglose = 'SEMANAL' | 'MENSUAL' | 'CICLO_COMPLETO';
export type CategoriaGasto = 'ALIMENTACION' | 'MEDICACION';

export interface GenerarReportePayload {
  fecha_inicio_reporte: string;
  fecha_fin_reporte: string;
  tipo_periodo: GranularidadDesglose;
  activo_biologico_id?: number | null;
  id_infraestructura?: number | null;
  id_especie?: number | null;
  categorias_incluidas?: CategoriaGasto[] | null;
}

export interface ReporteGasto {
  id_reporte_gasto_acumulado: number | null;
  id_activo_biologico: number | null;
  id_infraestructura: number | null;
  id_especie: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  gasto_total_acumulado: Decimal;
  gasto_promedio_individuo: Decimal | null;
  causa_no_calculable_promedio: string | null;
  sin_datos: boolean;
  estado?: string;
  mensaje?: string | null;
  nota_bajas?: string | null;
  advertencia?: string | null;
  desglose_categorias: { categoria: string; subtotal: Decimal; num_registros: number; porcentaje: Decimal }[];
  desglose_temporal: { etiqueta: string; fecha_inicio: string; fecha_fin: string; monto: Decimal }[];
  registros_sin_costo: { categoria: string; id_origen: number; fecha: string; descripcion: string }[];
  tendencia: { gasto_periodo_actual: Decimal; gasto_periodo_anterior: Decimal | null; variacion_porcentual: Decimal | null; estado: string; nota: string | null } | null;
  fecha_generacion: string | null;
}

export interface TrabajoReporte { id_cola: number | null; estado: string; fecha_solicitud: string | null; mensaje: string }

export interface EstadoTrabajoReporte {
  id_cola: number | null;
  estado: string;
  reporte: ReporteGasto | null;
}

export interface ArchivoExportacion {
  id_archivo: string;
  formato: string;
  nombre_archivo: string;
  total_registros: number;
  fecha_expiracion: string;
}

/** POST /reportes-gastos responde el reporte (200) o el trabajo encolado (202). */
export type ResultadoGenerarReporte = { tipo: 'reporte'; reporte: ReporteGasto } | { tipo: 'trabajo'; trabajo: TrabajoReporte };

// ── RF-81 Historial de suministros ───────────────────────────────────
export const TIPOS_SUMINISTRO = ['TODOS', 'ALIMENTO', 'MEDICAMENTO', 'SERVICIO_VETERINARIO', 'INSEMINACION'] as const;
export const ORIGENES_PRECIO = ['TODOS', 'MANUAL', 'M40_AUTOMATICO'] as const;

export interface FiltrosHistorial {
  id_activo_biologico: number;
  id_ciclo_productivo?: number;
  fecha_inicio_filtro?: string;
  fecha_fin_filtro?: string;
  tipo_suministro_filtro?: string;
  origen_precio_filtro?: string;
  costo_min?: string;
  costo_max?: string;
  pagina?: number;
  registros_por_pagina?: number;
}

export interface LineaHistorial {
  id_registro_suministro: string;
  id_activo_biologico: number;
  id_ciclo_productivo: number;
  tipo_suministro: string;
  descripcion: string;
  fecha_aplicacion: string;
  cantidad: Decimal;
  unidad_medida: string;
  precio_unitario: Decimal;
  costo_registro: Decimal;
  origen_precio: string;
  tipo_operacion: string;
  observacion: string | null;
  nombre_ciclo: string | null;
  estado_ciclo: string | null;
}

export interface ResumenHistorial {
  total_registros_filtrados: number;
  monto_total_filtrado: Decimal;
  desglose_por_tipo_suministro: Record<string, { total: number; monto: Decimal }>;
  pagina_actual: number;
  total_paginas: number;
  datos_contexto_no_disponibles: boolean;
  datos_actualizados_hasta: string;
  nivel_volumen: number;
  mensaje?: string | null;
}

export interface ConsultaAsincrona {
  id_consulta_asincrona?: number | null;
  id_exportacion?: number | null;
  estado: string;
  mensaje: string;
}

/** GET /historial responde la página (200) o un trabajo asíncrono (202, niveles 3-4). */
export type ResultadoHistorial =
  | { tipo: 'pagina'; items: LineaHistorial[]; resumen: ResumenHistorial }
  | { tipo: 'asincrono'; consulta: ConsultaAsincrona };

export interface EstadoTrabajoHistorial {
  id_cola: number | null;
  tipo_trabajo: string;
  estado: string;
  total_registros?: number | null;
  resultado?: { total_registros_filtrados?: number; monto_total_filtrado?: Decimal } | null;
  url_descarga?: string | null;
}

// ── RF-80 Auditoría ──────────────────────────────────────────────────
export interface EventoAuditoriaSuministro {
  id_auditoria_suministro: number;
  entidad_afectada: string;
  tipo_operacion: string;
  id_usuario: number;
  resultado: string;
  fecha_evento: string;
  datos_anteriores?: Record<string, unknown> | null;
  datos_nuevos?: Record<string, unknown> | null;
  ip_origen?: string | null;
  id_activo_biologico?: number | null;
  id_ciclo_productivo?: number | null;
  costo_afectado?: Decimal | null;
  origen_precio?: string | null;
  clasificacion_registro?: string | null;
  retencion_aplicable?: string | null;
  hash_integridad?: string | null;
  registro_incompleto?: boolean | null;
  detalle_causa?: string | null;
}

export interface FiltrosAuditoria {
  tipo_operacion?: string;
  id_usuario?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  entidad_afectada?: string;
  id_activo_biologico?: number;
  resultado?: string;
  clasificacion_registro?: string;
  pagina?: number;
  registros_por_pagina?: number;
}

export interface ListaAuditoria { total: number; pagina: number; registros_por_pagina: number; items: EventoAuditoriaSuministro[] }
