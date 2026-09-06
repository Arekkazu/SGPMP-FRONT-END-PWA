# TC-M01-108 — Cierre del Navegador Durante el Restablecimiento de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-RestablecerContrasena - Restablecimiento de Contraseña · RF-09 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-05T22:29:02.135Z |
| Cuenta Sujeto (Prueba) | jusebas73@gmail.com (ID: 93) |
| Nueva Contraseña de Prueba | Reset#2029 |
| Contraseña Original Restaurada | Test1234! |
| Estado Inicial / Restaurado | Activo |

## Contexto de Ejecución, Transparencia y Declaración Metodológica
> [!INFO]
> **1. Verificación Inicial de Precondición (CP-01)**: Se confirmó la existencia y estado activo de la cuenta `jusebas73@gmail.com` (ID: 93) vía Admin API (`GET /usuarios/admin`).  
> **2. Solicitud Manual por Usuario (CP-02)**: La solicitud de recuperación en `POST /contrasena/recuperar` fue realizada **MANUALMENTE por el usuario** desde su navegador. Esta desviación técnica controlada previene el agotamiento del rate-limit (3 solicitudes/hora por IP en el backend TEST) y permitió obtener el enlace real enviado a Gmail.  
> **3. Interrupción Simulada de Navegador (CP-03)**: Se completó el formulario en `/restablecer-contrasena?token=...` con `Reset#2029` y se esperó la entrega en backend (`wait('@restablecerReq')`) antes de forzar la detención del cliente (`win.stop()` + redirección a `/login`) previa al render de confirmación.  
> **4. Verificación Backend de Persistencia (CP-04)**: Se confirmó que el servidor SÍ actualizó la credencial en BD mediante inicio de sesión exitoso con `Reset#2029` (`HTTP 200 OK` + JWT recibido) y rechazo de la clave previa (`HTTP 401 Unauthorized`).  
> **5. Invalidation y Ambigüedad de Token Consumido (CP-05 - INC-M01-15-054)**: Al reintentar la solicitud con el mismo token consumido, el servidor respondió `HTTP 401 TOKEN_INVALIDO` con mensaje *"Error de autenticidad. El token de recuperación es inválido o ha sido alterado"*. Se evidencia la inconsistencia de no diferenciar un token ya consumido de uno corrupto o inexistente (confirmación de **INC-M01-15-054**).  
> **6. Teardown Transparente y Verificado por GET (CP-06)**: Se restableció la contraseña de la cuenta a su valor original (`Test1234!`) mediante `PUT /contrasena/usuarios/93` (`HTTP 200 OK`) y se confirmó mediante consulta posterior por GET (`GET /usuarios/admin` y `GET /usuarios/me`) que el estado permaneció en **`Activo`**, conservando la reusabilidad de la cuenta.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Precondición de Cuenta Sujeto | Cuenta jusebas73@gmail.com (ID: 93) confirmada en estado Activo en BD TEST | Cuenta encontrada, estado_cuenta: Activo | **OK** |
| CP-02: Solicitud de Recuperación de Contraseña (Manual) | Solicitud efectuada manualmente por el usuario desde su navegador para evitar consumir rate-limit por IP | Solicitud manual completada por el usuario. Enlace de restablecimiento entregado a la automatización. | **OK** |
| CP-03: Interrupción Prematura del Navegador en UI | Formulario enviado e interrupción del cliente simulada antes de recibir el render de confirmación | Formulario procesado en backend y corte de cliente ejecutado en UI (win.stop() + navegación a /login) | **OK** |
| CP-04: Verificación Backend de Persistencia de Nueva Contraseña | La nueva contraseña permite autenticarse (HTTP 200) y la contraseña anterior es rechazada (HTTP 401) | Autenticación con 'Reset#2029': HTTP 200 (Token JWT Recibido). Autenticación con clave previa: HTTP 401 | **OK** |
| CP-05: Reintento de Uso de Token Ya Consumido | El backend rechaza el token previamente usado | Respuesta HTTP 401: Error de autenticidad. El token de recuperación es inválido o ha sido alterado. Por favor, inicie un nuevo proceso de recuperación. (Confirmación de INC-M01-15-054: El backend no diferencia en su mensaje un token ya consumido de uno inválido/corrupto). | **OK** |
| CP-06: Teardown, Restauración de Contraseña y Estado Final (GET) | Contraseña restaurada a Test1234! y estado de cuenta verificado en Activo por GET posterior | Restauración clave: HTTP 200 (Contraseña actualizada exitosamente). Estado verificado en BD por GET posterior: Activo | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro de Auditoría y Persistencia de Red
- **Método de Generación de Token (CP-02)**: Solicitud manual realizada por el usuario vía UI en su navegador (desviación técnica justificada por rate-limit de IP).
- **Petición Disparada en UI (CP-03)**: POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/contrasena/restablecer
- **Payload Interrumpido**: { token: '[DISPARADO_REAL]', nueva_contrasena: 'Reset#2029', confirmar_contrasena: 'Reset#2029' }
- **Verificación Posterior Login (CP-04)**: POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/sesiones/ con 'Reset#2029' -> HTTP 200 OK. Con 'Test1234!' -> HTTP 401.
- **Hallazgo INC-M01-15-054 (CP-05)**: El reintento con token consumido responde `HTTP 401 TOKEN_INVALIDO` con mensaje genérico de alteración/inexistencia, sin distinguir un token consumido.
- **Teardown y Verificación GET (CP-06)**: Clave restaurada exitosamente a 'Test1234!' y estado de cuenta confirmado 'Activo' en BD por GET posterior.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondicion-usuario-activo.png](screenshots/01-precondicion-usuario-activo.png) — Confirmación por API del estado activo de jusebas73@gmail.com (ID: 93).
- [02-solicitud-recuperacion-manual.png](screenshots/02-solicitud-recuperacion-manual.png) — Registro del checkpoint CP-02 con solicitud manual por el usuario.
- [03-corte-navegador-prematuro.png](screenshots/03-corte-navegador-prematuro.png) — Reacción de UI ante win.stop() inmediato tras submit de formulario.
- [04-verificacion-login-nueva-clave.png](screenshots/04-verificacion-login-nueva-clave.png) — Inicio de sesión posterior comprobando autenticación exitosa con la nueva clave (Reset#2029).
- [05-reintento-token-invalidado.png](screenshots/05-reintento-token-invalidado.png) — Rechazo y ambigüedad de mensaje (INC-M01-15-054) en reintento de uso de token consumido.
- [06-teardown-restauracion-verificada.png](screenshots/06-teardown-restauracion-verificada.png) — Evidencia de restauración de contraseña a Test1234! y estado Activo confirmado por GET posterior.
- [tc-m01-108-cierre-navegador-restablecimiento.cy.ts.mp4](videos/tc-m01-108-cierre-navegador-restablecimiento.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
