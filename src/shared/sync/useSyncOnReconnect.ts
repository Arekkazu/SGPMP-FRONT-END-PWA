import { useEffect } from 'react';
import { replay } from './syncQueue';

/** Dispara la cola de sincronización al recuperar conexión (ver comentario en syncQueue.ts). */
export function useSyncOnReconnect(): void {
  useEffect(() => {
    if (navigator.onLine) void replay();
    window.addEventListener('online', replay);
    return () => window.removeEventListener('online', replay);
  }, []);
}
