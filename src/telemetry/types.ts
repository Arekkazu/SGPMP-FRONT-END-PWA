// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: excluye vencimiento de acciones manuales |
// | 2026-10-23 | destroyerban | FE-10 RF-58: estado GRIS sin umbral e indicador de anomalía |
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-05/M3-06/M3-10: autor del historial, ubicación de la alerta y listado de dispositivos |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/M3-08: nombres en vinculaciones y conteo del semáforo |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-19: filtros de alertas por área, activo y tipo con nombre |
// | 2026-10-26 | Leandro | ISSUE-678 G87 RF-58: distinguir la referencia válida de la condición posterior del sensor. |
// | 2026-10-26 | Arekkazu | INC-M03 lote 26-10 RF-58/59: unidad sin sensores, alertas correlacionadas y desviación estándar |
// | 2026-10-29 | Arekkazu | INC-M03-211-G98 RF-58: panel de alertas activas del dashboard |
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: estado del buffer Edge por dispositivo (GET /iot/buffer) |
// =====================================================================
// Módulo 3 — Telemetría IoT · Tipos de dominio
// Contrato: do-it/telemetrry/api_reference_m03_telemetria_iot.md
//
// Convenciones:
//  - Campos JSON en snake_case (espejan el backend).
//  - Decimal del backend → number | null.  datetime/date/UUID → string.
//  - Uniones const en MAYÚSCULAS para los enums del dominio.
// =====================================================================

// ── Enums (uniones const) ────────────────────────────────────────────
export type Severidad = 'LEVE' | 'MODERADO' | 'CRITICO';

export type EstadoAlerta =
  | 'ACTIVA' | 'EN_ATENCION' | 'RESUELTA' | 'DESCARTADA' | 'VENCIDA';

export type OrigenEvento = 'EDGE' | 'BACKEND' | 'IA';

export type EstadoDato = 'LECTURA_VALIDA' | 'FUERA_DE_RANGO' | 'ERROR_CALIBRACION';

export type OrigenDato = 'TIEMPO_REAL' | 'BUFFER_LOCAL' | 'EDGE_AGREGADO';

/** Semáforo del monitoreo en tiempo real (RF-58). */
export type EstadoSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';

/** Estado del ciclo de vida de un dispositivo IoT (RF-60). */
/** Fila de GET /iot/dispositivos (M3-10). */
/** RF-54 (TC-DIS-148): último reporte del buffer Edge de un dispositivo. */
export type EstadoOcupacionBuffer = 'NORMAL' | 'WARNING' | 'CRITICO';
export type PoliticaBuffer = 'POLITICA_RECHAZO' | 'POLITICA_SOBRESCRITURA';

export interface EstadoBufferSchema {
  id_dispositivo_iot: number;
  serial: string | null;
  descripcion: string | null;
  nombre_infraestructura: string | null;
  nombre_finca: string | null;
  estado_dispositivo: string | null;
  /** Último heartbeat: 'I' sin pendientes, 'A' buffer activo, 'L' lleno; null sin reporte. */
  estado_local_buffer: 'I' | 'A' | 'L' | null;
  datos_pendientes: number | null;
  /** false: el firmware todavía no reporta capacidad; los campos de abajo vienen null. */
  metricas_disponibles: boolean;
  capacidad_total: number | null;
  capacidad_utilizada: number | null;
  porcentaje_ocupacion: number | null;
  estado_buffer: EstadoOcupacionBuffer | null;
  politica_buffer_activa: PoliticaBuffer | null;
  ultimo_timestamp_pendiente: string | null;
  fecha_reporte: string | null;
  fecha_recepcion: string | null;
}

export interface DispositivoConEstadoSchema {
  id_dispositivo_iot: number;
  serial: string;
  descripcion: string | null;
  id_infraestructura: number;
  nombre_infraestructura: string;
  nombre_finca: string;
  estado_actual: string;
  fecha_ultimo_contacto: string | null;
  nivel_bateria_pct: number | string | null;
  calidad_senal_rssi: number | string | null;
}

export type EstadoDispositivo =
  | 'ACTIVO' | 'SIN_SEÑAL' | 'BUFFER_ACTIVO' | 'EN_MANTENIMIENTO' | 'INACTIVO';

