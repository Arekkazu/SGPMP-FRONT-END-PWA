import type { PermisoUsuario } from './AuthContext';

/** Compara dos listas de permisos sin importar el orden (RF-25, refresh de permisos en sesión). */
export function sonPermisosIguales(a: PermisoUsuario[] | null, b: PermisoUsuario[] | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;

  const clave = (p: PermisoUsuario) => `${p.id_recurso}:${p.id_accion}`;
  const setA = new Set(a.map(clave));
  const setB = new Set(b.map(clave));
  if (setA.size !== setB.size) return false;
  for (const c of setA) {
    if (!setB.has(c)) return false;
  }
  return true;
}
