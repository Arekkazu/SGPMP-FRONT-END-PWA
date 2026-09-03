import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
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

  it('no antepone la etiqueta cuando el campo solo repite el message del backend', () => {
    const err = mapToApiError(
      axiosError(400, {
        error_code: 'CAPTCHA_INVALIDO',
        message: 'Validación de seguridad fallida. Confirme que no es un robot.',
        fields: [
          {
            field: 'captcha_token',
            message: 'Validación de seguridad fallida. Confirme que no es un robot.',
          },
        ],
      })
    );

    expect(err.message).toBe('Validación de seguridad fallida. Confirme que no es un robot.');
    // El campo sigue disponible para resaltar el input; solo se omite del texto.
    expect(err.field).toBe('captcha_token');
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

  it('explica un 423 sin cuerpo como bloqueo temporal', () => {
    const err = mapToApiError(axiosError(423, undefined));
    expect(err.message).toBe(
      'Acceso bloqueado temporalmente por seguridad. Intenta nuevamente en unos minutos.'
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

  // ── RF-29: traducción de errores por código ───────────────────────────────
  //
  // El backend no traduce: responde siempre en español y acompaña cada error
  // con un `error_code` estable. El frontend traduce por ese código y cae al
  // `message` del backend cuando el código no está catalogado — que es la regla
  // de fallback que pide el RF, sin motor de i18n en el backend.

  it('traduce por error_code cuando el codigo esta catalogado', async () => {
    await i18n.changeLanguage('en-US');
    const err = mapToApiError(
      axiosError(400, {
        error_code: 'IDIOMA_NO_DISPONIBLE',
        message: "Idioma no disponible: El código de cultura 'fr-FR' no está soportado actualmente.",
        fields: [],
      })
    );
    expect(err.code).toBe('IDIOMA_NO_DISPONIBLE');
    expect(err.message).toContain('Language unavailable');
    await i18n.changeLanguage('es-CO');
  });

  it('cae al message en espanol del backend cuando el codigo no esta catalogado', async () => {
    await i18n.changeLanguage('en-US');
    const err = mapToApiError(
      axiosError(422, {
        error_code: 'CODIGO_DE_UN_MODULO_NUEVO',
        message: 'Mensaje que el catálogo todavía no cubre.',
        fields: [],
      })
    );
    expect(err.message).toBe('Mensaje que el catálogo todavía no cubre.');
    await i18n.changeLanguage('es-CO');
  });

  it('traduce tambien la tabla por status cuando la respuesta no trae cuerpo', async () => {
    await i18n.changeLanguage('en-US');
    expect(mapToApiError(axiosError(403, undefined)).message).toBe(
      'You do not have permission to perform this action.'
    );
    await i18n.changeLanguage('es-CO');
  });
});
