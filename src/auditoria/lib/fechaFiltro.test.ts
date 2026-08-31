import { describe, expect, it } from 'vitest';
import { aInstanteUtc } from './fechaFiltro';

describe('aInstanteUtc', () => {
  it('convierte el valor local de datetime-local al instante UTC', () => {
    // El test corre con la TZ del entorno: comparamos contra el mismo cálculo
    // en vez de contra un literal, para no atarlo a una zona concreta.
    const local = '2026-01-01T00:00';
    expect(aInstanteUtc(local)).toBe(new Date(2026, 0, 1, 0, 0).toISOString());
  });

  it('deja igual un valor que ya viene en UTC', () => {
    expect(aInstanteUtc('2026-01-01T05:00:00.000Z')).toBe('2026-01-01T05:00:00.000Z');
  });

  it('descarta una fecha inválida en vez de enviarla', () => {
    expect(aInstanteUtc('no-es-fecha')).toBeUndefined();
  });
});
