import { describe, expect, it } from 'vitest';
import { FECHA_NUMERICA, formatearFecha } from './formato';

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
