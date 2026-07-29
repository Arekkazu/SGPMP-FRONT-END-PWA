// Datos simulados para la lista de retroalimentaciones (RF-72).
// ⚠️ El backend no expone un GET de retroalimentaciones (solo POST). Esta lista
// es de ejemplo; el registro sí usa el endpoint real. Ver TASKS.md § Pendientes.

export type EstadoEvaluacion = 'PENDIENTE' | 'EVALUADO' | 'VENTANA_VENCIDA';

export interface RetroPendienteMock {
  id_resultado_inferencia: string;
  id_activo_biologico: number;
  identificador: string;
  especie: string;
  finca: string;
  riesgo_inferido: 'ALTO' | 'MEDIO' | 'BAJO';
  patologia_estimada: string;
  probabilidad: number;
  fecha_inferencia: string;
  estado_evaluacion: EstadoEvaluacion;
  evaluado_por?: string;
}

export const RETRO_PENDIENTES_MOCK: RetroPendienteMock[] = [
  {
    id_resultado_inferencia: '9f1c2b7a-0001-4a10-9b21-aa0011223344',
    id_activo_biologico: 101, identificador: 'BOV-101', especie: 'Bovinos', finca: 'La Esperanza',
    riesgo_inferido: 'ALTO', patologia_estimada: 'Mastitis subclínica', probabilidad: 0.87,
    fecha_inferencia: '2026-07-27T08:15:00Z', estado_evaluacion: 'PENDIENTE',
  },
  {
    id_resultado_inferencia: '9f1c2b7a-0002-4a10-9b21-aa0011223344',
    id_activo_biologico: 205, identificador: 'POR-205', especie: 'Porcinos', finca: 'El Roble',
    riesgo_inferido: 'MEDIO', patologia_estimada: 'Neumonía enzoótica', probabilidad: 0.61,
    fecha_inferencia: '2026-07-26T14:40:00Z', estado_evaluacion: 'PENDIENTE',
  },
  {
    id_resultado_inferencia: '9f1c2b7a-0003-4a10-9b21-aa0011223344',
    id_activo_biologico: 340, identificador: 'TIL-340', especie: 'Tilapia roja', finca: 'La Esperanza',
    riesgo_inferido: 'ALTO', patologia_estimada: 'Estreptococosis', probabilidad: 0.79,
    fecha_inferencia: '2026-07-20T10:05:00Z', estado_evaluacion: 'EVALUADO', evaluado_por: 'Dr. Ramírez',
  },
  {
    id_resultado_inferencia: '9f1c2b7a-0004-4a10-9b21-aa0011223344',
    id_activo_biologico: 118, identificador: 'BOV-118', especie: 'Bovinos', finca: 'El Roble',
    riesgo_inferido: 'BAJO', patologia_estimada: 'Sin patología relevante', probabilidad: 0.32,
    fecha_inferencia: '2026-04-15T09:00:00Z', estado_evaluacion: 'VENTANA_VENCIDA',
  },
];
