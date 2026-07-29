// =====================================================================
// Módulo 3 — Telemetría IoT · IDs de recursos y acciones RBAC
// Espeja modulo1.recursos / modulo1.acciones del backend.
// Los IDs son datos de DB (no de rol) → hardcodearlos es aceptable y
// estándar en el proyecto; nunca hardcodear IDs de ROL.
// =====================================================================

/** Recurso 32 — alertas operativas (ambientales/sanitarias). */
export const RECURSO_ALERTAS = 32;
/** Recurso 33 — dashboard de monitoreo en tiempo real. */
export const RECURSO_MONITOREO = 33;
/** Recurso 34 — historial de lecturas + exportación. */
export const RECURSO_HISTORIAL = 34;
/** Recurso 35 — infraestructura / estado de dispositivos IoT. */
export const RECURSO_INFRAESTRUCTURA = 35;
/** Recurso 36 — alertas técnicas de dispositivos (solo Admin/Ingeniero). */
export const RECURSO_ALERTAS_TECNICAS = 36;
/** Recurso 37 — vinculaciones lectura ↔ activo biológico. */
export const RECURSO_VINCULACIONES = 37;
/** Recurso 38 — calidad de telemetría. */
export const RECURSO_CALIDAD = 38;
/** Recurso 39 — bitácora de auditoría IoT. */
export const RECURSO_BITACORA = 39;

export const ACCION_R = 2; // Leer (listar / detalle)
export const ACCION_U = 3; // Actualizar (cambiar estado / resolver / corregir)
export const ACCION_E = 5; // Ejecutar (exportar / evaluar / reevaluar / verificar)
