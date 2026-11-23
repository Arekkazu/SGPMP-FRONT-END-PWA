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

// Al terminar la sesión también se borra la caché offline del tablero (M08): guarda alertas sanitarias,
// animales en riesgo, lecturas y las fincas del usuario, y quien use el mismo equipo después podría leerla
// desde las herramientas del navegador sin iniciar sesión (SEG-FE-04, issue #797).
export function borrarSesionOffline(): Promise<void> {
  return Promise.all([
    db.sesion_offline.clear(),
    db.dashboard_widgets.clear(),
    db.dashboard_contexto.clear(),
  ]).then(() => {}, () => {});
}
