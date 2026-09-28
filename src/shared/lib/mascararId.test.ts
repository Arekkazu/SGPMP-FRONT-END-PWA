import { describe, it, expect } from 'vitest';
import { mascararId } from './mascararId';

describe('mascararId', () => {
  it('muestra los primeros 4 caracteres y oculta el resto', () => {
    expect(mascararId('1234567890')).toBe('1234••••••');
  });

  it('devuelve el valor completo cuando tiene 4 caracteres o menos', () => {
    expect(mascararId('1234')).toBe('1234');
    expect(mascararId('12')).toBe('12');
    expect(mascararId('')).toBe('');
  });

  it('no revela los últimos dígitos de la identificación', () => {
    const enmascarado = mascararId('999912345678');
    expect(enmascarado).toBe('9999••••••');
    expect(enmascarado).not.toContain('5678');
  });
});
