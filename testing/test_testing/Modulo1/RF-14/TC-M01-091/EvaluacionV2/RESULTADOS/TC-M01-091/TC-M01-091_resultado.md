# TC-M01-091 — Generar notificación por correo y notificación interna simultáneamente

| Campo | Valor |
|---|---|
| Requisito | RF-14 |
| Herramienta | Cypress |
| Usuario | u20212200102@usco.edu.co |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Fecha | 2026-09-15T02:28:30.635Z |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| POST /sesiones/ | HTTP 200 + JWT válido | HTTP 200 + JWT recibido | **OK** |
| GET /notificaciones | HTTP 200 + evento CAMBIO_CONTRASENA visible | HTTP 200 + evento tipo 6 encontrado | **OK** |
| Bandeja interna UI | La interfaz muestra la notificación Cambio de contraseña | Notificación visible en la bandeja | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Evidencia

- CAMBIO_CONTRASENA se consulta en la bandeja interna mediante GET /notificaciones.
- El despacho EMAIL y su estado SMTP se validan en la prueba Pytest del servicio central; Cypress valida la representación interna.
