// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: exige permisos efectivos U y D |
import { useAuth } from '../../shared/auth/useAuth';
import { usePermission } from '../../shared/rbac/usePermission';
import { ACCION_D, ACCION_U, RECURSO_ALERTAS } from '../rbac';

/** Permisos efectivos de /sesiones/me/permisos; nunca inferidos del rol. */
export function useAccionesAlerta() {
  const { token, isBootstrapping, sesionOffline } = useAuth();
  const actualizar = usePermission(RECURSO_ALERTAS, ACCION_U);
  const descartar = usePermission(RECURSO_ALERTAS, ACCION_D);
  const sesionLista = !!token && !isBootstrapping && !sesionOffline;
  const puedeGestionar = sesionLista && actualizar;
  return { puedeGestionar, puedeDescartar: puedeGestionar && descartar };
}
