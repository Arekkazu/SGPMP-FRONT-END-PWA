// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-66: resultados por área (poblacional) y por activo (individual), RFC-009 |
// Datos simulados para el Monitor de Inferencia (RF-66) — dueño IoT/IA, sin endpoint.
// Ver do-it/prediction/TASKS.md § Pendientes. Los valores derivados (nivel, confianza,
// alerta) vienen ya calculados: los decide el motor, no el frontend.
import type { ModoEjecucion, TipoModelo } from '../types';

export type EstadoInferencia = 'EMITIDO' | 'RECHAZADO' | 'FALLIDO' | 'DESCARTADO' | 'NO_DISPONIBLE';
export type MotivoFallback = 'NODO_DESINCRONIZADO' | 'ERROR_MODELO' | 'TIMEOUT';

export interface Inferencia {
  id: string;
  uuid: string;
  /** Lote (poblacional) o individuo (individual). */
  unidad: string;
  area: string;
  especie: string;
  tipoModelo: TipoModelo;
  estado: EstadoInferencia;
  /** Dónde corrió de verdad; puede diferir del configurado por fallback. */
  modo: ModoEjecucion;
  fallback?: MotivoFallback;
  version: string;
  ventana: string;
  latenciaMs: number | null;
  hora: string;
  nivel: 0 | 1 | 2 | 3 | null;
  /** POBLACIONAL: score_anomalia del área contra su umbral. */
  score?: number;
  umbralScore?: number;
  confianzaBaja?: boolean;
  vector?: { densidad: number; dispersion: number; tasa: number; individuos: number; cobertura: number };
  /** INDIVIDUAL: probabilidades por nivel (0–3) y por patología del catálogo (RF-64). */
  enfermedad?: string;
  confianza?: number;
  distRiesgo?: [number, number, number, number];
  distPatologias?: { nombre: string; prob: number }[];
  variables?: { nombre: string; valor: string }[];
  faltantes?: string[];
  contextoIncompleto?: boolean;
  hibrido?: { syncMs: number; nivelServidor: number; discrepancia: boolean };
  paquete: string;
  eventoEdge?: string;
  alerta?: string;
  nota?: string;
}

export const MONITOR_MOTOR = { estado: 'OPERATIVO', paquetesRecibidos: 1284, latenciaP95Ms: 820, colaMaxNodo: 2, syncHibridaMs: 2150 };

const BOV = (tc: string, fc: string, fr: string) => [
  { nombre: 'Temperatura corporal', valor: tc }, { nombre: 'Frecuencia cardíaca', valor: fc }, { nombre: 'Frecuencia respiratoria', valor: fr },
  { nombre: 'Actividad', valor: '0.31 índice' }, { nombre: 'Temperatura ambiental', valor: '33.8 °C' }, { nombre: 'Humedad relativa', valor: '78 %' },
];

