// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-56: tipo de dato, estado_calidad y payload ramificado (RFC-011, RFC-015 C2) |
// Datos simulados RF-56 (Pipeline de inferencia).
import type { TipoDato } from '../components/TipoDatoPill';
import type { VectorComportamiento } from '../components/VectorComportamientoPanel';
import type { EstadoDato, OrigenDato } from '../types';

export type TipoFallo = 'VERSION_INCOMPATIBLE' | 'ERROR_AUTENTICACION' | 'INCONSISTENCIA_TEMPORAL' | 'ESQUEMA_INVALIDO' | 'DESFASE_EXCEDIDO';

/** Estos fallos no se arreglan reintentando: el paquete no cumple el contrato. */
export const FALLOS_NO_REINTENTABLES: TipoFallo[] = ['ESQUEMA_INVALIDO', 'DESFASE_EXCEDIDO'];

export const MAX_REGISTROS = 500;
export const MAX_REINTENTOS = 5;

export interface PaqueteMock {
  id: string;
  uuid: string;
  tipoDato: TipoDato;
  dispositivo: string;
  areaId: number | null;
  contexto: 'Ambiental' | 'Biométrico' | 'Hídrico' | 'Visión';
  ctxCompleto: boolean;
  variables: string[];
  registros: number;
  severidad: 'LEVE' | 'MODERADO' | 'CRITICO' | null;
  origen: OrigenDato;
  /** estado_calidad viene de RF-53; no depende del estado de envío. */
  estadoCalidad: EstadoDato;
  estado: 'ENVIADO' | 'PENDIENTE' | 'FALLIDO';
  reintentos: number;
  capturado: string;
  procesadoEdge: string;
  enviado: string | null;
  version: string;
  tipoFallo: TipoFallo | null;
  desfaseH: number;
  vision?: VectorComportamiento;
  /** Sobre de visión que llegó sin area_id y con valor/unidad escalares. */
  errorEsquema?: boolean;
}

export const PIPELINE_KPIS = { enviados: 312, pendientes: 7, fallidos: 3, contextoIncompleto: 5 };

