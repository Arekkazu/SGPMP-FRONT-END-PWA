import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INACTIVITY_TIMEOUT_MS, useSessionTimeout } from './useSessionTimeout';

const mocks = vi.hoisted(() => ({
  lastAuthRequestAt: 0,
  mantenerSesion: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../shared/api/http', () => ({
  getLastAuthenticatedRequestAt: () => mocks.lastAuthRequestAt,
  http: {},
  default: {},
}));

vi.mock('../api/authApi', () => ({ authApi: { mantenerSesion: mocks.mantenerSesion } }));

const INICIO = new Date('2026-08-27T12:00:00Z').getTime();

function renderSessionTimeout(onTimeout = vi.fn()) {
  const rendered = renderHook(() => useSessionTimeout({ hasSession: true, onTimeout }));
  return { ...rendered, onTimeout };
}

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(INICIO);
    mocks.lastAuthRequestAt = INICIO;
    mocks.mantenerSesion.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('avisa durante los últimos cinco minutos y la actividad reinicia el plazo', () => {
    const { result, onTimeout } = renderSessionTimeout();

    vi.setSystemTime(INICIO + 25 * 60 * 1000);
    act(() => { vi.advanceTimersByTime(1000); });

    expect(result.current).toBeLessThanOrEqual(5 * 60);
    expect(result.current).toBeGreaterThan(0);

    act(() => { window.dispatchEvent(new Event('pointerdown')); });

    expect(result.current).toBeNull();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('no revive una sesión cuyo plazo venció con la pestaña suspendida', () => {
    const { onTimeout } = renderSessionTimeout();

    vi.setSystemTime(INICIO + INACTIVITY_TIMEOUT_MS + 1);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  // El backend cuenta la inactividad desde la última petición autenticada, no
  // desde los eventos del DOM: sin keepalive, leer una pantalla media hora
  // cierra la sesión en el servidor antes de que el aviso llegue a mostrarse.
  it('envía keepalive si el backend lleva rato sin recibir peticiones', () => {
    renderSessionTimeout();

    vi.setSystemTime(INICIO + 2 * 60 * 1000);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });

    expect(mocks.mantenerSesion).toHaveBeenCalledOnce();
  });

  it('no envía keepalive si la app acaba de hacer una petición autenticada', () => {
    renderSessionTimeout();

    vi.setSystemTime(INICIO + 2 * 60 * 1000);
    mocks.lastAuthRequestAt = Date.now();
    act(() => { window.dispatchEvent(new Event('pointerdown')); });

    expect(mocks.mantenerSesion).not.toHaveBeenCalled();
  });
});
