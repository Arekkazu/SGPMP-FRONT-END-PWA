# TC-M01-086 — Acceso a /perfil con JWT inválido o expirado

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU13 - Consultar Perfil · RF-13 |
| Tipo / Equipo | Pruebas de Seguridad (JWT) · Frontend & QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T17:55:57.904Z |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Protección de ruta en la UI (SPA) | Impidió el acceso a /perfil y redirigió a /login | Acceso bloqueado en el cliente; redirección exitosa a /login | **OK** |
| Checkpoint 2: Respuesta del Backend TEST a JWT inválido/expirado (cy.request / API) | HTTP Status 401 Unauthorized | HTTP 401 - Respuesta del servidor: {"error_code":"TOKEN_INVALIDO","message":"El token es inválido o ha expirado.","fields":[],"timestamp":"2026-09-01T17:55:56.838830+00:00"} | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: La seguridad de rutas corresponde de forma compartida a **Diseño/Frontend** (redirección a `/login` en la SPA si no hay token) y al **Backend** (rechazo con `HTTP 401 Unauthorized` ante llamadas con tokens alterados o caducados).

## Registro Técnico de Red (Evaluación API cy.request)
- **Token de Prueba**: JWT con firma inválida / expirado.
- **Detalle de Petición HTTP Real al Backend**: Llamada directa GET https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/me con Bearer token manipulado -> Status: 401. Respuesta: {"error_code":"TOKEN_INVALIDO","message":"El token es inválido o ha expirado.","fields":[],"timestamp":"2026-09-01T17:55:56.838830+00:00"}
- **Hallazgos**:
- Checkpoint 1: Protección de ruta en la UI (SPA) -> Acceso bloqueado en el cliente; redirección exitosa a /login (OK)
- Checkpoint 2: Respuesta del Backend TEST a JWT inválido/expirado (cy.request / API) -> HTTP 401 - Respuesta del servidor: {"error_code":"TOKEN_INVALIDO","message":"El token es inválido o ha expirado.","fields":[],"timestamp":"2026-09-01T17:55:56.838830+00:00"} (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_redireccion_login_sin_jwt.png](screenshots/01_redireccion_login_sin_jwt.png) — Intento de acceso directo a /perfil sin sesión -> Redirección automática a /login.
- [02_respuesta_backend_jwt_invalido.png](screenshots/02_respuesta_backend_jwt_invalido.png) — Respuesta HTTP 401 del backend al enviar token manipulado.
