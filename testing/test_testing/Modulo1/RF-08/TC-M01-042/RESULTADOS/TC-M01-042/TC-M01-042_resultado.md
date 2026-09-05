# TC-M01-042 — Rechazo de correo electrónico con formato inválido en recuperación de contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Recuperación de contraseña · RF-08 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T18:38:22.455Z |
| Precondiciones | Vista /recuperar-contrasena disponible |
| Dato de prueba | Cuenta QA `ana.martinez.qa1@sgpmp-test.com` sin su dominio: `ana.martinez.qa1` |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Mensaje de error de formato en el cliente (UI) | Muestra mensaje "Formato de correo inválido." | Mensaje visible en pantalla: "Formato de correo inválido." | **OK** |
| Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form) | Permanecer en /recuperar-contrasena sin emitir tráfico de red | react-hook-form impidió la navegación y la emisión del formulario en el navegador | **OK** |
| Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request) | HTTP Status 400 (Bad Request, según RF-08) | HTTP 400 - Respuesta del servidor: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T18:38:22.688021+00:00"} | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Registro Técnico de Red (Llamada Directa API cy.request)
- **Datos de prueba**: Correo inválido `ana.martinez.qa1` (sin @ ni dominio).
- **Detalle de Petición HTTP Real al Backend**: Llamada directa HTTP POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/contrasena/recuperar -> Status: 400. Respuesta: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T18:38:22.688021+00:00"}
- **Hallazgos**:
- Checkpoint 1: Mensaje de error de formato en el cliente (UI) -> Mensaje visible en pantalla: "Formato de correo inválido." (OK)
- Checkpoint 2: Bloqueo de navegación/envío en el cliente (react-hook-form) -> react-hook-form impidió la navegación y la emisión del formulario en el navegador (OK)
- Checkpoint 3: Respuesta del Backend TEST al recibir payload con correo inválido (cy.request) -> HTTP 400 - Respuesta del servidor: {"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"correo_electronico","message":"value is not a valid email address: An email address must have an @-sign."}],"timestamp":"2026-09-01T18:38:22.688021+00:00"} (OK)

## Evidencias Visuales (Capturas .PNG)
- [01_correo_invalido_ui.png](screenshots/01_correo_invalido_ui.png) — Alerta de error de formato en el campo de correo en la UI del cliente.
- [02_bloqueo_envio_ui.png](screenshots/02_bloqueo_envio_ui.png) — Estado visual de la interfaz de recuperación tras el intento de submit.
