/**
 * #115 (RF-15) — el catálogo de especies no soportaba creación en modo
 * offline: "Nueva especie" quedaba deshabilitado y no existía ninguna cola
 * de sincronización de por medio, igual que a Ciclos Biológicos antes de #54.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { especiesApi } from '../api/especiesApi';
import { cacheEspecies, getEspeciesCache } from '../db/especiesTable';
import { enqueue, getConflictos, removeFromQueue } from '../../shared/sync/syncQueue';
import type { EspecieResponse } from '../types';
import { useEspecies } from './useEspecies';

vi.mock('../api/especiesApi', () => ({
  especiesApi: {
    listar: vi.fn(), registrar: vi.fn(), editar: vi.fn(), desactivar: vi.fn(), reactivar: vi.fn(),
  },
}));
vi.mock('../db/especiesTable', () => ({
  cacheEspecies: vi.fn().mockResolvedValue(undefined),
  getEspeciesCache: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../shared/sync/syncQueue', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  registerSyncHandler: vi.fn(),
  getConflictos: vi.fn().mockResolvedValue([]),
  removeFromQueue: vi.fn().mockResolvedValue(undefined),
}));

const api = vi.mocked(especiesApi);
const cache = { cacheEspecies: vi.mocked(cacheEspecies), getEspeciesCache: vi.mocked(getEspeciesCache) };
const queue = { enqueue: vi.mocked(enqueue), getConflictos: vi.mocked(getConflictos), removeFromQueue: vi.mocked(removeFromQueue) };

const ESPECIE: EspecieResponse = {
  id_especie: 1, nombre: 'Bovino', descripcion: null, es_activo: true,
  fecha_creacion: '', fecha_actualizacion: null,
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getEspeciesCache.mockResolvedValue([]);
  queue.getConflictos.mockResolvedValue([]);
  setOnline(true);
});

describe('useEspecies — creación offline (#115, RF-15)', () => {
  it('registrar sin conexión encola la operación en vez de llamar a la API', async () => {
    setOnline(false);
    const { result } = renderHook(() => useEspecies());

    let ok = false;
    await act(async () => {
      ok = await result.current.registrar({ nombre: 'Bovino' });
    });

    expect(ok).toBe(true);
    expect(api.registrar).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith(
      'config_especies',
      'crear',
      expect.objectContaining({ dto: { nombre: 'Bovino' } })
    );
    expect(result.current.especies).toHaveLength(1);
    expect(result.current.especies[0]).toMatchObject({ nombre: 'Bovino', pendienteSync: true });
    expect(result.current.especies[0].id_especie).toBeLessThan(0);
  });

  it('registrar con conexión sigue llamando a la API normalmente', async () => {
    api.registrar.mockResolvedValue(ESPECIE);
    const { result } = renderHook(() => useEspecies());

    let ok = false;
    await act(async () => {
      ok = await result.current.registrar({ nombre: 'Bovino' });
    });

    expect(ok).toBe(true);
    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(result.current.especies).toEqual([ESPECIE]);
  });

  it('cargar cae al caché local cuando la red falla', async () => {
    api.listar.mockRejectedValue(new Error('network'));
    cache.getEspeciesCache.mockResolvedValue([
      { id_especie: 1, nombre: 'Bovino', descripcion: null, es_activo: true, cachedAt: Date.now() },
    ]);
    const { result } = renderHook(() => useEspecies());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.fromCache).toBe(true);
    expect(result.current.especies).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('resolverConflicto descarta la operación en cola y quita la fila optimista', async () => {
    const { result } = renderHook(() => useEspecies());

    setOnline(false);
    await act(async () => {
      await result.current.registrar({ nombre: 'Bovino' });
    });
    const tempId = result.current.especies[0].id_especie;

    await act(async () => {
      await result.current.resolverConflicto({
        id: 7, modulo: 'config_especies', accion: 'crear',
        payload: { tempId, dto: { nombre: 'Bovino' } }, intentos: 1, creadoEn: Date.now(),
        conflicto: true, error: 'Ya existe una especie con ese nombre.',
      });
    });

    expect(queue.removeFromQueue).toHaveBeenCalledWith(7);
    expect(result.current.especies).toHaveLength(0);
  });
});
