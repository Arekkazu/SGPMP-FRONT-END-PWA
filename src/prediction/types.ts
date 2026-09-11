// =====================================================================
// Módulo 4 — Predicción / IA · Tipos de dominio
// Contrato: do-it/prediction/api_reference_m04_prediction_iot.md
//
// Convenciones (mirror de src/telemetry/types.ts):
//  - Campos JSON en snake_case (espejan el backend).
//  - Decimal del backend → number | null.  datetime/date/UUID → string.
//  - Uniones const en MAYÚSCULAS para los enums del dominio.
// =====================================================================

// ── Enums (uniones const) ────────────────────────────────────────────
export type TipoModelo =
  | 'ESPECIES_PEQUEÑAS' | 'ESPECIES_MEDIANAS' | 'ESPECIES_GRANDES' | 'CONTAGIO';

export type ModoEjecucion = 'EDGE' | 'SERVIDOR' | 'HIBRIDO';

export type EstadoVersion =
  | 'EN_VALIDACION' | 'APROBADO' | 'RECHAZADO' | 'ACTIVO' | 'DEPRECADO';

export type EstadoOta =
  | 'EXITOSO' | 'FALLIDO' | 'PENDIENTE' | 'SIN_CAMBIOS' | 'EN_PROCESO';

export type EstadoRetro = 'CORRECTO' | 'PARCIAL' | 'INCORRECTO' | 'SIN_EVENTO';

export type FuenteDiagnostico =
  | 'OBSERVACION_DIRECTA' | 'LABORATORIO' | 'HISTORIAL_CLINICO' | 'OTRO';

export type SeveridadEvento = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type TipoActor = 'USUARIO' | 'SISTEMA';

/** Etiquetas legibles para `tipo_modelo` (la ñ requiere URL-encode como path param). */
export const TIPO_MODELO_LABEL: Record<TipoModelo, string> = {
  ESPECIES_PEQUEÑAS: 'Especies pequeñas',
  ESPECIES_MEDIANAS: 'Especies medianas',
  ESPECIES_GRANDES: 'Especies grandes',
  CONTAGIO: 'Riesgo de contagio',
};

export const TIPOS_MODELO: TipoModelo[] = [
  'ESPECIES_PEQUEÑAS', 'ESPECIES_MEDIANAS', 'ESPECIES_GRANDES', 'CONTAGIO',
];

// =====================================================================
// RF-64 · Catálogo de Patologías — /prediccion/patologias (recurso 18)
// =====================================================================
export interface PatologiaVariableResponse {
  id_variable_ambiental: number;
  peso_evidencia: number | null;
  es_variable_critica: boolean;
}

export interface PatologiaM04Response {
  id_patologia: number;
  nombre_patologia: string;
  especie_aplicable: string;
  descripcion_clinica: string;
  es_base: boolean;
  es_activo: boolean;
  version_catalogo: number;
  variables_sensoricas_asociadas: PatologiaVariableResponse[];
  fecha_creacion_m04: string;
  fecha_actualizacion: string | null;
}

export interface PatologiaM04ListResponse {
  total: number;
  items: PatologiaM04Response[];
}

export interface ListarPatologiasFiltros {
  especie_aplicable?: string;
  solo_activas?: boolean;
  solo_base?: boolean;
}

export interface RegistrarPatologiaDTO {
  nombre_patologia: string;
  especie_aplicable: string;
  variables_sensoricas_asociadas: number[];
  descripcion_clinica: string;
}

export interface EditarPatologiaDTO {
  nombre_patologia: string;
  descripcion_clinica: string;
  variables_sensoricas_asociadas: number[];
  /** Token de concurrencia optimista → 412 si no coincide. */
  fecha_actualizacion: string | null;
}

// =====================================================================
// RF-65 · Configuración del Motor — /prediccion/motor-ia (recurso 41)
// =====================================================================
export interface ConfiguracionMotorIAResponse {
  id_configuracion_motor: number;
  tipo_modelo: TipoModelo;
  umbral_riesgo_alto: number;
  umbral_alerta_critica: number;
  ventana_temporal_min: number;
  modo_ejecucion: ModoEjecucion;
  id_version_modelo_activa: number | null;
  config_version: number;
  w_factor_sanitario: number;
  w_factor_ambiental: number;
  w_factor_densidad: number;
  temp_min_config: number | null;
  temp_max_config: number | null;
  hr_min_config: number | null;
  hr_max_config: number | null;
  densidad_maxima_config: number | null;
  es_activa: boolean;
  id_usuario_responsable: number;
  fecha_creacion: string;
}

export interface ConfiguracionMotorIAListResponse {
  total: number;
  items: ConfiguracionMotorIAResponse[];
}

export interface ConfigurarMotorDTO {
  tipo_modelo: TipoModelo;
  umbral_riesgo_alto: number;
  umbral_alerta_critica: number;
  ventana_temporal_min: number;
  modo_ejecucion: ModoEjecucion;
  w_factor_sanitario: number;
  w_factor_ambiental: number;
  w_factor_densidad: number;
  id_version_modelo_activa?: number | null;
  temp_min_config?: number | null;
  temp_max_config?: number | null;
  hr_min_config?: number | null;
  hr_max_config?: number | null;
  densidad_maxima_config?: number | null;
}

// =====================================================================
// RF-67 · Historial Diagnóstico — /prediccion/historial (recurso 42)
// =====================================================================
export type NivelRiesgo = 0 | 1 | 2 | 3;

export interface EventoHistorialResponse {
  id_evento: string;
  tipo_evento: string;
  id_activo_biologico: number;
  fecha_evento: string;
  id_resultado_inferencia: string | null;
  payload: Record<string, unknown> | null;
}

