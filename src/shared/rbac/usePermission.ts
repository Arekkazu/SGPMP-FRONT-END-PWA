import { useAuth } from '../auth/useAuth';

export function usePermission(idRecurso: number, idAccion: number): boolean {
  const { permisos } = useAuth();
  if (permisos === null) return false;
  return permisos.some(
    (p) => p.id_recurso === idRecurso && p.id_accion === idAccion
  );
}
