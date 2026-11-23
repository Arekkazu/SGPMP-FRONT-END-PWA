import { beforeEach, describe, expect, it, vi } from 'vitest';

const tablas = vi.hoisted(() => ({
  sesion_offline: { clear: vi.fn(async () => {}) },
  dashboard_widgets: { clear: vi.fn(async () => {}) },
  dashboard_contexto: { clear: vi.fn(async () => {}) },
}));

vi.mock('../db/db', () => ({ db: tablas }));

import { borrarSesionOffline } from './sesionOffline';

describe('borrarSesionOffline (SEG-FE-04, #797)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('borra la sesión offline y la caché del tablero', async () => {
    await borrarSesionOffline();
    expect(tablas.sesion_offline.clear).toHaveBeenCalledOnce();
    expect(tablas.dashboard_widgets.clear).toHaveBeenCalledOnce();
    expect(tablas.dashboard_contexto.clear).toHaveBeenCalledOnce();
  });

  it('sin IndexedDB no propaga el error: cerrar sesión siempre funciona', async () => {
    tablas.dashboard_widgets.clear.mockRejectedValueOnce(new Error('sin IndexedDB'));
    await expect(borrarSesionOffline()).resolves.toBeUndefined();
  });
});
