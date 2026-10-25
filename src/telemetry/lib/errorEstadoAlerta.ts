// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: distingue rechazos y fallos de conexión |
import i18n from '../../shared/i18n';
import type { ApiError } from '../../shared/api/errors';

/** Conserva códigos/status y evita presentar diagnósticos internos como mensajes públicos. */
export function errorEstadoAlerta(error: ApiError): ApiError {
  const status = error.status ?? 0;
  const clave = status === 403 ? 'denegado' : status === 422 ? 'transicion' : status === 0 ? 'red' : 'error';
  const publico = error.backendMessage?.trim();
  const seguro = publico && publico.length <= 1000
    && !/(traceback|sqlstate|sqlalchemy|psycopg|postgresql|bearer\s|password|contrase[nñ]a|\bselect\s.+\bfrom\b|\bupdate\s.+\bset\b|\binsert\s+into\b)/i.test(publico);
  const message = (status === 403 || status === 422) && seguro ? publico
    : (status === 403 || status === 422 || status === 0) ? i18n.t(`fe12.${clave}`, { ns: 'telemetry' })
    : error.message;
  return { ...error, status, message, backendMessage: undefined };
}
