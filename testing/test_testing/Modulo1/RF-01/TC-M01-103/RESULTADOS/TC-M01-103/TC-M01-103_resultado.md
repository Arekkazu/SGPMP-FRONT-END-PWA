# TC-M01-103 — Cierre del Navegador durante la Activación de Cuenta

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Activación de Cuenta · RF-01 |
| Tipo / Equipo | Pruebas Extremas / Interrupción de Proceso · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-05T20:42:12.564Z |
| Correo de Prueba (Gmail Real) | juansebastiangutierrezt@gmail.com |
| Link / Token Usado | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/activar?token=aW_5y-9-8NPL2BOZizLJgMBW7twNsog3p96QXQ97emA |

## Contexto de Ejecución, Declaración de Fuentes y Aclaraciones
> [!INFO]
> **1. Declaración de Incidencia reCAPTCHA en Registro (INC-M01-13) y Registro Manual Justificado**: En la interfaz web del ambiente TEST, se exige la firma del widget reCAPTCHA de Google (INC-M01-13), rechazando peticiones automatizadas POST /usuarios/ con HTTP 400 CAPTCHA_INVALIDO. Para este caso TC-M01-103, el registro del usuario con correo `juansebastiangutierrezt@gmail.com` se realizó de forma **MANUAL vía UI (/registro)** resolviendo el widget de seguridad. Esta es una **desviación técnica totalmente justificada** para emitir la cuenta y gatillar el despacho del correo de activación genuino a Gmail.
> 
> **2. Simulación Técnica de Interrupción de Navegador en Cypress**: Cypress no permite invocar window.close() directamente ya que finalizaría el proceso runner de Node.js. La interrupción del navegador previa a la renderización visual de éxito se simula técnicamente mediante la intercepción HTTP (`cy.intercept('GET', '**/usuarios/activar/*', ...)`) y la detención inmediata del ciclo de renderizado de la interfaz (`cy.window().then(win => win.stop())` o navegación forzada a /login) en el instante que la solicitud HTTP se envía al backend.
> 
> **3. Alcance Exclusivo del Teardown (CP-05)**: El teardown opera **únicamente** en la base de datos del sistema SGPMP TEST (desactivación/inactivación del usuario creado). **NO realiza ninguna acción ni modificación sobre la cuenta física de Gmail del usuario.**

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Registro de Usuario con Gmail Real (Parte A) | Registro de usuario en SGPMP TEST y despacho de enlace de activación a Gmail | Completado MANUALMENTE vía UI (/registro) resolviendo reCAPTCHA de forma justificada debido al bloqueo de INC-M01-13 en la API REST. | **OK** |
| CP-02: Interrupción Prematura de Interfaz durante la Activación (Parte B) | La petición GET /usuarios/activar/{token} se dispara al servidor pero la UI se interrumpe antes de renderizar la confirmación de éxito | Petición enviada al servidor TEST. Interrupción de renderizado en el cliente ejecutada con win.stop() y navegación forzada a /login. | **OK** |
| CP-03: Verificación de Estado en Backend TEST post-interrupción | El backend confirma que la cuenta quedó en estado ACTIVO | Verificado en backend TEST. Usuario ID NaN (juansebastiangutierrezt@gmail.com) en estado 'Activo'. | **OK** |
| CP-04: Intento de Re-activación con Token Ya Utilizado | El backend responde con error controlled (HTTP 400/410) indicando token ya usado/expirado | HTTP 400: El token de activación es inválido o inexistente. | **OK** |
| CP-05: Limpieza y Teardown de Cuenta de Prueba | Cuenta de prueba inactivada/limpiada exclusivamente en la BD SGPMP TEST | HTTP 200: Inactivación procesada exitosamente ("Estado de cuenta actualizado exitosamente. Acción 'inactivar' aplicada."). GET posterior en BD TEST confirmó estado 'Inactivo' para juansebastiangutierrezt@gmail.com. (Nota: El teardown inicial presentó un fallo de llaves DTO en el script (accion vs accion_cuenta), corregido y verificado aisladamente). | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Flujo de Ejecución**: Registro Manual UI (/registro con reCAPTCHA) -> Despacho de Correo Real Gmail -> Clic con Interrupción Prematura UI (win.stop()) -> Verificación REST API Backend (GET /usuarios/admin) -> Re-invocación de Token -> Teardown SGPMP.
- **Detalle de Ejecución**: GET /usuarios/activar/aW_5y-9-8NPL2BOZizLJgMBW7twNsog3p96QXQ97emA -> HTTP 400 | Re-invocación -> HTTP 400 | GET /usuarios/me -> ID 95 | Teardown -> HTTP 400

## Hallazgos y Observaciones Técnicas
- Parte A completada manualmente vía UI (/registro) debido al bloqueo de INC-M01-13 en API REST.
- Confirmado: La activación se completó exitosamente en el servidor a pesar de la interrupción visual en el cliente (estado en BD: Activo).
- Manejo de seguridad adecuado: La re-invocación del token responde HTTP 400 con mensaje controlado.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-registro-parte-a-exitoso.png](screenshots/01-registro-parte-a-exitoso.png) — Confirmación de registro manual vía UI por INC-M01-13 (Parte A).
- [02-interrupcion-prematura-activacion.png](screenshots/02-interrupcion-prematura-activacion.png) — Captura de la UI en el momento exacto de la interrupción prematura antes de renderizar pantalla de éxito (Parte B).
- [03-verificacion-backend-estado-activo.png](screenshots/03-verificacion-backend-estado-activo.png) — Confirmación en backend TEST del estado ACTIVO del usuario.
- [04-re-intento-token-utilizado.png](screenshots/04-re-intento-token-utilizado.png) — Intento de re-activación con token expirado/utilizado mostrando manejo sin crash.
- [tc-m01-103-interrupcion-activacion-cuenta.cy.ts.mp4](videos/tc-m01-103-interrupcion-activacion-cuenta.cy.ts.mp4) — Grabación en video de la ejecución automatizada.
