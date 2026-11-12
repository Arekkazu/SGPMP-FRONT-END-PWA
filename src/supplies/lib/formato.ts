// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: formato de montos y cantidades del backend (Decimal) |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 B-01 RF-77/90: porcentajes y meses con el formato del idioma |
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

/** Porcentaje ya multiplicado por 100 (`70.6` → «70,6 %»), con el separador del idioma activo. */
export function formatoPorcentaje(valor: string | number | null | undefined, maxDecimales = 1): string {
  const n = numero(valor);
  if (n === null) return '—';
  return new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: maxDecimales }).format(n / 100);
}

/** Rótulo de un período del backend: «2026-10» → «octubre de 2026»; un día → su fecha; lo demás, tal cual. */
export function formatoEtiquetaPeriodo(etiqueta: string): string {
  if (/^\d{4}-\d{2}$/.test(etiqueta)) {
    return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(`${etiqueta}-01T00:00:00`));
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(etiqueta) ? formatoFecha(etiqueta) : etiqueta;
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
