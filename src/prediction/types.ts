// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | DEV-36 RF-65: config_version en ConfigurarMotorDTO |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: etiquetaTipoModelo muestra "Sin tipo", nunca "null" |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/M4-02: nombre del usuario en auditoría, de variables y de especie en patologías |
// | 2026-10-29 | Arekkazu | TC-DIS-195 RF-73: columna ID de evento y filtros por actor y tipo de modelo |
// | 2026-10-29 | Arekkazu | QA-M04-27-10 / PEND-456 RF-54/66/68/70: nombres de versión, buffer, inferencias y contagio reales |
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ampliación de la ventana para un resultado |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M4-05 RF-70: solo equipos compatibles con el tipo de modelo de la versión |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18/N-05 RF-66: enfermedad y lote por nombre; poblacional sin umbral no se clasifica |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19/T-22 RF-65/69/70: componentes con etiqueta y números en formato regional |
// =====================================================================
// Módulo 4 — Predicción / IA · Tipos de dominio
// Contrato: do-it/prediction/api_reference_m04_prediction_iot.md
//
// Convenciones (mirror de src/telemetry/types.ts):
//  - Campos JSON en snake_case (espejan el backend).
//  - Decimal del backend → number | null.  datetime/date/UUID → string.
//  - Uniones const en MAYÚSCULAS para los enums del dominio.
// =====================================================================
import i18n from '../shared/i18n';

// ── Enums (uniones const) ────────────────────────────────────────────
/** RFC-009: eje tipo de manejo (6 modelos en 3 paradigmas), ya no tamaño del animal. */
export type TipoModelo =
  | 'MODELO_AVES' | 'MODELO_PORCINOS' | 'MODELO_ACUICULTURA'
  | 'MODELO_ESPECIES_MEDIANAS' | 'MODELO_ESPECIES_GRANDES' | 'MODELO_RIESGO_CONTAGIO';

/** Lo deriva el backend del tipo_modelo; decide umbrales, métricas y componente. */
export type Paradigma = 'POBLACIONAL' | 'INDIVIDUAL' | 'META';

/** RF-69/RF-70: los modelos POBLACIONAL se versionan y despliegan por componente. */
export type Componente = 'DETECTOR' | 'SEGUIMIENTO' | 'METRICAS' | 'ANOMALIAS';

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

/** Etiquetas legibles para `tipo_modelo`. */
export const TIPO_MODELO_LABEL: Record<TipoModelo, string> = {
  MODELO_AVES: 'Aves',
  MODELO_PORCINOS: 'Porcinos',
  MODELO_ACUICULTURA: 'Acuicultura',
  MODELO_ESPECIES_MEDIANAS: 'Especies medianas',
  MODELO_ESPECIES_GRANDES: 'Especies grandes',
  MODELO_RIESGO_CONTAGIO: 'Riesgo de contagio',
};

/**
 * M4-09: hay versiones sin `tipo_modelo` en la BD y el `?? tipo` las pintaba
 * como "· null" en los filtros de Distribución.
 */
export function etiquetaTipoModelo(tipo: string | null | undefined): string {
  if (!tipo) return 'Sin tipo';
  return TIPO_MODELO_LABEL[tipo as TipoModelo] ?? tipo;
}

export const PARADIGMA_POR_TIPO: Record<TipoModelo, Paradigma> = {
  MODELO_AVES: 'POBLACIONAL',
  MODELO_PORCINOS: 'POBLACIONAL',
  MODELO_ACUICULTURA: 'POBLACIONAL',
  MODELO_ESPECIES_MEDIANAS: 'INDIVIDUAL',
  MODELO_ESPECIES_GRANDES: 'INDIVIDUAL',
  MODELO_RIESGO_CONTAGIO: 'META',
};

export const TIPOS_MODELO = Object.keys(PARADIGMA_POR_TIPO) as TipoModelo[];

/** RF-20: el meta-modelo de contagio no se asigna a un área ni es familia de una especie. */
export const TIPOS_MODELO_ASIGNABLES = TIPOS_MODELO.filter((t) => PARADIGMA_POR_TIPO[t] !== 'META');

export const COMPONENTES: Componente[] = ['DETECTOR', 'SEGUIMIENTO', 'METRICAS', 'ANOMALIAS'];

/** T-19: «Métricas», no «METRICAS». Un componente fuera del catálogo se muestra tal cual. */
export function etiquetaComponente(componente: string | null | undefined): string {
  if (!componente) return '';
  return COMPONENTES.includes(componente as Componente) ? i18n.t(`prediction:componentes.${componente}`) : componente;
}

// =====================================================================
// RF-64 · Catálogo de Patologías — /prediccion/patologias (recurso 18)
// =====================================================================
export interface PatologiaVariableResponse {
  id_variable_ambiental: number;
  peso_evidencia: number | null;
  es_variable_critica: boolean;
  /** M4-02: del catálogo I3P-1; antes se mostraba "Variable 13". */
  nombre_variable?: string | null;
  unidad?: string | null;
}

