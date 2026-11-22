// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-22 | Arekkazu | A11Y2-M07 TC-DIS-269/271 RF-98/101: el rechazo del backend va bajo el campo que lo causó |
import type { ApiError } from '../shared/api/errors';

/**
 * Error del backend que corresponde a un campo del formulario (WCAG 3.3.1): se muestra bajo ese campo, con
 * aria-invalid, y no arriba del formulario. `campos` traduce el nombre del backend al del formulario.
 */
export function errorDeCampo(error: ApiError | null, campos: Record<string, string>): { campo: string; mensaje: string } | null {
  const f = error?.fields?.find((x) => campos[x.field])
    ?? (error?.field && campos[error.field] ? { field: error.field, message: error.message } : undefined);
  return f ? { campo: campos[f.field], mensaje: f.message } : null;
}
