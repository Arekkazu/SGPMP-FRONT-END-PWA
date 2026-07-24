// =====================================================================
// Módulo 2 — Activos Biológicos · Tipos de dominio
// Contrato: do-it/biological_assets/.../api_reference_m02_activos_biologicos.md
// =====================================================================

// ── Enums (uniones const) ────────────────────────────────────────────
export type TipoActivo = 'INDIVIDUAL' | 'POBLACIONAL';

export type OrigenFinanciero = 'compra' | 'nacimiento' | 'donacion' | 'transferencia_interna';

export type EstadoActivoNombre =
  | 'ACTIVO' | 'INACTIVO' | 'EN_TRATAMIENTO' | 'AISLADO' | 'CERRADO' | 'BAJA';

export type CategoriaHistorial =
  | 'ESTADO' | 'FASE' | 'EVENTO_BIOLOGICO' | 'CRECIMIENTO' | 'SANITARIO'
  | 'REPRODUCTIVO' | 'PRODUCTIVO' | 'BAJA' | 'TRANSFERENCIA';

export type TipoMedicionCrecimiento = 'PESO' | 'TALLA' | 'BIOMASA';
export type TipoEventoSanitario = 'VACUNACION' | 'TRATAMIENTO' | 'DIAGNOSTICO' | 'CONTROL_PREVENTIVO';
export type CategoriaReproductiva =
  | 'servicio' | 'inseminacion' | 'diagnostico' | 'parto' | 'aborto' | 'nacimiento';
export type ResultadoReproductivo = 'exitoso' | 'fallido';
export type TipoBaja = 'muerte' | 'venta' | 'sacrificio' | 'perdida' | 'descarte_sanitario';
export type TipoIndicador = 'CRECIMIENTO' | 'PRODUCCION' | 'SANITARIO' | 'EFICIENCIA' | 'TODOS';

// ── Máquina de estados (EstadoActivo) ────────────────────────────────
export const ESTADO_ID: Record<EstadoActivoNombre, number> = {
  ACTIVO: 1, INACTIVO: 2, EN_TRATAMIENTO: 3, AISLADO: 4, CERRADO: 5, BAJA: 6,
};

export const ID_ESTADO: Record<number, EstadoActivoNombre> = {
  1: 'ACTIVO', 2: 'INACTIVO', 3: 'EN_TRATAMIENTO', 4: 'AISLADO', 5: 'CERRADO', 6: 'BAJA',
};

export const TRANSICIONES_VALIDAS: Record<EstadoActivoNombre, EstadoActivoNombre[]> = {
  ACTIVO:         ['INACTIVO', 'EN_TRATAMIENTO', 'AISLADO', 'CERRADO', 'BAJA'],
  INACTIVO:       ['ACTIVO', 'EN_TRATAMIENTO', 'CERRADO', 'BAJA'],
  EN_TRATAMIENTO: ['ACTIVO', 'INACTIVO', 'AISLADO', 'CERRADO', 'BAJA'],
  AISLADO:        ['ACTIVO', 'INACTIVO', 'EN_TRATAMIENTO', 'CERRADO', 'BAJA'],
  CERRADO:        ['BAJA'],
  BAJA:           [],
};

/** Estados en los que se pueden registrar eventos biológicos. */
export const ESTADOS_PERMITEN_EVENTOS: EstadoActivoNombre[] = ['ACTIVO', 'EN_TRATAMIENTO', 'AISLADO'];

// ── Activo biológico — detalle ───────────────────────────────────────
export interface DetalleIndividualResponse {
  id_detalle: number | null;
  raza: string;
  sexo: string;
  fecha_nacimiento: string;      // datetime ISO
  peso_inicial: number | null;
  fecha_creacion: string | null;
}

export interface DetallePoblacionalResponse {
  id_detalle: number | null;
  cantidad_inicial: number;
  cantidad_actual: number | null;
  peso_promedio_inicial: number | null;
  peso_promedio: number | null;
  biomasa_total: number | null;
  densidad: number | null;
}

export interface ActivoBiologicoResponse {
  id_activo_biologico: number;
  id_especie: number;
  tipo: TipoActivo | string;
  identificador: string | null;
  fecha_inicio_ciclo: string | null;
  detalles_procedencia: string | null;
  origen_financiero: OrigenFinanciero | string;
  costo_adquisicion: number | null;
  soporte_documental: string | null;
  descripcion: string | null;
  id_infraestructura: number;
  atributos_dinamicos: Record<string, unknown> | null;
  id_estado: number;
  nombre_estado: string | null;
  id_usuario: number;
  fecha_creacion: string | null;
  detalle_individual: DetalleIndividualResponse | null;
  detalle_poblacional: DetallePoblacionalResponse | null;
}

