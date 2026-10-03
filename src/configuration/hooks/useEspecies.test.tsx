/**
 * #115 (RF-15) — el catálogo de especies no soportaba creación en modo
 * offline: "Nueva especie" quedaba deshabilitado y no existía ninguna cola
 * de sincronización de por medio, igual que a Ciclos Biológicos antes de #54.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { especiesApi } from '../api/especiesApi';
import { cacheEspecies, getEspeciesCache } from '../db/especiesTable';
import { enqueue, getConflictos, getQueue, removeFromQueue } from '../../shared/sync/syncQueue';
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
  getQueue: vi.fn().mockResolvedValue([]),
  removeFromQueue: vi.fn().mockResolvedValue(undefined),
  SYNC_REPLAY_TERMINADO: 'sgpmp:sync-replay-terminado',
}));

const api = vi.mocked(especiesApi);
const cache = { cacheEspecies: vi.mocked(cacheEspecies), getEspeciesCache: vi.mocked(getEspeciesCache) };
const queue = {
  enqueue: vi.mocked(enqueue),
  getConflictos: vi.mocked(getConflictos),
  getQueue: vi.mocked(getQueue),
  removeFromQueue: vi.mocked(removeFromQueue),
};

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
  queue.getQueue.mockResolvedValue([]);
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

const EVENTO_REPLAY = 'sgpmp:sync-replay-terminado';

const opCrear = (id: number, tempId: number, nombre: string, extra: Record<string, unknown> = {}) => ({
  id, modulo: 'config_especies', accion: 'crear', payload: { tempId, dto: { nombre } },
  intentos: 0, creadoEn: id, ...extra,
});

describe('useEspecies — la fila pendiente queda a la vista (#450, RF-15)', () => {
  it('la especie creada offline se agrega al inicio, no al final de la lista paginada', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    const { result } = renderHook(() => useEspecies());
    await act(async () => { await result.current.cargar(); });

    setOnline(false);
    await act(async () => { await result.current.registrar({ nombre: 'Porcino' }); });

    expect(result.current.especies.map((e) => e.nombre)).toEqual(['Porcino', 'Bovino']);
    expect(result.current.especies[0].pendienteSync).toBe(true);
  });

  it('recargar conserva arriba las creaciones que siguen en cola, la más reciente primero', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    queue.getQueue.mockResolvedValue([opCrear(1, -1, 'Ovino'), opCrear(2, -2, 'Caprino')] as never);
    const { result } = renderHook(() => useEspecies());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.especies.map((e) => e.nombre)).toEqual(['Caprino', 'Ovino', 'Bovino']);
    expect(result.current.especies.slice(0, 2).every((e) => e.pendienteSync)).toBe(true);
  });

  it('una creación en conflicto no se dibuja como pendiente: la muestra la alerta', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    queue.getQueue.mockResolvedValue([opCrear(1, -1, 'Ovino', { conflicto: true, error: 'duplicada' })] as never);
    const { result } = renderHook(() => useEspecies());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.especies.map((e) => e.nombre)).toEqual(['Bovino']);
  });

  it('si la cola local no se puede leer, la lista carga igual sin las pendientes', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    queue.getQueue.mockRejectedValue(new Error('IndexedDB no disponible'));
    const { result } = renderHook(() => useEspecies());

    await act(async () => { await result.current.cargar(); });

    expect(result.current.especies).toEqual([ESPECIE]);
    expect(result.current.error).toBeNull();
  });
});

describe('useEspecies — reacciona al fin del replay (#450, RF-15)', () => {
  it('al terminar un replay recarga y muestra la alerta de conflicto sin recargar a mano', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    const { result } = renderHook(() => useEspecies());
    await act(async () => { await result.current.cargar(); });
    expect(result.current.conflictos).toEqual([]);

    const conflicto = opCrear(7, -5, 'Bovino', { conflicto: true, error: 'Ya existe una especie con ese nombre.' });
    queue.getConflictos.mockResolvedValue([conflicto] as never);
    await act(async () => { window.dispatchEvent(new CustomEvent(EVENTO_REPLAY)); });

    await waitFor(() => expect(result.current.conflictos).toHaveLength(1));
    expect(result.current.conflictos[0].error).toBe('Ya existe una especie con ese nombre.');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('lo sincronizado deja de aparecer como pendiente tras el replay', async () => {
    api.listar.mockResolvedValue([]);
    queue.getQueue.mockResolvedValue([opCrear(1, -1, 'Porcino')] as never);
    const { result } = renderHook(() => useEspecies());
    await act(async () => { await result.current.cargar(); });
    expect(result.current.especies[0]).toMatchObject({ nombre: 'Porcino', pendienteSync: true });

    // el replay sincronizó: el servidor ya la tiene y la cola quedó vacía
    api.listar.mockResolvedValue([{ ...ESPECIE, id_especie: 9, nombre: 'Porcino' }]);
    queue.getQueue.mockResolvedValue([]);
    await act(async () => { window.dispatchEvent(new CustomEvent(EVENTO_REPLAY)); });

    await waitFor(() => expect(result.current.especies[0].id_especie).toBe(9));
    expect(result.current.especies.some((e) => e.pendienteSync)).toBe(false);
  });

  it('recarga con el mismo `soloActivas` con el que cargó la instancia', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    const { result } = renderHook(() => useEspecies());
    await act(async () => { await result.current.cargar(true); });

    await act(async () => { window.dispatchEvent(new CustomEvent(EVENTO_REPLAY)); });

    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2));
    expect(api.listar).toHaveBeenLastCalledWith(true);
  });

  it('una instancia que nunca cargó no pide nada al terminar un replay', async () => {
    renderHook(() => useEspecies());

    await act(async () => { window.dispatchEvent(new CustomEvent(EVENTO_REPLAY)); });

    expect(api.listar).not.toHaveBeenCalled();
  });

  it('deja de escuchar al desmontarse', async () => {
    api.listar.mockResolvedValue([ESPECIE]);
    const { result, unmount } = renderHook(() => useEspecies());
    await act(async () => { await result.current.cargar(); });
    unmount();

    await act(async () => { window.dispatchEvent(new CustomEvent(EVENTO_REPLAY)); });

    expect(api.listar).toHaveBeenCalledTimes(1);
  });
});
