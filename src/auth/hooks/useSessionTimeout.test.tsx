import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INACTIVITY_TIMEOUT_MS } from '../lib/sessionTiming';
import { useSessionTimeout } from './useSessionTimeout';

describe('useSessionTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el aviso cinco minutos antes y la actividad reinicia el plazo', () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-08-27T12:00:00Z');
    vi.setSystemTime(startedAt);
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useSessionTimeout({
      token: 'token-activo',
      expiresAt: null,
      onTimeout,
    }));

    vi.setSystemTime(startedAt.getTime() + 25 * 60 * 1000);
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.showWarning).toBe(true);
    expect(result.current.reason).toBe('inactivity');

    act(() => window.dispatchEvent(new Event('pointerdown')));

    expect(result.current.showWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('no permite reactivar una sesión cuyo plazo venció con la pestaña suspendida', () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-08-27T12:00:00Z');
    vi.setSystemTime(startedAt);
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout({
      token: 'token-activo',
      expiresAt: null,
      onTimeout,
    }));

    vi.setSystemTime(startedAt.getTime() + INACTIVITY_TIMEOUT_MS + 1);
    act(() => window.dispatchEvent(new Event('pointerdown')));

    expect(onTimeout).toHaveBeenCalledOnce();
    expect(onTimeout).toHaveBeenCalledWith('inactivity');
  });

  it('distingue la expiración absoluta informada por expira_en', () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-08-27T12:00:00Z');
    vi.setSystemTime(startedAt);
    const onTimeout = vi.fn();
    renderHook(() => useSessionTimeout({
      token: 'token-activo',
      expiresAt: startedAt.getTime() + 1000,
      onTimeout,
    }));

    act(() => vi.advanceTimersByTime(1000));

    expect(onTimeout).toHaveBeenCalledOnce();
    expect(onTimeout).toHaveBeenCalledWith('expired');
  });
});
