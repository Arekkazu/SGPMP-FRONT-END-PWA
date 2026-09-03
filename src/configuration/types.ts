// =====================================================================
// Especies
// =====================================================================
export interface EspecieResponse {
  id_especie: number;
  nombre: string;
  descripcion: string | null;
  es_activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
}

export interface RegistrarEspecieDTO {
  nombre: string;
  descripcion?: string;
}

export interface EditarEspecieDTO {
  nombre: string;
  descripcion?: string;
  fecha_actualizacion: string;
}

// =====================================================================
// Fincas
// =====================================================================
export interface UbicacionFinca {
  departamento: string;
  municipio: string;
  vereda: string;
  latitud: number;
  longitud: number;
}

export interface FincaResponse {
  id_finca: number;
  nombre: string;
  ubicacion: UbicacionFinca;
  tamano_h: number;
  es_activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  id_usuario: number | null;
}

export interface RegistrarFincaDTO {
  nombre: string;
  ubicacion: UbicacionFinca;
  tamano_h: number;
  id_usuario?: number;
}

export interface EditarFincaDTO extends RegistrarFincaDTO {
  fecha_actualizacion: string;
}

// =====================================================================
// Infraestructuras
// =====================================================================
export interface InfraestructuraResponse {
  id_infraestructura: number;
  nombre_infraestructura: string;
  tipo_area: string;
  superficie: number;
  id_finca: number;
  descripcion_infraestructura: string | null;
  es_activo: boolean;
  fecha_actualizacion: string | null;
}

export interface RegistrarInfraestructuraDTO {
  nombre_infraestructura: string;
  tipo_area: string;
  superficie: number;
  finca_id: number;
  descripcion_infraestructura?: string;
}

export interface EditarInfraestructuraDTO extends RegistrarInfraestructuraDTO {
  fecha_actualizacion?: string;
}

// =====================================================================
// Dispositivos IoT
// =====================================================================
export interface DispositivoIotResponse {
  id_dispositivo_iot: number;
  serial: string;
  descripcion: string;
  id_infraestructura: number;
  es_activo: boolean;
  fecha_creacion: string;
}

export interface RegistrarDispositivoIotDTO {
  serial: string;
  descripcion: string;
  id_infraestructura: number;
  es_activo?: boolean;
}

// =====================================================================
// Sensores
// =====================================================================
export type CategoriaSensor =
  | 'HUMEDAD'
  | 'TEMPERATURA'
  | 'OXIGENO'
  | 'PH'
  | 'AMONIACO'
  | 'SALINIDAD'
  | 'LUMINOSIDAD';

export interface SensorResponse {
  id_sensores: number;
  nombre: string;
  id_dispositivo_iot: number;
  es_activo: boolean;
  categoria: string | null;
}

export interface RegistrarSensorDTO {
  nombre: string;
  categoria?: CategoriaSensor;
}

// =====================================================================
// Configuración Remota IoT (202 Accepted)
// =====================================================================
export interface ConfiguracionRemotaResponse {
  id_configuracion_remota: number;
  id_dispositivo_iot: number;
  frecuencia_captura: number;
  intervalo_transmision: number;
  estado: string;
  id_usuario: number | null;
  fecha_creacion: string | null;
  fecha_aplicacion: string | null;
  mensaje: string | null;
}

export interface ConfigurarRemotamenteDTO {
  frecuencia_captura: number;
  intervalo_transmision: number;
}

// =====================================================================
// Sensores — Asociación a Áreas
// =====================================================================
export interface SensorAreaResponse {
  id_sensores_area_asociada: number;
  id_sensor: number;
  id_dispositivo_iot: number;
  id_infraestructura: number;
  punto_instalacion: string;
  tiene_estado: boolean;
  fecha_asociacion: string;
  fecha_finalizacion: string | null;
  id_usuario: number;
}

export interface AsociarSensorAreaDTO {
  id_dispositivo_iot: number;
  id_infraestructura: number;
  punto_instalacion: string;
}

// =====================================================================
// Calibración de Sensores
// =====================================================================
export interface CalibracionResponse {
  id_calibracion: number;
  id_dispositivo_iot: number;
  id_sensor: number;
  valor_referencia: number;
  fecha_calibracion: string;
  id_usuario: number;
  observaciones: string | null;
}

export interface RegistrarCalibracionDTO {
  id_dispositivo_iot: number;
  id_infraestructura: number;
  valor_referencia: number;
  fecha_calibracion: string;
  observaciones?: string;
}

// =====================================================================
// Ciclos Biológicos
// =====================================================================
export interface CicloBiologicoResponse {
  id_ciclo_biologico: number;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  id_especie: number;
  es_activo: boolean;
  fecha_actualizacion: string | null;
}