export interface PatologiaM04Response {
  id_patologia: number;
  nombre_patologia: string;
  especie_aplicable: string;
  /** M4-02: nombre de la especie; null con TODAS. */
  nombre_especie?: string | null;
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
  paradigma: Paradigma;
  /** INDIVIDUAL/META; null en POBLACIONAL. */
  umbral_riesgo_alto: number | null;
  umbral_alerta_critica: number | null;
  /** POBLACIONAL; null en INDIVIDUAL/META. */
  umbral_score_anomalia: number | null;
  /** POBLACIONAL: componente -> id_version ACTIVO (reemplaza id_version_modelo_activa). */
  versiones_activas_por_componente: Partial<Record<Componente, number>> | null;
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
  umbral_riesgo_alto?: number | null;
  umbral_alerta_critica?: number | null;
  umbral_score_anomalia?: number | null;
  versiones_activas_por_componente?: Partial<Record<Componente, number>> | null;
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
  /** DEV-36 (RF-65 CA-9): config_version leída; obligatoria al editar (412 si cambió). */
  config_version?: number | null;
}

/**
 * RF-65 E7/E8/E10 (DEV-09): estado de la configuración en cada nodo Edge.
 * - APLICADA: el nodo confirmó la misma `config_version`.
 * - PENDIENTE: el nodo estaba desconectado; se aplicará al reconectar (E7).
 * - FALLIDA: el nodo no confirmó (sin ACK) (E8).
 * - DESINCRONIZADO: el nodo confirmó otra `config_version` (E10).
 */
export type EstadoSincronizacionNodo = 'APLICADA' | 'PENDIENTE' | 'FALLIDA' | 'DESINCRONIZADO';

export interface SincronizacionNodo {
  id_dispositivo_iot: number;
  serial: string;
  config_version_servidor: number;
  config_version_nodo: number | null;
  estado_sincronizacion: EstadoSincronizacionNodo;
  intentos_sincronizacion: number;
  fecha_ultimo_intento: string | null;
  fecha_aplicacion: string | null;
  motivo_fallo: string | null;
}

export interface SincronizacionMotor {
  /** Consolidado: el peor estado entre los nodos (APLICADA si no hay nodos). */
  estado: EstadoSincronizacionNodo;
  mensaje: string;
  nodos: SincronizacionNodo[];
}

/**
 * Resultado de `POST /prediccion/motor-ia`. En los cuatro códigos la configuración
 * quedó guardada; el código solo dice si llegó a los nodos:
 * 201/200 aplicada (o sin nodos) · 202 algún nodo PENDIENTE o FALLIDA · 409 DESINCRONIZADO.
 */
