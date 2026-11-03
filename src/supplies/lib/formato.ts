// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: formato de montos y cantidades del backend (Decimal) |
import i18n from '../../shared/i18n';

/**
 * El backend envía los Decimal como texto. Se muestran con el separador del
 * idioma activo; nunca se suman en el cliente (los totales llegan calculados).
 */
function numero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function formatoMoneda(valor: string | number | null | undefined): string {
  const n = numero(valor);
  if (n === null) return '—';
  return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n);
}

export function formatoCantidad(valor: string | number | null | undefined, maxDecimales = 3): string {
  const n = numero(valor);
  if (n === null) return '—';
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: maxDecimales }).format(n);
}

/** "2026-10-23" o ISO → fecha corta local; texto vacío → "—". */
export function formatoFecha(valor: string | null | undefined, conHora = false): string {
  if (!valor) return '—';
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  // Un día suelto se interpreta en hora local: con `new Date('2026-10-23')` sería UTC y retrocede un día en Colombia.
  const fecha = soloDia ? new Date(`${valor}T00:00:00`) : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat(i18n.language, conHora && !soloDia
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(fecha);
}

/** Valida un decimal positivo escrito por el usuario ("12,5" o "12.5") y lo normaliza a "12.5". */
export function decimalPositivo(texto: string): string | null {
  const v = (texto ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(v) || Number(v) <= 0) return null;
  return v;
}
