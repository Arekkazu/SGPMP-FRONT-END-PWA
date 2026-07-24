// =====================================================================
// Módulo 2 — Activos Biológicos · IDs de recursos y acciones RBAC
// Espeja modulo1.recursos / modulo1.acciones del backend.
// Se centralizan como consts para legibilidad (los IDs son datos de DB,
// no de rol — hardcodear IDs de RECURSO/ACCIÓN es aceptable y estándar
// en el proyecto; nunca hardcodear IDs de ROL).
// =====================================================================

/** Recurso 29 — todas las operaciones sobre el activo biológico. */
export const RECURSO_ACTIVOS = 29;
/** Recurso 30 — asociar sensor IoT a un activo. */
export const RECURSO_SENSOR_ACTIVO = 30;
/** Recurso 31 — lectura de la bitácora de auditoría del módulo. */
export const RECURSO_AUDITORIA_M02 = 31;

export const ACCION_C = 1; // Crear
export const ACCION_R = 2; // Leer
export const ACCION_U = 3; // Actualizar
export const ACCION_D = 4; // Eliminar / Desactivar (cierre de ciclo)
export const ACCION_E = 5; // Ejecutar (estado, fases, transferencias)
