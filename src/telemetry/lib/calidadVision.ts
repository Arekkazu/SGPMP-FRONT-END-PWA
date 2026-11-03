// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-62: observaciones de visión evaluadas (antes datos de ejemplo) |
import type { FlagVision, ObservacionVisionEvaluada } from '../types';

/** `{flag: {activo, …}}` del backend → `{flag: boolean}` para FlagChips. */
export function flagsActivos(flags: Record<string, FlagVision> | null | undefined): Record<string, boolean> {
  return Object.fromEntries(Object.entries(flags ?? {}).map(([k, v]) => [k, !!v?.activo]));
}

function numero(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Los valores con que se evaluó la observación, tal como quedaron en sus flags. Los pesos no se
 * guardan por observación: el panel muestra aparte la política vigente.
 */
export function valoresEvaluados(o: ObservacionVisionEvaluada) {
  const f = o.flags_detectados ?? {};
  return {
    cobertura: numero(o.cobertura_ventana),
    fpsEfectivo: numero(o.fps_efectivo),
    fpsConfigurado: numero(f.fps_insuficiente?.fps_configurado),
    tracksPerdidos: o.cantidad_tracks_perdidos,
    tracksTolerables: numero(f.tracking_inestable?.tracks_perdidos_tolerables),
  };
}
