import { describe, expect, it, vi } from 'vitest';
import { http, refreshAccessToken } from './http';
import { tokenStore } from '../auth/tokenStore';

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
