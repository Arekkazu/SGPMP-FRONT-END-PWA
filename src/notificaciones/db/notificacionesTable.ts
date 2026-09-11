import { db, type FcmRegistroCacheRow } from '../../shared/db/db';
import type { NotificacionInternaResponse } from '../types';

function ordenarPorFecha(
  items: NotificacionInternaResponse[],
): NotificacionInternaResponse[] {
  return items.sort((a, b) => (
    new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime()
    || b.id_notificacion - a.id_notificacion
  ));
}

export async function reemplazarNotificacionesCache(
  idUsuario: number,
  items: NotificacionInternaResponse[],
): Promise<void> {
  const cachedAt = Date.now();
  await db.transaction('rw', db.notificaciones, async () => {
    await db.notificaciones.where('id_usuario').equals(idUsuario).delete();
    await db.notificaciones.bulkPut(
      items.map((item) => ({ ...item, id_usuario: idUsuario, cachedAt })),
    );
  });
}

export async function guardarNotificacionesCache(
  idUsuario: number,
  items: NotificacionInternaResponse[],
): Promise<void> {
  const cachedAt = Date.now();
  await db.notificaciones.bulkPut(
    items.map((item) => ({ ...item, id_usuario: idUsuario, cachedAt })),
  );
}

export async function obtenerNotificacionesCache(
  idUsuario: number,
): Promise<NotificacionInternaResponse[]> {
  const rows = await db.notificaciones.where('id_usuario').equals(idUsuario).toArray();
  return ordenarPorFecha(rows.map(({ id_usuario: _usuario, cachedAt: _cache, ...item }) => item));
}

export async function actualizarLecturaCache(
  idUsuario: number,
  notificacion: NotificacionInternaResponse,
): Promise<void> {
  await db.notificaciones.update([idUsuario, notificacion.id_notificacion], {
    ...notificacion,
    cachedAt: Date.now(),
  });
}

export async function obtenerRegistroFcm(
  idUsuario: number,
): Promise<FcmRegistroCacheRow | undefined> {
  return db.fcm_registros.get(idUsuario);
}

export async function guardarRegistroFcm(idUsuario: number, token: string): Promise<void> {
  await db.fcm_registros.put({
    id_usuario: idUsuario,
    token,
    registradoEn: Date.now(),
  });
}