// ── DTOs — registro / actualización ──────────────────────────────────
export interface RegistrarActivoDTO {
  tipo_activo: TipoActivo;
  id_especie: number;
  fecha_inicio_ciclo: string;              // date
  detalles_procedencia?: string | null;
  origen_financiero: OrigenFinanciero;
  costo_adquisicion?: number | null;
  soporte_documental?: string | null;
  id_infraestructura: number;
  atributos_dinamicos?: Record<string, unknown> | null;
  // INDIVIDUAL
  identificador?: string | null;
  raza?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;        // datetime
  peso_inicial?: number | null;
  // POBLACIONAL
  cantidad_inicial?: number | null;
  peso_promedio_inicial?: number | null;
}

export interface ActualizarActivoIndividualDTO {
  raza?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;        // datetime
  peso_inicial?: number | null;
}

/** Ítem del listado (endpoint presunto GET /activos-biologicos/ — ver TODO en TASKS.md). */
export interface ActivoListItem {
  id_activo_biologico: number;
  tipo: TipoActivo | string;
  identificador: string | null;
  id_especie: number;
  nombre_especie?: string | null;
  id_estado: number;
  nombre_estado?: string | null;
  id_infraestructura: number | null;
  nombre_infraestructura?: string | null;
  fecha_inicio_ciclo?: string | null;
  cantidad_actual?: number | null;
}

export interface ListarActivosFiltros {
  tipo?: TipoActivo;
  id_especie?: number;
  id_estado?: number;
  id_infraestructura?: number;
  pagina?: number;
  page_size?: number;
}

export interface PaginaActivos {
  registros: ActivoListItem[];
  total_registros: number;
  pagina_actual: number;
  total_paginas: number;
  registros_por_pagina: number;
}

// ── Estado y ciclo de vida ───────────────────────────────────────────
export interface CambiarEstadoDTO {
  estado_nuevo: EstadoActivoNombre;
  fecha_cambio_estado: string;             // date
  motivo_cambio: string;
}

export interface HistoricoEstadoResponse {
  id_historico: number | null;
  id_activo_biologico: number;
  id_estado_anterior: number;
  nombre_estado_anterior: string | null;
  id_estado_nuevo: number;
  nombre_estado_nuevo: string | null;
  fecha_cambio: string;
  motivo_cambio: string | null;
  modulo_origen: string;
  id_usuario: number;
}

export interface CambioEstadoResponse {
  id_activo_biologico: number;
  estado_anterior: number;
  estado_nuevo: number;
  historial: HistoricoEstadoResponse;
}

export interface CerrarCicloDTO {
  fecha_cierre: string;                    // date
  motivo_cierre: string;
  descripcion_cierre?: string | null;
}

export interface CierreActivoResponse {
  id_activo_biologico: number;
  estado: string;
  fecha_cierre: string;
  motivo_cierre: string;
  fase_finalizada: boolean;
}

// ── Fases del ciclo productivo ───────────────────────────────────────
export interface CambiarFaseDTO {
  id_ciclo_productiva: number;
  motivo_cambio?: string | null;
  fecha_inicio?: string | null;            // datetime
}

export interface GestionFaseResponse {
  id_gestion_fases: number | null;
  id_activo_biologico: number;
  id_ciclo_productiva: number;
  nombre_ciclo: string;
  nombre_fase_actual: string | null;
  paso_actual: number | null;
  total_pasos: number | null;
  fecha_inicio: string;
  fecha_finalizacion: string | null;
  es_activa: boolean;
  motivo_cambio: string | null;
}

export interface HistorialFasesResponse {
  id_activo_biologico: number;
  fases: GestionFaseResponse[];
}

// ── Eventos ──────────────────────────────────────────────────────────
export interface EventoCrecimientoResponse {
  tipo_medicion: string;
  valor_medicion: number;
  unidad_medida: string;
  tipo_agregacion: string | null;
  frecuencia: string | null;
  nuevo_peso_promedio: number | null;
  cantidad_medida: number | null;
}

export interface EventoBajaResponse {
  cantidad_afectada: number;
  tipo: string;
  motivo_baja: string | null;
}

export interface EventoSanitarioResponse {
  tipo: string;
  diagnostico: string | null;
  medicamento: string | null;
  dosis: number | null;
  unidad_dosis: string | null;
  frecuencia: number | null;
  duracion: number | null;
  observaciones: string | null;
}

export interface EventoProductivoResponse {
  cantidad: number;
  id_metrica_produccion: number;
  id_ciclo_productivo: number;
  condiciones: string | null;
  tipo_producto: string | null;
  unidad_medida: string | null;
}

