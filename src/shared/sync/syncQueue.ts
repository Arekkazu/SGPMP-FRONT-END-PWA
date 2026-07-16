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
