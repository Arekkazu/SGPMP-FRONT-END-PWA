// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60: parámetros de heartbeat por categoría y detección de visión (RFC-011, RFC-015 C1) |
// Datos simulados RF-60 para cámaras: el backend aún no expone los parámetros por
// categoría ni las ventanas de visión de un dispositivo. Reemplazar por `api/` cuando existan.

export type CategoriaDispositivo = 'NODO_AMBIENTAL' | 'NODO_HIDRICO' | 'NODO_BIOMETRICO' | 'CAMARA';

/** Segundos. `d` = valores por defecto sin medir en hardware. */
export interface ParametrosCategoria { hb: number; freq: number; margen: number; d?: boolean }

export const PARAMETROS_CATEGORIA: Record<CategoriaDispositivo, ParametrosCategoria> = {
  NODO_AMBIENTAL: { hb: 300, freq: 600, margen: 300 },
  NODO_HIDRICO: { hb: 300, freq: 600, margen: 300 },
  NODO_BIOMETRICO: { hb: 150, freq: 300, margen: 150 },
  CAMARA: { hb: 120, freq: 300, margen: 150, d: true },
};

/** umbral_inactivo = umbral_sin_senal + 6 h de inactividad extendida. */
export const INACTIVIDAD_EXTENDIDA_S = 6 * 3600;

/** Solo CAMARA: cuántas ventanas seguidas bajo la cobertura mínima marcan SIN_DETECCION_VALIDA. */
export const PARAMETROS_VISION = { ventanasConsecutivas: 3, coberturaMinima: 0.3 };

/** umbral_sin_senal (nombre canónico, RFC-015 C1; `heartbeat` es su alias deprecado). */
export function umbralSinSenal(p: ParametrosCategoria): number {
  return Math.max(p.hb, p.freq) + p.margen;
}

/** Cadena canónica: intervalo_heartbeat ≤ frecuencia_muestreo / 2 ≤ frecuencia_muestreo ≤ umbral_sin_senal. */
export function cadenaCanonicaValida(p: ParametrosCategoria): boolean {
  return p.hb <= p.freq / 2 && p.freq <= umbralSinSenal(p);
}

export function formatoSegundos(s: number): string {
  if (s >= 3600) return `${+(s / 3600).toFixed(1)} h`;
  if (s >= 60) return `${+(s / 60).toFixed(1)} min`;
  return `${s} s`;
}

export interface VentanaDeteccion { ventana: string; cobertura: number; individuos: number }

export interface CamaraMock {
  serial: string;
  area: string;
  estado: 'ACTIVO' | 'SIN_SEÑAL';
  firmware: string;
  ventanas: VentanaDeteccion[];
}

export const CAMARAS: CamaraMock[] = [
  { serial: 'CAM-GALPON-A-01', area: 'Galpón A · área 4', estado: 'ACTIVO', firmware: 'v1.2.0', ventanas: [{ ventana: '09:00–09:05', cobertura: 0.95, individuos: 42 }, { ventana: '09:05–09:10', cobertura: 0.96, individuos: 42 }, { ventana: '09:10–09:15', cobertura: 0.94, individuos: 41 }] },
  { serial: 'CAM-ESTANQUE-A-01', area: 'Estanque A · área 9', estado: 'ACTIVO', firmware: 'v1.2.0', ventanas: [{ ventana: '09:00–09:05', cobertura: 0.22, individuos: 3 }, { ventana: '09:05–09:10', cobertura: 0.18, individuos: 2 }, { ventana: '09:10–09:15', cobertura: 0.15, individuos: 1 }] },
  { serial: 'CAM-GALPON-B-01', area: 'Galpón B · área 5', estado: 'SIN_SEÑAL', firmware: 'v1.2.0', ventanas: [] },
];

export type ResultadoDeteccion = 'DETECCION_VALIDA' | 'SIN_DETECCION_VALIDA' | 'SIN_SEÑAL';

/**
 * Sin ventanas = no llega heartbeat: fallo de dispositivo (alerta DISPOSITIVO_SIN_SEÑAL).
 * Con heartbeat pero N ventanas seguidas bajo la cobertura mínima: condición de calidad,
 * no fallo (RFC-011 §2.7, no genera alerta técnica).
 */
export function evaluarDeteccion(ventanas: VentanaDeteccion[], p = PARAMETROS_VISION): { resultado: ResultadoDeteccion; consecutivas: number } {
  if (ventanas.length === 0) return { resultado: 'SIN_SEÑAL', consecutivas: 0 };
  let consecutivas = 0;
  for (let i = ventanas.length - 1; i >= 0 && ventanas[i].cobertura < p.coberturaMinima; i--) consecutivas++;
  return { resultado: consecutivas >= p.ventanasConsecutivas ? 'SIN_DETECCION_VALIDA' : 'DETECCION_VALIDA', consecutivas };
}
