// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M3-10: tiempo relativo para listas |
import { describe, expect, it } from 'vitest';
import { FECHA_NUMERICA, formatearFecha, formatearRelativo } from './formato';

describe('formatearFecha', () => {
  it('#300: un YYYY-MM-DD es un día local, no la medianoche UTC del día anterior', () => {
    expect(formatearFecha('2026-10-07', FECHA_NUMERICA)).toBe(
      new Date(2026, 9, 7).toLocaleDateString('es-CO', FECHA_NUMERICA),
    );
  });

  it('un instante ISO se muestra en hora local', () => {
    const iso = '2026-10-08T01:45:00Z';
    expect(formatearFecha(iso, FECHA_NUMERICA)).toBe(new Date(iso).toLocaleDateString('es-CO', FECHA_NUMERICA));
  });
});

describe('formatearRelativo (M3-10)', () => {
  const ahora = Date.parse('2026-10-25T21:00:00Z');
  it('dice cuánto hace en la unidad más grande que cabe', () => {
    expect(formatearRelativo('2026-10-25T20:48:00Z', ahora)).toBe('hace 12 minutos');
    expect(formatearRelativo('2026-10-22T21:00:00Z', ahora)).toBe('hace 3 días');
    expect(formatearRelativo('2026-10-25T20:59:40Z', ahora)).toBe('este minuto');
    expect(formatearRelativo(null, ahora)).toBe('—');
  });
});