/** Clasificación de calidad (RF-62). */
export type ClasificacionCalidad =
  | 'APTO' | 'APTO_CON_RESERVA' | 'NO_APTO' | 'INDETERMINADA';

/** Estado de una vinculación lectura ↔ activo biológico (RF-61). */
export type EstadoVinculacion =
  | 'CONFIRMADA' | 'AMBIGUA' | 'SIN_VINCULAR' | 'PENDIENTE_REVISION' | 'SUPERADA';

export type MecanismoVinculacion = 'AUTOMATICA' | 'MANUAL' | 'CORRECCION';

/** Severidad del log de auditoría (RF-63). */
export type SeveridadLog = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** Clasificación de retención de un evento de auditoría (RF-63). */
export type ClasificacionRegistro = 'NIC41' | 'TECNICO';

// =====================================================================
// Alertas — /iot/alertas (recurso 32) · Alertas técnicas (recurso 36)
// =====================================================================
export interface AlertaSchema {
  id_alerta: number;
  tipo_alerta: string;
  severidad: string;
  estado_alerta: string;
  origen_evento: string;
  tipo_variable: string;
  valor: number | null;
  unidad: string | null;
  fecha_evento: string;
  fecha_generacion: string;
  fecha_registro: string | null;
  fecha_notificacion: string | null;
  fecha_atencion: string | null;
  fecha_resolucion: string | null;
  fecha_vencimiento: string | null;
  ultima_ocurrencia: string | null;
  frecuencia_evento: number;
  reglas_activas: unknown[];
  contexto_activo_biologico: Record<string, unknown> | null;
  metadato_evento: Record<string, unknown> | null;
  accion_sugerida: string | null;
  motivo_descarte: string | null;
  diagnostico: string | null;
  conflicto_resolucion: string | null;
  severidad_edge_original: string | null;
  severidad_ia: string | null;
  tiene_inferencia_no_disponible: boolean;
  tiene_contexto_incompleto: boolean;
  tiene_generada_por_reevaluacion: boolean;
  id_sensor: number | null;
  /** M3-06/T-18: nombres para la ubicación; opcionales hasta que el backend los exponga en todos los ambientes. */
  nombre_sensor?: string | null;
  nombre_infraestructura?: string | null;
  nombre_finca?: string | null;
  /** T-18: identificador del activo o, sin él, su especie. */
  nombre_activo?: string | null;
  id_dispositivo_ioit: number | null;
  id_activo_biologico: number | null;
  id_infraestructura: number | null;
  id_evento_edge_computing: number | null;
  id_telemetria: number | null;
  id_paquete_inferencia: number | null;
  id_usuario_atencion: number | null;
  id_usuario_resolucion: number | null;
  referencia_alerta_original: number | null;
}

export interface HistoricoEstadoAlertaSchema {
  id_historico_estado_alerta: number | null;
  id_alerta: number;
  estado_anterior: string;
  estado_nuevo: string;
  fecha_cambio: string;
  id_usuario: number | null;
  /** M3-05: quién hizo el cambio; null en transiciones automáticas o backend sin el campo. */
  nombre_usuario?: string | null;
  motivo: string | null;
}

export interface AlertaDetalleSchema extends AlertaSchema {
  historico_estados: HistoricoEstadoAlertaSchema[];
}

export interface ListaAlertasSchema {
  total: number;
  pagina: number;
  por_pagina: number;
  items: AlertaSchema[];
}

export interface ListarAlertasFiltros {
  estado?: string;
  severidad?: string;
  tipo_alerta?: string;
  id_sensor?: number;
  id_activo_biologico?: number;
  /** T-18: área elegida por nombre. */
  id_infraestructura?: number;
  origen_evento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  /** M3-08: alertas resueltas/cerradas desde este instante (filtra fecha_resolucion). */
  fecha_resolucion_desde?: string;
  pagina?: number;
  por_pagina?: number;
}

/** Nuevo estado permitido al actualizar una alerta (PATCH …/estado). */
export type NuevoEstadoAlerta = 'EN_ATENCION' | 'RESUELTA' | 'DESCARTADA';

export interface ActualizarEstadoAlertaDTO {
  nuevo_estado: NuevoEstadoAlerta;
  motivo?: string | null;
}

