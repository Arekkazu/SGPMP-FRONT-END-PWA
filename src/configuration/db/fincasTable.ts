import { db } from '../../shared/db/db';
import type { FincaCacheRow } from '../../shared/db/db';

export async function cacheFincas(items: FincaCacheRow[]): Promise<void> {
  await db.config_fincas.bulkPut(items);
}

export async function getFincasCache(): Promise<FincaCacheRow[]> {
  return db.config_fincas.toArray();
}

export async function clearFincasCache(): Promise<void> {
  await db.config_fincas.clear();
}
