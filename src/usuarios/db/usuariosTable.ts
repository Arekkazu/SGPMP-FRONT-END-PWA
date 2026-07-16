import { db } from '../../shared/db/db';
import type { UsuarioCacheRow } from '../../shared/db/db';

export async function cacheUsuarios(items: UsuarioCacheRow[]): Promise<void> {
  await db.usuarios.bulkPut(items);
}

export async function getUsuariosCache(): Promise<UsuarioCacheRow[]> {
  return db.usuarios.toArray();
}

export async function clearUsuariosCache(): Promise<void> {
  await db.usuarios.clear();
}
