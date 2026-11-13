// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: contratos de la API /finanzas |
// | 2026-11-05 | Arekkazu | M06 prototipos: listados del período, modelo de costo por activo y resumen de auditoría |
// | 2026-11-09 | destroyerban | INC-M06-323-G27 RF-85: cosechas pendientes e ingreso manual de sus costos de venta |
// | 2026-11-10 | Arekkazu | INC-M06-337/344/345 RF-86/87/93: cierre en espera, acumulado y desglose de mantenimiento |
// | 2026-11-10 | Arekkazu | INC-M06-297-G34-02 RF-86: un evento suspendido posterior a la última medición deja el activo pendiente |
// | 2026-11-10 | Arekkazu | INC-M06-346-G43-02 RF-87: la prevalidación lista cada línea sin trazabilidad con su activo y lo que falta |
// | 2026-11-10 | Arekkazu | TC-DIS-252/254/265 RF-COT/91/94: estado al cierre de la cotización, nivel del fallo de la cadena y origen del evento |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-82..94: reporte de usabilidad del 11-11 (período por defecto, titular, formatos y nombres) |
// | 2026-11-11 | Arekkazu | USAB-M06 RF-87/93: período por titular y año, listas cortas en vez de todos los períodos en un solo selector |
// | 2026-11-12 | Arekkazu | TC-DIS-256 RF-91: la línea de asiento trae el nombre y el tipo de su activo |
// | 2026-11-12 | Arekkazu | Lote M05/M06 11-12 RF-93: activo excluido del cierre con su motivo y lo que quedó fuera del estado |
/** Los Decimal del backend llegan como texto y no se suman en el cliente. */
export type Dec = string;

export type TipoCierre = 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
export type Clasificacion = 'PRODUCCION' | 'CONSUMO';
export type CategoriaPrecio = 'PESO_KG' | 'POR_CABEZA' | 'PRODUCTO';
export type FuentePrecio = 'MERCADO_ACTIVO' | 'UPRA' | 'ESTIMADA';
export type Sentido = 'GANANCIA' | 'PERDIDA' | 'UNICO' | 'TRASLADO' | 'CAPITALIZACION';
export type OrigenCosto = 'MANO_OBRA_PROPIA' | 'COMPRA_PROVEEDOR' | 'SERVICIO_TERCERO' | 'CONSUMO_INVENTARIO';
export type Naturaleza = 'MANTENIMIENTO' | 'INVERSION' | 'VENTA';

export const TIPOS_HECHO = [
  'RECONOCIMIENTO_NACIMIENTO', 'RECONOCIMIENTO_DIFERENCIA', 'VARIACION_VR_TB', 'VARIACION_VR_PM', 'PRODUCTO_AGRICOLA',
  'CONSUMO_INSUMO', 'MANO_OBRA_PROPIA', 'BAJA_ACTIVO', 'AJUSTE_PERIODO_ANTERIOR', 'DEPRECIACION_ACTIVO_COSTO',
  'DETERIORO_ACTIVO_COSTO',
] as const;
export type TipoHecho = (typeof TIPOS_HECHO)[number];
export const SENTIDOS: Sentido[] = ['GANANCIA', 'PERDIDA', 'UNICO', 'TRASLADO', 'CAPITALIZACION'];
export const SUBTIPOS = [
  'ALIMENTO', 'MEDICAMENTO', 'MANO_OBRA', 'VETERINARIO', 'INVERSION_DIRECTA', 'TRANSPORTE', 'COMISION',
  'IMPUESTO_TRANSACCION', 'SACRIFICIO', 'OTRO',
] as const;
export type Subtipo = (typeof SUBTIPOS)[number];
export const ORIGENES: OrigenCosto[] = ['MANO_OBRA_PROPIA', 'COMPRA_PROVEEDOR', 'SERVICIO_TERCERO', 'CONSUMO_INVENTARIO'];

