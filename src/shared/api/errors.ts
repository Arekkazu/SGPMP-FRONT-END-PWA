import type { AxiosError } from 'axios';

import i18n from '../i18n';

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
  const message = traducirPorCodigo(code, resolveMessage(status, data, fields));
  const field = fields?.[0]?.field ?? (data?.field as string | undefined);

  return { code, message, field, status };
}

function stripPydanticPrefix(msg: string): string {
  return msg.startsWith('Value error, ') ? msg.slice('Value error, '.length) : msg;
}

/**
 * Traduccion de errores del backend (RF-29).
 *
 * El backend no traduce: responde siempre en espanol, pero acompaña cada error
 * con un `error_code` estable. Ese codigo es la clave de traduccion, y el
 * `message` del backend es el `defaultValue`. Un codigo que todavia no este en
 * el catalogo se renderiza en espanol, que es exactamente el fallback que pide
 * el RF ("los elementos sin traduccion disponible se muestran en espanol").
 *
 * Por eso no hace falta ningun motor de i18n en el backend ni externalizar los
 * mensajes de los nueve modulos.
 */
function traducirPorCodigo(code: string | undefined, mensajeBackend: string): string {
  // `HTTP_<status>` no es un codigo del backend: lo sintetiza `mapToApiError`
  // cuando la respuesta no trae cuerpo. Buscarlo en el catalogo solo produciria
  // avisos de clave faltante por algo que nunca va a estar ahi; el texto de esos
  // casos ya sale traducido de `mensajePorStatus`.
  if (!code || code.startsWith('HTTP_')) return mensajeBackend;
  return i18n.t(`errores.por_codigo.${code}`, {
    ns: 'common',
    defaultValue: mensajeBackend,
  });
}

/** Texto por status HTTP, traducido; cae al espanol si falta la clave. */
function mensajePorStatus(status: number, porDefecto: string): string {
  return i18n.t(`errores.por_status.${status}`, { ns: 'common', defaultValue: porDefecto });
}

// Mensajes por defecto de Pydantic que llegan en inglés; los de nuestros
// field_validator ya vienen en español.
const PYDANTIC_ES: Record<string, string> = {
  'Field required': 'validacion.campo_obligatorio',
};

function describeField({ field, message }: BackendFieldError): string {
  const clave = PYDANTIC_ES[message];
  const msg = clave
    ? i18n.t(clave, { ns: 'common', defaultValue: 'Campo obligatorio.' })
    : stripPydanticPrefix(message);
  if (!field) return msg;
  const label = field.replace(/_/g, ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${msg}`;
}

function resolveMessage(status: number, data?: Record<string, unknown>, fields?: BackendFieldError[]): string {
  // Los errores de dominio (app_error_handler) repiten su `message` dentro de
  // `fields[0].message`. Anteponerle la etiqueta del campo produce ruido del
  // tipo "Captcha token: Validación de seguridad fallida…", así que esas
  // entradas se descartan y gana el `message` de arriba. Las de Pydantic
  // (`VAL_ENTRADA`) traen un texto distinto y corto, y sí necesitan la etiqueta.
  const detalles =
    fields?.filter((f) => f.message && f.message !== data?.message).map(describeField) ?? [];
  if (detalles.length) return detalles.join(' · ');
  if (data?.message) return data.message as string;
  if (data?.detail && typeof data.detail === 'string') return data.detail;

  switch (status) {
    case 400: return mensajePorStatus(400, 'Solicitud inválida. Verifica los datos ingresados.');
    case 401: return mensajePorStatus(401, 'Sesión expirada. Por favor inicia sesión nuevamente.');
    case 403: return mensajePorStatus(403, 'No tienes permisos para realizar esta acción.');
    case 404: return mensajePorStatus(404, 'El recurso solicitado no fue encontrado.');
    case 409: return mensajePorStatus(409, 'Ya existe un registro con los mismos datos.');
    case 410: return mensajePorStatus(410, 'El enlace o token ha expirado. Solicita uno nuevo e intenta nuevamente.');
    case 412: return mensajePorStatus(412, 'Los datos fueron modificados por otro usuario. Recarga e intenta de nuevo.');
    case 422: return mensajePorStatus(422, 'Los datos no cumplen las reglas de negocio.');
    case 423: return mensajePorStatus(423, 'Acceso bloqueado temporalmente por seguridad. Intenta nuevamente en unos minutos.');
    case 429: return mensajePorStatus(429, 'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.');
    default:  return i18n.t('errores.generico', { ns: 'common', defaultValue: 'Ocurrió un error inesperado. Intenta nuevamente.' });
  }
}
