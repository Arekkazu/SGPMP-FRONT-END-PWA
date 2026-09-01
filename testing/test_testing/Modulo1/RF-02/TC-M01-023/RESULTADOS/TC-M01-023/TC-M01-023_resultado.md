# TC-M01-023 — Rechazo de correo electrónico con formato inválido en inicio de sesión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU02 - Inicio de Sesión · RF-02 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T07:12:19.651Z |
| Precondiciones | Vista /login disponible |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Mensaje de error de formato en el cliente (UI) | Muestra mensaje "El formato del correo electrónico no es válido." | Mensaje visible en pantalla: "El formato del correo electrónico no es válido." | **OK** |
| Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form) | Permanecer en /login sin emitir tráfico de red | react-hook-form impidió la navegación y la emisión del formulario en el navegador | **OK** |
| Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request) | HTTP Status 400 / 422 (Rechazo por validación de entrada) | HTTP 400 - Respuesta del servidor: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T07:12:24.981298+00:00"} | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema (Fase Desarrollo / Herramienta Cypress), este caso corresponde a **Interfaz/UI o navegación; le corresponde al equipo de Diseño** (Validación de formato en frontend; confirmar si también se valida en backend).

## Registro Técnico de Red (Llamada Directa API cy.request)
- **Datos de prueba**: Correo inválido `ana.martinez.qa1` (sin @ ni dominio).
- **Detalle de Petición HTTP Real al Backend**: Llamada directa HTTP POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/sesiones/ -> Status: 400. Respuesta: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T07:12:24.981298+00:00"}
- **Hallazgos**:
- Checkpoint 1: Mensaje de error de formato en el cliente (UI) -> Mensaje visible en pantalla: "El formato del correo electrónico no es válido." (OK)
- Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form) -> react-hook-form impidió la navegación y la emisión del formulario en el navegador (OK)
- Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request) -> HTTP 400 - Respuesta del servidor: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T07:12:24.981298+00:00"} (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_correo_invalido_ui.png](screenshots/01_correo_invalido_ui.png) — Alerta de error de formato en el campo de correo en la UI del cliente.
- [02_respuesta_backend_login.png](screenshots/02_respuesta_backend_login.png) — Estado visual de la interfaz de login tras el intento de submit.
