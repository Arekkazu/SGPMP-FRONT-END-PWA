import { describe, expect, it } from 'vitest';
import { numeroModulo } from './useNombreModulo';

describe('numeroModulo', () => {
  it('reconoce todas las formas en que el backend escribe un módulo', () => {
    for (const v of ['MODULO1', 'Modulo 1', 'modulo1', 'M01', 'M1', 'Módulo 1', ' m001 ']) {
      expect(numeroModulo(v)).toBe(1);
    }
    expect(numeroModulo('Modulo 9')).toBe(9);
  });

  it('deja pasar lo que no es un código de módulo', () => {
    for (const v of ['RF-38', 'modulo10', 'M0', 'auth', '', null, undefined]) {
      expect(numeroModulo(v)).toBeNull();
    }
  });
});
