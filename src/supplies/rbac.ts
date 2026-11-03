// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: recursos RBAC del módulo de suministros |
// =====================================================================
// Módulo 5 — Suministros · IDs de recursos RBAC
// Espejan `_RECURSO` de cada router de src/supplies en el backend
// (modulo1.recursos 47-57). Son datos de BD, no de rol.
// =====================================================================

/** 47 consumo_alimentos (RF-75): C registrar · R consultar · D anular. */
export const RECURSO_CONSUMO = 47;
/** 48 medicamentos (RF-76): C registrar · R consultar · D anular. */
export const RECURSO_MEDICAMENTOS = 48;
/** 49 eficiencia_alimenticia (RF-74): R consultar · E calcular. */
export const RECURSO_ICA = 49;
/** 50 administracion_batch_ica (RF-74 Flujo C): R panel · E ejecutar/interrumpir/reintentar. */
export const RECURSO_BATCH_ICA = 50;
/** 51 reporte_gastos_suministros (RF-77): R consultar · E generar/exportar. */
export const RECURSO_GASTOS = 51;
/** 52 historial_suministros (RF-81): R consultar/exportar · E trabajos pesados. */
export const RECURSO_HISTORIAL = 52;
/** 55 costeo_directo_suministros (RF-78): C registrar · R acumulado · U corregir. */
export const RECURSO_COSTEO = 55;
/** 56 provision_nic41 (RF-79): R consultar · E consolidar/corregir. */
export const RECURSO_NIC41 = 56;
/** 57 bitacora_auditoria_suministros (RF-80): R consultar · E exportar. */
export const RECURSO_AUDITORIA = 57;

export const ACCION_C = 1;
export const ACCION_R = 2;
export const ACCION_U = 3;
export const ACCION_D = 4;
export const ACCION_E = 5;
