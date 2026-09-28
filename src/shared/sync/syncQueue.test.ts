/**
 * #115 (RF-15) — `replay()` distinguía un solo tipo de fallo: cualquier error
 * dejaba la operación en cola para el próximo intento, en silencio, sin avisar
 * al usuario. Eso es correcto para un fallo de red, pero un rechazo de negocio
 * (409 "nombre duplicado" porque otro usuario ya lo registró) nunca deja de
 * fallar solo por reintentarlo — necesita resolución manual (ver `useEspecies`).
 * Estas pruebas cubren esa bifurcación contra un `db.syncQueue` en memoria
 * (jsdom no trae IndexedDB real, así que se reemplaza el módulo de Dexie).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rows, nextId } = vi.hoisted(() => ({ rows: [] as any[], nextId: { value: 1 } }));

vi.mock('../db/db', () => ({
  db: {
    syncQueue: {
      add: vi.fn(async (op: any) => {
        const id = nextId.value++;
        rows.push({ ...op, id });
        return id;
      }),
      orderBy: () => ({ toArray: async () => [...rows] }),
      delete: vi.fn(async (id: number) => {
        const i = rows.findIndex((r) => r.id === id);
        if (i >= 0) rows.splice(i, 1);
      }),
      update: vi.fn(async (id: number, changes: Record<string, unknown>) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, changes);
      }),
      filter: (fn: (op: any) => boolean) => ({ toArray: async () => rows.filter(fn) }),
    },
  },
}));

import { enqueue, registerSyncHandler, replay, getConflictos } from './syncQueue';

beforeEach(() => {
  rows.length = 0;
  nextId.value = 1;
});

describe('syncQueue.replay — resolución de conflictos (#115, RF-15)', () => {
  it('un rechazo 4xx (ej. 409 nombre duplicado) marca la operación como conflicto y no la reintenta', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'Bovino' });
    const handler = vi.fn().mockRejectedValue({ status: 409, message: 'Ya existe una especie con ese nombre.' });
    registerSyncHandler('config_especies', handler);

    await replay();
    expect(handler).toHaveBeenCalledTimes(1);

    const conflictos = await getConflictos('config_especies');
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].error).toBe('Ya existe una especie con ese nombre.');

    // Otra reconexión no debe volver a llamar al handler: ya está esperando
    // resolución manual (ver useEspecies.resolverConflicto).
    await replay();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('un fallo sin status (red caída) deja la operación en cola para el próximo intento', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'Porcino' });
    const handler = vi.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(undefined);
    registerSyncHandler('config_especies', handler);

    await replay();
    expect(await getConflictos('config_especies')).toHaveLength(0);

    await replay();
    expect(handler).toHaveBeenCalledTimes(2);
    expect(await getConflictos('config_especies')).toHaveLength(0);
  });

  it('un 401 no se marca como conflicto (el interceptor global ya maneja la sesión expirada)', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'Avícola' });
    registerSyncHandler('config_especies', vi.fn().mockRejectedValue({ status: 401, message: 'Sesión expirada.' }));

    await replay();

    expect(await getConflictos('config_especies')).toHaveLength(0);
  });
});