export interface ConfiguracionGeneral {
  tipo_cierre: TipoCierre;
  pct_umbral_desviacion_precio: Dec;
  dias_alerta_vencimiento_precio: 7 | 15 | 30;
  fecha_inicio_operacion: string | null;
  fecha_actualizacion: string | null;
}
export interface ParametroEspecie {
  id_especie: number; especie: string; clasificacion: Clasificacion | null;
  categoria_precio: Exclude<CategoriaPrecio, 'PRODUCTO'> | null; vida_util_meses: number | null;
}
export interface CostoVenta {
  id_parametro_costo_venta: number; id_especie: number; especie: string;
  pct_transporte: Dec; pct_comisiones: Dec; pct_impuestos: Dec;
}
export interface Asignacion {
  id_asignacion_cuenta_contable: number; tipo_hecho: TipoHecho; sentido: Sentido; id_especie: number | null;
  subtipo_costo: Subtipo | null; cuenta_debito: string; cuenta_credito: string;
}
export interface Configuracion {
  general: ConfiguracionGeneral; especies: ParametroEspecie[]; costos_venta: CostoVenta[]; matriz: Asignacion[];
  lineas_pendientes_cuenta: number;
}

export interface Precio {
  id_precio_mercado: number; id_especie: number; categoria: CategoriaPrecio; precio_unitario: Dec; unidad_medida: string;
  fuente: FuentePrecio; fecha_vigencia: string; fecha_vencimiento: string | null; id_metrica_produccion: number | null;
  evidencia: string; justificacion: string | null; id_precio_corregido: number | null;
  estado: 'ACTIVO' | 'PROGRAMADO' | 'VENCIDO' | 'SUPERADO' | string; es_aplicado: boolean;
}
export interface PrecioPayload {
  id_especie: number; categoria: CategoriaPrecio; id_metrica_produccion?: number | null; precio_unitario: string;
  fecha_vigencia: string; fecha_vencimiento?: string | null; fuente: FuentePrecio; evidencia_documental: string;
  justificacion_estimacion?: string | null; id_precio_corregido?: number | null; confirmar_desviacion?: boolean;
}

export interface Hecho { tipo_hecho: TipoHecho; sentido: Sentido; valor: Dec }
export interface Propuesta {
  id_activo_biologico: number; identificador: string; tipo: string; especie: string; id_especie: number; finca: string;
  estado: string; origen_financiero: string; costo_adquisicion: Dec | null; soporte_documental: string | null;
  fecha_reconocimiento: string; es_apertura: boolean; clasificacion: Clasificacion | null;
  indicador_valoracion: 'VALOR_RAZONABLE' | 'VALORACION_POR_COSTO' | null; valor_inicial: Dec | null; costos_venta: Dec | null;
  magnitud: Dec | null; unidad_magnitud: string | null;
  precio: { id_precio_mercado: number; precio_unitario: Dec; unidad_medida: string; fuente: FuentePrecio; fecha_vigencia: string } | null;
  hechos: Hecho[]; bloqueos: Array<{ codigo: string; mensaje: string }>; advertencias: string[]; requiere_costos_manuales: boolean; es_confirmable: boolean;
}
export interface CostosManuales { transporte?: string | null; comisiones?: string | null; impuestos?: string | null; otros?: string | null }

export interface ActivoValorado {
  id_activo_biologico: number; identificador: string; tipo: string; especie: string; finca: string; estado: string;
  clasificacion: Clasificacion | null; fecha_reconocimiento: string; indicador_reconocimiento: string; es_apertura: boolean;
  valorado_por_costo: boolean; valor_contable_por_costo: Dec | null; valor_razonable_neto: Dec | null;
  fecha_calculo: string | null; tiene_valor_estimado: boolean; id_especie: number; costo_adquisicion: Dec | null;
  origen_financiero: string; valor_inicial: Dec | null; id_finca: number; id_infraestructura: number; infraestructura: string;
  /** Modelo de costo (NIC 41 ¶30): solo si el activo se mide al costo. */
  costo_base: Dec | null; depreciacion_acumulada: Dec | null; deterioro_acumulado: Dec | null; vida_util_meses: number | null;
  razon_sin_mercado: string | null; fecha_marcacion: string | null; escenario_costo: string | null;
}

