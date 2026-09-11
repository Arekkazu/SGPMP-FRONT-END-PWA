import { describe, expect, it, vi } from 'vitest';
import { http, refreshAccessToken, consumirAvisoSesionCerrada } from './http';
import { tokenStore } from '../auth/tokenStore';

function onRejected() {
  const manager = http.interceptors.response as unknown as {
    handlers: Array<{ fulfilled: (v: unknown) => unknown; rejected: (e: unknown) => Promise<unknown> }>;
  };
  const ultimo = manager.handlers[manager.handlers.length - 1];
  return ultimo.rejected;
}

describe('refreshAccessToken', () => {
  it('deduplica refrescos concurrentes en una sola llamada real a /sesiones/refresh', async () => {
    const postSpy = vi
      .spyOn(http, 'post')
      .mockResolvedValue({ data: { token: 'nuevo-access-token' } });

    const [tokenA, tokenB] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/sesiones/refresh');
    expect(tokenA).toBe('nuevo-access-token');
    expect(tokenB).toBe('nuevo-access-token');
    expect(tokenStore.get()).toBe('nuevo-access-token');

    postSpy.mockRestore();
    tokenStore.clear();
  });

  it('tras un refresh fallido, la siguiente llamada reintenta de verdad (mutex no queda colgado)', async () => {
    const postSpy = vi.spyOn(http, 'post').mockRejectedValueOnce(new Error('sin cookie'));

    await expect(refreshAccessToken()).rejects.toThrow('sin cookie');
    expect(postSpy).toHaveBeenCalledTimes(1);

    postSpy.mockResolvedValueOnce({ data: { token: 'segundo-token' } });
    const token = await refreshAccessToken();

    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(token).toBe('segundo-token');

    postSpy.mockRestore();
    tokenStore.clear();
  });
});

describe('interceptor 401', () => {
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replaceSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { replace: replaceSpy, href: '' },
    });
  });

  afterEach(() => {
    tokenStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('intenta refresh ante cualquier 401 (no solo TOKEN_EXPIRADO) antes de redirigir', async () => {
    tokenStore.set('access-viejo');
    const postSpy = vi.spyOn(http, 'post').mockResolvedValue({ data: { token: 'access-nuevo' } });

    const error = {
      config: { url: '/usuarios/admin', headers: {} },
      response: { status: 401, data: { error_code: 'TOKEN_REVOCADO' } },
    };

    // El refresh funciona, pero el reintento falla (sin adapter real en jsdom):
    // el interceptor debe entonces limpiar la sesión y redirigir.
    await expect(onRejected()(error)).rejects.toBeTruthy();
    expect(postSpy).toHaveBeenCalledWith('/sesiones/refresh');
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    expect(tokenStore.get()).toBeNull();
    // QA M09 (hallazgo #2): la redirección forzada debe dejar una bandera para
    // que LoginPage explique por qué se cerró la sesión.
    expect(consumirAvisoSesionCerrada()).toBe(true);
  });

  it('no intenta refresh ni limpia el token en endpoints publicos de auth', async () => {
    tokenStore.set('access-vigente');
    const postSpy = vi.spyOn(http, 'post');

    const error = {
      config: { url: '/sesiones/', headers: {} },
      response: { status: 401, data: { error_code: 'CREDENCIALES_INVALIDAS' } },
    };

    await expect(onRejected()(error)).rejects.toBeTruthy();
    expect(postSpy).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('access-vigente');
  });
});