export interface EventoReproductivoResponse {
  categoria: string;
  resultado: string;
  numero_cria: number;
  id_padre: number | null;
  id_madre: number | null;
}

export interface EventoActivoResponse {
  id_eventos: number;
  id_activo_biologico: number;
  fecha: string;
  descripcion: string | null;
  id_usuario: number | null;
  crecimiento: EventoCrecimientoResponse | null;
  baja: EventoBajaResponse | null;
  sanitario: EventoSanitarioResponse | null;
  productivo: EventoProductivoResponse | null;
  reproductivo: EventoReproductivoResponse | null;
}

export interface HistorialEventosResponse {
  id_activo_biologico: number;
  total: number;
  eventos: EventoActivoResponse[];
}

export interface RegistrarEventoCrecimientoDTO {
  tipo_medicion: TipoMedicionCrecimiento;
  valor_medicion: number;
  unidad_medida: string;
  tipo_agregacion?: string | null;
  frecuencia?: string | null;
  nuevo_peso_promedio?: number | null;
  cantidad_medida?: number | null;
  fecha?: string | null;
  descripcion?: string | null;
}

export interface RegistrarEventoCrecimientoResponse {
  evento: EventoActivoResponse;
  fase_avanzada: boolean;
}

export interface RegistrarEventoBajaDTO {
  tipo_baja: TipoBaja;
  fecha_baja: string;                      // date
  motivo_baja: string;
  cantidad_afectada?: number | null;       // solo LOTE (baja parcial)
}

export interface RegistrarEventoSanitarioDTO {
  tipo: TipoEventoSanitario;
  diagnostico?: string | null;
  medicamento?: string | null;
  dosis?: number | null;
  unidad_dosis?: string | null;
  frecuencia?: number | null;
  duracion?: number | null;
  observaciones?: string | null;
  fecha?: string | null;
  descripcion?: string | null;
  solicitar_estado?: 'EN_TRATAMIENTO' | 'AISLADO' | null;
}

export interface RegistrarEventoSanitarioResponse {
  evento: EventoActivoResponse;
  cambio_estado: HistoricoEstadoResponse | null;
}

export interface RegistrarEventoProductivoDTO {
  tipo_producto: string;
  cantidad_producida: number;
  unidad_medida: string;
  fecha_evento: string;                    // date
  condiciones_produccion?: string | null;
  observaciones?: string | null;
}

export interface RegistrarEventoReproductivoDTO {
  categoria: CategoriaReproductiva;
  resultado: ResultadoReproductivo;
  fecha?: string | null;
  id_padre?: number | null;
  id_madre?: number | null;
  numero_crias?: number;
  descripcion?: string | null;
}

export interface RegistrarEventoReproductivoResponse {
  evento: EventoActivoResponse;
}

/** Unidades válidas por tipo de medición (RF-40). */
export const UNIDADES_POR_MEDICION: Record<TipoMedicionCrecimiento, string[]> = {
  PESO: ['kg', 'gr', 'lb'],
  TALLA: ['cm', 'm'],
  BIOMASA: ['kg/m2'],
};

// ── Infraestructura / historial / ficha / transferencias ─────────────
export interface AsociacionInfraestructuraResponse {
  id_historial: number;
  id_activo_biologico: number;
  id_infraestructura: number;
  nombre_infraestructura: string;
  tipo_infraestructura: string;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface ConsultaAsociacionResponse {
  tipo_consulta: string;
  id_activo_biologico: number;
  asociacion_activa: AsociacionInfraestructuraResponse | null;
  historial: AsociacionInfraestructuraResponse[] | null;
}

export interface ConsultarHistorialFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
  categoria_evento?: CategoriaHistorial;
  pagina?: number;
  page_size?: number;
}

export interface RegistroHistorialResponse {
  categoria: string;
  fecha_evento: string;
  descripcion: string;
  detalle_especifico: Record<string, unknown>;
  usuario_responsable: string;
  modulo_origen: string;
}

export interface HistorialActivoResponse {
  id_activo_biologico: number;
  total_registros: number;
  pagina_actual: number;
  total_paginas: number;
  registros_por_pagina: number;
  registros: RegistroHistorialResponse[];
}

