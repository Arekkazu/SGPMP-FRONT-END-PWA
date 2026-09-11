/**
 * Normalización de fechas de filtro antes de enviarlas al backend.
 *
 * El problema es siempre el mismo: los `<input type="date">` y
 * `<input type="datetime-local">` producen valores **sin zona horaria**, y el
 * backend los compara contra columnas `timestamptz`. Un valor naive se
 * interpreta en la zona del *servidor*, no en la del usuario, así que el rango
 * queda corrido — mientras las tablas muestran las mismas filas en hora local.
 *
 * `new Date()` no ayuda de forma uniforme, y ahí está la trampa: según ECMA-262
 * la forma con hora se parsea en **local** y la de solo fecha en **UTC**.
 *
 *     new Date('2026-01-01T00:00')  // medianoche local
 *     new Date('2026-01-01')        // medianoche UTC
 *
 * Por eso hacen falta funciones distintas y no una sola: pasarle un
 * `YYYY-MM-DD` a `aInstanteUtc` no arregla nada, devuelve el mismo string que ya
 * se estaba enviando.
 */

/**
 * Instante UTC de un valor de `<input type="datetime-local">` (`2026-01-01T00:00`).
 *
 * Idempotente sobre un valor que ya venga en UTC, y devuelve `undefined` si la
 * fecha no es válida para que el filtro se omita en vez de viajar corrupto.
 */
export function aInstanteUtc(valor: string): string | undefined {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/**
 * Comienzo del día **local** de un `<input type="date">` (`2026-01-01`), en UTC.
 *
 * La `T00:00:00` sin `Z` es todo el arreglo: fuerza el parseo en hora local. Con
 * `Z` se estaría tratando el día calendario del usuario como un día UTC, que en
 * UTC-5 corre la ventana cinco horas.
 */
export function inicioDelDiaUtc(valor: string): string | undefined {
  const fecha = new Date(`${valor}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/** Fin del día local (23:59:59.999) de un `<input type="date">`, en UTC. */
export function finDelDiaUtc(valor: string): string | undefined {
  const fecha = new Date(`${valor}T23:59:59.999`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/**
 * Día calendario local en formato `YYYY-MM-DD`, para `value`/`max` de inputs.
 *
 * `new Date().toISOString().slice(0, 10)` —el patrón que estaba repetido por el
 * proyecto— devuelve el día de *mañana* para cualquier usuario al oeste de UTC
 * después de las 19:00 hora local.
 */
export function hoyLocal(fecha: Date = new Date()): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Día calendario local de hace `dias` días, en formato `YYYY-MM-DD`. */
export function diasAtrasLocal(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return hoyLocal(fecha);
}
