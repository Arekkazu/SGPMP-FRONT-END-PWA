// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-62: índice de calidad de visión (RFC-011, AIOT-SPEC-01 §2) |
// Datos simulados RF-62 para visión: el backend aún no expone evaluaciones de visión
// ni sus parámetros. Reemplazar por `api/` cuando existan.

export type EstadoCalibracionVision = 'CALIBRADO' | 'EN_CALIBRACION' | 'SIN_LINEA_BASE';
export type ClaseVision = 'OPTIMA' | 'DEGRADADA' | 'NO_APTA';

/** Valores por defecto (D), sin medir en hardware. */
export interface ParametrosVision {
  w1: number; w2: number; w3: number;
  tracksTolerables: number;
  umbralOptima: number;
  umbralDegradada: number;
  factorEnCalibracion: number;
}

export const PARAMETROS_INDICE_VISION: ParametrosVision = {
  w1: 0.4, w2: 0.35, w3: 0.25, tracksTolerables: 5, umbralOptima: 80, umbralDegradada: 40, factorEnCalibracion: 0.7,
};

export interface ObservacionVision {
  id: string;
  camara: string;
  area: string;
  ventana: string;
  densidad: number;
  individuos: number;
  cobertura: number;
  fpsEfectivo: number;
  fpsConfigurado: number;
  tracksPerdidos: number;
  calibracion: EstadoCalibracionVision;
}

export const OBSERVACIONES_VISION: ObservacionVision[] = [
  { id: 'EVV-001', camara: 'CAM-GALPON-A-01', area: 'Galpón A · área 4', ventana: '09:05–09:10', densidad: 0.62, individuos: 42, cobertura: 0.96, fpsEfectivo: 11.6, fpsConfigurado: 12, tracksPerdidos: 2, calibracion: 'CALIBRADO' },
  { id: 'EVV-002', camara: 'CAM-GALPON-A-01', area: 'Galpón A · área 4', ventana: '09:00–09:05', densidad: 0.58, individuos: 42, cobertura: 0.94, fpsEfectivo: 12, fpsConfigurado: 12, tracksPerdidos: 1, calibracion: 'EN_CALIBRACION' },
  { id: 'EVV-003', camara: 'CAM-GALPON-B-01', area: 'Galpón B · área 5', ventana: '09:00–09:05', densidad: 0.49, individuos: 37, cobertura: 0.71, fpsEfectivo: 8.4, fpsConfigurado: 12, tracksPerdidos: 6, calibracion: 'CALIBRADO' },
  { id: 'EVV-004', camara: 'CAM-CUARENTENA-01', area: 'Corral cuarentena · área 7', ventana: '06:40–06:45', densidad: 0, individuos: 0, cobertura: 1, fpsEfectivo: 12, fpsConfigurado: 12, tracksPerdidos: 0, calibracion: 'SIN_LINEA_BASE' },
];

export interface EvaluacionVision {
  componenteFps: number;
  componenteTracks: number;
  base: number;
  factor: number;
  indice: number;
  clase: ClaseVision;
  aptoParaIa: boolean;
  confianzaBaja: boolean;
  flags: { cobertura_baja: boolean; tracking_inestable: boolean; fps_insuficiente: boolean; sin_linea_base: boolean };
}

/**
 * Determinista: el mismo sobre con los mismos parámetros da el mismo índice.
 * Índice = 100 × (w1·cobertura + w2·min(1, fps/fps_cfg) + w3·(1 − min(1, tracks/tolerables))) × factor de calibración.
 * apto_para_nic41 es siempre false en visión (M06 no aplica).
 */
export function evaluarVision(o: ObservacionVision, p: ParametrosVision = PARAMETROS_INDICE_VISION): EvaluacionVision {
  const componenteFps = Math.min(1, o.fpsEfectivo / o.fpsConfigurado);
  const componenteTracks = 1 - Math.min(1, o.tracksPerdidos / p.tracksTolerables);
  const base = 100 * (p.w1 * o.cobertura + p.w2 * componenteFps + p.w3 * componenteTracks);
  const factor = { CALIBRADO: 1, EN_CALIBRACION: p.factorEnCalibracion, SIN_LINEA_BASE: 0 }[o.calibracion];
  const indice = Math.round(base * factor);
  const clase: ClaseVision = indice >= p.umbralOptima ? 'OPTIMA' : indice >= p.umbralDegradada ? 'DEGRADADA' : 'NO_APTA';
  return {
    componenteFps,
    componenteTracks,
    base: Math.round(base * 10) / 10,
    factor,
    indice,
    clase,
    aptoParaIa: clase !== 'NO_APTA' && o.calibracion !== 'SIN_LINEA_BASE',
    confianzaBaja: clase === 'DEGRADADA',
    // Supuesto del prototipo: la ficha no fija los umbrales que activan cada flag.
    flags: {
      cobertura_baja: o.cobertura < 0.9,
      tracking_inestable: o.tracksPerdidos >= p.tracksTolerables,
      fps_insuficiente: o.fpsEfectivo < o.fpsConfigurado,
      sin_linea_base: o.calibracion === 'SIN_LINEA_BASE',
    },
  };
}
