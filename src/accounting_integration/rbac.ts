// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-95..102: recursos RBAC de la integración contable |
// =====================================================================
// Módulo 7 — Integración contable con AgroFusion · recursos RBAC por nombre.
// Espejan `permiso("<nombre>", …)` de m07_router en el backend; su id sale
// de la secuencia y cambia entre ambientes.
// =====================================================================

export const R_EXPORTACION = 'exportacion_contable';
export const R_CLIENTES = 'clientes_externos';
export const R_CONTRATOS = 'contratos_aaef';
export const R_AUDITORIA = 'auditoria_integracion';
export const R_AUDITORIA_CIERRES = 'auditoria_integracion_cierres';

export { ACCION_C, ACCION_R, ACCION_U, ACCION_D, ACCION_E } from '../supplies/rbac';
