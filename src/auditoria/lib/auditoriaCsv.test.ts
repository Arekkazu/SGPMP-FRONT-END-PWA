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
    integridad: 'INTEGRO',
    ...overrides,
  };
}

describe('generarCsv', () => {
  it('incluye BOM, usa CRLF y escapa comas, comillas y saltos de línea', () => {
    const csv = generarCsv([
      evento({
        direccion_ip: '10.0.0.7',
        nombre_usuario: 'Ramírez, Leandro',
        descripcion: 'Intento "fallido"\nrevisado',
      }),
    ], [{ id: 1, label: 'REGISTRO_USUARIO' }]);

    expect(csv.startsWith('\uFEFFID,Usuario,Tipo evento')).toBe(true);
    expect(csv).toContain('"Ramírez, Leandro"');
    expect(csv).toContain('"Intento ""fallido""\nrevisado"');
    expect(csv).toContain('\r\n1,');
    expect(csv).toContain(',REGISTRO_USUARIO,');
    expect(csv).toContain(',10.0.0.7,');
    expect(csv.trimEnd().endsWith(',INTEGRO')).toBe(true);
  });
});
