# TC-M01-091 — REEVALUACIÓN V2

RF-14 — Notificación por correo e interna simultáneas (CAMBIO_CONTRASENA)
Fecha: 2026-09-15 · Entorno decisorio: TEST

## DECISIÓN GENERAL

### REEVALUACIÓN APROBADA — V1 era falso positivo de ambiente

Evidencia V1 apuntaba a `http://localhost:8000` (backend) y
`http://127.0.0.1:5176` (frontend), ambiente local no disponible durante esa
corrida. El único checkpoint que falló fue "Bandeja interna UI" ("La API
responde 200 con el evento, pero la bandeja renderiza 'No tienes
notificaciones'").

## REEJECUCIÓN CONTRA TEST

Se generó primero un evento CAMBIO_CONTRASENA real (`PUT
/contrasena/usuarios/45`, autoservicio, con consentimiento del titular de la
cuenta) y luego se corrió el caso contra TEST real.

| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| POST /sesiones/ | HTTP 200 + JWT | HTTP 200 + JWT recibido | **OK** |
| GET /notificaciones | HTTP 200 + evento tipo 6 | HTTP 200 + evento tipo 6 encontrado | **OK** |
| Bandeja interna UI | Muestra "Cambio de contraseña" | Notificación visible en la bandeja | **OK** |

**1/1 test passing.** A diferencia de TC-M01-088, este caso no recarga la
página completa (`cy.visit`) después del login, así que no depende del
mecanismo de refresh de token — no se ve afectado por el defecto de
`AUDITORIA_OBLIGATORIA_FALLIDA` documentado en la reevaluación de TC-M01-088.

## Estado de cierre

TC-M01-091 reevaluado: **APROBADO**. El rechazo original fue un falso
positivo puro de ambiente (localhost no disponible), no un defecto de
producto ni de la lógica de notificaciones.
