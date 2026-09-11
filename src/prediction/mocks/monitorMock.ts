// Datos simulados para el Monitor de Inferencia (RF-66) — dueño IoT/IA, sin endpoint.
// Ver do-it/prediction/TASKS.md § Pendientes.

export interface MonitorMotor {
  version: string;
  modo: string;
  paquetes_hoy: number;
  latencia_p95_ms: number;
  cola: number;
  uptime: string;
}

export interface ActivoMonitoreado {
  id: number;
  identificador: string;
  especie: string;
  finca: string;
  nivel_riesgo: 0 | 1 | 2 | 3;
  enfermedad_estimada: string;
  confianza: number;
  latencia_ms: number;
  hora: string;
  variables_recibidas: number;
  variables_esperadas: number;
  dist_riesgo: { nivel: string; prob: number }[];
  dist_patologias: { nombre: string; prob: number }[];
  variables_faltantes: string[];
}

export const MONITOR_MOTOR: MonitorMotor = {
  version: 'v4.2.1', modo: 'HIBRIDO', paquetes_hoy: 1284, latencia_p95_ms: 340, cola: 3, uptime: '99.8%',
};

export const MONITOR_KPIS = [
  { etiqueta: 'Activos monitoreados', valor: 42 },
  { etiqueta: 'Riesgo alto', valor: 5 },
  { etiqueta: 'Inferencias/h', valor: 128 },
  { etiqueta: 'Confianza media', valor: '86%' },
  { etiqueta: 'Alertas activas', valor: 7 },
];

export const ACTIVOS_MONITOREADOS: ActivoMonitoreado[] = [
  {
    id: 101, identificador: 'BOV-101', especie: 'Bovinos', finca: 'La Esperanza',
    nivel_riesgo: 3, enfermedad_estimada: 'Mastitis subclínica', confianza: 0.87, latencia_ms: 290, hora: '08:15',
    variables_recibidas: 5, variables_esperadas: 6,
    dist_riesgo: [{ nivel: 'Sin riesgo', prob: 0.03 }, { nivel: 'Bajo', prob: 0.05 }, { nivel: 'Moderado', prob: 0.05 }, { nivel: 'Alto', prob: 0.87 }],
    dist_patologias: [{ nombre: 'Mastitis subclínica', prob: 0.87 }, { nombre: 'Cetosis', prob: 0.08 }, { nombre: 'Acidosis ruminal', prob: 0.05 }],
    variables_faltantes: ['Índice THI'],
  },
  {
    id: 205, identificador: 'POR-205', especie: 'Porcinos', finca: 'El Roble',
    nivel_riesgo: 2, enfermedad_estimada: 'Neumonía enzoótica', confianza: 0.61, latencia_ms: 410, hora: '08:12',
    variables_recibidas: 6, variables_esperadas: 6,
    dist_riesgo: [{ nivel: 'Sin riesgo', prob: 0.10 }, { nivel: 'Bajo', prob: 0.14 }, { nivel: 'Moderado', prob: 0.61 }, { nivel: 'Alto', prob: 0.15 }],
    dist_patologias: [{ nombre: 'Neumonía enzoótica', prob: 0.61 }, { nombre: 'Rinitis atrófica', prob: 0.22 }, { nombre: 'Pleuroneumonía', prob: 0.17 }],
    variables_faltantes: [],
  },
  {
    id: 340, identificador: 'TIL-340', especie: 'Tilapia roja', finca: 'La Esperanza',
    nivel_riesgo: 1, enfermedad_estimada: 'Sin patología relevante', confianza: 0.72, latencia_ms: 350, hora: '08:09',
    variables_recibidas: 4, variables_esperadas: 4,
    dist_riesgo: [{ nivel: 'Sin riesgo', prob: 0.20 }, { nivel: 'Bajo', prob: 0.72 }, { nivel: 'Moderado', prob: 0.06 }, { nivel: 'Alto', prob: 0.02 }],
    dist_patologias: [{ nombre: 'Estreptococosis', prob: 0.18 }, { nombre: 'Saprolegniasis', prob: 0.10 }],
    variables_faltantes: [],
  },
  {
    id: 412, identificador: 'POL-412', especie: 'Pollos de engorde', finca: 'El Roble',
    nivel_riesgo: 0, enfermedad_estimada: 'Sin patología relevante', confianza: 0.91, latencia_ms: 260, hora: '08:05',
    variables_recibidas: 5, variables_esperadas: 5,
    dist_riesgo: [{ nivel: 'Sin riesgo', prob: 0.91 }, { nivel: 'Bajo', prob: 0.06 }, { nivel: 'Moderado', prob: 0.02 }, { nivel: 'Alto', prob: 0.01 }],
    dist_patologias: [{ nombre: 'Coccidiosis', prob: 0.06 }, { nombre: 'Enf. respiratoria', prob: 0.03 }],
    variables_faltantes: [],
  },
];
