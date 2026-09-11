import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from './tokenStore';

describe('tokenStore', () => {
  afterEach(() => {
    tokenStore.clear();
  });

  it('notifica renovaciones y limpieza de la sesión', () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);

    tokenStore.set('renovado');
    tokenStore.clear();

    expect(listener.mock.calls).toEqual([['renovado'], [null]]);
    unsubscribe();
  });

  it('no notifica si el token no cambió', () => {
    tokenStore.set('mismo-token');
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);

    tokenStore.set('mismo-token');

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
