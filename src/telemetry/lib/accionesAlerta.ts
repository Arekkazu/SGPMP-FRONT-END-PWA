// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: centraliza acciones manuales permitidas |
import type { NuevoEstadoAlerta } from '../types';

export interface PermisosAccionesAlerta {
  puedeGestionar: boolean;
  puedeDescartar: boolean;
}

/** DEV-30: VENCIDA es automática; los estados terminales no admiten acciones. */
export function accionesAlerta(estado: string, permisos: PermisosAccionesAlerta): NuevoEstadoAlerta[] {
  if (!permisos.puedeGestionar) return [];
  if (estado === 'ACTIVA') return permisos.puedeDescartar ? ['EN_ATENCION', 'DESCARTADA'] : ['EN_ATENCION'];
  if (estado === 'EN_ATENCION') return ['RESUELTA'];
  return [];
}