export interface ResultadoGuardarMotor {
  config: ConfiguracionMotorIAResponse;
  sincronizacion: SincronizacionMotor;
  status: 200 | 201 | 202 | 409;
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
  paradigma: Paradigma | null;
  componente: Componente | null;
  /** POBLACIONAL: calibracion_completada, tasa_falsos_positivos_rutina, tasa_deteccion_eventos_clinicos. */
  metricas_poblacionales: Record<string, number | boolean> | null;
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
/** RF-66: un resultado del motor de inferencia (GET /prediccion/inferencias). */
export interface InferenciaMonitorResponse {
  id_resultado_inferencia: string;
  id_activo_biologico: number;
  identificador_activo: string | null;
  nombre_area: string;
  nombre_finca: string;
  especie: string | null;
  tipo_modelo: TipoModelo;
  paradigma: Paradigma | null;
  id_version_modelo: number;
  nombre_version: string | null;
  nivel_riesgo: number;
  /** INDIVIDUAL: {"0": p, ..., "3": p}. POBLACIONAL: puede traer score_anomalia y umbral. */
  probabilidad_riesgo: Record<string, number>;
  id_patologia: number | null;
  nombre_patologia: string | null;
  /** Probabilidad por patología: {nombre o id: p}. */
  probabilidad_enfermedad: Record<string, number>;
  confianza_global: number;
  contexto_incompleto: boolean;
  latencia_excedida: boolean;
  modo_ejecucion: ModoEjecucion;
  latencia_ms: number | null;
  fecha_inicio_ventana: string | null;
  fecha_fin_ventana: string | null;
  fecha_inferencia: string;
  tiene_alerta_generada: boolean;
  id_alerta_generada: number | null;
  /** T-18: nombre de cada patología de `probabilidad_enfermedad`, por su id (backend). */
  nombres_patologias?: Record<string, string> | null;
}

/** RF-68: un cálculo de riesgo de contagio de un lote (GET /prediccion/riesgo-contagio). */
export interface RiesgoContagioMonitorResponse {
  id_resultado_contagio: number;
  id_activo_biologico: number;
  identificador_activo: string | null;
  nombre_area: string;
  nombre_finca: string;
  especie: string | null;
  probabilidad_contagio: number;
  /** 0 BAJO, 1 MEDIO, 2 ALTO. */
  nivel_riesgo_contagio: number;
  factor_sanitario_fs: number;
  factor_ambiental_fa: number | null;
  factor_densidad_fd: number | null;
  w_fs_aplicado: number;
  w_fa_aplicado: number;
  w_fd_aplicado: number;
  confianza_baja: boolean;
  data_quality_score: number | null;
  factores_ausentes: string[] | null;
  modo_ejecucion_calculo: string | null;
  n_enfermos_detectados: number | null;
  total_activos_lote: number | null;
  porcentaje_sensores_activos: number | null;
  fecha_calculo: string;
  id_alerta_generada: number | null;
  detalle_calculo: Record<string, unknown> | null;
}

export interface DespliegueOtaResponse {
  id_despliegue_ota: number;
  id_version_modelo: number;
  /** CU06 H-02: nombre de la versión (backend #866); antes solo se veía "v43". */
  nombre_version?: string | null;
  nombre_version_anterior?: string | null;
  id_dispositivo_iot: number;
  /** T-18: descripción o serial del equipo (backend). */
  nombre_dispositivo?: string | null;
  tipo_modelo: TipoModelo;
  paradigma: Paradigma | null;
  componente: Componente | null;
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
  /** DEV-15 (DB-04): distribución y fase del rollout a la que pertenece. */
  id_distribucion_ota?: number | null;
  fase_rollout?: FaseRollout | null;
  fecha_expiracion_url?: string | null;
  id_mensaje_notify?: string | null;
}

// RF-70 · Orquestador OTA (DEV-15, D6 de AIOT-DEV-03) — FE-01b
/** Rollout por fases: 1 nodo canary, luego 20–30 % (parcial), luego el resto (total). */
export type FaseRollout = 'CANARY' | 'PARCIAL' | 'TOTAL';
export const FASES_ROLLOUT: FaseRollout[] = ['CANARY', 'PARCIAL', 'TOTAL'];
export type EstadoDistribucion = 'EN_CURSO' | 'COMPLETADA' | 'DETENIDA';
export type ModoDistribucion = 'INMEDIATO' | 'PROGRAMADO' | 'POR_LOTES';
export const MODOS_DISTRIBUCION: ModoDistribucion[] = ['INMEDIATO', 'PROGRAMADO', 'POR_LOTES'];

/** `POST /prediccion/ota/distribuciones`. El orden de los dispositivos decide el rollout: el primero es el canary. */
export interface CrearDistribucionOtaDTO {
  id_version_modelo: number;
  lista_dispositivos_objetivo: number[];
  modo_distribucion: ModoDistribucion;
  ventana_inicio?: string | null;
  ventana_fin?: string | null;
  nivel_bateria_minimo?: number | null;
  tamano_fragmento_bytes: number;
  max_reintentos_descarga: number;
  porcentaje_parcial: number;
}

export interface DistribucionOtaResponse {
  id_distribucion_ota: number;
  id_version_modelo: number;
  tipo_modelo: TipoModelo;
  componente: Componente | null;
  modo_distribucion: ModoDistribucion;
  ventana_inicio: string | null;
  ventana_fin: string | null;
  nivel_bateria_minimo: number | null;
  tamano_fragmento_bytes: number;
  max_reintentos_descarga: number;
  porcentaje_parcial: number;
  fase_rollout: FaseRollout;
  estado_distribucion: EstadoDistribucion;
  id_usuario: number;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  despliegues: DespliegueOtaResponse[];
}

/** Dispositivo IoT que se puede elegir como objetivo (GET /configuracion/dispositivos-iot). */
export interface DispositivoObjetivoOta {
  id_dispositivo_iot: number;
  serial: string;
  descripcion: string;
  es_activo: boolean;
  /** M4-05: SENSOR | CAMARA, para filtrar los 373 equipos del paso 3. */
  categoria?: string | null;
  /** M4-05: área del equipo, para reconocerlo sin el serial. */
  nombre_infraestructura?: string | null;
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

/** RF-72: excepción del Administrador a la ventana para un resultado (POST /prediccion/retroalimentacion/ampliaciones). */
export interface AmpliarVentanaRetroDTO {
  id_resultado_inferencia: string;
  dias_habilitados: number;    // 1–365, desde hoy
  justificacion: string;       // 10–1000 caracteres, queda en RF-73
}

export interface AmpliacionVentanaRetroResponse {
  id_ampliacion_ventana_retroalimentacion: number;
  id_resultado_inferencia: string;
  fecha_limite: string;
  justificacion: string;
  id_usuario_autorizador: number;
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
  /** T-18: «Usuario 900» no decía quién; null si el backend aún no lo expone. */
  nombre_usuario?: string | null;
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
  tipo_modelo?: string;
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
  /** M4-03: para ofrecer solo diagnósticos de su especie. */
  id_especie?: number | null;
}
