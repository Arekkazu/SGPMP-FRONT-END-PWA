# TC-M01-106 — Cierre del Navegador Durante el Cambio de Contraseña

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-CambioContrasena - Cambio de Contraseña · RF-07 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Seguridad · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T05:01:13.151Z |
| Cuenta de Prueba | gestor.granja.test@pecuaria.co |
| ID Usuario Dinámico | 30 |

## Contexto de Ejecución y Metodología de Seguridad
> [!INFO]
> **1. Obtención Dinámica de ID de Usuario**: Se consultó `GET /usuarios/me` en CP-01 para obtener el `id_usuario` real (30) sin depender de IDs hardcodeados.  
> **2. Simulación Fiel de Abandono del Cliente**: Se aplicó `cy.intercept('PUT', '**/contrasena/usuarios/**', { forceNetworkError: true })` a mitad del transporte TCP del formulario en `/perfil`.  
> **3. Verificación de Seguridad 1 (Contraseña Actualizada)**: Se comprobó por API que el servidor procesó el cambio de clave y permitió autenticarse con `NuevaTest#2026` (`HTTP 200 OK`).  
> **4. Verificación de Seguridad 2 (Invalidación de JWT Previo)**: Se comprobó por API que el token previo (`tokenPrevia`) fue revocado inmediatamente (`HTTP 401 Unauthorized`).  
> **5. Autenticación de Restauración en CP-06**: Se autenticó la solicitud de restauración a la clave original `Test1234!` mediante un JWT fresco emitido con la nueva clave.

## Estado Crítico de Restauración de la Cuenta (CP-06)
> [!NOTE]
> **RESTAURACIÓN EXITOSA DE CUENTA**: La contraseña de la cuenta `gestor.granja.test@pecuaria.co` fue restaurada satisfactoriamente a su valor original (`Test1234!`). La cuenta queda lista y alineada para futuras ejecuciones de pruebas.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Autenticación Inicial y Captura Dinámica de id_usuario y tokenPrevia | Login inicial con Test1234! y obtención dinámica del id_usuario desde GET /usuarios/me | Token previa capturado. ID de usuario obtenido dinámicamente: 30 | **OK** |
| CP-02: Formulario de Cambio de Contraseña en UI (/perfil) | Formulario en /perfil completado con contraseña actual (Test1234!) y nueva (NuevaTest#2026) | Formulario listo y validado en cliente para submit | **OK** |
| CP-03: Simulación de Abandono Post-Envío (Fase 1 Interrupción) | La UI captura la falla de transporte TCP sin congelar la ejecución del test | Abandono del cliente simulado correctamente a mitad del transporte HTTP | **OK** |
| CP-04: Verificación por API de Contraseña Actualizada en Servidor (Fase 2) | El backend procesó el cambio de clave y responde HTTP 200 OK entregando un token JWT nuevo | Login exitoso con nueva contraseña (HTTP 200 OK, tokenNuevo recibido) | **OK** |
| CP-05: Verificación por API de Invalidación de Sesión Anterior (Fase 2) | Respuesta HTTP 401 Unauthorized confirmando que el tokenPrevia fue revocado tras el cambio de clave | Token previo rechazado correctamente por el servidor (HTTP 401 Unauthorized) | **OK** |
| CP-06: Restauración Final de Contraseña Original Autenticada (CP-06) | Uso de un JWT fresco emitido con NuevaTest#2026 para revertir la contraseña a Test1234! vía API | Restauración exitosa (HTTP 200 OK, Login con Test1234! responde HTTP 200 OK) | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> GET /usuarios/me (id_usuario: 30) -> /perfil (Submit PUT /contrasena/usuarios/30 con { forceNetworkError: true }) -> Reintento API REST POST /sesiones/ -> GET /sesiones/me/permisos -> PUT /contrasena/usuarios/30 (Restauración).
- **Detalle de Ejecución**: Submit PUT /contrasena/usuarios/30 enviado y cortado con { forceNetworkError: true } -> Abandono simulado | Login API con NuevaTest#2026 -> HTTP 200 | Consumo GET /sesiones/me/permisos con tokenPrevia -> HTTP 401 | Restauración PUT /contrasena/usuarios/30 -> HTTP 200

## Hallazgos y Observaciones Técnicas
- Cuenta de Prueba: gestor.granja.test@pecuaria.co
- ID de Usuario Obtenido Dinámicamente: 30
- Estado Final de Restauración de Contraseña: EXITOSA (Restaurada a Test1234!)
- Simulación de Abandono del Cliente: Aplicado { forceNetworkError: true } sobre PUT **/contrasena/usuarios/**.
- Verificación de Seguridad 1 (Contraseña Actualizada): Login exitoso por API con NuevaTest#2026 (HTTP 200 OK).
- Verificación de Seguridad 2 (Invalidación de JWT Previo): GET /sesiones/me/permisos con tokenPrevia rechazado (HTTP 401 TOKEN_REVOCADO).
- CP-01: Autenticación Inicial y Captura Dinámica de id_usuario y tokenPrevia -> Token previa capturado. ID de usuario obtenido dinámicamente: 30 (OK)
- CP-02: Formulario de Cambio de Contraseña en UI (/perfil) -> Formulario listo y validado en cliente para submit (OK)
- CP-03: Simulación de Abandono Post-Envío (Fase 1 Interrupción) -> Abandono del cliente simulado correctamente a mitad del transporte HTTP (OK)
- CP-04: Verificación por API de Contraseña Actualizada en Servidor (Fase 2) -> Login exitoso con nueva contraseña (HTTP 200 OK, tokenNuevo recibido) (OK)
- CP-05: Verificación por API de Invalidación de Sesión Anterior (Fase 2) -> Token previo rechazado correctamente por el servidor (HTTP 401 Unauthorized) (OK)
- CP-06: Restauración Final de Contraseña Original Autenticada (CP-06) -> Restauración exitosa (HTTP 200 OK, Login con Test1234! responde HTTP 200 OK) (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-formulario-cambio-contrasena-listo.png](screenshots/01-formulario-cambio-contrasena-listo.png) — Formulario de cambio de contraseña en /perfil completado con contraseña actual y nueva listo para envío.
- [02-ui-reaccion-corte-red-cambio-pw.png](screenshots/02-ui-reaccion-corte-red-cambio-pw.png) — Reacción de la UI ante la simulación de abandono/corte de red simulado (forceNetworkError: true).
- [03-confirmacion-api-nueva-contrasena-valida.png](screenshots/03-confirmacion-api-nueva-contrasena-valida.png) — Comprobación por API REST del login exitoso (HTTP 200 OK) con la nueva contraseña NuevaTest#2026.
- [04-confirmacion-api-sesion-anterior-invalidada.png](screenshots/04-confirmacion-api-sesion-anterior-invalidada.png) — Comprobación por API REST del rechazo de la sesión previa (HTTP 401 Unauthorized / TOKEN_REVOCADO).
- [tc-m01-106-cierre-navegador-cambio-contrasena.cy.ts.mp4](videos/tc-m01-106-cierre-navegador-cambio-contrasena.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
