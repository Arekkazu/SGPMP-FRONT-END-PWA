// Utilidades para interpretar el nivel de riesgo de los eventos de historial (RF-67).
// ⚠️ La forma del `payload` de EventoHistorialResponse no está documentada en el
// contrato; se extrae de forma tolerante. Ver TASKS.md § Pendientes.

import type { Tono } from '../components/Pill';

export const NIVEL_RIESGO_LABEL: Record<number, string> = {
  0: 'Sin riesgo',
  1: 'Bajo',
  2: 'Moderado',
  3: 'Alto',
};

export function nivelRiesgoTono(nivel: number | null): Tono {
  switch (nivel) {
    case 3: return 'error';
    case 2: return 'warning';
    case 1: return 'info';
    case 0: return 'success';
    default: return 'neutral';
  }
}

/** Lee un nivel de riesgo entero (0–3) del payload, con varias claves posibles. */
export function extraerNivelRiesgo(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  const claves = ['nivel_riesgo', 'nivel', 'risk_level'];
  for (const k of claves) {
    const v = payload[k];
    if (typeof v === 'number') return Math.round(v);
    if (typeof v === 'string' && !isNaN(Number(v))) return Math.round(Number(v));
  }
  return null;
}

/** Lee una probabilidad/confianza (0–1) del payload si existe. */
export function extraerConfianza(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  const claves = ['confianza', 'probabilidad', 'confidence', 'score'];
  for (const k of claves) {
    const v = payload[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

/** Texto corto de la patología estimada si el payload la trae. */
export function extraerPatologia(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const claves = ['patologia', 'enfermedad_estimada', 'diagnostico', 'patologia_estimada'];
  for (const k of claves) {
    const v = payload[k];
    if (typeof v === 'string') return v;
  }
  return null;
}
