// Datos simulados para Riesgo de Contagio (RF-68) — dueño IoT/IA, sin endpoint.
// Ver do-it/prediction/TASKS.md § Pendientes.

export interface ContagioMotor {
  w_fs: number;
  w_fa: number;
  w_fd: number;
  ciclos_hoy: number;
  lotes_degradados: number;
  sin_datos: number;
  alertas: number;
}

export interface ContagioHistorial {
  hora: string;
  probabilidad: number;
  nivel: 'ALTO' | 'MEDIO' | 'BAJO';
  fs: number;
  fa: number;
  fd: number;
  calidad: string;
  confianza: number;
}

export interface LoteContagio {
  id: number;
  identificador: string;
  especie: string;
  finca: string;
  probabilidad: number;
  nivel: 'ALTO' | 'MEDIO' | 'BAJO';
  confianza: number;
  factor_sanitario: number;
  factor_ambiental: number;
  factor_densidad: number;
  calidad: string;
  pesos_recalculados: boolean;
  historial: ContagioHistorial[];
}

export const CONTAGIO_MOTOR: ContagioMotor = {
  w_fs: 0.5, w_fa: 0.3, w_fd: 0.2, ciclos_hoy: 96, lotes_degradados: 2, sin_datos: 1, alertas: 4,
};

function hist(base: number): ContagioHistorial[] {
  return Array.from({ length: 8 }, (_, i) => {
    const p = Math.max(0.05, Math.min(0.95, base + (Math.sin(i) * 0.06)));
    return {
      hora: `${String(6 + i).padStart(2, '0')}:00`,
      probabilidad: Number(p.toFixed(2)),
      nivel: p >= 0.7 ? 'ALTO' : p >= 0.4 ? 'MEDIO' : 'BAJO',
      fs: Number((p * 0.5).toFixed(2)), fa: Number((p * 0.3).toFixed(2)), fd: Number((p * 0.2).toFixed(2)),
      calidad: 'Buena', confianza: Number((0.8 + i * 0.01).toFixed(2)),
    };
  });
}

export const LOTES_CONTAGIO: LoteContagio[] = [
  {
    id: 1, identificador: 'LOTE-A12', especie: 'Porcinos', finca: 'El Roble',
    probabilidad: 0.82, nivel: 'ALTO', confianza: 0.88,
    factor_sanitario: 0.46, factor_ambiental: 0.24, factor_densidad: 0.12, calidad: 'Buena',
    pesos_recalculados: false, historial: hist(0.78),
  },
  {
    id: 2, identificador: 'LOTE-B07', especie: 'Tilapia roja', finca: 'La Esperanza',
    probabilidad: 0.55, nivel: 'MEDIO', confianza: 0.74,
    factor_sanitario: 0.28, factor_ambiental: 0.19, factor_densidad: 0.08, calidad: 'Parcial',
    pesos_recalculados: true, historial: hist(0.52),
  },
  {
    id: 3, identificador: 'LOTE-C21', especie: 'Pollos de engorde', finca: 'El Roble',
    probabilidad: 0.28, nivel: 'BAJO', confianza: 0.91,
    factor_sanitario: 0.14, factor_ambiental: 0.09, factor_densidad: 0.05, calidad: 'Buena',
    pesos_recalculados: false, historial: hist(0.30),
  },
  {
    id: 4, identificador: 'LOTE-D03', especie: 'Bovinos', finca: 'La Esperanza',
    probabilidad: 0.71, nivel: 'ALTO', confianza: 0.83,
    factor_sanitario: 0.40, factor_ambiental: 0.22, factor_densidad: 0.09, calidad: 'Buena',
    pesos_recalculados: false, historial: hist(0.68),
  },
];
