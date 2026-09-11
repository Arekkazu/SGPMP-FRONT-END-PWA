// Datos simulados RF-55 (Procesamiento edge / detección de desviaciones).

export type ClasificacionRf55Mock = 'NORMAL' | 'SIMPLE' | 'COMPUESTA' | 'ERROR_CONFIGURACION';

export interface EventoEdgeMock {
  id: string;
  dispositivo: string;
  variables: string;
  valor: string;
  clasificacion: ClasificacionRf55Mock;
  regla: string;
  severidad: 'LEVE' | 'MODERADO' | 'CRITICO';
  origen: 'EDGE' | 'BACKEND' | 'IA';
  capturado: string;
  procesado: string;
}

export const EDGE_KPIS = { variables: 11, desviacionesHoy: 8, enBuffer: 14, normales: 214 };

export interface GaugeEdgeMock { label: string; valor: number; min: number; max: number; unidad: string; estado: 'ok' | 'warning' | 'critical' }

export const EDGE_GAUGES: GaugeEdgeMock[] = [
  { label: 'Temp. ambiental', valor: 28.4, min: 0, max: 50, unidad: '°C', estado: 'ok' },
  { label: 'CO2', valor: 1510, min: 0, max: 2000, unidad: 'ppm', estado: 'warning' },
  { label: 'pH agua', valor: 9.1, min: 0, max: 14, unidad: '', estado: 'critical' },
  { label: 'Humedad', valor: 63, min: 0, max: 100, unidad: '%', estado: 'ok' },
];

export const EDGE_EVENTOS: EventoEdgeMock[] = [
  { id: 'a1f0…', dispositivo: 'EDGE-GRANJA-002', variables: 'CO2', valor: '1 510 ppm', clasificacion: 'SIMPLE', regla: 'Umbral CO2 > 1400', severidad: 'MODERADO', origen: 'EDGE', capturado: '09:12:41', procesado: '09:12:41' },
  { id: 'b2c9…', dispositivo: 'EDGE-ESTANQUE-004', variables: 'PH_AGUA', valor: '9.1', clasificacion: 'SIMPLE', regla: 'pH fuera de [6.5, 8.5]', severidad: 'CRITICO', origen: 'EDGE', capturado: '09:12:42', procesado: '09:12:42' },
  { id: 'c3d8…', dispositivo: 'EDGE-GALPON-007', variables: 'TEMP + HUMEDAD', valor: '32 °C / 78 %', clasificacion: 'COMPUESTA', regla: 'Índice de estrés térmico', severidad: 'MODERADO', origen: 'IA', capturado: '09:11:58', procesado: '09:12:01' },
  { id: 'd4e7…', dispositivo: 'EDGE-GRANJA-001', variables: 'NH3', valor: '—', clasificacion: 'ERROR_CONFIGURACION', regla: 'Sin umbral configurado', severidad: 'LEVE', origen: 'BACKEND', capturado: '09:10:31', procesado: '09:10:31' },
];
