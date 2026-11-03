// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-05 RF-59: combinaciones de filtros válidas del historial, para no dejar armar las que el backend rechaza |

/**
 * Filtros del historial de telemetría (RF-59), con los nombres que usa el backend
 * en la Restricción 12. El rango de fechas siempre va y no cuenta aquí.
 */
export type FiltroHistorial =
  | 'tipo_variable' | 'categoria_variable' | 'id_unidad_productiva' | 'especie'
  | 'estado_dato' | 'origen_dato' | 'sensor_id' | 'id_activo_biologico';

/**
 * Copia de `COMBINACIONES_FILTROS_VALIDAS` del backend
 * (`sgpmp-backend/src/telemetry/domain/entities/monitoreo.py`), que sale de la
 * regla 12 de RF-59. Si el backend cambia la tabla, cambiarla aquí también: la
 * prueba `combinacionesHistorial.test.ts` recorre cada fila.
 */
export const COMBINACIONES_VALIDAS: readonly (readonly FiltroHistorial[])[] = [
  [],
  ['tipo_variable'],
  ['categoria_variable'],
  ['estado_dato'],
  ['origen_dato'],
  ['sensor_id'],
  ['id_unidad_productiva'],
  ['especie'],
  ['tipo_variable', 'id_unidad_productiva'],
  ['tipo_variable', 'especie'],
  ['sensor_id', 'estado_dato'],
  ['categoria_variable', 'id_unidad_productiva'],
  ['id_activo_biologico'],
];

const contiene = (combo: readonly FiltroHistorial[], filtros: Iterable<FiltroHistorial>) =>
  [...filtros].every((f) => combo.includes(f));

/** ¿El backend acepta exactamente estos filtros juntos? */
export function combinacionValida(elegidos: ReadonlySet<FiltroHistorial>): boolean {
  return COMBINACIONES_VALIDAS.some((c) => c.length === elegidos.size && contiene(c, elegidos));
}

/**
 * ¿Se puede sumar `filtro` a lo ya elegido sin salirse de la tabla? Un filtro ya
 * elegido siempre se puede seguir usando (para cambiarlo o quitarlo).
 */
export function filtroPermitido(filtro: FiltroHistorial, elegidos: ReadonlySet<FiltroHistorial>): boolean {
  if (elegidos.has(filtro)) return true;
  return COMBINACIONES_VALIDAS.some((c) => contiene(c, [...elegidos, filtro]));
}

/**
 * Con qué filtros (de los que ofrece la pantalla) todavía se puede combinar lo
 * elegido. Vacío = lo elegido no admite ningún otro filtro de la pantalla.
 */
export function companerosPosibles(
  elegidos: ReadonlySet<FiltroHistorial>,
  enPantalla: readonly FiltroHistorial[],
): FiltroHistorial[] {
  return enPantalla.filter((f) => !elegidos.has(f) && filtroPermitido(f, elegidos));
}