// =====================================================================
// Monitoreo — /iot/monitoreo (dashboard=33, historial=34)
// =====================================================================
export interface ResumenUnidadSchema {
  id_infraestructura: number;
  nombre_infraestructura: string;
  id_finca: number;
  nombre_finca: string;
  total_sensores: number;
  sensores_online: number;
  sensores_sin_senal: number;
  sensores_con_error: number;
  estado_general: string;
  alertas_activas_count: number;
  ultimo_dato_recibido: string | null;
  /** RF-58 CU04 E1: "Sin datos disponibles" cuando la unidad no tiene sensores (GRIS). */
  mensaje_estado?: string | null;
}

export interface EstadoSensorSchema {
  id_sensor: number;
  id_dispositivo_iot: number;
  nombre_sensor: string;
  tipo_variable: string;
  categoria_variable: string;
  ultimo_valor: number | null;
  ultima_unidad: string;
  ultimo_timestamp_captura: string;
  estado_semaforo: string;
  estado_calidad: string | null;
  estado_calidad_valor_operativo?: string | null;
  timestamp_estado_actual?: string | null;
  estado_desviacion: string;
  estado_conectividad: string;
  tiempo_sin_reporte_min: number;
  dato_desactualizado: boolean;
  id_alerta: number | null;
  severidad_alerta: string | null;
  tendencia: string | null;
  id_infraestructura: number;
  nombre_infraestructura: string;
  id_finca: number;
  nombre_finca: string;
  nivel_bateria_pct: number | null;      // null sin el permiso datos_tecnicos_dashboard (DEV-39)
  calidad_senal_rssi: number | null;
  calidad_senal_snr: number | null;
  /** RF-58 E7 (DEV-39): GRIS porque la variable no tiene umbral configurado en M09. */
  sin_umbral?: boolean;
  /** RF-58 R2/E2: lectura FUERA_DE_RANGO o ERROR_CALIBRACION. */
  indicador_anomalia?: boolean;
  /** false si la lectura no es LECTURA_VALIDA (no es un valor operativo normal). */
  es_valor_operativo?: boolean;
  /** Etiqueta del backend en español; la UI la traduce con `estadoLectura`. */
  etiqueta_estado?: string | null;
}

export interface DashboardResponseSchema {
  total: number;
  pagina: number;
  por_pagina: number;
  resumen_unidades: ResumenUnidadSchema[];
  sensores: EstadoSensorSchema[];
  /** M3-08: sensores por color de todo el alcance (VERDE/AMARILLO/ROJO/GRIS), no de la página. */
  conteo_semaforo?: Record<string, number>;
  /** G98 (RF-58 CA-11): alertas ACTIVA del alcance; `total` de arriba es de sensores. */
  panel_alertas_activas?: PanelAlertasActivasSchema;
}

export interface AlertaActivaPanelSchema {
  id_alerta: number;
  tipo_alerta: string;
  severidad: string | null;
  tipo_variable: string | null;
  valor: number | string | null;
  unidad: string | null;
  fecha_generacion: string;
  minutos_transcurridos: number;
  id_infraestructura: number | null;
  id_activo_biologico: number | null;
  identificador_activo: string | null;
}

export interface PanelAlertasActivasSchema {
  total: number;
  alertas: AlertaActivaPanelSchema[];
}

export interface DashboardFiltros {
  id_infraestructura?: number;
  pagina?: number;
  por_pagina?: number;
}

// ── Historial (RF-59) ────────────────────────────────────────────────
export interface LecturaHistoricaSchema {
  id_telemetria: number;
  id_sensor: number;
  nombre_sensor: string;
  id_variable: number;
  tipo_variable: string;
  categoria_variable: string;
  valor: number | null;
  valor_ajustado: number | null;
  unidad_medida: string;
  timestamp_captura: string;
  estado_calidad: string;
  estado_semaforo_historico: string;
  origen_dato: string;
  id_infraestructura: number | null;
  infraestructura: string | null;
  finca: string | null;
  id_activo_biologico: number | null;
  especie: string | null;
  id_alerta: number | null;
  nivel_bateria_pct: number | null;
  calidad_senal_rssi: number | null;
  calidad_senal_snr: number | null;
}

