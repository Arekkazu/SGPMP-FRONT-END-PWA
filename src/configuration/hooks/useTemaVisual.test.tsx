/**
 * RF-27 — el selector de tema estaba invertido de punta a punta.
 *
 * `TemaVisualSection` declaraba `0 = Light, 1 = Dark, 2 = Auto`, y el backend y el RF
 * usan `1 = Claro, 2 = Oscuro, 3 = Sistema` (`ThemeMode` en `tema_visual.py`). Guardar
 * "Claro" enviaba `0` y el DTO respondía 422; "Oscuro" enviaba `1` y se persistía
 * *Claro*; "Automático" enviaba `2` y se persistía *Oscuro*. Al leer, el mapeo inverso
 * pintaba oscuro sobre el valor que el backend llama Claro.
 *
 * Es el mismo modo de fallo que RF-29 tuvo con `'es'` frente a `'es-CO'`.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { temaVisualApi } from '../api/personalizacionApi';
import { THEME_MODE, aplicarTema, resolverTema } from '../../shared/tema/tema';
import type { ApiError } from '../../shared/api/errors';
import { useTemaVisual } from './useTemaVisual';

vi.mock('../api/personalizacionApi', () => ({
  temaVisualApi: {
    obtener: vi.fn(),
    guardar: vi.fn(),
    obtenerGlobal: vi.fn(),
    guardarGlobal: vi.fn(),
  },
}));

const api = vi.mocked(temaVisualApi);

const RESUELTO = { theme_mode: THEME_MODE.CLARO, fuente: 'personal' as const, id_tema_visual: 5 };
const GUARDADO = {
  id_tema_visual: 5,
  id_usuario: 7,
  theme_mode: THEME_MODE.OSCURO,
  es_global: false,
  fecha_actualizacion: '2026-09-03T12:00:00Z',
};

function error(code: string, status: number): ApiError {
  return { code, message: code, status };
}

function simularSistemaOscuro(oscuro: boolean) {
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: oscuro,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    addListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  simularSistemaOscuro(false);
  api.obtener.mockResolvedValue(RESUELTO);
  api.obtenerGlobal.mockResolvedValue({ ...RESUELTO, fuente: 'global' });
  api.guardar.mockResolvedValue(GUARDADO);
  api.guardarGlobal.mockResolvedValue({ ...GUARDADO, es_global: true });
});

describe('contrato de theme_mode con el backend', () => {
  it('los valores del RF son 1, 2 y 3, no 0, 1 y 2', () => {
    expect(THEME_MODE).toEqual({ CLARO: 1, OSCURO: 2, SISTEMA: 3 });
  });

  it.each([
    [THEME_MODE.CLARO, 'light'],
    [THEME_MODE.OSCURO, 'dark'],
  ])('theme_mode %i se pinta como %s', (mode, esperado) => {
    expect(resolverTema(mode)).toBe(esperado);
  });

  it('el modo Sistema sigue a prefers-color-scheme', () => {
    simularSistemaOscuro(true);
    expect(resolverTema(THEME_MODE.SISTEMA)).toBe('dark');

    simularSistemaOscuro(false);
    expect(resolverTema(THEME_MODE.SISTEMA)).toBe('light');
  });

  it('cae a claro si el navegador no expone prefers-color-scheme', () => {
    // Flujo alterno "Error en modo Automatico (Dispositivo no compatible)" del RF.
    const original = window.matchMedia;
    // @ts-expect-error se elimina a proposito para simular el navegador sin soporte
    delete window.matchMedia;

    expect(resolverTema(THEME_MODE.SISTEMA)).toBe('light');

    window.matchMedia = original;
  });

  it('aplicar el tema escribe data-theme en el documento', () => {
    aplicarTema(THEME_MODE.OSCURO);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('useTemaVisual', () => {
  it('envia el theme_mode del RF, no el indice de la tarjeta', async () => {
    const { result } = renderHook(() => useTemaVisual());

    await act(async () => { await result.current.guardar({ theme_mode: THEME_MODE.OSCURO }); });

    expect(api.guardar).toHaveBeenCalledWith({ theme_mode: 2 });
    expect(api.guardar).not.toHaveBeenCalledWith({ theme_mode: 1 });
  });

  it('guardar Oscuro pinta oscuro, no claro', async () => {
    const { result } = renderHook(() => useTemaVisual());

    await act(async () => { await result.current.guardar({ theme_mode: THEME_MODE.OSCURO }); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('guardar Claro pinta claro, no oscuro', async () => {
    const { result } = renderHook(() => useTemaVisual());

    await act(async () => { await result.current.guardar({ theme_mode: THEME_MODE.CLARO }); });

    expect(api.guardar).toHaveBeenCalledWith({ theme_mode: 1 });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('aplica el tema resuelto al cargar, no solo lo muestra', async () => {
    api.obtener.mockResolvedValue({ ...RESUELTO, theme_mode: THEME_MODE.OSCURO });
    const { result } = renderHook(() => useTemaVisual());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.personal?.theme_mode).toBe(THEME_MODE.OSCURO);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('el 403 del tema global no impide ver la preferencia personal', async () => {
    // El recurso 27 solo lo lee el Administrador. Con `Promise.all` este 403 tumbaba
    // tambien la lectura del recurso 24, que todos los roles si pueden leer.
    api.obtenerGlobal.mockRejectedValue(error('ACCESO_DENEGADO', 403));
    const { result } = renderHook(() => useTemaVisual());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.personal?.theme_mode).toBe(THEME_MODE.CLARO);
    expect(result.current.global_).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('guardar el tema global no repinta la interfaz del administrador', async () => {
    // El tema global solo alcanza a quien no tiene preferencia propia.
    const { result } = renderHook(() => useTemaVisual());
    await act(async () => { await result.current.cargar(); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await act(async () => { await result.current.guardarGlobal({ theme_mode: THEME_MODE.OSCURO }); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('un theme_mode rechazado deja el saveError sin repintar', async () => {
    api.guardar.mockRejectedValue(error('TEMA_INVALIDO', 400));
    const { result } = renderHook(() => useTemaVisual());
    await act(async () => { await result.current.cargar(); });

    let ok = true;
    await act(async () => { ok = await result.current.guardar({ theme_mode: 9 }); });

    expect(ok).toBe(false);
    expect(result.current.saveError?.code).toBe('TEMA_INVALIDO');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
