import { db, type SesionOfflineRow } from '../db/db';

// Sin IndexedDB (navegación privada, jsdom) no hay modo offline, pero la sesión
// en línea sigue funcionando: ningún fallo de aquí se propaga.
export type SesionOffline = Omit<SesionOfflineRow, 'id'>;

export function guardarSesionOffline(sesion: SesionOffline): Promise<void> {
  return db.sesion_offline.put({ id: 1, ...sesion }).then(() => {}, () => {});
}

export function leerSesionOffline(): Promise<SesionOffline | undefined> {
  return db.sesion_offline.get(1).catch(() => undefined);
}

export function borrarSesionOffline(): Promise<void> {
  return db.sesion_offline.clear().catch(() => {});
}
