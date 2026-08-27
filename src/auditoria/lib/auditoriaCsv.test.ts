import { describe, expect, it } from 'vitest';
import type { AuditoriaItemResponse } from '../types';
import { generarCsv } from './auditoriaCsv';

function evento(overrides: Partial<AuditoriaItemResponse> = {}): AuditoriaItemResponse {
  return {
    id_evento: 1,
    tipo_evento: 1,
    fecha_evento: '2026-01-01T00:00:00Z',
    modulo: 'IDENTITY_ACCESS',
    resultado: 'EXITOSO',
    detalle: null,
    id_usuario: 7,
    categoria: 'AUTENTICACION',
    estado: 'ACTIVO',
    integridad_ok: true,
    ...overrides,
  };
}

describe('generarCsv', () => {
  it('incluye BOM, usa CRLF y escapa comas, comillas y saltos de línea', () => {
    const csv = generarCsv([
      evento({
        nombre_usuario: 'Ramírez, Leandro',
        descripcion: 'Intento "fallido"\nrevisado',
      }),
    ], [{ id: 1, label: 'LOGIN_SUCCESS' }]);

    expect(csv.startsWith('\uFEFFID,Usuario,Tipo evento')).toBe(true);
    expect(csv).toContain('"Ramírez, Leandro"');
    expect(csv).toContain('"Intento ""fallido""\nrevisado"');
    expect(csv).toContain('\r\n1,');
    expect(csv).toContain(',LOGIN_SUCCESS,');
  });
});
