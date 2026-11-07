// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-04 RF-60: segundos legibles (antes en camarasMock) |
import { formatearNumero } from '../../shared/i18n/formato';

/** 300 → "5 min", 22500 → "6,3 h", 45 → "45 s". */
export function formatoSegundos(s: number): string {
  if (s >= 3600) return `${formatearNumero(s / 3600, { maximumFractionDigits: 1 })} h`;
  if (s >= 60) return `${formatearNumero(s / 60, { maximumFractionDigits: 1 })} min`;
  return `${formatearNumero(s)} s`;
}