/** Datos del activo que acompañan a cada registro de los listados del período. */
interface ActivoDelRegistro {
  id_activo_biologico: number; identificador: string; tipo_activo: string; id_especie: number; especie: string; finca: string;
  clasificacion: Clasificacion | null;
}
export interface MedicionPeriodo extends ActivoDelRegistro {
  id_medicion_posterior: number; origen_medicion: string; valor_razonable_anterior: Dec; valor_razonable_actual: Dec;
  ganancia_perdida_transformacion: Dec; ganancia_perdida_precio_mercado: Dec; variacion_total: Dec;
  tiene_valor_estimado: boolean; estado: string; fecha_medicion: string;
}
export type TipoVariacion = 'GANANCIA_TRANSFORMACION_BIOLOGICA' | 'PERDIDA_TRANSFORMACION_BIOLOGICA' | 'GANANCIA_PRECIO_MERCADO'
  | 'PERDIDA_PRECIO_MERCADO';
/** Evento del período cuya medición quedó suspendida: no deja medición posterior (RF-86). */
export interface EventoPendiente extends ActivoDelRegistro {
  id_evento: number; fecha_evento: string; motivo: string | null; fecha_procesamiento: string;
}
export interface VariacionPeriodo extends ActivoDelRegistro {
  id_variacion_valor_razonable: number; tipo: TipoVariacion; monto_variacion: Dec; valor_razonable_anterior: Dec;
  valor_razonable_nuevo: Dec; tiene_estimacion: boolean; fecha_registro: string; id_linea: number | null;
  tipo_evidencia: string | null; estado_trazabilidad: string;
}
export interface CalculoPeriodo extends ActivoDelRegistro {
  id_calculo_valor_razonable: number; magnitud: Dec; unidad_magnitud: string; precio_unitario: Dec; valor_razonable_bruto: Dec;
  costos_venta: Dec; valor_neto: Dec; metodo_costo: string; estado: string; tiene_valor_estimado: boolean; es_producto: boolean;
  fecha_calculo: string;
}
export interface ProductoPeriodo extends ActivoDelRegistro {
  id_reconocimiento_producto_agricola: number; producto_agricola: string; cantidad_cosechada: Dec; unidad_medida: string;
  precio_mercado_producto: Dec | null; costo_venta_producto: Dec | null; valor_producto: Dec; valor_reduccion_activo: Dec | null;
  tipo: 'PRODUCTO_DE_CONSUMO' | 'PRODUCTO_PERIODICO' | string; fecha_cosecha: string;
}
export interface CosechaPendiente {
  id_evento: number; id_activo_biologico: number; identificador: string; especie: string; finca: string;
  clasificacion: Clasificacion | null; producto_agricola: string | null; unidad_medida: string | null; cantidad_cosechada: Dec;
  fecha_cosecha: string; motivo: string | null; fecha_ultimo_intento: string; intentos: number; admite_costos_manuales: boolean;
}
export interface Calculo {
  id_calculo_valor_razonable: number | null; magnitud: Dec; unidad_magnitud: string; precio_unitario: Dec;
  valor_razonable_bruto: Dec; costo_transporte: Dec; costo_comisiones: Dec; costo_impuestos_transaccion: Dec;
  otros_costos_disposicion: Dec; valor_neto: Dec; metodo_costo: string; tiene_valor_estimado: boolean; fecha_calculo: string | null;
}
export interface Medicion {
  id_medicion_posterior: number; origen_medicion: string; valor_razonable_anterior: Dec; valor_razonable_actual: Dec;
  ganancia_perdida_transformacion: Dec; ganancia_perdida_precio_mercado: Dec; variacion_total: Dec;
  tiene_valor_estimado: boolean; fecha_medicion: string;
}
export interface Linea {
  id_linea_asiento_nic41: number; tipo_hecho: TipoHecho; sentido: Sentido; valor: Dec; fecha_hecho: string;
  id_periodo_contable: number; id_activo_biologico: number | null; tabla_origen: string; id_origen: number;
  tipo_evidencia: string; subtipo_costo: Subtipo | null; es_estimacion: boolean; es_reverso: boolean;
  cuenta_debito: string | null; cuenta_credito: string | null; estado: string; estado_trazabilidad?: string;
  id_comprobante_nic41?: number | null;
  identificador_activo?: string | null; tipo_activo?: string | null;
}
export interface HistorialActivo {
  activo: { id_activo_biologico: number; identificador: string; especie: string; finca: string; razon_social: string | null;
    numero_id_tributaria: string | null; peso_kg: Dec | null; cantidad_actual: number | null; costo_adquisicion: Dec | null };
  reconocimientos: Array<{ id_reconocimiento_inicial: number; estado: string; indicador_valoracion: string;
    valor_razonable_neto_inicial: Dec | null; fecha_reconocimiento: string; es_apertura: boolean; justificacion_reversion: string | null }>;
  calculos: Calculo[]; mediciones: Medicion[]; productos: Array<Record<string, unknown>>;
  valoracion_costo: { costos_adquisicion: Dec; vida_util_meses: number | null; depreciacion_acumulada: Dec;
    deterioro_acumulado: Dec; valor_contable_por_costo: Dec; razon_sin_mercado: string | null; es_activa: boolean } | null;
  lineas: Linea[];
}
export interface Simulacion {
  es_valido: boolean; motivo: string | null; mensaje: string | null; calculo: Calculo | null;
  precio: { precio_unitario: Dec; unidad_medida: string; fuente: FuentePrecio; fecha_vigencia: string } | null;
}

