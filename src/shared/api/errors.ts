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

export function mapToApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;

  const code = (data?.error_code as string) ?? (data?.code as string) ?? (data?.detail as string) ?? `HTTP_${status}`;
  const fields = data?.fields as BackendFieldError[] | undefined;
  const message = resolveMessage(status, data, fields);
  const field = fields?.[0]?.field ?? (data?.field as string | undefined);

  return { code, message, field, status };
}

function stripPydanticPrefix(msg: string): string {
  return msg.startsWith('Value error, ') ? msg.slice('Value error, '.length) : msg;
}

// Mensajes por defecto de Pydantic que llegan en inglés; los de nuestros
// field_validator ya vienen en español.
const PYDANTIC_ES: Record<string, string> = {
  'Field required': 'Campo obligatorio.',
};

function describeField({ field, message }: BackendFieldError): string {
  const msg = PYDANTIC_ES[message] ?? stripPydanticPrefix(message);
  if (!field) return msg;
  const label = field.replace(/_/g, ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${msg}`;
}

function resolveMessage(status: number, data?: Record<string, unknown>, fields?: BackendFieldError[]): string {
  const detalles = fields?.filter((f) => f.message).map(describeField) ?? [];
  if (detalles.length) return detalles.join(' · ');
  if (data?.message) return data.message as string;
  if (data?.detail && typeof data.detail === 'string') return data.detail;

  switch (status) {
    case 400: return 'Solicitud inválida. Verifica los datos ingresados.';
    case 401: return 'Sesión expirada. Por favor inicia sesión nuevamente.';
    case 403: return 'No tienes permisos para realizar esta acción.';
    case 404: return 'El recurso solicitado no fue encontrado.';
    case 409: return 'Ya existe un registro con los mismos datos.';
    case 412: return 'Los datos fueron modificados por otro usuario. Recarga e intenta de nuevo.';
    case 422: return 'Los datos no cumplen las reglas de negocio.';
    default:  return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}
