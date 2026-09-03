# TC-M01-109 — Interrupción de Red Intermitente en Login y Cambio de Contraseña (RF-02 & RF-07)

| Campo | Valor |
|---|---|
| Caso de uso / Requisitos | CU-InicioSesion (RF-02) y CU-CambioContrasena (RF-07) |
| Tipo / Equipo | Pruebas Extremas / Resiliencia e Interrupción Intermitente · QA Team |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T07:31:10.067Z |
| Cuenta Sujeto Exclusiva | gestor.granja.test@pecuaria.co |
| Cuenta Administración | admin@pecuaria.co |
| ID Usuario Dinámico | 30 |
| Fallas Previas Registradas (N) | 0 |
| Intento Calculado Esperado | Intento 1 de 5 |

## Contexto de Ejecución y Metodología de Seguridad
> [!INFO]
> **1. Regla de Tiempos de Bloqueo por Requerimiento**:  
>    - **RF-02 (Login)**: 5 intentos fallidos consecutivos provocan bloqueo de 15 minutos.  
>    - **RF-07 (Cambio de Clave)**: 5 intentos fallidos consecutivos provocan bloqueo de 30 minutos.  
> **2. Verificación de Sesión Única (RF-02 - CP-03)**: Se confirmó por API que la emisión del Token B en el reintento manual provocó la revocación inmediata del Token A (`HTTP 401 TOKEN_REVOCADO`), garantizando que solo existe una sesión activa por cuenta.  
> **3. Hallazgo de Reintento Injusto en Cambio de Clave (RF-07 - CP-05)**: Se confirmó empíricamente que reintentar `PUT /contrasena/usuarios/{id}` con la clave previa obsoleta retorna `HTTP 401 Unauthorized` e incrementa el contador a **Intento 1 de 5** (mensaje explícito de advertencia de 30 min), documentando este comportamiento como hallazgo sin agotar los 5 intentos ni bloquear la cuenta.  
> **4. Restauración Obligatoria (CP-06)**: Se revirtió satisfactoriamente la contraseña de `gestor.granja.test@pecuaria.co` a su valor original (`Test1234!`).

## Estado de Restauración de la Cuenta (CP-06)
> [!NOTE]
> **RESTAURACIÓN EXITOSA DE CUENTA**: La contraseña de `gestor.granja.test@pecuaria.co` fue restaurada satisfactoriamente a su valor original (`Test1234!`).

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Precondición de Cuenta Sujeto | Cuenta gestor.granja.test@pecuaria.co existente y activa (HTTP 200) | Cuenta encontrada ID: 30, Estado: Activo | **OK** |
| CP-02: RF-02 Login UI Interrumpido + Captura Token A | POST /sesiones/ procesado por backend (Token A emitido); cliente recibe Network Error | Token A capturado en proxy (eyJhbGciOiJIUzI...); cliente experimentó falla de red | **OK** |
| CP-03: RF-02 Verificación de Sesión Única | Token A EXIGE HTTP 401 (TOKEN_REVOCADO) y Token B responde HTTP 200 OK | Token A rechazado (HTTP 401); Token B activo (HTTP 200 OK) — Sesión única garantizada | **OK** |
| CP-04: RF-07 Cambio de Clave Interrumpido | PUT procesado en backend (clave actualizada a NuevaTest#2029); cliente recibe Network Error | Falla de red capturada por el cliente tras envío de cambio de clave | **OK** |
| CP-05: RF-07 Reintento Manual con Clave Obsoleta | EXIGE STRICTAMENTE HTTP 401 Unauthorized conteniendo "Intento 1 de 5" | HTTP 401 (CONTRASENA_ACTUAL_INCORRECTA) — Evento ID 3753 a las 2026-09-03T07:31:07.706811Z. Contador en Intento 1 de 5 (bloqueo a 30 min) | **OK** |
| CP-06: Restauración de Contraseña Original | Reversión exitosa a Test1234! (HTTP 200 OK) y verificación de login | Contraseña restaurada satisfactoriamente a Test1234!. Login final respondió HTTP 200 OK | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Hallazgos y Observaciones Técnicas
- **Hallazgo RF-02 (Sesión Única)**: La emisión de un nuevo JWT invalida la sesión previa (`HTTP 401 TOKEN_REVOCADO`), impidiendo sesiones duplicadas huérfanas tras errores de transporte TCP.
- **Hallazgo RF-07 (Contador Injusto en Reintento)**: Un reintento manual enviando la clave actual obsoleta genera un error `HTTP 401 CONTRASENA_ACTUAL_INCORRECTA` e incrementa el contador a **Intento 1 de 5**, arriesgando un bloqueo de 30 minutos si el usuario reintenta 5 veces.

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondiciones-cuenta.png](screenshots/01-precondiciones-cuenta.png) — Verificación de estado activo y conteo previo de fallas N para gestor.granja.test@pecuaria.co.
- [02-corte-red-login.png](screenshots/02-corte-red-login.png) — Reacción UI ante el corte de red en la respuesta de POST /sesiones/ (Token A capturado).
- [03-sesion-unica-token-revocado.png](screenshots/03-sesion-unica-token-revocado.png) — Verificación API comprobando Token A revocado (HTTP 401) y Token B válido (HTTP 200).
- [04-corte-red-cambio-clave.png](screenshots/04-corte-red-cambio-clave.png) — Interrupción de red en la respuesta HTTP 200 de PUT /contrasena/usuarios/{id}.
- [05-reintento-injusto-contador.png](screenshots/05-reintento-injusto-contador.png) — Reintento con clave obsoleta exigiendo HTTP 401 CONTRASENA_ACTUAL_INCORRECTA e incremento a Intento N+1 de 5.
- [06-restauracion-contrasena.png](screenshots/06-restauracion-contrasena.png) — Reversión exitosa de la clave a Test1234!.
- [tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4](videos/tc-m01-109-interrupcion-intermitente-login-cambio.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