export interface Costo {
  id_registro_costo: number; naturaleza_costo: Naturaleza | null; subtipo_costo: Subtipo; origen_costo: OrigenCosto;
  vehiculo_contable: string; id_activo_biologico: number | null; activo: string | null; monto_costo: Dec; fecha_costo: string;
  id_periodo_contable: number; estado: string; politica_capitalizacion: string; justificacion: string | null;
  tercero_razon_social: string | null; factura_prefijo: string | null; factura_numero: string | null;
  id_grupo_reparto: string | null; metodo_reparto: string | null; es_reverso: boolean; id_origen_m05: string | null;
  id_especie: number; especie: string; finca: string;
}
export interface CostoPayload {
  subtipo_costo: Subtipo; origen_costo: OrigenCosto; monto_costo: string; fecha_costo: string;
  id_activo_biologico?: number; activos_reparto?: number[]; metodo_reparto?: 'POR_CABEZAS' | 'POR_BIOMASA';
  naturaleza_costo?: Naturaleza; justificacion?: string; tercero_nit?: string; tercero_dv?: string;
  tercero_razon_social?: string; factura_prefijo?: string; factura_numero?: string; fecha_factura?: string;
  fecha_vencimiento_factura?: string; confirmar_capitalizacion?: boolean;
}
export interface ResultadoCosto {
  registros: Array<{ id_registro_costo: number; id_activo_biologico: number | null; monto_costo: Dec; naturaleza_costo: Naturaleza | null;
    vehiculo_contable: string; estado: string; id_linea_asiento: number | null }>;
  id_grupo_reparto: string | null; aviso: string | null;
}

/** Titular tributario con períodos contables; NIT nulo = períodos sin titular asignado. */
export interface Titular { numero_id_tributaria: string | null; razon_social: string | null }
export interface FiltroPeriodos { numero_id_tributaria?: string; sin_titular?: boolean }
export interface Periodo {
  id_periodo_contable: number; numero_id_tributaria: string; razon_social?: string | null; tipo_cierre: TipoCierre; fecha_inicio: string; fecha_fin: string;
  estado: 'ABIERTO' | 'EN_CIERRE' | 'CERRADO' | string; fecha_cierre: string | null;
  ultimo_cierre: { id_cierre: number; estado: string; paso_actual: number | null; error_detalle: string | null;
    fecha_inicio: string; fecha_fin: string | null; nombre_usuario_ejecutor?: string | null } | null;
}
export interface Prevalidacion {
  bloqueos: Array<{ codigo: string; mensaje: string }>; activos_sin_precio: Array<{ id_activo_biologico: number; identificador: string; especie: string }>;
  lineas_sin_trazabilidad: Array<{
    id_linea: number; tipo_hecho: TipoHecho; faltantes: string[]; id_activo_biologico?: number | null; identificador?: string | null;
  }>;
  puede_cerrar: boolean; requiere_autorizacion: boolean;
}
export interface ResultadoCierre {
  id_cierre: number; periodo: string; estado: string; activos_procesados: number;
  activos_excluidos: Array<{ id_activo_biologico: number; motivo?: string }>; lineas_excluidas: number[];
  comprobantes: Array<{ codigo: string; hash: string; valor_total: Dec }>; hash_cierre: string;
  reportes: { estado_resultados?: { id_estado: number; resultado_neto: Dec }; informe_revelaciones?: { id_informe: number; version: string } };
  id_periodo_siguiente: number | null;
}
export interface Comprobante {
  id_comprobante_nic41: number; codigo: string; tipo_hecho: TipoHecho; especie: string; fecha_comprobante: string;
  lineas: Array<{ valor: Dec; cuenta_debito: string; cuenta_credito: string }>; valor_total: Dec; hash_integridad: string;
}
export interface Cadena {
  id_linea_asiento_nic41: number; tipo_hecho: TipoHecho; valor: Dec; tipo_evidencia: string; estado_trazabilidad: string;
  estado_verificacion: string | null; nivel_fallo: string | number | null; eslabones_faltantes: string[] | null;
  eslabones: Record<string, unknown> | null;
}

