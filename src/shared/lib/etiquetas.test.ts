import { describe, expect, it } from 'vitest';
import { humanizar } from './etiquetas';

describe('humanizar', () => {
  it('convierte snake_case y MAYÚSCULAS en texto legible', () => {
    expect(humanizar('peso_destete')).toBe('Peso destete');
    expect(humanizar('FASE_PRODUCTIVA')).toBe('Fase productiva');
  });
  it('vacío → guion', () => {
    expect(humanizar(null)).toBe('—');
  });
});