export interface RegistrarCicloDTO {
  id_especie: number;
  nombre: string;
  descripcion?: string;
  duracion_dias: number;
}

export interface EditarCicloDTO {
  id_especie: number;
  nombre: string;
  descripcion?: string;
  duracion_dias: number;
  fecha_actualizacion?: string;
}

// =====================================================================
// Patologías
// =====================================================================
export interface PatologiaEspecieItemResponse {
  id_especies_patologias: number;
  id_patologia: number;
  id_especie: number;
  nombre: string;
  descripcion: string | null;
  es_activo: boolean;
  fecha_actualizacion: string | null;
}

export interface RegistrarPatologiaDTO {
  id_especie: number;
  nombre: string;
  descripcion?: string;
}

export interface EditarPatologiaDTO {
  nombre: string;
  descripcion?: string;
  fecha_actualizacion?: string;
}

// =====================================================================
// Métricas de Producción
// =====================================================================
export type TipoMedicion = 'PESO' | 'VOLUMEN' | 'LONGITUD' | 'CONTEO' | 'OTRO';
export type TipoActivo = 'INDIVIDUAL' | 'LOTE' | 'AMBOS';

export interface MetricaProduccionResponse {
  id_metrica_produccion: number;
  nombre: string;
  unidad_medida: string;
  tipo_medicion: TipoMedicion;
  aplica_a_tipo_activo: TipoActivo;
  id_especie: number | null;
  es_activo: boolean;
  fecha_actualizacion: string | null;
}

export interface RegistrarMetricaDTO {
  id_especie: number;
  nombre: string;
  unidad_medida: string;
  tipo_medicion: TipoMedicion;
  aplica_a_tipo_activo?: TipoActivo;
}

export interface EditarMetricaDTO {
  nombre: string;
  unidad_medida: string;
  tipo_medicion: TipoMedicion;
  aplica_a_tipo_activo: TipoActivo;
  fecha_actualizacion?: string;
}

// =====================================================================
// Umbrales Ambientales
// =====================================================================
export type NivelAlerta = 'normal' | 'precaucion' | 'critico';

export interface NivelAlertaDTO {
  nivel: NivelAlerta;
  limite_inferior: number;
  limite_superior: number;
}

export interface UmbralAmbientalResponse {
  id_umbral_ambiental: number;
  id_especie: number;
  id_variable_ambiental: number;
  unidad_medida: string;
  valor_min: number;
  valor_max: number;
  es_activo: boolean;
  fecha_actualizacion: string | null;
  niveles: NivelAlertaDTO[];
}

export interface RegistrarUmbralDTO {
  id_especie: number;
  id_variable_ambiental: number;
  valor_min: number;
  valor_max: number;
  niveles: NivelAlertaDTO[];
}

export interface EditarUmbralDTO {
  valor_min: number;
  valor_max: number;
  niveles: NivelAlertaDTO[];
  fecha_actualizacion?: string;
}

// =====================================================================
// Parámetros Globales
// =====================================================================
export interface ConfiguracionGlobalResponse {
  id_configuracion_global: number;
  frecuencia_muestreo: number;
  heartbeat: number;
  fecha_actualizacion: string;
  id_usuario: number;
  es_activo: boolean;
}

export interface CrearConfiguracionGlobalDTO {
  frecuencia_muestreo: number;
  heartbeat: number;
}

export interface ActualizarConfiguracionGlobalDTO {
  frecuencia_muestreo: number;
  heartbeat: number;
  fecha_actualizacion: string;
}

// =====================================================================
// Contexto de Interfaz
// =====================================================================
export interface ContextoInterfazResponse {
  id_usuario: number;
  nombre_completo: string;
  id_rol: number;
  nombre_rol: string;
  id_finca: number | null;
  finca_activa: string | null;
  departamento: string | null;
  especies_configuradas: string[];
  modulos_autorizados: string[];
}

// =====================================================================
// Identidad Visual
// =====================================================================
export interface IdentidadVisualResponse {
  id_identidad_visual: number;
  id_finca: number;
  id_usuario: number;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  org_display_name: string;
  version: number | null;
  fecha_creacion: string | null;
}

export interface GuardarIdentidadVisualDTO {
  id_finca: number;
  primary_color: string;
  secondary_color: string;
  org_display_name: string;
}

export interface ActualizarIdentidadVisualDTO {
  primary_color: string;
  secondary_color: string;
  org_display_name: string;
  version: number;
}

// =====================================================================
// Tema Visual
// =====================================================================
export interface TemaResueltoResponse {
  theme_mode: number;
  fuente: 'personal' | 'global' | 'default';
  id_tema_visual: number | null;
}

export interface TemaVisualResponse {
  id_tema_visual: number;
  id_usuario: number;
  theme_mode: number;
  es_global: boolean;
  fecha_actualizacion: string | null;
}

export interface GuardarTemaDTO {
  theme_mode: number;
}

