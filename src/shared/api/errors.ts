import type { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  status: number;
}

interface BackendFieldError {
  field: string;
  message: string;
}

const RATE_LIMIT_CODES = new Set([
  'LIMITE_SOLICITUDES_EXCEDIDO',
]);

const TOKEN_EXPIRED_MESSAGE = 'El enlace o token ha expirado. Solicita uno nuevo e intenta nuevamente.';
const RATE_LIMIT_MESSAGE = 'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.';

export function mapToApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;

  const code = (data?.error_code as string) ?? (data?.code as string) ?? (data?.detail as string) ?? `HTTP_${status}`;
  const fields = data?.fields as BackendFieldError[] | undefined;
  const message = resolveMessage(status, code, data, fields);
  const field = fields?.[0]?.field ?? (data?.field as string | undefined);

  return { code, message, field, status };
}

function stripPydanticPrefix(msg: string): string {
  return msg.startsWith('Value error, ') ? msg.slice('Value error, '.length) : msg;
}

function resolveMessage(
  status: number,
  code: string,
  data?: Record<string, unknown>,
  fields?: BackendFieldError[]
): string {
  if (fields?.length && fields[0].message) return stripPydanticPrefix(fields[0].message);
  if (data?.message) return data.message as string;
  if (data?.detail && typeof data.detail === 'string') return data.detail;

  // El backend de recuperación actualmente reporta el rate limit como 422,
  // aunque el contrato HTTP lo documenta como 429. El código de negocio evita
  // confundir este caso con una validación ordinaria mientras se corrige allí.
  if (RATE_LIMIT_CODES.has(code)) return RATE_LIMIT_MESSAGE;

  switch (status) {
    case 400: return 'Solicitud inválida. Verifica los datos ingresados.';
    case 401: return 'Sesión expirada. Por favor inicia sesión nuevamente.';
    case 403: return 'No tienes permisos para realizar esta acción.';
    case 404: return 'El recurso solicitado no fue encontrado.';
    case 409: return 'Ya existe un registro con los mismos datos.';
    case 410: return TOKEN_EXPIRED_MESSAGE;
    case 412: return 'Los datos fueron modificados por otro usuario. Recarga e intenta de nuevo.';
    case 422: return 'Los datos no cumplen las reglas de negocio.';
    case 429: return RATE_LIMIT_MESSAGE;
    default:  return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}
