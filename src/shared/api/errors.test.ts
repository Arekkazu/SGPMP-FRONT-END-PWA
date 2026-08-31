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

  // El backend siempre acompaña sus errores con `message` (app_error_handler),
  // así que estos fallbacks por status solo aplican a respuestas sin cuerpo:
  // un 429 del proxy inverso o un 410 servido por la CDN.
  it('explica un 410 sin cuerpo como enlace o token expirado', () => {
    const err = mapToApiError(axiosError(410, undefined));
    expect(err.status).toBe(410);
    expect(err.code).toBe('HTTP_410');
    expect(err.message).toBe('El enlace o token ha expirado. Solicita uno nuevo e intenta nuevamente.');
  });

  it('explica un 429 sin cuerpo como exceso de solicitudes', () => {
    const err = mapToApiError(axiosError(429, undefined));
    expect(err.message).toBe(
      'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.'
    );
  });

  it('conserva el mensaje del rate limit de recuperación, que el backend envía como 422', () => {
    const err = mapToApiError(
      axiosError(422, {
        error_code: 'LIMITE_SOLICITUDES_EXCEDIDO',
        message: 'Límite de solicitudes excedido para su conexión. Podrá intentarlo de nuevo a las 15:30:00.',
        fields: [],
      })
    );
    expect(err.code).toBe('LIMITE_SOLICITUDES_EXCEDIDO');
    expect(err.message).toBe(
      'Límite de solicitudes excedido para su conexión. Podrá intentarlo de nuevo a las 15:30:00.'
    );
  });

  it('mantiene el fallback genérico para un 422 sin mensaje', () => {
    const err = mapToApiError(axiosError(422, { error_code: 'REGLA_NEGOCIO', fields: [] }));
    expect(err.message).toBe('Los datos no cumplen las reglas de negocio.');
  });
});
