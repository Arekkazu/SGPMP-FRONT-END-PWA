/**
 * Formateo de fechas y numeros segun el idioma activo (RF-29).
 *
 * Antes de esto habia mas de 30 llamadas a `toLocaleDateString('es-CO')` y
 * `toLocaleString('es-CO')` repartidas por el proyecto, con el locale quemado.
 * Cambiar el idioma dejaba las etiquetas en ingles y las fechas en formato
 * colombiano.
 *
 * Distinto de `shared/lib/fecha.ts`, que normaliza valores de `<input>` antes de
 * enviarlos al backend y no tiene nada que ver con presentacion.
 */
import i18n from './index';

function locale(): string {
  return i18n.language || 'es-CO';
}

/** dd/mm/aaaa en es-CO (mm/dd/aaaa en en-US): el formato que pide la UAT (T-05). */
export const FECHA_NUMERICA: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

/** Un `YYYY-MM-DD` sin hora es un día calendario, no un instante. */
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `null`/`undefined`/fecha invalida devuelven un guion, no "Invalid Date". */
export function formatearFecha(
  valor: string | number | Date | null | undefined,
  opciones: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  // `new Date('2026-10-07')` es la medianoche UTC: en UTC-5 se mostraba el 06/10.
  const fecha = valor instanceof Date
    ? valor
    : new Date(typeof valor === 'string' && SOLO_FECHA.test(valor) ? `${valor}T00:00:00` : valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString(locale(), opciones);
}

/** Fecha con hora, para tablas de auditoria y de telemetria. */
export function formatearFechaHora(
  valor: string | number | Date | null | undefined,
  opciones: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' },
): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString(locale(), opciones);
}

/** Solo la hora. */
export function formatearHora(
  valor: string | number | Date | null | undefined,
  opciones: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleTimeString(locale(), opciones);
}

/** Acepta texto porque los Decimal del backend llegan serializados ("2500.00"). */
export function formatearNumero(
  valor: number | string | null | undefined,
  opciones: Intl.NumberFormatOptions = {},
): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '—';
  return numero.toLocaleString(locale(), opciones);
}
