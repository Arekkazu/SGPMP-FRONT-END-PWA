# TC-M01-056 — Rechazo cuando la nueva contraseña y su confirmación no coinciden en restablecimiento

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU09 - Restablecer Contraseña · RF-09 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T17:40:30.774Z |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 2: Bloqueo de envío en cliente (react-hook-form) | Impidió el submit del formulario al no coincidir las contraseñas | El cliente bloqueó la transmisión del formulario sin emitir tráfico de red | **OK** |
| Checkpoint 1: Mensaje de error de mismatch en cliente (UI) | Muestra mensaje "Las contraseñas no coinciden." | Mensaje visible en UI: "Las contraseñas no coinciden." | **OK** |
| Checkpoint 3: Respuesta del Backend TEST al mismatch en restablecimiento (cy.request) | HTTP Status 400 / 422 | HTTP 404 - Respuesta del servidor: {"detail":"Not Found"} | **OBSERVACION** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema, la validación de coincidencia de contraseñas corresponde a **Interfaz/UI o navegación (Frontend / Equipo de Diseño)**. Se verifica adicionalmente la respuesta de la API del backend.

## Registro Técnico de Red (Evaluación API cy.request)
- **Datos de prueba**: Nueva `Reset#2029`, Confirmación `Reset#2030` (mismatch).
- **Detalle de Petición HTTP Real al Backend**: Llamada directa POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/autenticacion/restablecer-contrasena -> Status: 404. Respuesta: {"detail":"Not Found"}
- **Hallazgos**:
- Checkpoint 2: Bloqueo de envío en cliente (react-hook-form) -> El cliente bloqueó la transmisión del formulario sin emitir tráfico de red (OK)
- Checkpoint 1: Mensaje de error de mismatch en cliente (UI) -> Mensaje visible en UI: "Las contraseñas no coinciden." (OK)
- Checkpoint 3: Respuesta del Backend TEST al mismatch en restablecimiento (cy.request) -> HTTP 404 - Respuesta del servidor: {"detail":"Not Found"} (OBSERVACION)

## Evidencias Visuales (Capturas .PNG)
- [01_mismatch_restablecer_ui.png](screenshots/01_mismatch_restablecer_ui.png) — Formulario de restablecer contraseña con mismatch.
- [02_error_mismatch_restablecer_ui.png](screenshots/02_error_mismatch_restablecer_ui.png) — Mensaje de error de validación en la UI.
