// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-182 RF-66: etiquetas de nivel Normal / Riesgo bajo / Riesgo alto / Crítico |
// | 2026-11-02 | Arekkazu | AJF-09 RF-67: la confianza viene en confianza_global |
// Utilidades para interpretar el nivel de riesgo de los eventos de historial (RF-67).
// ⚠️ La forma del `payload` de EventoHistorialResponse no está documentada en el
// contrato; se extrae de forma tolerante. Ver TASKS.md § Pendientes.

import type { Tono } from '../components/Pill';

// TC-DIS-182: los cuatro niveles de RF-66, iguales en el monitor y en el historial.
export const NIVEL_RIESGO_LABEL: Record<number, string> = {
  0: 'Normal',
  1: 'Riesgo bajo',
  2: 'Riesgo alto',
  3: 'Crítico',
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
  // AJF-09: el backend manda `confianza_global` (RF-67); sin ella la confianza nunca se veía.
  const claves = ['confianza_global', 'confianza', 'probabilidad', 'confidence', 'score'];
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
  // QA-M04 ronda 2 CU04 H-01: el historial manda `nombre_patologia`; sin ella la tarjeta salía sin patología.
  const claves = ['nombre_patologia', 'patologia', 'enfermedad_estimada', 'diagnostico', 'patologia_estimada'];
  for (const k of claves) {
    const v = payload[k];
    if (typeof v === 'string') return v;
  }
  return null;
}
