// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-03: el activo se toma de la opción elegida o del ID escrito |
import { describe, expect, it } from 'vitest';
import { idDeTextoActivo } from './CamposVinculacion';

describe('idDeTextoActivo', () => {
  it('lee el ID de la opción elegida o del número escrito', () => {
    expect(idDeTextoActivo('BOV-101 (#876)')).toBe(876);
    expect(idDeTextoActivo('876')).toBe(876);
    expect(idDeTextoActivo('#876')).toBe(876);
    expect(idDeTextoActivo('BOV-101')).toBeNaN();
    expect(idDeTextoActivo('')).toBeNaN();
  });
});
