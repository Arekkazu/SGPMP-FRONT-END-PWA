// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: pruebas del formato de montos, fechas y decimales |
import { describe, expect, it } from 'vitest';
import { decimalPositivo, formatoCantidad, formatoFecha, formatoMoneda } from './formato';

describe('formato de M05', () => {
  it('normaliza decimales positivos con coma o punto y rechaza cero, negativos y texto', () => {
    expect(decimalPositivo('12,5')).toBe('12.5');
    expect(decimalPositivo(' 3 ')).toBe('3');
    expect(decimalPositivo('0')).toBeNull();
    expect(decimalPositivo('-1')).toBeNull();
    expect(decimalPositivo('1e3')).toBeNull();
    expect(decimalPositivo('')).toBeNull();
  });

  it('muestra guion cuando el backend no envía valor', () => {
    expect(formatoMoneda(null)).toBe('—');
    expect(formatoCantidad(undefined)).toBe('—');
    expect(formatoFecha(null)).toBe('—');
  });

  it('formatea el Decimal recibido como texto', () => {
    expect(formatoMoneda('1500.5')).toMatch(/1[.,]500/);
    expect(formatoCantidad('2.12345')).toMatch(/2[.,]123/);
  });

  it('un día suelto conserva su fecha local (no retrocede por UTC)', () => {
    expect(formatoFecha('2026-10-23')).toMatch(/23/);
  });
});
