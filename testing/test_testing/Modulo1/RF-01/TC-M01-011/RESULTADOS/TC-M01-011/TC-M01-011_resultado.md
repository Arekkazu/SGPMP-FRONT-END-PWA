# TC-M01-011 — Rechazo de registro por reCAPTCHA no resuelto / fallido

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU01 - Registro de Usuario · RF-01 |
| Tipo / Equipo | Manejo de Seguridad / reCAPTCHA · Frontend / Backend QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T00:20:03.400Z |
| Precondiciones | Formulario /registro con reCAPTCHA activado |

> [!WARNING]
> **ACLARACIÓN SOBRE EL AMBIENTE Y EL RECAPTCHA SIMULADO**:
> - El reCAPTCHA en el ambiente de **TEST** se encuentra **SIMULADO** (no corresponde al reCAPTCHA real de producción o con claves de test oficiales de Google).
> - Las respuestas HTTP obtenidas en las llamadas directas a la API (Escenario A (Token Vacío): POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 201 | Escenario B (Token Inválido): POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 201) se deben a esta simulación del entorno y **NO confirman ni descartan una vulnerabilidad real del backend**.
> - Por este motivo, el veredicto del caso es **NO APROBADO — no se puede validar en este ambiente (CAPTCHA simulado)**.
> - Se requiere ejecutar esta prueba en un ambiente con reCAPTCHA en modo test real (claves de prueba de Google) para dar un veredicto definitivo de seguridad.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Bloqueo de envío en la interfaz (UI) | Botón "Registrarse" deshabilitado en UI cuando captcha_token es nulo | El botón "Registrarse" permanece deshabilitado en la interfaz sin token de CAPTCHA | **OK** |
| Checkpoint 2: Respuesta HTTP de la API con CAPTCHA NO RESUELTO (captcha_token vacío) | HTTP 400 (Rechazo por CAPTCHA no resuelto en ambiente real) | HTTP 201 Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST) | **OBSERVACION** |
| Checkpoint 3: Respuesta HTTP de la API con CAPTCHA FALLIDO (captcha_token inválido/expirado) | HTTP 400 (Rechazo por CAPTCHA inválido en ambiente real) | HTTP 201 Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST) | **OBSERVACION** |
| Checkpoint 4: Veredicto Global de Seguridad en Ambiente de TEST | Rechazo por CAPTCHA verificado en ambiente con claves oficiales de prueba de Google | NO APROBADO: No es posible validar la seguridad en este ambiente de TEST (CAPTCHA simulado). Petición Token Vacío devuelven 201 y Token Inválido devuelve 201 | **OBSERVACION** |

## Veredicto: **NO APROBADO — no se puede validar en este ambiente (CAPTCHA simulado)**

## Registro Técnico de Red (Peticiones HTTP a la API)
- Escenario A (Token Vacío): POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 201
- Escenario B (Token Inválido): POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 201

## Hallazgos y Observaciones Técnicas
- Checkpoint 1: Bloqueo de envío en la interfaz (UI) -> El botón "Registrarse" permanece deshabilitado en la interfaz sin token de CAPTCHA (OK)
- Checkpoint 2: Respuesta HTTP de la API con CAPTCHA NO RESUELTO (captcha_token vacío) -> HTTP 201 Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST) (OBSERVACION)
- Checkpoint 3: Respuesta HTTP de la API con CAPTCHA FALLIDO (captcha_token inválido/expirado) -> HTTP 201 Creado (Respuesta obtenida por estar el reCAPTCHA SIMULADO en este ambiente de TEST) (OBSERVACION)
- Checkpoint 4: Veredicto Global de Seguridad en Ambiente de TEST -> NO APROBADO: No es posible validar la seguridad en este ambiente de TEST (CAPTCHA simulado). Petición Token Vacío devuelven 201 y Token Inválido devuelve 201 (OBSERVACION)

## Evidencias Visuales (Capturas .PNG)
- [01_registro_ui_captcha.png](screenshots/01_registro_ui_captcha.png) — Formulario de registro en UI (Paso 2) con botón de envío deshabilitado cuando el CAPTCHA no ha sido resuelto.