export interface HistorialDiagnosticoResponse {
  eventos: EventoHistorialResponse[];
  cursor_siguiente: string | null;
  total_pagina: number;
}

export interface ConsultarHistorialFiltros {
  fecha_inicio: string; // date (YYYY-MM-DD), requerido
  fecha_fin: string;    // date (YYYY-MM-DD), requerido
  nivel_riesgo?: number;
  id_patologia?: number;
  incluir_alertas?: boolean;
  cursor_paginacion?: string;
}

// =====================================================================
// RF-69 · Versiones de Modelos — /prediccion/modelos (recurso 43)
// =====================================================================
export interface VersionModeloResponse {
  id_version_modelo: number;
  nombre_version: string;
  tipo_modelo: TipoModelo;
  estado_version: EstadoVersion;
  formato_artefacto: string | null;
  tamanio_artefacto_bytes: number | null;
  hash_artefacto_sha256: string | null;
  dataset_entrenamiento_hash: string | null;
  id_proceso_rf71: string | null;
  version_referencia: number | null;
  f1_score: number | null;
  recall_clase_riesgo_alto: number | null;
  precision_modelo: number | null;
  accuracy: number | null;
  roc_auc_score: number | null;
  recall_por_clase: Record<string, number> | null;
  matriz_confusion: number[][] | null;
  compatibilidad_variables: number[] | null;
  notas_validacion: string | null;
  detalle_validacion: string | null;
  esta_produccion: boolean;
  fecha_entrenamiento: string | null;
  fecha_registro: string | null;
  fecha_despliegue: string | null;
}

export interface VersionModeloListResponse {
  total: number;
  items: VersionModeloResponse[];
}

export interface ListarModelosFiltros {
  tipo_modelo?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}

export interface RegistrarNotasVersionDTO {
  notas_validacion: string;
}

// =====================================================================
// RF-70 · OTA / Distribución — /prediccion (recurso 44)
// =====================================================================
export interface DespliegueOtaResponse {
  id_despliegue_ota: number;
  id_version_modelo: number;
  id_dispositivo_iot: number;
  tipo_modelo: TipoModelo;
  modo_distribucion: string;
  estado_despliegue: EstadoOta;
  hash_modelo_sha256: string | null;
  resultado_validacion_hash: string | null;
  id_version_modelo_anterior: number | null;
  rollback_ejecutado: boolean;
  intentos_descarga: number;
  max_reintentos: number;
  tamano_modelo_bytes: number | null;
  tamano_descargado_bytes: number | null;
  duracion_proceso_ms: number | null;
  ventana_inicio: string | null;
  ventana_fin: string | null;
  nivel_bateria_al_inicio: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  motivo_fallo: string | null;
}

export interface OtaStatusResponse {
  id_version_modelo: number;
  despliegues: DespliegueOtaResponse[];
  total: number;
}

export interface DespliegueOtaListResponse {
  total: number;
  items: DespliegueOtaResponse[];
}

export interface ListarDesplieguesFiltros {
  id_version?: number;
  id_dispositivo?: number;
  estado?: string;
  limit?: number;
  offset?: number;
}

// =====================================================================
// RF-72 · Retroalimentación Clínica — /prediccion/retroalimentacion (45)
// =====================================================================
export interface RegistrarRetroalimentacionDTO {
  id_resultado_inferencia: string;
  id_activo_biologico: number;
  estado_retroalimentacion: EstadoRetro;
  diagnosticos_reales?: number[] | null;
  observaciones_clinicas?: string | null;
  fuente_diagnostico?: FuenteDiagnostico | null;
}

export interface RetroalimentacionClinicaResponse {
  id_retroalimentacion: string;
  id_resultado_inferencia: string;
  id_activo_biologico: number;
  estado_retroalimentacion: EstadoRetro;
  diagnosticos_reales: number[] | null;
  fuente_diagnostico: FuenteDiagnostico | null;
  es_fuente_desconocida: boolean;
  es_conflicto_retroalimentacion: boolean;
  observaciones_clinicas: string | null;
  id_usuario_veterinario: number;
  fecha_retroalimentacion: string;
  estado_registro: string;
}

// =====================================================================
// RF-73 · Auditoría M04 — /prediccion/auditoria (recurso 46, Admin)
// =====================================================================
export interface EventoAuditoriaM04Response {
  id_evento: string;
  tipo_evento: string;
  modulo: string;
  fecha_evento: string;
  tipo_actor: TipoActor;
  correlacion_id: string | null;
  payload_evento: Record<string, unknown> | null;
  es_payload_truncado: boolean;
  severidad_evento: SeveridadEvento;
  origen_registro: string | null;
  id_usuario: number | null;
  id_sistema: string | null;
  id_referencia: string | null;
  entidad_referencia: string | null;
  resultado_operacion: string | null;
  codigo_error: string | null;
  descripcion_error: string | null;
  origen_dato: string | null;
  version_modelo: string | null;
  latencia_ms: number | null;
  hash_evento: string | null;
}

export interface AuditoriaM04ListResponse {
  total: number;
  pagina: number;
  por_pagina: number;
  items: EventoAuditoriaM04Response[];
}

export interface ListarAuditoriaFiltros {
  tipo_evento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  id_usuario?: number;
  id_sistema?: string;
  id_referencia?: string;
  severidad_evento?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface ExportarAuditoriaFiltros extends ListarAuditoriaFiltros {
  formato?: 'json' | 'csv';
}

// =====================================================================
// Selector de activos biológicos (para el filtro de RF-67).
// Forma mínima; el listado se consulta vía historialApi sin importar el
// módulo biological_assets (regla: un módulo no importa de otro).
// =====================================================================
export interface ActivoSelectorItem {
  id_activo_biologico: number;
  identificador: string | null;
  tipo: string;
  nombre_especie: string | null;
}
