# TC-M01-074 — Intentar exportar auditoría sin conexión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-10 |
| Tipo / Equipo | Negativa / Offline · Frontend |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T00:53:22.478Z |
| Precondiciones | Sesión admin@pecuaria.co, vista /auditoria, 0 eventos cargados |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|


## Veredicto: NO EJECUTADO (falló la preparación / login)

## Comportamiento registrado / hallazgos
- La vista de Auditoría no muestra ningún indicador de "sin conexión".
- El export funciona offline: genera el CSV desde los eventos en memoria, sin petición de red.
- El botón "Exportar CSV" no reacciona a la conectividad; su estado depende solo de eventos.length.
- Al recargar offline aparece "Error al cargar auditoría / Ocurrió un error inesperado" (mensaje genérico, no "Sin conexión").

## Evidencia
- `screenshots/01_offline_export.png`
- `screenshots/02_offline_recargar_error.png`
- `videos/tc-m01-074-exportar-auditoria-offline.cy.ts.mp4`