export interface FichaIntegralResponse {
  id_activo_biologico: number;
  identificador: string | null;
  tipo: string;
  especie: string;
  fecha_registro: string | null;
  dias_en_sistema: number | null;
  estado_actual: string;
  infraestructura_asociada: string | null;
  fase_productiva_activa: string | null;
  raza: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  peso_actual: number | null;
  unidad_peso: string | null;
  fecha_ultimo_peso: string | null;
  cantidad_actual: number | null;
  biomasa_total: number | null;
  densidad: number | null;
  eventos_sanitarios: Record<string, unknown>[];
  eventos_productivos: Record<string, unknown>[];
  eventos_crecimiento: Record<string, unknown>[];
  eventos_reproductivos: Record<string, unknown>[];
  indicadores: Record<string, unknown>[];
  advertencias: string[];
}

export interface InfraestructuraDisponibleResponse {
  id_infraestructura: number;
  nombre: string;
  tipo: string;
  capacidad_maxima: number | null;
  id_especie: number | null;
}

export interface RegistrarTransferenciaDTO {
  infraestructura_origen_id: number;
  infraestructura_destino_id: number;
  fecha_transferencia: string;             // date
  motivo_transferencia: string;
}

export interface TransferenciaResponse {
  id_movimiento: number | null;
  id_activo_biologico: number;
  infraestructura_origen: string;
  infraestructura_destino: string;
  fecha_transferencia: string;
  motivo_transferencia: string;
  mensaje: string;
}

// ── Sensores IoT (recurso 30) ────────────────────────────────────────
export interface AsociarSensorActivoDTO {
  tipo_activo: 'INDIVIDUAL' | 'LOTE';
  tipo_asociacion: 'DIRECTA' | 'AMBIENTAL' | 'POBLACIONAL';
  dispositivo_iot_id: number;
  sensor_id: number;
  id_infraestructura: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  motivo?: string | null;
}

export interface AsociacionSensorActivoResponse {
  id_asociacion_activo_sensor: number;
  id_activo_biologico: number;
  tipo_activo: string;
  tipo_asociacion: string;
  dispositivo_iot_id: number;
  sensor_id: number;
  id_infraestructura: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado_asociacion: string;
  motivo: string | null;
  advertencia: string | null;
}

// ── Indicadores / datos consolidados ─────────────────────────────────
export interface ConsultarIndicadoresFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_indicador?: TipoIndicador;
}

export interface IndicadorZootecnicoResponse {
  tipo: string;
  valor: number | null;
  unidad: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  variables_usadas: Record<string, unknown>;
  fecha_calculo: string;
  disponible: boolean;
}

export interface IndicadoresActivoResponse {
  id_activo_biologico: number;
  tipo_activo: string;
  indicadores: IndicadorZootecnicoResponse[];
  advertencias: string[];
}

export interface DatosConsolidadosFiltros {
  tipo_dato?: 'eventos' | 'fases' | 'estado' | 'metricas' | 'todos';
  fecha_inicio?: string;
  fecha_fin?: string;
  pagina?: number;
  page_size?: number;
}

export interface DatosConsolidadosResponse {
  id_activo_biologico: number;
  identificador: string | null;
  tipo_activo: string;
  especie: string;
  estado_actual: string;
  infraestructura_asociada: string | null;
  fase_productiva_activa: string | null;
  historial_eventos: Record<string, unknown>[];
  historial_fases: Record<string, unknown>[];
  historico_estados: Record<string, unknown>[];
  metricas_actuales: Record<string, unknown>;
  total_registros: number;
  pagina_actual: number;
  total_paginas: number;
  registros_por_pagina: number;
  fecha_generacion: string;
}

// ── Auditoría (recurso 31) ───────────────────────────────────────────
export interface ConsultarBitacoraFiltros {
  rf_origen?: string;
  tipo_evento?: string;
  id_activo_biologico?: number;
  clasificacion_biologica?: string;
  resultado?: string;
  severidad_log?: string;
  fecha_inicio?: string;                   // datetime ISO
  fecha_fin?: string;                      // datetime ISO
  pagina?: number;
  page_size?: number;
}

export interface EventoAuditoriaResponse {
  id_bitacora: number;
  id_evento: string;
  rf_origen: string;
  tipo_evento: string;
  clasificacion_biologica: string;
  id_activo_biologico: number | null;
  tipo_activo: string | null;
  timestamp_evento: string;
  timestamp_registro: string;
  resultado: string;
  descripcion: string | null;
  detalle_tecnico: Record<string, unknown> | null;
  id_usuario_responsable: number | null;
  modulo_consumidor: string | null;
  severidad_log: string;
  id_evento_correlacionado: string | null;
  hash_integridad: string;
  registro_incompleto: boolean;
}

export interface BitacoraAuditoriaResponse {
  total_registros: number;
  pagina_actual: number;
  total_paginas: number;
  registros_por_pagina: number;
  registros: EventoAuditoriaResponse[];
}
