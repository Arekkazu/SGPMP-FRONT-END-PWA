// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | FE-09 RF-17: usePermissionPorNombre para recursos sin id fijo |
import { useAuth } from '../auth/useAuth';

export function usePermission(idRecurso: number, idAccion: number): boolean {
  const { permisos } = useAuth();
  if (permisos === null) return false;
  return permisos.some(
    (p) => p.id_recurso === idRecurso && p.id_accion === idAccion
  );
}

/** Como `usePermission`, pero ubica el recurso por nombre: su id sale de la secuencia
 *  y cambia entre ambientes (p. ej. `variables_ambientales_criticas`). */
export function usePermissionPorNombre(nombreRecurso: string, idAccion: number): boolean {
  const { permisos } = useAuth();
  if (permisos === null) return false;
  return permisos.some(
    (p) => p.nombre_recurso === nombreRecurso && p.id_accion === idAccion
  );
}
