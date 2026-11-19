// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 RNF-03: el catálogo de M09 manda sobre el texto del backend |
import type { AxiosError } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { fijarCatalogoErrores } from './catalogoErrores';
import { mapToApiError } from './errors';

function error(code: string, message: string): AxiosError {
  return { response: { status: 422, data: { error_code: code, message } } } as unknown as AxiosError;
}

describe('Catálogo de mensajes de error (RF-107)', () => {
  afterEach(() => fijarCatalogoErrores({}));

  it('usa el texto y el botón del catálogo cuando la clave está', () => {
    fijarCatalogoErrores({ ESPECIE_INACTIVA: { mensaje: 'La especie elegida no está activa.',
      accion: { texto: 'Ir a configurar especies', ruta: 'configuracion' } } });
    const api = mapToApiError(error('ESPECIE_INACTIVA', 'texto del backend'));
    expect(api.message).toBe('La especie elegida no está activa.');
    expect(api.accion).toEqual({ texto: 'Ir a configurar especies', ruta: 'configuracion' });
  });

  it('sin entrada en el catálogo conserva el texto del backend y no ofrece botón', () => {
    const api = mapToApiError(error('OTRO_CODIGO', 'El período del 01/10/2026 al 31/10/2026 no está cerrado.'));
    expect(api.message).toBe('El período del 01/10/2026 al 31/10/2026 no está cerrado.');
    expect(api.accion).toBeUndefined();
  });
});
