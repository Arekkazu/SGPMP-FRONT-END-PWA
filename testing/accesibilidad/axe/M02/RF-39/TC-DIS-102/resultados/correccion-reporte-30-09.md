# TC-DIS-102 — Corrección del reporte del 30/09/2026

El reporte del 30/09 indicaba "sin auditorías fallidas" en Lighthouse, pero el JSON de ese día muestra
`label-content-name-mismatch` fallida (WCAG 2.5.3, botón de notificaciones del AppBar): aria-label
"Notificaciones (466 sin leer)" frente a la insignia visible "99+". Se registra ahora.

En el re-test del 07/10/2026 no se reproduce: depende del contador de notificaciones de la cuenta
(30/09: "99+"; 07/10: 30–31, varía durante la ejecución) y no hay cambios en el AppBar desde el 30/09;
el defecto sigue vigente.
