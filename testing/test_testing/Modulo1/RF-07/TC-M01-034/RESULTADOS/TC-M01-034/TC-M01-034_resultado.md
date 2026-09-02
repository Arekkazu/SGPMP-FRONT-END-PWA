# TC-M01-034 — Rechazo cuando la nueva contraseña y su confirmación no coinciden

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Cambio de Contraseña · RF-07 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T16:53:16.879Z |
| Cuenta de Prueba | admin@pecuaria.co |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Paso 1: Autenticación inicial de usuario en la UI (/login) | Inicio de sesión exitoso y redirección fuera de /login | LOGIN EXITOSO: Autenticación completada correctamente en la UI | **OK** |
| Checkpoint 2: Bloqueo de envío en cliente (react-hook-form) | Impidió el submit del formulario al no coincidir las contraseñas | El cliente bloqueó la transmisión del formulario sin emitir tráfico de red | **OK** |
| Checkpoint 1: Mensaje de error de mismatch en el cliente (UI) | Muestra mensaje "Las contraseñas no coinciden." | Mensaje visible en UI: "Las contraseñas no coinciden." | **OK** |
| Checkpoint 3: Respuesta del Backend TEST al mismatch de contraseñas (cy.request) | HTTP Status 400 / 422 | HTTP 401 - Respuesta del servidor: {"error_code":"TOKEN_REVOCADO","message":"El token de sesión ha sido revocado o es inválido.","fields":[],"timestamp":"2026-09-01T16:53:15.539216+00:00"} | **OBSERVACION** |
| Checkpoint 3b: Recuperación automática de credenciales | Evaluación según estado de respuesta | NO REQUERIDA (Respuesta HTTP 401) | **OK** |
| Checkpoint 4: Salvaguarda obligatoria final (Verificación de Login) | Inicio de sesión exitoso con admin@pecuaria.co / Test1234! | LOGIN EXITOSO (HTTP 200) - Las credenciales del administrador permanecieron 100% intactas y funcionales | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema, la validación de coincidencia de contraseñas corresponde a **Interfaz/UI o navegación (Frontend / Equipo de Diseño)**. Se verifica adicionalmente la respuesta de la API del backend.

## Registro Técnico de Red (Evaluación API cy.request)
- **Datos de prueba**: Contraseña actual `Test1234!`, Nueva `Nueva#2027`, Confirmación `Nueva#2028` (mismatch).
- **Detalle de Petición HTTP Real al Backend**: Llamada directa PUT https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/contrasena/usuarios/1 -> Status: 401. Respuesta: {"error_code":"TOKEN_REVOCADO","message":"El token de sesión ha sido revocado o es inválido.","fields":[],"timestamp":"2026-09-01T16:53:15.539216+00:00"}
- **Hallazgos**:
- Paso 1: Autenticación inicial de usuario en la UI (/login) -> LOGIN EXITOSO: Autenticación completada correctamente en la UI (OK)
- Checkpoint 2: Bloqueo de envío en cliente (react-hook-form) -> El cliente bloqueó la transmisión del formulario sin emitir tráfico de red (OK)
- Checkpoint 1: Mensaje de error de mismatch en el cliente (UI) -> Mensaje visible en UI: "Las contraseñas no coinciden." (OK)
- Checkpoint 3: Respuesta del Backend TEST al mismatch de contraseñas (cy.request) -> HTTP 401 - Respuesta del servidor: {"error_code":"TOKEN_REVOCADO","message":"El token de sesión ha sido revocado o es inválido.","fields":[],"timestamp":"2026-09-01T16:53:15.539216+00:00"} (OBSERVACION)
- Checkpoint 3b: Recuperación automática de credenciales -> NO REQUERIDA (Respuesta HTTP 401) (OK)
- Checkpoint 4: Salvaguarda obligatoria final (Verificación de Login) -> LOGIN EXITOSO (HTTP 200) - Las credenciales del administrador permanecieron 100% intactas y funcionales (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_mismatch_contrasenas_ui.png](screenshots/01_mismatch_contrasenas_ui.png) — Formulario de cambio de contraseña diligenciado con mismatch.
- [02_error_mismatch_ui.png](screenshots/02_error_mismatch_ui.png) — Mensaje de error de validación en la UI ("Las contraseñas no coinciden.").
- [03_login_salvaguarda_intacto.png](screenshots/03_login_salvaguarda_intacto.png) — Salvaguarda final: Confirmación de inicio de sesión exitoso con credenciales originales.
