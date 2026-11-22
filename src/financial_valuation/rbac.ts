// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: recursos RBAC del módulo financiero NIC 41 |
// =====================================================================
// Módulo 6 — Valoración financiera NIC 41 · recursos RBAC por nombre.
// Espejan `permiso("<nombre>", …)` de m06_router en el backend. Se ubican
// por nombre porque su id sale de la secuencia y cambia entre ambientes.
// =====================================================================

export const R_PRECIOS = 'precios_mercado';
export const R_CONFIGURACION = 'configuracion_contable';
export const R_RECONOCIMIENTO = 'reconocimiento_inicial';
export const R_VALORACION = 'valoracion_activos';
export const R_COSTOS = 'costos_activos';
export const R_CIERRE = 'cierre_periodo';
export const R_COSTO_HISTORICO = 'valoracion_por_costo';
export const R_COTIZACIONES = 'cotizaciones';
export const R_TRAZABILIDAD = 'trazabilidad_contable';
export const R_REVELACIONES = 'revelaciones_nic41';
export const R_ESTADO_RESULTADOS = 'estado_resultados';
export const R_AUDITORIA = 'auditoria_financiera';

export { ACCION_C, ACCION_R, ACCION_U, ACCION_D, ACCION_E } from '../supplies/rbac';
