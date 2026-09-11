import { db } from '../../shared/db/db';
import type { EspecieCacheRow } from '../../shared/db/db';

export async function cacheEspecies(items: EspecieCacheRow[]): Promise<void> {
  await db.config_especies.bulkPut(items);
}

export async function getEspeciesCache(): Promise<EspecieCacheRow[]> {
  return db.config_especies.toArray();
}

export async function clearEspeciesCache(): Promise<void> {
  await db.config_especies.clear();
}