export interface ResumenEstadisticoSchema {
  tipo_variable: string;
  valor_minimo: number | null;
  valor_maximo: number | null;
  valor_promedio: number | null;
  total_lecturas: number;
  pct_dentro_rango: number | null;
  pct_fuera_rango: number | null;
  total_alertas_en_periodo: number;
  desviacion_estandar?: number | null;
}

/** RF-59 E7 / CA-17 (DEV-38): intervalo sin lecturas > 3 × la frecuencia de muestreo. */
export interface VacioTemporalSchema {
  sensor_id: number;
  tipo_variable: string;
  desde: string;                          // datetime ISO: última lectura antes del hueco
  hasta: string;                          // datetime ISO: primera lectura después del hueco
  duracion_min: number;
  frecuencia_esperada_min: number;
}

export interface HistorialPageSchema {
  /** Registros navegables (como mucho 10 000, CA-19). */
  total: number;
  /** DEV-38: registros que cumplen los filtros; si supera 10 000, `truncado` y `aviso`. */
  total_encontrado?: number;
  truncado?: boolean;
  aviso?: string | null;
  pagina: number;
  por_pagina: number;
  paginas_totales: number;
  filtros_aplicados: Record<string, unknown>;
  rango_real_datos: Record<string, unknown>;
  items: LecturaHistoricaSchema[];
  estadisticas: ResumenEstadisticoSchema[];
  vacios_temporales?: VacioTemporalSchema[];
  /** RF-59 Salida 5: alertas de RF-57 del periodo (con incluir_alertas). */
  alertas_correlacionadas?: AlertaCorrelacionadaSchema[];
}

export interface AlertaCorrelacionadaSchema {
  id_alerta: number;
  tipo_alerta: string;
  severidad: string;
  timestamp_generacion: string | null;
  variable_afectada: string | null;
  estado_final: string;
}

export type OrdenHistorial = 'ASC' | 'DESC';

export interface HistorialFiltros {
  fecha_inicio: string;                   // date (requerido)
  fecha_fin: string;                      // date (requerido)
  sensor_id?: number;
  tipo_variable?: string;
  categoria_variable?: string;
  id_infraestructura?: number;
  especie?: string;
  estado_dato?: EstadoDato;
  origen_dato?: OrigenDato;
  incluir_alertas?: boolean;
  pagina?: number;
  por_pagina?: number;
  orden?: OrdenHistorial;
}

export type FormatoExportHistorial = 'PDF' | 'EXCEL';

// =====================================================================
// Dispositivos — /iot/dispositivos (recurso 35)
// =====================================================================
export interface EstadoDispositivoIoTSchema {
  id_estado_dispositivo_iot: number;
  id_dispositivo_iot: number;
  estado_actual: string;
  fecha_ultimo_contacto: string | null;
  id_ultimo_heartbeat: number | null;
  tiempo_sin_contacto: string | null;
  causa_primaria: string | null;
  causas_secundarias: unknown | null;
  fecha_ultima_actualizacion: string;
}

export interface HistoricoTransicionSchema {
  id_transaccion: number;
  id_dispositivo_iot: number;
  estado_anterior: string;
  estado_nuevo: string;
  causa_primaria: string | null;
  causa_secundaria: unknown | null;
  id_usuario_responsable: number | null;
  notas: string | null;
  fecha_transicion: string;
}

export interface EstadoDispositivoDetalleSchema {
  estado: EstadoDispositivoIoTSchema;
  historial: HistoricoTransicionSchema[];
}

/**
 * Transición manual de mantenimiento (RF-60 CA-7/CA-8).
 * `PATCH /iot/dispositivos/{id}/mantenimiento` · recurso 35 (U) — solo Admin/Ing.
 * El backend acepta únicamente estos dos estados destino.
 */
export interface AplicarMantenimientoDTO {
  nuevo_estado: 'EN_MANTENIMIENTO' | 'ACTIVO';
  motivo?: string | null;
}

