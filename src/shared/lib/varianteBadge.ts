import type { BadgeVariant } from '../design-system/Badge';

/**
 * Mapea el nombre de un rol (dato del backend, ej. "Administrador",
 * "Ingeniero Agrónomo") a la variante de `Badge` del sistema de diseño.
 *
 * Los ids de rol son datos de DB y el catálogo crece (ver CLAUDE.md RBAC):
 * nada de hardcodear ids; se clasifica por subcadena estable del nombre.
 */
export function varianteRol(nombreRol: string): BadgeVariant {
  const n = nombreRol.toLowerCase();
  if (n.includes('admin')) return 'admin';
  if (n.includes('vet')) return 'veterinario';
  if (n.includes('cont')) return 'contador';
  if (n.includes('ing')) return 'ingeniero';
  if (n.includes('prod')) return 'productor';
  return 'neutral';
}

/** Mapea el estado de cuenta (dato del backend) a la variante semántica. */
export function varianteEstado(estado: string): BadgeVariant {
  const n = estado.toLowerCase();
  if (n === 'activo') return 'activo';
  if (n === 'inactivo') return 'inactivo';
  if (n === 'bloqueado') return 'bloqueado';
  if (n === 'pendiente') return 'pendiente';
  if (n === 'eliminado') return 'eliminado';
  return 'neutral';
}
