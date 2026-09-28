import { db } from '../../shared/db/db';
import type { CicloBiologicoCacheRow } from '../../shared/db/db';

export async function cacheCiclos(idEspecie: number, items: CicloBiologicoCacheRow[]): Promise<void> {
  await db.transaction('rw', db.ciclos_biologicos, async () => {
    await db.ciclos_biologicos.where('id_especie').equals(idEspecie).delete();
    await db.ciclos_biologicos.bulkPut(items);
  });
}

export async function getCiclosCache(idEspecie: number): Promise<CicloBiologicoCacheRow[]> {
  return db.ciclos_biologicos.where('id_especie').equals(idEspecie).toArray();
}
