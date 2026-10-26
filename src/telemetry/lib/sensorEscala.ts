// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-11: el último dato muestra el día cuando no es de hoy |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-22: un solo formato de fecha y hora en M03 |
import type { GaugeStatus } from '../../shared/design-system/Gauge';
import { formatearFechaHora, formatearHora, formatearNumero } from '../../shared/i18n/formato';
import { diaLocal, hoyLocal } from '../../shared/lib/fecha';

/** Mapea el semáforo del backend al estado de color del Gauge. */
export function semaforoToGauge(estado: string | null | undefined): GaugeStatus {
  switch ((estado ?? '').toUpperCase()) {
    case 'VERDE': return 'ok';
    case 'AMARILLO': return 'warning';
    case 'ROJO': return 'critical';
    default: return 'placeholder';
  }
}

/**
 * Escala nominal por tipo de variable para el Gauge.
 * ⚠️ El dashboard NO expone el rango operativo real por sensor — esta escala
 * es aproximada, solo para la proporción visual. El color (semáforo) es la
 * fuente de verdad del estado. Ver "Cosas faltantes" en TASKS.md.
 */
export function escalaNominal(tipoVariable: string | null | undefined): { min: number; max: number } {
  const v = (tipoVariable ?? '').toUpperCase();
  if (v.includes('HUMEDAD')) return { min: 0, max: 100 };
  if (v.includes('TEMPERATURA') && v.includes('CORPORAL')) return { min: 30, max: 45 };
  if (v.includes('TEMPERATURA')) return { min: 0, max: 50 };
  if (v.includes('CO2')) return { min: 0, max: 2000 };
  if (v.includes('NH3') || v.includes('AMONIAC')) return { min: 0, max: 100 };
  if (v.includes('PH')) return { min: 0, max: 14 };
  if (v.includes('OXIGENO') || v.includes('OXÍGENO')) return { min: 0, max: 15 };
  if (v.includes('CARDIAC')) return { min: 0, max: 200 };
  if (v.includes('RESPIRATORI')) return { min: 0, max: 100 };
  return { min: 0, max: 100 };
}

/**
 * Valor de una lectura con su unidad (T-22): máximo 2 decimales y el separador
 * del idioma activo. Antes salía tal cual del backend ("11.8300 mg/L") y en otra
 * pantalla con coma.
 */
export function valorConUnidad(valor: number | string | null | undefined, unidad?: string | null): string {
  if (valor == null || valor === '') return '—';
  const n = formatearNumero(valor, { maximumFractionDigits: 2 });
  return unidad ? `${n} ${unidad}` : n;
}

/** Hora legible (HH:MM:SS) de un timestamp ISO. */
export function horaCaptura(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 19) || '—';
  return formatearHora(d, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Momento del último dato de un sensor o área (M3-11): solo la hora si es de hoy;
 * si no, también el día. "último dato 11:48 a. m." escondía que el dato tenía días.
 */
export function momentoCaptura(iso: string | null | undefined): string {
  if (!iso) return '—';
  if (diaLocal(iso) === hoyLocal()) return horaCaptura(iso);
  return formatearFechaHora(iso);
}

/**
 * Fecha y hora local de un instante. T-22: había tres formatos ("2026-10-25 09:29 p. m.",
 * "22 de oct, 03:18 p. m.", "25/10/26, 9:16 p. m."); ahora es el de la app, el mismo
 * de la auditoría de M04.
 */
export function fechaHoraCaptura(iso: string | null | undefined): string {
  return formatearFechaHora(iso);
}

/** "hace N min/s" a partir de minutos sin reporte. */
export function sinReporte(min: number | null | undefined): string {
  if (min == null) return '—';
  if (min < 1) return 'hace segundos';
  if (min < 60) return `hace ${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${Math.round(min % 60)} min`;
}
