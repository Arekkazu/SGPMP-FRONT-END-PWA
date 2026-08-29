import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import { mapToApiError } from './errors';

function axiosError(status: number, data: unknown): AxiosError {
  return { response: { status, data } } as AxiosError;
}

describe('mapToApiError', () => {
  it('nombra los campos que fallaron en vez de un "Field required" suelto', () => {
    const err = mapToApiError(
      axiosError(400, {
        error_code: 'VAL_ENTRADA',
        message: 'Errores de validacion en la solicitud',
        fields: [
          { field: 'confirmar_contrasena', message: 'Field required' },
          { field: 'numero_identificacion', message: 'Value error, Solo dígitos.' },
        ],
      })
    );

    expect(err.message).toBe(
      'Confirmar contrasena: Campo obligatorio. · Numero identificacion: Solo dígitos.'
    );
    expect(err.code).toBe('VAL_ENTRADA');
    expect(err.field).toBe('confirmar_contrasena');
  });

  it('cae al message del backend cuando no hay fields', () => {
    const err = mapToApiError(
      axiosError(409, { error_code: 'CORREO_DUPLICADO', message: 'El correo ya existe.', fields: [] })
    );
    expect(err.message).toBe('El correo ya existe.');
  });
});
