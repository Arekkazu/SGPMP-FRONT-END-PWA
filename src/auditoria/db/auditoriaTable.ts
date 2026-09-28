import { db } from '../../shared/db/db';
import type { AuditoriaItemResponse } from '../types';

function ordenar(items: AuditoriaItemResponse[]): AuditoriaItemResponse[] {
  return items.sort((a, b) => (
    new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime()
    || b.id_evento - a.id_evento
  ));
}

export async function cachearEventos(items: AuditoriaItemResponse[]): Promise<void> {
  const cachedAt = Date.now();
  await db.auditoria_eventos.bulkPut(
    items.map((item) => ({ ...item, cachedAt })),
  );
}

export async function obtenerEventosCache(): Promise<AuditoriaItemResponse[]> {
  const filas = await db.auditoria_eventos.toArray();
  return ordenar(filas.map(({ cachedAt: _cachedAt, ...item }) => item));
}
