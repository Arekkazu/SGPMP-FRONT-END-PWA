/**
 * RF-30 / RF-31 — versionar es una operación distinta de crear.
 *
 * El backend rechaza con 409 crear una plantilla con un nombre ya existente
 * (antes devolvía 201 con v2 en silencio), así que el cliente necesita una
 * ruta propia para generar la versión siguiente.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { plantillasApi } from './plantillasApi';

vi.mock('../../shared/api/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const postMock = vi.mocked(http.post);

const SNAPSHOT = { ciclos_biologicos: [{ nombre: 'Alevín', duracion_dias: 30 }] };

describe('plantillasApi.versionar', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: { id_plantilla: 13, template_name: 'Tilapia Estándar', version: 3 },
    } as never);
  });

  it('llama al endpoint de versiones de la plantilla base', async () => {
    await plantillasApi.versionar(12, { params_snapshot: SNAPSHOT });

    expect(postMock).toHaveBeenCalledWith('/configuracion/plantillas/12/versiones', {
      params_snapshot: SNAPSHOT,
    });
  });

  it('no envía template_name ni id_especie: los hereda la versión base', async () => {
    await plantillasApi.versionar(12, { params_snapshot: SNAPSHOT });

    const [, body] = postMock.mock.calls[0];
    expect(Object.keys(body as object)).toEqual(['params_snapshot']);
  });

  it('devuelve la plantilla nueva con su número de versión', async () => {
    const nueva = await plantillasApi.versionar(12, { params_snapshot: SNAPSHOT });

    expect(nueva.version).toBe(3);
    expect(nueva.template_name).toBe('Tilapia Estándar');
  });

  it('registrar sigue apuntando a la ruta de creación, no a la de versiones', async () => {
    await plantillasApi.registrar({
      template_name: 'Otra', id_especie: 3, params_snapshot: SNAPSHOT,
    });

    expect(postMock.mock.calls[0][0]).toBe('/configuracion/plantillas');
  });
});
