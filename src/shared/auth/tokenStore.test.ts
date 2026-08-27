import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from './tokenStore';

describe('tokenStore', () => {
  afterEach(() => {
    tokenStore.clear();
    vi.restoreAllMocks();
  });

  it('conserva en memoria la expiración calculada desde expira_en', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);

    tokenStore.set('access-token', 120);

    expect(tokenStore.get()).toBe('access-token');
    expect(tokenStore.getExpiresAt()).toBe(130_000);
  });

  it('notifica renovaciones y limpieza de la sesión', () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);

    tokenStore.set('renovado', 60);
    tokenStore.clear();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].token).toBe('renovado');
    expect(listener.mock.calls[1][0]).toEqual({ token: null, expiresAt: null });
    unsubscribe();
  });
});
