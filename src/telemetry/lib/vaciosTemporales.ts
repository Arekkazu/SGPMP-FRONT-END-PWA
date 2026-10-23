// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
import type { LecturaHistoricaSchema, VacioTemporalSchema } from '../types';

/**
 * RF-59 E7 / CA-17 (DEV-38): el backend calcula los vacíos (hueco > 3 × frecuencia) sobre
 * todo el rango filtrado; aquí solo se ubican en la página que se está mostrando.
 */
const ms = (iso: string) => new Date(iso).getTime();
const clave = (idSensor: number, variable: string, iso: string) => `${idSensor}|${variable}|${ms(iso)}`;

/**
 * Vacío que termina en cada lectura, por (sensor, variable, timestamp). Con orden DESC la fila
 * del vacío va justo después de esa lectura: entre ella y la anterior en el tiempo.
 */
export function vaciosPorLecturaPosterior(vacios: VacioTemporalSchema[]): Map<string, VacioTemporalSchema> {
  return new Map(vacios.map((v) => [clave(v.sensor_id, v.tipo_variable, v.hasta), v]));
}

export function vacioTrasLectura(
  porLectura: Map<string, VacioTemporalSchema>,
  lectura: Pick<LecturaHistoricaSchema, 'id_sensor' | 'tipo_variable' | 'timestamp_captura'>,
): VacioTemporalSchema | undefined {
  return porLectura.get(clave(lectura.id_sensor, lectura.tipo_variable, lectura.timestamp_captura));
}

/** Zonas de la gráfica: solo los vacíos cuyos dos extremos están entre los puntos graficados. */
export function zonasDelGrafico(vacios: VacioTemporalSchema[], timestamps: string[]): { x1: string; x2: string }[] {
  const porMs = new Map(timestamps.map((ts) => [ms(ts), ts]));
  return vacios.flatMap((v) => {
    const x1 = porMs.get(ms(v.desde));
    const x2 = porMs.get(ms(v.hasta));
    return x1 && x2 ? [{ x1, x2 }] : [];
  });
}

/** Duración legible: minutos, horas o días. */
export function duracionLegible(minutos: number): { valor: number; unidad: 'min' | 'h' | 'd' } {
  if (minutos < 120) return { valor: minutos, unidad: 'min' };
  if (minutos < 48 * 60) return { valor: Math.round((minutos / 60) * 10) / 10, unidad: 'h' };
  return { valor: Math.round((minutos / 1440) * 10) / 10, unidad: 'd' };
}
