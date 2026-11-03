// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: orden por gravedad, sensores sin datos y titular del área |
import type { EstadoSemaforo, EstadoSensorSchema } from '../types';

/** Lo que está mal primero (M3-15). Un valor desconocido cuenta como GRIS. */
const GRAVEDAD: Record<EstadoSemaforo, number> = { ROJO: 0, AMARILLO: 1, GRIS: 2, VERDE: 3 };

export function semaforo(estado: string | null | undefined): EstadoSemaforo {
  const up = (estado ?? '').toUpperCase();
  return up in GRAVEDAD ? (up as EstadoSemaforo) : 'GRIS';
}

export const gravedad = (estado: string | null | undefined) => GRAVEDAD[semaforo(estado)];

export const porGravedad = (a: EstadoSensorSchema, b: EstadoSensorSchema) =>
  gravedad(a.estado_semaforo) - gravedad(b.estado_semaforo);

/**
 * GRIS por falta de datos, no por falta de umbral (RF-58 E7): ese sensor sí reporta
 * y su valor se muestra como cualquier otro.
 */
export const sinDatos = (s: EstadoSensorSchema) =>
  s.ultimo_valor == null || (semaforo(s.estado_semaforo) === 'GRIS' && !s.sin_umbral);

/** Rojo o amarillo: lleva medidor; el resto va en una fila compacta (prototipo 13.4). */
export const conProblema = (s: EstadoSensorSchema) => gravedad(s.estado_semaforo) < GRAVEDAD.GRIS;

export type Titular =
  | { tipo: 'sin_sensores' }
  | { tipo: 'sin_datos'; desde: string | null }
  | { tipo: 'en_rango' }
  | { tipo: 'problema'; sensor: EstadoSensorSchema };

/** Lo primero que hay que leer de un área, en palabras: su peor sensor. */
export function titularArea(sensores: EstadoSensorSchema[]): Titular {
  if (sensores.length === 0) return { tipo: 'sin_sensores' };
  const conDatos = sensores.filter((s) => !sinDatos(s));
  if (conDatos.length === 0) {
    const ultimo = sensores.map((s) => s.ultimo_timestamp_captura).filter(Boolean).sort().pop() ?? null;
    return { tipo: 'sin_datos', desde: ultimo };
  }
  const peor = [...conDatos].sort(porGravedad)[0];
  return conProblema(peor) ? { tipo: 'problema', sensor: peor } : { tipo: 'en_rango' };
}
