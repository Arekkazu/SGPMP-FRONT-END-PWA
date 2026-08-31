/**
 * Normaliza un valor de filtro de fecha al instante UTC equivalente.
 *
 * `<input type="datetime-local">` produce `2026-01-01T00:00`, sin zona. El
 * backend lo recibe como un datetime naive y lo compara contra `fecha_evento`,
 * que es `timestamptz`: Postgres lo interpretaría en la zona de la sesión del
 * servidor, no en la del usuario, y el rango quedaría corrido. `new Date()` sí
 * lo parsea como hora local, así que `toISOString()` da el instante correcto.
 *
 * Es idempotente sobre un valor que ya venga en UTC (el corte que arma la
 * exportación), y devuelve `undefined` si la fecha no es válida para que el
 * filtro se omita en vez de viajar corrupto.
 */
export function aInstanteUtc(valor: string): string | undefined {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}
