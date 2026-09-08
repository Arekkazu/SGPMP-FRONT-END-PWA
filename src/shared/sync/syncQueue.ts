import { db, type SyncOperation } from '../db/db';

export async function enqueue(
  modulo: string,
  accion: string,
  payload: unknown
): Promise<void> {
  await db.syncQueue.add({
    modulo,
    accion,
    payload,
    intentos: 0,
    creadoEn: Date.now(),
  });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
        .sync.register('sgpmp-sync');
    } catch {
      // Background sync not available; will replay on next online event
    }
  }
}

export async function getQueue(): Promise<SyncOperation[]> {
  return db.syncQueue.orderBy('creadoEn').toArray();
}

export async function removeFromQueue(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

type SyncHandler = (accion: string, payload: unknown) => Promise<void>;

// Un handler por módulo, registrado una sola vez cuando el hook de ese módulo se
// carga (efecto de import a nivel de módulo — ver useCiclosBiologicos.ts). No hay
// service worker con Background Sync en este proyecto, así que `replay()` se
// dispara desde el evento `online` del navegador (ver useSyncOnReconnect.ts).
const handlers = new Map<string, SyncHandler>();

export function registerSyncHandler(modulo: string, handler: SyncHandler): void {
  handlers.set(modulo, handler);
}

/** Reintenta la cola en orden de creación; una operación que vuelve a fallar se queda para el próximo intento. */
export async function replay(): Promise<void> {
  const cola = await getQueue();
  for (const op of cola) {
    const handler = handlers.get(op.modulo);
    if (!handler) continue;
    try {
      await handler(op.accion, op.payload);
      if (op.id !== undefined) await removeFromQueue(op.id);
    } catch {
      // Sigue en la cola: se reintenta en la proxima reconexion.
    }
  }
}
