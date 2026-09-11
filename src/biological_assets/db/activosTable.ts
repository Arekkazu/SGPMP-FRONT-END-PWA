import { db } from '../../shared/db/db';
import type { ActivoBiologicoCacheRow } from '../../shared/db/db';

/** Reemplaza la caché completa de la lista de activos (read-only offline). */
export async function cacheActivos(items: ActivoBiologicoCacheRow[]): Promise<void> {
  await db.transaction('rw', db.activos_biologicos, async () => {
    await db.activos_biologicos.clear();
    await db.activos_biologicos.bulkPut(items);
  });
}

export async function getActivosCache(): Promise<ActivoBiologicoCacheRow[]> {
  return db.activos_biologicos.toArray();
}

export async function clearActivosCache(): Promise<void> {
  await db.activos_biologicos.clear();
}
