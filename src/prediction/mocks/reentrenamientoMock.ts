// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-71: disparadores, modo de generación, 7 fases y monitoreo de degradación (RFC-009) |
// Datos simulados para Reentrenamiento de Modelos (RF-71) — dueño IoT/IA.
// No hay endpoint de usuario (solo el registro interno X-RF71-Internal-Key).
// Ver do-it/prediction/TASKS.md § Pendientes.
import type { Componente, EstadoVersion, TipoModelo } from '../types';

export type EstadoProceso = 'EJECUTANDO' | 'PAUSADO' | 'COMPLETADO' | 'FALLIDO' | 'ABORTADO' | 'INTERRUMPIDO';
export type Disparador = 'PROGRAMADO' | 'MANUAL' | 'DEGRADACION';
export type ModoGeneracion = 'REENTRENAMIENTO' | 'CALIBRACION_EN_SITIO';
export type EstadoFase = 'completada' | 'en_curso' | 'pendiente' | 'fallida';

/** Las 7 fases de RF-71: termina entregando la versión a RF-69, que decide si sirve. */
export const FASES_REENTRENAMIENTO = ['activacion', 'dataset', 'preprocesamiento', 'entrenamiento', 'metricas', 'entrega', 'cierre'] as const;

export interface ProcesoReentrenamiento {
  id: string;
  inicio: string;
  fin: string | null;
  tipoModelo: TipoModelo;
  componente: Componente | null;
  disparador: Disparador;
  modo: ModoGeneracion;
  estado: EstadoProceso;
  progreso: number;
  /** Índice de la fase actual (0–6). */
  fase: number;
  versionBase: string;
  /** Versión entregada a RF-69 y el estado que RF-69 le asignó. */
  versionNueva: string | null;
  estadoRf69: EstadoVersion | null;
  registros: number | null;
  log: string[];
}

export interface DegradacionModelo {
  tipoModelo: TipoModelo;
  componente: Componente | null;
  version: string;
  ultimaEvaluacion: string;
  datos: string;
  criterio: string;
  degradado: boolean;
}

export const RECURSOS_MOCK = { cpu: 58, ram: 47, cpuMax: 70, ramMax: 60 };