// =====================================================================
// Vinculaciones — /iot/vinculaciones (recurso 37)
// =====================================================================
export interface VinculacionLecturaSchema {
  id_vinculacion_lectura: number;
  id_telemetria: number;
  modelo_manejo: string;
  id_activo_biologico: number | null;
  id_infraestructura: number;
  fecha_inicio_vinculacion: string;
  fecha_fin_vinculacion: string | null;
  mecanismo_vinculacion: string;
  estado_vinculacion: string;
  id_usuario: number | null;
  motivo_correccion: string | null;
  id_vinculacion_reemplazada: number | null;
  fecha_creacion: string;
  // T-18: nombres resueltos por el backend; los IDs siguen para filtrar y resolver.
  nombre_activo?: string | null;
  especie_activo?: string | null;
  nombre_infraestructura?: string | null;
  nombre_finca?: string | null;
  nombre_variable?: string | null;
  nombre_sensor?: string | null;
  valor_lectura?: number | null;
  unidad_lectura?: string | null;
  fecha_lectura?: string | null;
  nombre_usuario?: string | null;
}

export interface ListaVinculacionesSchema {
  total: number;
  pagina: number;
  por_pagina: number;
  items: VinculacionLecturaSchema[];
}

export interface VinculacionesFiltros {
  id_telemetria?: number;
  estado_vinculacion?: string;
  mecanismo_vinculacion?: string;
  id_infraestructura?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface ResolverVinculacionDTO {
  id_activo_biologico: number;
  modelo_manejo: string;
}

export interface CorregirVinculacionDTO {
  id_activo_biologico: number;
  modelo_manejo: string;
  motivo: string;                          // 5–500 chars
}

// =====================================================================
// Calidad — /iot/calidad (recurso 38)
// =====================================================================
export interface TelemetriaCalidadSchema {
  id_evaluacion: string;                   // UUID
  id_telemetria: number;
  id_sensor: number;
  timestamp_evaluacion: string;
  indice_calidad: number | null;
  clasificacion_calidad: string;
  apto_para_ia: boolean;
  apto_para_nic41: boolean;
  flags_detectados: Record<string, unknown>;
  version_limites_fisicos_aplicada: string | null;
  parametros_aplicados: Record<string, unknown>;
  parametros_calibracion_aplicados: Record<string, unknown> | null;
  estado_evaluacion: string;
  motivo_reevaluacion: string | null;
  id_evaluacion_superada: string | null;   // UUID
  version_evaluacion: number | null;
  fecha_creacion: string | null;
}

export interface ListaCalidadSchema {
  total: number;
  pagina: number;
  por_pagina: number;
  items: TelemetriaCalidadSchema[];
}

export interface CalidadFiltros {
  id_sensor?: number;
  clasificacion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado_evaluacion?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface SolicitarReevaluacionDTO {
  id_sensor: number;
  fecha_desde: string;
  fecha_hasta: string;
  causa_documentada: string;               // 10–1000 chars
  parametros_correctos?: Record<string, unknown> | null;
}

export interface ReevaluacionResponseSchema {
  evaluaciones_superadas: number;
  evaluaciones_creadas: number;
}

// =====================================================================
// Auditoría IoT — /iot/auditoria (recurso 39)
// =====================================================================
export interface EventoAuditoriaIotSchema {
  id_evento: string;                       // UUID
  id_usuario: number | null;
  nombre_usuario: string | null;
  tipo_evento: string;
  modulo: string;
  descripcion: string | null;
  resultado: string;
  direccion_ip: string | null;
  user_agent: string | null;
  id_sesion: string | null;                // UUID
  fecha_hora: string;
  accion_detallada: Record<string, unknown> | null;
  entidad_afectada_tipo: string | null;
  entidad_afectada_id: string | null;
  severidad_log: string;
  hash_integridad: string;
  clasificacion_registro: string;
  retencion_aplicable: number;
  registro_incompleto: boolean;
  timestamp_registro: string | null;
}

export interface ListaAuditoriaIotSchema {
  total: number;
  pagina: number;
  por_pagina: number;
  items: EventoAuditoriaIotSchema[];
}

export interface AuditoriaFiltros {
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_evento?: string;
  severidad_log?: string;
  clasificacion_registro?: string;
  entidad_afectada_id?: string;
  resultado?: string;
  pagina?: number;
  por_pagina?: number;
}

export type FormatoExportBitacora = 'json' | 'csv';

export interface VerificacionIntegridadSchema {
  total_verificados: number;
  comprometidos: number;
  ids_comprometidos: string[];
}
