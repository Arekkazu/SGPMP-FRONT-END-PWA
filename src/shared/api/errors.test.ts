import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { mapToApiError } from './errors';

function createAxiosError(status: number, data?: Record<string, unknown>): AxiosError {
  return { response: { status, data } } as AxiosError;
}

describe('mapToApiError', () => {
  it('muestra un mensaje claro para un token expirado sin mensaje del backend', () => {
    const result = mapToApiError(createAxiosError(410, { error_code: 'TOKEN_EXPIRADO' }));

    expect(result).toMatchObject({
      code: 'TOKEN_EXPIRADO',
      status: 410,
      message: 'El enlace o token ha expirado. Solicita uno nuevo e intenta nuevamente.',
    });
  });

  it('mapea HTTP 429 como exceso de solicitudes', () => {
    const result = mapToApiError(createAxiosError(429));

    expect(result.status).toBe(429);
    expect(result.message).toBe(
      'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.'
    );
  });

  it('reconoce el rate limit de recuperación aunque el backend responda 422', () => {
    const result = mapToApiError(createAxiosError(422, {
      error_code: 'LIMITE_SOLICITUDES_EXCEDIDO',
    }));

    expect(result.code).toBe('LIMITE_SOLICITUDES_EXCEDIDO');
    expect(result.status).toBe(422);
    expect(result.message).toBe(
      'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.'
    );
  });

  it('conserva el mensaje específico enviado por el backend', () => {
    const result = mapToApiError(createAxiosError(422, {
      error_code: 'LIMITE_SOLICITUDES_EXCEDIDO',
      message: 'Podrás intentarlo nuevamente a las 15:30:00.',
    }));

    expect(result.message).toBe('Podrás intentarlo nuevamente a las 15:30:00.');
  });

  it('mantiene el fallback existente para otros errores 422', () => {
    const result = mapToApiError(createAxiosError(422, {
      error_code: 'REGLA_NEGOCIO',
    }));

    expect(result.message).toBe('Los datos no cumplen las reglas de negocio.');
  });
});
