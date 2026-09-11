// Datos simulados para Reentrenamiento de Modelos (RF-71) — dueño IoT/IA.
// No hay endpoint de usuario (solo el registro interno X-RF71-Internal-Key).
// Ver do-it/prediction/TASKS.md § Pendientes.

export type EstadoProceso = 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO' | 'CANCELADO';

export interface ProcesoReentrenamiento {
  id: number;
  fecha_inicio: string;
  tipo_modelo: string;
  activacion: 'Manual' | 'Automática (degradación)';
  estado: EstadoProceso;
  f1_global: number | null;
  recall_riesgo: number | null;
  duracion: string;
  progreso: number;
}

export interface FaseProceso {
  nombre: string;
  estado: 'completada' | 'en_curso' | 'pendiente';
}

export const PROCESOS_REENTRENAMIENTO: ProcesoReentrenamiento[] = [
  { id: 5012, fecha_inicio: '2026-07-29T06:00:00Z', tipo_modelo: 'Especies medianas', activacion: 'Automática (degradación)', estado: 'EN_PROCESO', f1_global: null, recall_riesgo: null, duracion: '00:18:42', progreso: 62 },
  { id: 5008, fecha_inicio: '2026-07-27T22:10:00Z', tipo_modelo: 'Especies pequeñas', activacion: 'Manual', estado: 'COMPLETADO', f1_global: 0.86, recall_riesgo: 0.89, duracion: '00:41:05', progreso: 100 },
  { id: 5004, fecha_inicio: '2026-07-25T03:30:00Z', tipo_modelo: 'Riesgo de contagio', activacion: 'Automática (degradación)', estado: 'FALLIDO', f1_global: 0.71, recall_riesgo: 0.68, duracion: '00:12:20', progreso: 100 },
  { id: 5001, fecha_inicio: '2026-07-22T14:00:00Z', tipo_modelo: 'Especies grandes', activacion: 'Manual', estado: 'COMPLETADO', f1_global: 0.83, recall_riesgo: 0.87, duracion: '00:55:11', progreso: 100 },
];

export const FASES_MOCK: FaseProceso[] = [
  { nombre: 'Extracción de datos', estado: 'completada' },
  { nombre: 'Preprocesamiento', estado: 'completada' },
  { nombre: 'Entrenamiento', estado: 'en_curso' },
  { nombre: 'Validación', estado: 'pendiente' },
  { nombre: 'Registro de versión', estado: 'pendiente' },
];

export const RECURSOS_MOCK = { cpu: 58, ram: 47 };

export const LOG_MOCK = [
  '[06:00:12] Proceso 5012 iniciado (tipo=ESPECIES_MEDIANAS, algoritmo=GradientBoosting)',
  '[06:02:40] Dataset cargado: 48.320 registros, ventana 2026-04..2026-07',
  '[06:05:03] Preprocesamiento completado (12 variables I3P-1)',
  '[06:07:55] Época 1/50 — loss=0.412 f1=0.71',
  '[06:14:20] Época 24/50 — loss=0.188 f1=0.84',
  '[06:18:41] Entrenamiento en curso… 62%',
];

export const DEGRADACION_MOCK = {
  tipo_modelo: 'Especies medianas',
  f1_actual: 0.76,
  umbral: 0.80,
};