export const INFERENCIAS: Inferencia[] = [
  {
    id: 'INF-0113', uuid: 'c1f63d2e-35a4-4d3e-8c81-eaf7dc30f313', unidad: 'BOV-1042', area: 'Potrero 2 · área 12', especie: 'Bovino', tipoModelo: 'MODELO_ESPECIES_GRANDES', estado: 'EMITIDO', modo: 'EDGE', version: 'grd-3.0', ventana: '09:10–09:18', latenciaMs: 390, hora: '09:18:05', nivel: 3,
    enfermedad: 'Estrés térmico', confianza: 0.86, distRiesgo: [0.01, 0.02, 0.06, 0.91],
    distPatologias: [{ nombre: 'Estrés térmico', prob: 0.86 }, { nombre: 'Deshidratación', prob: 0.06 }, { nombre: 'Ninguna (estado normal)', prob: 0.04 }],
    variables: BOV('40.8 °C', '95 lpm', '61 rpm'), faltantes: [], contextoIncompleto: false, paquete: 'PKT-2113', eventoEdge: 'EVT-012', alerta: 'ALR-0031',
  },
  {
    id: 'INF-0115', uuid: 'e3185f40-57c6-4f50-8ea3-0c19fe52b515', unidad: 'Lote porcino P1', area: 'Corral porcino 1 · área 8', especie: 'Porcino', tipoModelo: 'MODELO_PORCINOS', estado: 'EMITIDO', modo: 'SERVIDOR', fallback: 'TIMEOUT', version: 'DETECTOR: det-porc-1.0 · ANOMALIAS: if-porc-1.0', ventana: '09:10–09:15', latenciaMs: 2750, hora: '09:19:52', nivel: 0,
    score: 0.44, umbralScore: 0.65, confianzaBaja: false, vector: { densidad: 0.512, dispersion: 3.389, tasa: 0.995, individuos: 31, cobertura: 0.97 }, paquete: 'PKT-2115',
    nota: 'El nodo EDGE-CORRAL-P1 tardó 2 340 ms; el motor pasó a servidor (fallback por TIMEOUT).',
  },
  {
    id: 'INF-0112', uuid: 'b0e52c1d-24f3-4c2d-9b70-d9e6cb2fe212', unidad: 'OV-0245', area: 'Aprisco 1 · área 11', especie: 'Ovino', tipoModelo: 'MODELO_ESPECIES_MEDIANAS', estado: 'FALLIDO', modo: 'SERVIDOR', version: 'med-1.4', ventana: '09:05–09:17', latenciaMs: null, hora: '09:17:30', nivel: null, paquete: 'PKT-2112',
    nota: 'El modelo no respondió en servidor. Como el modo configurado es SERVIDOR no hay respaldo: la inferencia se marca como fallida y no se genera alerta.',
  },
  {
    id: 'INF-0110', uuid: '9ec30afb-02d1-4a0b-9f5e-b7c4a90dc010', unidad: 'BOV-1077', area: 'Potrero 3 · área 13', especie: 'Bovino', tipoModelo: 'MODELO_ESPECIES_GRANDES', estado: 'RECHAZADO', modo: 'EDGE', version: 'grd-3.0', ventana: '09:08–09:16', latenciaMs: null, hora: '09:16:05', nivel: null, paquete: 'PKT-2110',
    nota: 'El paquete llegó con variables_telemetria vacío. Se rechazó, quedó INFERENCIA_RECHAZADA en la bitácora y no se generó alerta.',
  },
  {
    id: 'INF-0109', uuid: '8db2f9ea-f1c0-4f9a-8e4d-a6b398fcbf09', unidad: 'OV-0231', area: 'Aprisco 1 · área 11', especie: 'Ovino', tipoModelo: 'MODELO_ESPECIES_MEDIANAS', estado: 'EMITIDO', modo: 'SERVIDOR', version: 'med-1.4', ventana: '09:03–09:15', latenciaMs: 640, hora: '09:15:12', nivel: 2,
    enfermedad: 'Gastroenteritis infecciosa', confianza: 0.42, distRiesgo: [0.10, 0.22, 0.41, 0.27],
    distPatologias: [{ nombre: 'Gastroenteritis infecciosa', prob: 0.52 }, { nombre: 'Ninguna (estado normal)', prob: 0.18 }, { nombre: 'Deshidratación', prob: 0.09 }],
    variables: [{ nombre: 'Temperatura corporal', valor: '40.1 °C' }, { nombre: 'Frecuencia cardíaca', valor: '104 lpm' }, { nombre: 'Actividad', valor: '0.51 índice' }, { nombre: 'Temperatura ambiental', valor: '31.2 °C' }, { nombre: 'Humedad relativa', valor: '71 %' }],
    faltantes: ['Frecuencia respiratoria'], contextoIncompleto: true, paquete: 'PKT-2109',
    nota: 'Falta una variable crítica: la confianza se reduce un 20 % (0.52 → 0.42).',
  },
  {
    id: 'INF-0108', uuid: '7ca1e8d9-e0bf-4e8f-9d3c-95a287ebae08', unidad: 'Lote pollos Galpón B', area: 'Galpón B · área 5', especie: 'Pollo de engorde', tipoModelo: 'MODELO_AVES', estado: 'EMITIDO', modo: 'HIBRIDO', version: 'DETECTOR: det-aves-1.2 · ANOMALIAS: if-aves-1.0', ventana: '09:05–09:10', latenciaMs: 1120, hora: '09:14:24', nivel: 2,
    score: 0.78, umbralScore: 0.6, confianzaBaja: false, vector: { densidad: 0.18, dispersion: 7.91, tasa: 0.21, individuos: 37, cobertura: 0.94 },
    hibrido: { syncMs: 2400, nivelServidor: 2, discrepancia: false }, paquete: 'PKT-012', eventoEdge: 'EVT-010', alerta: 'ALR-0032',
  },
  {
    id: 'INF-0107', uuid: '6b90d7c8-dfae-4d7e-8c2b-84f176dafd07', unidad: 'Lote pollos Galpón A', area: 'Galpón A · área 4', especie: 'Pollo de engorde', tipoModelo: 'MODELO_AVES', estado: 'EMITIDO', modo: 'HIBRIDO', version: 'DETECTOR: det-aves-1.2 · ANOMALIAS: if-aves-1.0', ventana: '09:05–09:10', latenciaMs: 780, hora: '09:13:08', nivel: 0,
    score: 0.31, umbralScore: 0.6, confianzaBaja: false, vector: { densidad: 0.6213, dispersion: 3.417, tasa: 1.2085, individuos: 42, cobertura: 0.96 },
    hibrido: { syncMs: 1900, nivelServidor: 0, discrepancia: false }, paquete: 'PKT-010', eventoEdge: 'EVT-009',
  },
  {
    id: 'INF-0105', uuid: '4f7eb5a6-bd8c-4b5c-8a09-62df54b8db05', unidad: 'Lote porcino P2', area: 'Corral porcino 2 · área 9', especie: 'Porcino', tipoModelo: 'MODELO_PORCINOS', estado: 'EMITIDO', modo: 'SERVIDOR', fallback: 'NODO_DESINCRONIZADO', version: 'DETECTOR: det-porc-1.0 · ANOMALIAS: if-porc-1.0', ventana: '09:05–09:10', latenciaMs: 610, hora: '09:11:29', nivel: 1,
    score: 0.66, umbralScore: 0.65, confianzaBaja: false, vector: { densidad: 0.392, dispersion: 4.0115, tasa: 0.771, individuos: 28, cobertura: 0.92 }, paquete: 'PKT-2105',
    nota: 'El nodo no tenía la configuración vigente (DESINCRONIZADO): se infirió en servidor.',
  },
  {
    id: 'INF-0104', uuid: '3e6da4f5-ac7b-4a4b-99f8-51ce43a7ca04', unidad: 'BOV-1057', area: 'Potrero 2 · área 12', especie: 'Bovino', tipoModelo: 'MODELO_ESPECIES_GRANDES', estado: 'DESCARTADO', modo: 'EDGE', version: 'grd-3.0', ventana: '08:58–09:06', latenciaMs: null, hora: '09:09:40', nivel: null, paquete: 'PKT-2104',
    nota: '12 inferencias en cola en EDGE-POTRERO-2 (límite 10): se descartó por ser de las más antiguas.',
  },
  {
    id: 'INF-0102', uuid: '1c4b82d3-8a5f-4e29-b7d6-3fac21e5a802', unidad: 'Lote tilapia Estanque 1', area: 'Estanque 1 · área 10', especie: 'Tilapia roja', tipoModelo: 'MODELO_ACUICULTURA', estado: 'EMITIDO', modo: 'EDGE', version: 'DETECTOR: det-acui-1.0 · ANOMALIAS: if-acui-1.0', ventana: '08:50–08:55', latenciaMs: 520, hora: '08:58:39', nivel: 0,
    score: 0.22, umbralScore: 0.55, confianzaBaja: false, vector: { densidad: 0.441, dispersion: 2.102, tasa: 0.9015, individuos: 310, cobertura: 0.99 }, paquete: 'PKT-2102',
  },
  {
    id: 'INF-0101', uuid: '0f3a91c2-7b4e-4d18-a6c5-2e9b10d4f701', unidad: 'OV-0231', area: 'Aprisco 1 · área 11', especie: 'Ovino', tipoModelo: 'MODELO_ESPECIES_MEDIANAS', estado: 'NO_DISPONIBLE', modo: 'SERVIDOR', version: 'med-1.4', ventana: '08:29–08:41', latenciaMs: null, hora: '08:41:10', nivel: null, paquete: 'PKT-2101',
    nota: 'El motor en servidor no respondió (08:41–08:44). El activo quedó SIN_DIAGNOSTICO_TEMPORAL hasta la inferencia siguiente.',
  },
];

/** El último resultado de cada unidad (lote o individuo) es su estado actual. */
export function ultimoPorUnidad(lista: Inferencia[] = INFERENCIAS): Inferencia[] {
  const vistos = new Set<string>();
  return lista.filter((i) => (vistos.has(i.unidad) ? false : (vistos.add(i.unidad), true)));
}
