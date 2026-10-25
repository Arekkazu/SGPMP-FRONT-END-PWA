import { useEffect } from 'react';
import { replay } from './syncQueue';

/**
 * Dispara la cola de sincronización al recuperar conexión (ver comentario en syncQueue.ts).
 * Solo con JWT: en modo offline (AuthContext.sesionOffline) primero hay que renovar la
 * sesión, y el token nuevo vuelve a montar este efecto, que reenvía la cola.
 */
export function useSyncOnReconnect(conSesion: boolean): void {
  useEffect(() => {
    if (!conSesion) return;
    if (navigator.onLine) void replay();
    window.addEventListener('online', replay);
    return () => window.removeEventListener('online', replay);
  }, [conSesion]);
}