export interface Cotizacion {
  id_cotizacion: number; fecha_emision: string; activos_cotizados: number[]; valor_razonable_referencia: Dec;
  valor_cotizacion_propuesto: Dec; condiciones: string | null; estado: string; fecha_vencimiento: string | null;
  motivo_anulacion: string | null; version: number; estado_periodo: string;
  /** Estado que tenía al cerrarse su período (RF-COT); null mientras el período sigue abierto. */
  estado_al_cierre?: string | null;
}

export interface EstadoResumen {
  id_estado: number; id_periodo_contable: number; total_ingresos: Dec; total_gastos: Dec; resultado_neto: Dec;
  estado: 'GENERADO' | 'APROBADO' | string; fecha_generacion: string; filtros: Record<string, number | null>; version: number;
  fecha_aprobacion: string | null;
}
export interface EstadoDetalle extends EstadoResumen {
  nombre_aprobador?: string | null;
  componentes: Record<string, Dec | unknown[] | Record<string, Dec>>; hash_consistencia: string;
}
/** Activo excluido del cierre (RF-93 FA-3/FA-4): ``motivo`` es un código; ``montos_excluidos``, lo que quedó fuera del estado. */
export interface ActivoExcluidoCierre {
  id_activo_biologico: number; identificador?: string; motivo?: string; detalle?: string;
  montos_excluidos?: { componentes: Record<string, Dec>; total_ingresos: Dec; total_gastos: Dec; resultado_neto: Dec };
}
/** Acumulado del período (también abierto), sin versión. */
export interface Acumulado {
  componentes: Record<string, Dec>; desglose_costos_mantenimiento: Record<string, Dec>; total_ingresos: Dec; total_gastos: Dec;
  resultado_neto: Dec; estado_periodo: string; es_definitivo: boolean;
}
export type TipoAjuste = 'AUMENTAR' | 'DISMINUIR';
export interface InformeResumen {
  id_informe: number; version_informe: string; estado: 'BORRADOR' | 'APROBADO' | 'RECHAZADO' | 'ARCHIVADO' | string;
  fecha_generacion: string; fecha_aprobacion: string | null; razon_rechazo: string | null; hash_informe: string;
  /** Nombre de quien lo aprobó; null mientras no se apruebe. */
  nombre_aprobador?: string | null;
}
export interface InformeDetalle extends InformeResumen { contenido: Record<string, unknown> }
export interface InformePayload {
  compromisos_vigentes: Array<{ descripcion: string; monto_estimado?: string | null; contraparte?: string | null }>;
  activos_pignorados: Array<{ id_activo_biologico: number; entidad_acreedora: string; monto_garantia?: string | null }>;
  declaracion_sin_novedad: boolean; justificacion_inconsistencias?: string | null;
}

export interface EventoAuditoria {
  id_evento: string; descripcion_evento: string; tipo_evento: string; fecha_hora: string; actor: string;
  activo: string | null; id_periodo_contable: number | null; resumen_payload: Record<string, unknown> | null;
  monto_afectado: Dec | null; severidad: string; integridad_verificable: boolean;
  /** Vista legible: «Repositorio central» o «Sincronizado desde respaldo». */
  origen?: string | null;
}
export type Severidad = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export interface PaginaAuditoria {
  total_registros: number; pagina_actual: number; registros_por_pagina: number; eventos: EventoAuditoria[];
  resumen_severidad: Record<Severidad, number>;
}
