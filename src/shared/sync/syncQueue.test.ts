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

import { enqueue, registerSyncHandler, replay, getConflictos, SYNC_REPLAY_TERMINADO } from './syncQueue';

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

describe('syncQueue.replay — aviso de fin de replay (#450, RF-15)', () => {
  // `replay()` corre fuera de React: sin este evento, useEspecies no se entera de que
  // marcó un conflicto y la alerta "Conflicto de sincronización" nunca se dibuja.
  function escucharReplay() {
    const alTerminar = vi.fn();
    window.addEventListener(SYNC_REPLAY_TERMINADO, alTerminar);
    return { alTerminar, dejar: () => window.removeEventListener(SYNC_REPLAY_TERMINADO, alTerminar) };
  }

  it('emite el evento cuando un rechazo 4xx marca un conflicto', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'Bovino' });
    registerSyncHandler('config_especies', vi.fn().mockRejectedValue({ status: 409, message: 'duplicada' }));
    const { alTerminar, dejar } = escucharReplay();

    await replay();
    dejar();

    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it('emite el evento cuando una operación se sincroniza y sale de la cola', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'Porcino' });
    registerSyncHandler('config_especies', vi.fn().mockResolvedValue(undefined));
    const { alTerminar, dejar } = escucharReplay();

    await replay();
    dejar();

    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it('emite un solo evento por replay aunque haya varias operaciones', async () => {
    await enqueue('config_especies', 'crear', { nombre: 'A' });
    await enqueue('config_especies', 'crear', { nombre: 'B' });
    registerSyncHandler('config_especies', vi.fn().mockResolvedValue(undefined));
    const { alTerminar, dejar } = escucharReplay();

    await replay();
    dejar();

    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it('no emite nada con la cola vacía (replay corre en cada montaje y reconexión)', async () => {
    const { alTerminar, dejar } = escucharReplay();

    await replay();
    dejar();

    expect(alTerminar).not.toHaveBeenCalled();
  });

  it.each([
    ['una caída de red (sin status)', new Error('Network Error')],
    ['un 5xx', { status: 503, message: 'no disponible' }],
    ['un 401', { status: 401, message: 'sesión expirada' }],
  ])('no emite nada si %s deja la cola igual', async (_nombre, fallo) => {
    await enqueue('config_especies', 'crear', { nombre: 'Ovino' });
    registerSyncHandler('config_especies', vi.fn().mockRejectedValue(fallo));
    const { alTerminar, dejar } = escucharReplay();

    await replay();
    dejar();

    expect(alTerminar).not.toHaveBeenCalled();
  });
});
