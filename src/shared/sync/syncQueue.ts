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

/** Operaciones que el backend rechazó en firme (ver `replay`) — requieren resolución manual. */
export async function getConflictos(modulo?: string): Promise<SyncOperation[]> {
  const conflictos = await db.syncQueue.filter((op) => op.conflicto === true).toArray();
  return modulo ? conflictos.filter((op) => op.modulo === modulo) : conflictos;
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

/**
 * Reintenta la cola en orden de creación.
 *
 * #115 (RF-15): un rechazo de negocio (ej. 409 "ya existe una especie con ese
 * nombre" porque otro usuario la registró mientras este dispositivo estaba
 * offline) nunca deja de fallar solo por reintentarlo — antes se tragaba el
 * error y la operación quedaba reintentándose en silencio en cada reconexión,
 * sin que el usuario se enterara. Un 4xx (fuera de 401, que ya fuerza logout
 * global vía el interceptor de `http.ts`) es una respuesta definitiva del
 * backend: se marca `conflicto` para que el módulo la muestre y el usuario la
 * resuelva (descartar y, si aún la quiere, crearla de nuevo con otro nombre).
 * Cualquier otro fallo (red, 5xx) se deja igual para el próximo intento.
 */
export async function replay(): Promise<void> {
  const cola = await getQueue();
  for (const op of cola) {
    if (op.conflicto || op.id === undefined) continue;
    const handler = handlers.get(op.modulo);
    if (!handler) continue;
    try {
      await handler(op.accion, op.payload);
      await removeFromQueue(op.id);
    } catch (e) {
      const status = (e as { status?: unknown } | null)?.status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 401) {
        await db.syncQueue.update(op.id, {
          conflicto: true,
          error: (e as { message?: string } | null)?.message ?? 'No se pudo sincronizar.',
        });
      }
    }
  }
}