export const PROCESOS_REENTRENAMIENTO: ProcesoReentrenamiento[] = [
  {
    id: 'e7a1c3f2', inicio: '2026-04-03T08:40:00', fin: null, tipoModelo: 'MODELO_ESPECIES_MEDIANAS', componente: null, disparador: 'DEGRADACION', modo: 'REENTRENAMIENTO',
    estado: 'EJECUTANDO', progreso: 62, fase: 3, versionBase: 'med-1.5', versionNueva: null, estadoRf69: null, registros: 286_400,
    log: ['[08:40:00] REENTRENAMIENTO_INICIADO · disparador DEGRADACION (F1 0.76 < 0.80)', '[08:41:12] Dataset construido: 286 400 registros apto_para_ia, dataset_hash 9c41…', '[08:46:30] Preprocesamiento: balanceo de Riesgo alto ×2.1, división 70/15/15', '[08:58:05] Entrenamiento Random Forest · 100 árboles · semilla 42 · 62 %'],
  },
  {
    id: 'b41d9a07', inicio: '2026-04-02T22:00:00', fin: '2026-04-02T22:48:00', tipoModelo: 'MODELO_AVES', componente: 'ANOMALIAS', disparador: 'PROGRAMADO', modo: 'CALIBRACION_EN_SITIO',
    estado: 'COMPLETADO', progreso: 100, fase: 6, versionBase: 'if-aves-1.0', versionNueva: 'if-aves-1.1', estadoRf69: 'APROBADO', registros: 18_240,
    log: ['[22:00:00] REENTRENAMIENTO_INICIADO · calibración en sitio (3 auditorías RF-24)', '[22:47:40] Métricas entregadas sin evaluar a RF-69', '[22:48:00] RF-69 asignó APROBADO'],
  },
  {
    id: '5c2e8f19', inicio: '2026-04-01T14:10:00', fin: '2026-04-01T14:52:00', tipoModelo: 'MODELO_ESPECIES_GRANDES', componente: null, disparador: 'MANUAL', modo: 'REENTRENAMIENTO',
    estado: 'COMPLETADO', progreso: 100, fase: 6, versionBase: 'grd-3.0', versionNueva: 'grd-3.1', estadoRf69: 'ACTIVO', registros: 412_900,
    log: ['[14:10:00] REENTRENAMIENTO_INICIADO · manual', '[14:52:00] RF-69 asignó APROBADO; activada después por el veterinario'],
  },
  {
    id: '91fa0d3c', inicio: '2026-03-30T03:00:00', fin: '2026-03-30T03:21:00', tipoModelo: 'MODELO_RIESGO_CONTAGIO', componente: null, disparador: 'PROGRAMADO', modo: 'REENTRENAMIENTO',
    estado: 'FALLIDO', progreso: 71, fase: 4, versionBase: 'ctg-1.2', versionNueva: null, estadoRf69: null, registros: 18_700,
    log: ['[03:00:00] REENTRENAMIENTO_INICIADO · programado', '[03:21:00] REENTRENAMIENTO_FALLIDO · la clase Alto quedó con menos de 50 ejemplos tras la división'],
  },
  {
    id: '0d77b2e4', inicio: '2026-03-28T10:30:00', fin: '2026-03-28T10:44:00', tipoModelo: 'MODELO_PORCINOS', componente: 'DETECTOR', disparador: 'MANUAL', modo: 'CALIBRACION_EN_SITIO',
    estado: 'INTERRUMPIDO', progreso: 38, fase: 2, versionBase: 'det-porc-1.0', versionNueva: null, estadoRf69: null, registros: 9_120,
    log: ['[10:30:00] REENTRENAMIENTO_INICIADO · manual', '[10:44:00] Cancelado por el usuario: queda INTERRUMPIDO y se puede reanudar desde Preprocesamiento'],
  },
];

export const DEGRADACION: DegradacionModelo[] = [
  { tipoModelo: 'MODELO_ESPECIES_MEDIANAS', componente: null, version: 'med-1.5', ultimaEvaluacion: '2026-04-03T08:40:00', datos: '3 100 aptos/día', criterio: 'F1 0.76 < 0.80', degradado: true },
  { tipoModelo: 'MODELO_ESPECIES_GRANDES', componente: null, version: 'grd-3.1', ultimaEvaluacion: '2026-04-03T06:00:00', datos: '4 800 aptos/día', criterio: 'F1 0.86 ≥ 0.80', degradado: false },
  { tipoModelo: 'MODELO_RIESGO_CONTAGIO', componente: null, version: 'ctg-1.2', ultimaEvaluacion: '2026-04-03T06:00:00', datos: '620 aptos/día', criterio: 'F1 0.82 ≥ 0.80', degradado: false },
  { tipoModelo: 'MODELO_AVES', componente: 'ANOMALIAS', version: 'if-aves-1.0', ultimaEvaluacion: '2026-04-03T06:00:00', datos: 'ventanas ÓPTIMA/DEGRADADA', criterio: 'Falsos positivos 0.07 ≤ 0.10', degradado: false },
  { tipoModelo: 'MODELO_PORCINOS', componente: 'ANOMALIAS', version: 'if-porc-1.0', ultimaEvaluacion: '2026-04-03T06:00:00', datos: 'ventanas ÓPTIMA/DEGRADADA', criterio: 'Falsos positivos 0.13 > 0.10', degradado: true },
];

/** Estado de cada fase a partir de la fase actual y del estado del proceso. */
export function estadoFases(p: Pick<ProcesoReentrenamiento, 'fase' | 'estado'>): EstadoFase[] {
  return FASES_REENTRENAMIENTO.map((_, i) => {
    if (p.estado === 'COMPLETADO' || i < p.fase) return 'completada';
    if (i > p.fase) return 'pendiente';
    return p.estado === 'FALLIDO' ? 'fallida' : p.estado === 'EJECUTANDO' ? 'en_curso' : 'pendiente';
  });
}
