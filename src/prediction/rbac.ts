// =====================================================================
// Módulo 4 — Predicción / IA · IDs de recursos y acciones RBAC
// Espeja modulo1.recursos / modulo1.acciones del backend
// (do-it/prediction/api_reference_m04_prediction_iot.md § permisos).
// Los IDs de recurso son datos de DB → hardcodearlos es estándar en el
// proyecto; nunca hardcodear IDs de ROL.
// =====================================================================

/** Recurso 18 — catálogo de patologías (RF-64). Admin/Vet: C,R,U,D. */
export const RECURSO_PATOLOGIAS = 18;
/** Recurso 41 — configuración del motor de inferencia (RF-65). Admin/Vet: C,R · Ing: R. */
export const RECURSO_MOTOR = 41;
/** Recurso 42 — historial diagnóstico (RF-67). Admin/Prod/Vet: R. */
export const RECURSO_HISTORIAL = 42;
/** Recurso 43 — ciclo de vida de versiones de modelos (RF-69). Admin/Vet: R,U,E. */
export const RECURSO_MODELOS = 43;
/** Recurso 44 — estado OTA / distribución (RF-70). Admin/Ing: R. */
export const RECURSO_OTA = 44;
/** Recurso 45 — retroalimentación clínica (RF-72). Vet: C · Admin/Vet: R. */
export const RECURSO_RETRO = 45;
/** Recurso 46 — bitácora de auditoría M04 (RF-73). Admin: R,E. */
export const RECURSO_AUDITORIA = 46;

export const ACCION_C = 1; // Crear
export const ACCION_R = 2; // Leer (listar / detalle)
export const ACCION_U = 3; // Actualizar
export const ACCION_D = 4; // Eliminar (desactivar)
export const ACCION_E = 5; // Ejecutar (activar / exportar)
