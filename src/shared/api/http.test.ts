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

// REUSO_TOKEN_REFRESCO_DETECTADO: la cookie del refresh token es de todas las pestañas.
describe('refreshAccessToken entre pestañas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tokenStore.clear();
    delete (navigator as { locks?: unknown }).locks;
  });

  function conCandado(antes?: () => void) {
    const request = vi.fn(async (_nombre: string, fn: () => Promise<unknown>) => {
      antes?.();
      return fn();
    });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    return request;
  }

  it('refresca dentro del candado compartido del navegador', async () => {
    const request = conCandado();
    vi.spyOn(http, 'post').mockResolvedValue({ data: { token: 'nuevo' } });

    await expect(refreshAccessToken()).resolves.toBe('nuevo');
    expect(request).toHaveBeenCalledWith('sigab-refresh-token', expect.any(Function));
  });

  it('si otra pestaña refrescó mientras esperaba el candado, usa ese token sin rotar otra vez', async () => {
    conCandado(() => tokenStore.set('de-otra-pestana'));
    const postSpy = vi.spyOn(http, 'post');

    await expect(refreshAccessToken()).resolves.toBe('de-otra-pestana');
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('un 401 con un token ya reemplazado por otra pestaña reintenta con el vigente', async () => {
    tokenStore.set('vigente');
    const postSpy = vi.spyOn(http, 'post');

    await expect(refreshAccessToken('viejo')).resolves.toBe('vigente');
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('reparte el token nuevo a las demás pestañas y toma el que ellas reparten', async () => {
    const otraPestana = new BroadcastChannel('sigab-sesion');
    const recibido = new Promise<unknown>((r) => otraPestana.addEventListener('message', (e) => r((e as MessageEvent).data), { once: true }));
    vi.spyOn(http, 'post').mockResolvedValue({ data: { token: 'repartido' } });

    await refreshAccessToken();
    await expect(recibido).resolves.toBe('repartido');

    otraPestana.postMessage('desde-otra-pestana');
    await vi.waitFor(() => expect(tokenStore.get()).toBe('desde-otra-pestana'));
    otraPestana.close();
  });
});

describe('interceptor 401', () => {
  let replaceSpy: ReturnType<typeof vi.fn>;
  const adapterOriginal = http.defaults.adapter;

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
    http.defaults.adapter = adapterOriginal;
    vi.restoreAllMocks();
  });

  it('intenta refresh ante cualquier 401 (no solo TOKEN_EXPIRADO) y reintenta con el token nuevo', async () => {
    tokenStore.set('access-viejo');
    const postSpy = vi.spyOn(http, 'post').mockResolvedValue({ data: { token: 'access-nuevo' } });

    // El reintento sale por el adapter, no por `http.post`. Sin mockearlo,
    // jsdom lo rechaza con un error de red y la prueba terminaba midiendo esa
    // falla del entorno en vez del contrato del interceptor.
    const adapter = vi.fn().mockResolvedValue({ status: 200, data: { ok: true }, headers: {}, config: {} });
    http.defaults.adapter = adapter;

    const error = {
      config: { url: '/usuarios/admin', headers: {} },
      response: { status: 401, data: { error_code: 'TOKEN_REVOCADO' } },
    };

    await expect(onRejected()(error)).resolves.toMatchObject({ data: { ok: true } });
    expect(postSpy).toHaveBeenCalledWith('/sesiones/refresh');
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer access-nuevo');
    // El refresh arreglo la sesion: no se cierra nada.
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('access-nuevo');
  });

  it('si el refresh rechaza la sesion, la cierra y deja el aviso para LoginPage', async () => {
    tokenStore.set('access-viejo');
    vi.spyOn(http, 'post').mockRejectedValue({
      response: { status: 401, data: { error_code: 'REFRESH_TOKEN_REUTILIZADO' } },
    });

    const error = {
      config: { url: '/usuarios/admin', headers: {} },
      response: { status: 401, data: { error_code: 'TOKEN_REVOCADO' } },
    };

    await expect(onRejected()(error)).rejects.toBeTruthy();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    expect(tokenStore.get()).toBeNull();
    // QA M09 (hallazgo #2): la redirección forzada debe dejar una bandera para
    // que LoginPage explique por qué se cerró la sesión.
    expect(consumirAvisoSesionCerrada()).toBe('generica');
  });

  it('RF-06: una sesion finalizada por cambio de estado cierra sin refresh y deja su propio aviso', async () => {
    tokenStore.set('access-viejo');
    const postSpy = vi.spyOn(http, 'post');

    const error = {
      config: { url: '/usuarios/me', headers: {} },
      response: { status: 401, data: { error_code: 'SESION_FINALIZADA_CAMBIO_ESTADO' } },
    };

    await expect(onRejected()(error)).rejects.toBeTruthy();
    // La cuenta quedo INACTIVA/BLOQUEADA/ELIMINADA: refrescar no la recupera.
    expect(postSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    expect(tokenStore.get()).toBeNull();
    expect(consumirAvisoSesionCerrada()).toBe('cambio_estado');
  });

  it('INC-M02-51-G44: un 5xx o un fallo de red en el refresh no cierra la sesion', async () => {
    const error = {
      config: { url: '/usuarios/admin', headers: {} },
      response: { status: 401, data: { error_code: 'TOKEN_EXPIRADO' } },
    };
    const fallos = [
      { response: { status: 500, data: { error_code: 'AUDITORIA_OBLIGATORIA_FALLIDA' } } },
      new Error('Network Error'),
    ];

    for (const fallo of fallos) {
      tokenStore.set('access-viejo');
      vi.spyOn(http, 'post').mockRejectedValueOnce(fallo);

      await expect(onRejected()({ ...error, config: { ...error.config } })).rejects.toBeTruthy();
      expect(replaceSpy).not.toHaveBeenCalled();
      expect(tokenStore.get()).toBe('access-viejo');
      expect(consumirAvisoSesionCerrada()).toBeNull();
    }
  });

  it('si el reintento vuelve a dar 401, cierra la sesion en vez de refrescar en bucle', async () => {
    tokenStore.set('access-nuevo');
    const postSpy = vi.spyOn(http, 'post');

    // `_retry` ya en true es el 401 del reintento volviendo al interceptor.
    const error = {
      config: { url: '/usuarios/admin', headers: {}, _retry: true },
      response: { status: 401, data: { error_code: 'TOKEN_REVOCADO' } },
    };

    await expect(onRejected()(error)).rejects.toBeTruthy();
    expect(postSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    expect(tokenStore.get()).toBeNull();
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

  it('#133: CONTRASENA_ACTUAL_INCORRECTA no cierra la sesion (es un error de negocio, no de token)', async () => {
    tokenStore.set('access-vigente');
    const postSpy = vi.spyOn(http, 'post');

    const error = {
      config: { url: '/contrasena/usuarios/7', headers: {} },
      response: {
        status: 401,
        data: { error_code: 'CONTRASENA_ACTUAL_INCORRECTA', message: 'La contraseña actual es incorrecta.' },
      },
    };

    await expect(onRejected()(error)).rejects.toMatchObject({ code: 'CONTRASENA_ACTUAL_INCORRECTA' });
    expect(postSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('access-vigente');
  });
});
