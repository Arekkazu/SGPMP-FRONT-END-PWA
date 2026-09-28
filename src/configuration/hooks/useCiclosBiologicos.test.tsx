/**
 * #54 (RF-16) — Ciclos Biológicos debe permitir escritura offline con
 * sincronización diferida (TC-M09-43), igual que el resto de módulos de
 * dominio. Antes la escritura era estrictamente online, sin cola ni caché.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ciclosApi } from '../api/especiesConfigApi';
import { cacheCiclos, getCiclosCache } from '../db/ciclosTable';
import { enqueue } from '../../shared/sync/syncQueue';
import type { CicloBiologicoResponse } from '../types';
import { useCiclosBiologicos } from './useCiclosBiologicos';

vi.mock('../api/especiesConfigApi', () => ({
  ciclosApi: { listar: vi.fn(), registrar: vi.fn(), editar: vi.fn(), desactivar: vi.fn() },
}));
vi.mock('../db/ciclosTable', () => ({
  cacheCiclos: vi.fn().mockResolvedValue(undefined),
  getCiclosCache: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../shared/sync/syncQueue', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  registerSyncHandler: vi.fn(),
}));

const api = vi.mocked(ciclosApi);
const cache = { cacheCiclos: vi.mocked(cacheCiclos), getCiclosCache: vi.mocked(getCiclosCache) };
const queue = vi.mocked(enqueue);

const CICLO: CicloBiologicoResponse = {
  id_ciclo_biologico: 1, nombre: 'Alevín', descripcion: null,
  duracion_dias: 30, id_especie: 3, es_activo: true, fecha_actualizacion: null,
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  cache.getCiclosCache.mockResolvedValue([]);
  setOnline(true);
});

describe('useCiclosBiologicos — offline (RF-16)', () => {
  it('registrar sin conexión encola la operación en vez de llamar a la API', async () => {
    setOnline(false);
    const { result } = renderHook(() => useCiclosBiologicos());

    let ok = false;
    await act(async () => {
      ok = await result.current.registrar({ id_especie: 3, nombre: 'Alevín', duracion_dias: 30 });
    });

    expect(ok).toBe(true);
    expect(api.registrar).not.toHaveBeenCalled();
    expect(queue).toHaveBeenCalledWith('ciclos_biologicos', 'crear', { id_especie: 3, nombre: 'Alevín', duracion_dias: 30 });
    expect(result.current.ciclos).toHaveLength(1);
    expect(result.current.ciclos[0]).toMatchObject({ nombre: 'Alevín', pendienteSync: true });
    expect(result.current.ciclos[0].id_ciclo_biologico).toBeLessThan(0);
  });

  it('registrar con conexión sigue llamando a la API normalmente', async () => {
    api.registrar.mockResolvedValue(CICLO);
    const { result } = renderHook(() => useCiclosBiologicos());

    let ok = false;
    await act(async () => {
      ok = await result.current.registrar({ id_especie: 3, nombre: 'Alevín', duracion_dias: 30 });
    });

    expect(ok).toBe(true);
    expect(queue).not.toHaveBeenCalled();
    expect(result.current.ciclos).toEqual([CICLO]);
  });

  it('cargar cae al caché local cuando la red falla', async () => {
    api.listar.mockRejectedValue(new Error('network'));
    cache.getCiclosCache.mockResolvedValue([{
      id_ciclo_biologico: 1, nombre: 'Alevín', descripcion: null,
      duracion_dias: 30, id_especie: 3, es_activo: true, fecha_actualizacion: null,
      cachedAt: Date.now(),
    }]);
    const { result } = renderHook(() => useCiclosBiologicos());

    await act(async () => { await result.current.cargar(3); });

    expect(result.current.fromCache).toBe(true);
    expect(result.current.ciclos).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });
});
