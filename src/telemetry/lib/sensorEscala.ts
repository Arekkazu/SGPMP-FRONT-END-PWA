import type { GaugeStatus } from '../../shared/design-system/Gauge';

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

/** Hora legible (HH:MM:SS) de un timestamp ISO. */
export function horaCaptura(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 19) || '—';
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** "hace N min/s" a partir de minutos sin reporte. */
export function sinReporte(min: number | null | undefined): string {
  if (min == null) return '—';
  if (min < 1) return 'hace segundos';
  if (min < 60) return `hace ${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${Math.round(min % 60)} min`;
}
