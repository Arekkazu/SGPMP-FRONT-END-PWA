# TC-M01-060 — Flujo E2E Recuperación y Restablecimiento de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | RF-08 · RF-09 · RF-02 |
| Tipo / Equipo | E2E · QA |
| Ambiente (front) | http://localhost:5174 |
| Backend | http://localhost:8000/api |
| Navegador | Electron 118 (headless) |
| Fecha ejecución | 2026-09-03T03:45:05.490Z |
| Precondiciones | Mailpit corriendo en localhost:8025, backend en localhost:8000, usuario supervisor.dev@gmail.com en BD |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| POST /contrasena/recuperar | HTTP 200 — correo enviado a Mailpit | HTTP 202 — {"message":"Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña en unos minutos."} | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Nota de Clasificación QA
> **BLOQUEANTE IDENTIFICADO**: El endpoint `POST /api/contrasena/recuperar` responde HTTP 202 pero **no genera token en BD** (tabla `modulo1.tokens` sin registros de tipo `recuperacion`) y **no envía correo a Mailpit**. Los Pasos 2, 3 y 4 están bloqueados por este defecto del backend (RF-08).

## Registro Técnico
- **Infraestructura verificada**: Mailpit accesible en localhost:8025, SMTP funcional (puerto 1025), red Docker correcta.
- **Bug confirmado**: Backend responde 202 sin crear token ni enviar correo. Verificado en BD remota 158.69.200.27:5448 — 0 registros en modulo1.tokens con token_tipo='recuperacion'.
- **Hallazgos**:
  - POST /contrasena/recuperar → HTTP 202 — {"message":"Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña en unos minutos."} (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_formulario_recuperacion.png](screenshots/tc-m01-060-recuperacion-e2e.cy.ts/01_formulario_recuperacion.png) — Formulario de recuperación con correo ingresado.

## Defectos Reportados
| ID | Descripción | Severidad | Responsable |
|---|---|---|---|
| DEF-001 | POST /api/contrasena/recuperar responde 202 pero no genera token ni envía correo | Alta | Backend |
| DEF-002 | usuario member_qa sin permisos en tabla configuracion_batch_exportacion_auditoria | Media | Backend/DBA |