// =====================================================================
// Idioma
// =====================================================================
export interface IdiomaResueltoResponse {
  /** Siempre 'es-CO' o 'en-US'. El backend rechaza 'es'/'en' con 400. */
  locale_code: string;
  /** El backend responde 'defecto', no 'default'. */
  fuente: 'personal' | 'global' | 'defecto';
  id_preferencia_idioma: number | null;
  /** Se reenvía en el PATCH para detectar el conflicto de perfil (409). */
  version_perfil?: number | null;
}

export interface PreferenciaIdiomaResponse {
  id_preferencia_idioma: number;
  id_usuario: number;
  locale_code: string;
  es_por_defecto: boolean;
  fecha_actualizacion: string | null;
  version_perfil?: number | null;
}

export interface GuardarIdiomaDTO {
  locale_code: string;
  /** Opcional: omitirla salta la comprobación de concurrencia en el backend. */
  version_perfil?: number | null;
}

// =====================================================================
// Dashboard Layout
// =====================================================================
export interface WidgetConfigDTO {
  id_widget: number;
  posicion_fila: number;
  posicion_columna: number;
  span_columnas: number;
  visible: boolean;
  orden: number;
}

export interface DashboardLayoutResponse {
  id_dashboard_layout: number | null;
  id_usuario: number;
  grid: WidgetConfigDTO[];
  active_widget: string[];
  fecha_actualizacion: string | null;
  // Se reenvia en el PATCH para que el backend detecte que el perfil cambio
  // mientras el usuario editaba (RF-28, conflicto de concurrencia).
  version_perfil: number | null;
}

export interface GuardarDashboardDTO {
  layout_config: WidgetConfigDTO[];
  active_widget: string[];
  version_perfil?: number | null;
}

// El catalogo lo define el backend (modulo9.widgets) y viene filtrado por el rol
// del usuario: cada widget se habilita con el permiso de lectura de su propio
// recurso, no con el del dashboard.
export interface WidgetCatalogoItem {
  id_widget: number;
  clave: string;
  nombre: string;
  grupo: string;
  span_predeterminado: 1 | 2;
}

export interface WidgetDatosResponse {
  id_widget: number;
  clave: string;
  nombre: string;
  posicion_fila: number;
  posicion_columna: number;
  span_columnas: number;
  orden: number;
  sin_datos: boolean;
  mensaje: string | null;
  datos: Record<string, unknown>[];
}

// =====================================================================
// Plantillas de Configuración
// =====================================================================

/**
 * Categorías que el RF-30 autoriza dentro de una plantilla. Los dispositivos
 * IoT, la infraestructura, el dashboard y la identidad visual quedan fuera a
 * propósito: dependen del contexto de cada unidad productiva y el backend
 * rechaza el snapshot que las incluya.
 */
export const CATEGORIAS_PLANTILLA = [
  'ciclos_biologicos',
  'patologias',
  'metricas_produccion',
  'umbrales_ambientales',
] as const;

export type CategoriaPlantilla = (typeof CATEGORIAS_PLANTILLA)[number];

/**
 * Configuración real de una especie en la forma que espera `params_snapshot`.
 * Sin ids propios de la especie origen: la plantilla se aplica sobre otra.
 */
export interface SnapshotEspecie {
  ciclos_biologicos: { nombre: string; duracion_dias: number; descripcion: string | null }[];
  patologias: { nombre: string; descripcion: string | null; es_activo: boolean }[];
  metricas_produccion: {
    nombre: string;
    unidad_medida: string;
    tipo_medicion: TipoMedicion;
    aplica_a_tipo_activo: TipoActivo;
  }[];
  umbrales_ambientales: {
    id_variable_ambiental: number;
    unidad_medida: string;
    valor_min: string;
    valor_max: string;
    niveles: { nivel: NivelAlerta; limite_inferior: string; limite_superior: string }[];
  }[];
}

export interface PlantillaResponse {
  id_plantilla: number;
  id_especie: number;
  id_usuario: number;
  template_name: string;
  params_snapshot: Record<string, unknown>;
  version: number;
  fecha_creacion: string;
}

export interface RegistrarPlantillaDTO {
  template_name: string;
  id_especie: number;
  params_snapshot: Record<string, unknown>;
}

/** Versionar solo cambia los parámetros: nombre y especie los hereda la base. */
export interface VersionarPlantillaDTO {
  params_snapshot: Record<string, unknown>;
}

export interface AplicarPlantillaDTO {
  id_especie_destino: number;
  fecha_actualizacion_especie_destino: string | null;
}

export interface AplicacionPlantillaResponse {
  id_aplicacion_plantilla: number;
  id_plantilla: number;
  id_usuario: number;
  target_config: Record<string, unknown>;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  fecha_aplicacion: string | null;
}
