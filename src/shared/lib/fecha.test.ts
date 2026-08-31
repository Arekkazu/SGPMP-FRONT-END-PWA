import { describe, expect, it } from 'vitest';
import {
  aInstanteUtc,
  diasAtrasLocal,
  finDelDiaUtc,
  hoyLocal,
  inicioDelDiaUtc,
} from './fecha';

// Los tests se comparan contra el mismo cálculo en vez de contra literales, para
// que no queden atados a la zona horaria en la que corran.
describe('aInstanteUtc', () => {
  it('convierte el valor local de datetime-local al instante UTC', () => {
    expect(aInstanteUtc('2026-01-01T00:00')).toBe(new Date(2026, 0, 1, 0, 0).toISOString());
  });

  it('deja igual un valor que ya viene en UTC', () => {
    expect(aInstanteUtc('2026-01-01T05:00:00.000Z')).toBe('2026-01-01T05:00:00.000Z');
  });

  it('descarta una fecha inválida en vez de enviarla', () => {
    expect(aInstanteUtc('no-es-fecha')).toBeUndefined();
  });
});

describe('inicioDelDiaUtc / finDelDiaUtc', () => {
  it('toman el día calendario del usuario, no el día UTC', () => {
    expect(inicioDelDiaUtc('2026-01-01')).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).toISOString());
    expect(finDelDiaUtc('2026-01-01')).toBe(new Date(2026, 0, 1, 23, 59, 59, 999).toISOString());
  });

  it('el rango cubre exactamente 24 horas', () => {
    const inicio = new Date(inicioDelDiaUtc('2026-06-15')!).getTime();
    const fin = new Date(finDelDiaUtc('2026-06-15')!).getTime();
    expect(fin - inicio).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('descarta una fecha inválida', () => {
    expect(inicioDelDiaUtc('')).toBeUndefined();
    expect(finDelDiaUtc('nope')).toBeUndefined();
  });
});

describe('hoyLocal', () => {
  it('devuelve el día calendario local, no el UTC', () => {
    const ahora = new Date();
    const esperado = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0'),
    ].join('-');
    expect(hoyLocal()).toBe(esperado);
  });

  it('no adelanta un día para una hora nocturna al oeste de UTC', () => {
    // 2026-01-01 22:00 hora local: toISOString() daría el día 2 en UTC-5.
    expect(hoyLocal(new Date(2026, 0, 1, 22, 0))).toBe('2026-01-01');
  });
});

describe('diasAtrasLocal', () => {
  it('retrocede en el calendario local', () => {
    expect(diasAtrasLocal(0)).toBe(hoyLocal());
    const hace7 = new Date();
    hace7.setDate(hace7.getDate() - 7);
    expect(diasAtrasLocal(7)).toBe(hoyLocal(hace7));
  });
});
