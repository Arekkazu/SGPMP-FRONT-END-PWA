// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-55: rama de visión por ventana y presupuesto de tiempo (RFC-011) |
// Datos simulados RF-55 (Procesamiento edge / detección de desviaciones).

export type ClasificacionRf55Mock = 'NORMAL' | 'SIMPLE' | 'COMPUESTA' | 'ERROR_CONFIGURACION';
/** Escalar básico (RF-55.1), escalar básico + multivariable (RF-55.2) o visión por ventana (RFC-011). */
export type RamaEdge = 'BASICO' | 'AVANZADO' | 'VISION';

export interface EventoEdgeMock {
  id: string;
  rama: RamaEdge;
  dispositivo: string;
  variables: string;
  valor: string;
  clasificacion: ClasificacionRf55Mock;
  regla: string;
  severidad: 'LEVE' | 'MODERADO' | 'CRITICO';
  origen: 'EDGE' | 'BACKEND' | 'IA';
  capturado: string;
  procesado: string;
  /** Escalar: ms por medición. Visión: segundos por ventana. */
  tiempoProceso: number;
}

export const EDGE_KPIS = { variables: 11, desviacionesHoy: 8, enBuffer: 14, normales: 214 };

/** Presupuesto escalar por medición (RF-55). */
export const PRESUPUESTO_ESCALAR_MS = 500;

export interface GaugeEdgeMock { label: string; valor: number; min: number; max: number; unidad: string; estado: 'ok' | 'warning' | 'critical' }

export const EDGE_GAUGES: GaugeEdgeMock[] = [
  { label: 'Temp. ambiental', valor: 28.4, min: 0, max: 50, unidad: '°C', estado: 'ok' },
  { label: 'CO2', valor: 1510, min: 0, max: 2000, unidad: 'ppm', estado: 'warning' },
  { label: 'pH agua', valor: 9.1, min: 0, max: 14, unidad: '', estado: 'critical' },
  { label: 'Humedad', valor: 63, min: 0, max: 100, unidad: '%', estado: 'ok' },
];

export const EDGE_EVENTOS: EventoEdgeMock[] = [
  { id: 'a1f0…', rama: 'BASICO', dispositivo: 'EDGE-GRANJA-002', variables: 'CO2', valor: '1 510 ppm', clasificacion: 'SIMPLE', regla: 'Umbral CO2 > 1400', severidad: 'MODERADO', origen: 'EDGE', capturado: '09:12:41', procesado: '09:12:41', tiempoProceso: 120 },
  { id: 'b2c9…', rama: 'BASICO', dispositivo: 'EDGE-ESTANQUE-004', variables: 'PH_AGUA', valor: '9.1', clasificacion: 'SIMPLE', regla: 'pH fuera de [6.5, 8.5]', severidad: 'CRITICO', origen: 'EDGE', capturado: '09:12:42', procesado: '09:12:42', tiempoProceso: 95 },
  { id: 'c3d8…', rama: 'AVANZADO', dispositivo: 'EDGE-GALPON-007', variables: 'TEMP + HUMEDAD', valor: '32 °C / 78 %', clasificacion: 'COMPUESTA', regla: 'Índice de estrés térmico', severidad: 'MODERADO', origen: 'IA', capturado: '09:11:58', procesado: '09:12:01', tiempoProceso: 310 },
  { id: 'd4e7…', rama: 'BASICO', dispositivo: 'EDGE-GRANJA-001', variables: 'NH3', valor: '—', clasificacion: 'ERROR_CONFIGURACION', regla: 'Sin umbral configurado', severidad: 'LEVE', origen: 'BACKEND', capturado: '09:10:31', procesado: '09:10:31', tiempoProceso: 40 },
  { id: 'e5f6…', rama: 'VISION', dispositivo: 'CAM-GALPON-A-01', variables: 'Vector de comportamiento · Galpón A · área 4', valor: 'ρ 0.62 · n=42', clasificacion: 'NORMAL', regla: 'Isolation Forest (visión) v1.0', severidad: 'LEVE', origen: 'EDGE', capturado: '09:10:00', procesado: '09:13:06', tiempoProceso: 186 },
  { id: 'f6a7…', rama: 'VISION', dispositivo: 'CAM-GALPON-B-01', variables: 'Vector de comportamiento · Galpón B · área 5', valor: 'ρ 0.18 · n=37', clasificacion: 'COMPUESTA', regla: 'Isolation Forest (visión) v1.0', severidad: 'MODERADO', origen: 'EDGE', capturado: '09:10:00', procesado: '09:14:22', tiempoProceso: 262 },
];

// Rama de visión (AIOT-SPEC-01 §4): valores por defecto (D), sin medir en hardware.
export const VISION_CFG = {
  duracionSeg: 300,
  presupuestoPct: 80,
  rangoMin: 50,
  rangoMax: 95,
  etapas: [
    { nombre: 'Detección (YOLO-nano)', pct: 65 },
    { nombre: 'Seguimiento (ByteTrack)', pct: 15 },
    { nombre: 'Métricas del vector', pct: 5 },
    { nombre: 'Anomalías (Isolation Forest)', pct: 5 },
    { nombre: 'Margen', pct: 10 },
  ],
};

export interface VentanaVisionMock {
  camara: string;
  area: string;
  inicio: string;
  fin: string;
  /** null = no terminó antes del cierre de la siguiente ventana. */
  procesoSeg: number | null;
  framesDescartados: number;
  cobertura: string;
}

export const VENTANAS_VISION: VentanaVisionMock[] = [
  { camara: 'CAM-GALPON-A-01', area: 'Galpón A · área 4', inicio: '09:05:00', fin: '09:10:00', procesoSeg: 186, framesDescartados: 0, cobertura: '0.96' },
  { camara: 'CAM-GALPON-B-01', area: 'Galpón B · área 5', inicio: '09:05:00', fin: '09:10:00', procesoSeg: 262, framesDescartados: 0, cobertura: '0.94' },
  { camara: 'CAM-GALPON-B-01', area: 'Galpón B · área 5', inicio: '09:00:00', fin: '09:05:00', procesoSeg: null, framesDescartados: 412, cobertura: '0.71' },
  { camara: 'CAM-GALPON-A-01', area: 'Galpón A · área 4', inicio: '09:00:00', fin: '09:05:00', procesoSeg: 228, framesDescartados: 0, cobertura: '0.95' },
  { camara: 'CAM-CUARENTENA-01', area: 'Corral cuarentena · área 7', inicio: '06:40:00', fin: '06:45:00', procesoSeg: 97, framesDescartados: 0, cobertura: '1.00' },
];

export type EstadoVentana = 'DENTRO' | 'EXCEDIDO' | 'BACKPRESSURE';

/** Una ventana debe terminar antes de que cierre la siguiente; si no, hay backpressure y se descartan frames. */
export function estadoVentana(procesoSeg: number | null, cfg = VISION_CFG): EstadoVentana {
  if (procesoSeg == null || procesoSeg > cfg.duracionSeg) return 'BACKPRESSURE';
  if (procesoSeg > (cfg.duracionSeg * cfg.presupuestoPct) / 100) return 'EXCEDIDO';
  return 'DENTRO';
}