export const PIPELINE_PAQUETES: PaqueteMock[] = [
  { id: 'PKT-001', uuid: '3f8a1d2e-7b4c-4e9f-a012-1c3d5e7f9b2a', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GALPONA-003', areaId: 4, contexto: 'Ambiental', ctxCompleto: true, variables: ['Temperatura Ambiental', 'Humedad Relativa', 'NH3'], registros: 3, severidad: 'CRITICO', origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'ENVIADO', reintentos: 0, capturado: '09:12:34', procesadoEdge: '09:12:34', enviado: '09:12:34', version: 'v2.1', tipoFallo: null, desfaseH: 0 },
  { id: 'PKT-002', uuid: '9c2b4f6a-1e8d-4a3c-b765-2d4f6a8c0e1b', tipoDato: 'ESCALAR', dispositivo: 'EDGE-ESTANQUE-002', areaId: 9, contexto: 'Hídrico', ctxCompleto: true, variables: ['pH del Agua', 'Oxígeno Disuelto'], registros: 2, severidad: 'MODERADO', origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'ENVIADO', reintentos: 0, capturado: '09:03:11', procesadoEdge: '09:03:12', enviado: '09:03:12', version: 'v2.1', tipoFallo: null, desfaseH: 0 },
  { id: 'PKT-004', uuid: 'b8e4f6d2-5a3c-4e9f-b127-4c6e8a0b2d5f', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GRANJA-002', areaId: 5, contexto: 'Ambiental', ctxCompleto: false, variables: ['Temperatura Ambiental'], registros: 1, severidad: 'LEVE', origen: 'BUFFER_LOCAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'ENVIADO', reintentos: 1, capturado: '07:40:10', procesadoEdge: '07:40:11', enviado: '09:10:44', version: 'v2.1', tipoFallo: null, desfaseH: 1.5 },
  { id: 'PKT-005', uuid: 'c9f5a7e3-6b4d-4f0a-c238-5d7f9b1c3e6a', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GALPONA-003', areaId: 4, contexto: 'Ambiental', ctxCompleto: true, variables: ['Temperatura Ambiental', 'CO2'], registros: 2, severidad: 'CRITICO', origen: 'TIEMPO_REAL', estadoCalidad: 'ERROR_CALIBRACION', estado: 'FALLIDO', reintentos: 5, capturado: '08:45:29', procesadoEdge: '08:45:30', enviado: null, version: 'v2.0', tipoFallo: 'VERSION_INCOMPATIBLE', desfaseH: 0 },
  { id: 'PKT-006', uuid: 'd0a6b8f4-7c5e-4a1b-d349-6e8a0c2d4f7b', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GRANJA-001', areaId: 4, contexto: 'Biométrico', ctxCompleto: false, variables: ['Frecuencia Respiratoria'], registros: 1, severidad: 'MODERADO', origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'PENDIENTE', reintentos: 2, capturado: '09:08:21', procesadoEdge: '09:08:22', enviado: null, version: 'v2.1', tipoFallo: null, desfaseH: 0 },
  { id: 'PKT-008', uuid: 'f2c8d0b6-9e7a-4c3d-f56b-8a0c2e4f6b9d', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GRANJA-002', areaId: 5, contexto: 'Ambiental', ctxCompleto: true, variables: ['Temperatura Ambiental', 'Humedad Relativa'], registros: 2, severidad: 'MODERADO', origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'FALLIDO', reintentos: 5, capturado: '08:29:58', procesadoEdge: '08:30:00', enviado: null, version: 'v2.1', tipoFallo: 'ERROR_AUTENTICACION', desfaseH: 0 },
  {
    id: 'PKT-010', uuid: '6a8c0e2b-4d6f-4a1c-9e3b-5d7f9a1c3e5b', tipoDato: 'VECTOR_COMPORTAMIENTO', dispositivo: 'CAM-GALPON-A-01', areaId: 4, contexto: 'Visión', ctxCompleto: true, variables: ['Vector de comportamiento'], registros: 1, severidad: null, origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'ENVIADO', reintentos: 0, capturado: '09:10:00', procesadoEdge: '09:13:06', enviado: '09:13:07', version: 'v2.1', tipoFallo: null, desfaseH: 0,
    vision: { area: 'Galpón A · área 4', ventanaInicio: '09:05:00', ventanaFin: '09:10:00', individuos: 42, densidad: 0.6213, dispersion: 3.417, tasa: 1.2085, calidad: { cobertura_ventana: 0.96, n_tracks_perdidos: 2, fps_efectivo: 11.6, estado_calibracion: 'CALIBRADO' } },
  },
  {
    id: 'PKT-011', uuid: '7b9d1f3a-5c7e-4b2d-0f4a-6e8a0c2d4f6b', tipoDato: 'VECTOR_COMPORTAMIENTO', dispositivo: 'CAM-CUARENTENA-01', areaId: 7, contexto: 'Visión', ctxCompleto: true, variables: ['Vector de comportamiento'], registros: 1, severidad: null, origen: 'BUFFER_LOCAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'PENDIENTE', reintentos: 1, capturado: '06:45:00', procesadoEdge: '06:46:37', enviado: null, version: 'v2.1', tipoFallo: null, desfaseH: 2.3,
    vision: { area: 'Corral cuarentena · área 7', ventanaInicio: '06:40:00', ventanaFin: '06:45:00', individuos: 0, densidad: 0, dispersion: 0, tasa: 0, calidad: { cobertura_ventana: 1, n_tracks_perdidos: 0, fps_efectivo: 12, estado_calibracion: 'SIN_LINEA_BASE' } },
  },
  {
    id: 'PKT-012', uuid: '8c0e2a4b-6d8f-4c3e-1a5b-7f9b1d3e5a7c', tipoDato: 'VECTOR_COMPORTAMIENTO', dispositivo: 'CAM-GALPON-B-01', areaId: null, contexto: 'Visión', ctxCompleto: true, variables: ['Vector de comportamiento'], registros: 1, severidad: null, origen: 'TIEMPO_REAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'FALLIDO', reintentos: 0, capturado: '09:10:00', procesadoEdge: '09:14:22', enviado: null, version: 'v2.1', tipoFallo: 'ESQUEMA_INVALIDO', desfaseH: 0, errorEsquema: true,
    vision: { area: 'Galpón B · área 5', ventanaInicio: '09:05:00', ventanaFin: '09:10:00', individuos: 37, densidad: 0.18, dispersion: 7.91, tasa: 0.21, calidad: { cobertura_ventana: 0.94, n_tracks_perdidos: 1, fps_efectivo: 12, estado_calibracion: 'CALIBRADO' } },
  },
  { id: 'PKT-013', uuid: '9d1f3b5c-7e9a-4d4f-2b6c-8a0c2e4f6b8d', tipoDato: 'ESCALAR', dispositivo: 'EDGE-GRANJA-003', areaId: 6, contexto: 'Ambiental', ctxCompleto: true, variables: ['Temperatura Ambiental', 'Humedad Relativa'], registros: 2, severidad: 'LEVE', origen: 'BUFFER_LOCAL', estadoCalidad: 'LECTURA_VALIDA', estado: 'FALLIDO', reintentos: 0, capturado: '06:16:00 (hace 75 h)', procesadoEdge: '06:16:01', enviado: null, version: 'v2.1', tipoFallo: 'DESFASE_EXCEDIDO', desfaseH: 75 },
];

/**
 * Sobre que se envía al motor. El vector de comportamiento no lleva valor/unidad y
 * exige area_id; el escalar lleva sensor, severidad y contexto.
 */
export function payloadPaquete(p: PaqueteMock): Record<string, unknown> {
  const base = {
    id_paquete: p.uuid,
    dispositivo_id: p.dispositivo,
    area_id: p.areaId,
    tipo_dato: p.tipoDato,
    timestamp_captura: p.capturado,
    timestamp_procesamiento_edge: p.procesadoEdge,
    origen: p.origen,
    estado_calidad: p.estadoCalidad,
    version_modelo_objetivo: p.version,
  };
  if (p.tipoDato === 'VECTOR_COMPORTAMIENTO' && p.vision) {
    const v = p.vision;
    const sobre: Record<string, unknown> = {
      ...base,
      ventana_inicio: v.ventanaInicio,
      ventana_fin: v.ventanaFin,
      componentes: { densidad_actividad: v.densidad, dispersion_espacial: v.dispersion, tasa_movimiento: v.tasa },
      n_individuos_observados: v.individuos,
      indicadores_calidad: v.calidad,
    };
    if (p.errorEsquema) { delete sobre.area_id; sobre.valor = v.densidad; sobre.unidad = '—'; }
    return sobre;
  }
  return {
    ...base,
    estado_desviacion: p.severidad ? `DESVIACION_${p.severidad === 'CRITICO' ? 'CRITICA' : p.severidad === 'MODERADO' ? 'MODERADA' : 'LEVE'}` : 'NORMAL',
    severidad: p.severidad,
    variables: p.variables,
    num_registros: p.registros,
    contexto: { tipo: p.contexto, completo: p.ctxCompleto },
  };
}
