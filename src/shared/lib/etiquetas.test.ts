// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-22: un texto legible queda igual |
import { describe, expect, it } from 'vitest';
import { humanizar } from './etiquetas';

describe('humanizar', () => {
  it('convierte snake_case y MAYÚSCULAS en texto legible', () => {
    expect(humanizar('peso_destete')).toBe('Peso destete');
    expect(humanizar('FASE_PRODUCTIVA')).toBe('Fase productiva');
  });
  it('T-22: un texto que ya es legible queda igual', () => {
    expect(humanizar('pH del agua')).toBe('pH del agua');
    expect(humanizar('MONOCODIGO')).toBe('Monocodigo');
  });
  it('vacío → guion', () => {
    expect(humanizar(null)).toBe('—');
  });
});
