# TC-M01-109 — Pérdida de Conexión Intermitente en Flujos de Identidad (RF-01, RF-02, RF-07, RF-08, RF-09)

| Campo | Valor |
|---|---|
| Caso de prueba | TC-M01-109 |
| Requisitos | Transversal: RF-01, RF-02, RF-07, RF-08, RF-09 |
| Tipo / Equipo | Pruebas Extremas / Interrupción Intermitente · QA Team |
| Modo de Ejecución | **Fase B (Punto 2)** — 2 Caídas Simuladas + Verificación de Recuperación de Contraseña |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-06T00:12:15.709Z |
| Cuenta Sujeto Auth | jusebas73@gmail.com (ID: 93) |
| Cuenta Sujeto Recuperación | jusebas73@gmail.com (Cuenta personal comprobada por el usuario) |
| Fallas Previas Auditadas (N) | 0 |
| Intento Esperado CP-05 | Intento 1 de 5 |
| Caídas Simuladas Previas (UI) | **2 de 2** |
| Peticiones a /contrasena/recuperar | Procesadas según flujo |

## Contexto de Ejecución y Validaciones Técnicas
> [!INFO]
> **1. Comprobación de Token Único**: El usuario comprobó que solo llegó un token válido de restablecimiento de contraseña.  
> **2. Validación CP-06**: Confirmada la no-duplicidad de tokens en la prueba.  
> **3. Resiliencia RF-02 y RF-07**: Sesión única y contador de fallas verificados correctamente (Token A revocado; Intento 1 de 5 registrado).  
> **4. Teardown (CP-07)**: La contraseña de `jusebas73@gmail.com` fue restaurada exitosamente a `Test1234!`.

## Estado de Restauración de la Cuenta (CP-07)
> [!NOTE]
> **RESTAURACIÓN EXITOSA DE CUENTA**: La contraseña de `jusebas73@gmail.com` fue restaurada satisfactoriamente a su valor original (`Test1234!`).

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Precondición Cuenta Sujeto Auth | Cuenta jusebas73@gmail.com existente y activa (HTTP 200) | Cuenta encontrada ID: 93, Estado: Activo | **OK** |
| CP-02: RF-02 Login UI Interrumpido + Captura Token A | POST /sesiones/ procesado por backend (Token A emitido); cliente recibe Network Error | Token A capturado (eyJhbGciOiJIUzI...); cliente experimentó caída de red | **OK** |
| CP-03: RF-02 Verificación de Sesión Única | Token A EXIGE HTTP 401 (TOKEN_REVOCADO) y Token B responde HTTP 200 OK | Token A rechazado (HTTP 401); Token B activo (HTTP 200 OK) — Sesión única garantizada | **OK** |
| CP-04: RF-07 Cambio de Clave Interrumpido | PUT procesado en backend (clave actualizada a Reset#2029); cliente recibe Network Error | Caída de red simulada en respuesta recibida por el cliente | **OK** |
| CP-05: RF-07 Reintento Manual con Clave Obsoleta | EXIGE STRICTAMENTE HTTP 401 Unauthorized conteniendo "Intento 1 de 5" | HTTP 401 (CONTRASENA_ACTUAL_INCORRECTA) — Contador incrementado a Intento 1 de 5 (bloqueo a 30 min). Hallazgo de QA verificado | **OK** |
| CP-06: RF-08/RF-09 Recuperación Intermitente | Verificación de generación de token de recuperación sin duplicidad | El usuario comprobó que solo llegó un token válido de restablecimiento de contraseña. | **OK** |
| CP-07: Restauración de Contraseña Original | Reversión exitosa a Test1234! (HTTP 200 OK) y verificación de login | Contraseña de jusebas73@gmail.com restaurada a Test1234!. Login final HTTP 200 OK | **OK** |

## Veredicto Final: **SIN FALLAS BLOQUEANTES**
> [!NOTE]
> **Veredicto Final: SIN FALLAS BLOQUEANTES** — Todos los checkpoints de la prueba (CP-01 a CP-07) fueron validados satisfactoriamente.

## Hallazgos y Observaciones Técnicas
- **RF-08 / RF-09 (Check CP-06)**: El usuario comprobó que solo llegó un token válido de restablecimiento de contraseña, confirmando el correcto comportamiento del flujo sin duplicidad de tokens.
- **RF-02 (Sesión Única)**: Invalidation de Token A tras emisión de Token B (HTTP 401 TOKEN_REVOCADO).
- **RF-07 (Contador de Fallas)**: Incremental Intento 1 de 5 en reintento con clave obsoleta.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondiciones-cuenta.png](screenshots/01-precondiciones-cuenta.png) — Verificación de cuentas sujeto y fallas previas en auditoría.
- [02-corte-red-login.png](screenshots/02-corte-red-login.png) — Interrupción de red en POST /sesiones/ (Token A capturado).
- [03-sesion-unica-token-revocado.png](screenshots/03-sesion-unica-token-revocado.png) — Verificación Token A (401) vs Token B (200 OK).
- [04-corte-red-cambio-clave.png](screenshots/04-corte-red-cambio-clave.png) — Interrupción de red en PUT /contrasena/usuarios/93.
- [05-reintento-injusto-contador.png](screenshots/05-reintento-injusto-contador.png) — Reintento con clave obsoleta e incremento de contador a Intento N+1.
- [06-recuperacion-real-guardrail.png](screenshots/06-recuperacion-real-guardrail.png) — Formulario de recuperación ejecutado con caídas simuladas.
- [07-restauracion-contrasena.png](screenshots/07-restauracion-contrasena.png) — Reversión exitosa de contraseña a Test1234!.
- [tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4](videos/tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4) — Grabación en video.
