# TC-M01-104 — Pérdida de Conexión a Internet Durante el Inicio de Sesión (Login)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-Login - Inicio de Sesión / Autenticación · RF-02 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Manejo de Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T04:39:33.631Z |
| Cuenta de Prueba | admin@pecuaria.co |

## Contexto de Ejecución y Observación de Sustitución de Cuenta
> [!INFO]
> **1. Observación de Contexto sobre la Cuenta de Prueba**: El usuario especificado en la ficha del caso (`ana.martinez.qa1@sgpmp-test.com`) registra actualmente estado `CUENTA_PENDIENTE` (no activada vía correo en el ambiente TEST).  
> **2. Sustitución Validada por la Cuenta Admin**: Con el fin de evaluar la emisión y recepción efectiva de JWTs reales y la ausencia de "sesiones fantasmas", se utilizó la cuenta activa `admin@pecuaria.co` (autenticada y verificada en el backend TEST).  
> **3. Simulación Técnica de Corte Post-Envío**: Se utilizó `cy.intercept('POST', '**/sesiones/', { forceNetworkError: true })` para abortar la respuesta HTTP del servidor justo tras el envío del cuerpo de credenciales.  
> **4. Verificación de No 'Sesión Fantasma'**: Se constató que el cliente no almacenó tokens erróneos post-corte y que el reintento emitió un nuevo JWT válido capaz de consumir exitosamente `GET /sesiones/me/permisos`.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Verificación Inicial del Estado de Credenciales en BD TEST | La cuenta de prueba responde HTTP 200 OK en login normal emitiendo un token JWT válido | Respuesta inicial del servidor: HTTP 200 OK (Token JWT presente) | **OK** |
| CP-02: Diligenciamiento de Credenciales en Formulario UI | Credenciales cargadas en la página /login con formulario validado en cliente | Formulario de login listo para enviar con credenciales válidas | **OK** |
| CP-03: Simulación de Corte de Red Post-Envío y Reacción UI (Fase 1) | La UI captura la falla de red sin colgar la pantalla, reactiva el botón y conserva las credenciales | Corte de red capturado correctamente en UI (Pantalla no congelada, formulario disponible) | **OK** |
| CP-04: Verificación de Ausencia de Tokens Falsos en Cliente Post-Corte (Fase 1) | El cliente NO almacenó ningún token JWT en localStorage tras la interrupción de red | Valor de token en localStorage tras el corte: null (Correcto) | **OK** |
| CP-05: Reintento de Login tras Restablecer Conexión (Fase 2) | El servidor TEST responde HTTP 200 OK entregando un token JWT fresco y nuevo | Reintento exitoso (HTTP 200 OK, nuevo token JWT recibido) | **OK** |
| CP-06: Verificación por API de Sesión Activa Válida (Sin Sesión Fantasma) | Respuesta exitosa HTTP 200 OK consumiendo GET /sesiones/me/permisos con el nuevo JWT emitido | Consumo de permisos exitoso (HTTP 200 OK - Sesión totalmente funcional) | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> Submit POST /sesiones/ con { forceNetworkError: true } -> UI Error Alert -> Reintento Login -> GET /sesiones/me/permisos (API Verification).
- **Detalle de Ejecución**: Submit POST /sesiones/ enviado y cortado con { forceNetworkError: true } -> Falla de red capturada en UI | Reintento Real POST /sesiones/ -> HTTP 200 (JWT emitido)

## Hallazgos y Observaciones Técnicas
- Cuenta de Prueba Validada: admin@pecuaria.co (Sustituto activo de ana.martinez.qa1@sgpmp-test.com por encontrarse en CUENTA_PENDIENTE)
- Simulación de Interrupción de Red Post-Envío: Se aplicó { forceNetworkError: true } en POST **/sesiones/ a mitad del transporte TCP.
- Reacción de la UI y Manejo de Errores: La interfaz capturó el error de transporte de red sin congelar la pantalla y preservó los campos.
- Verificación de Almacenamiento Cliente: Se confirmó la ausencia de tokens fantasma o nulos en localStorage post-corte.
- Verificación de No Sesión Fantasma en Servidor: El reintento de login emitió un token JWT fresco (HTTP 200 OK) con el que se consumió exitosamente GET /sesiones/me/permisos.
- CP-01: Verificación Inicial del Estado de Credenciales en BD TEST -> Respuesta inicial del servidor: HTTP 200 OK (Token JWT presente) (OK)
- CP-02: Diligenciamiento de Credenciales en Formulario UI -> Formulario de login listo para enviar con credenciales válidas (OK)
- CP-03: Simulación de Corte de Red Post-Envío y Reacción UI (Fase 1) -> Corte de red capturado correctamente en UI (Pantalla no congelada, formulario disponible) (OK)
- CP-04: Verificación de Ausencia de Tokens Falsos en Cliente Post-Corte (Fase 1) -> Valor de token en localStorage tras el corte: null (Correcto) (OK)
- CP-05: Reintento de Login tras Restablecer Conexión (Fase 2) -> Reintento exitoso (HTTP 200 OK, nuevo token JWT recibido) (OK)
- CP-06: Verificación por API de Sesión Activa Válida (Sin Sesión Fantasma) -> Consumo de permisos exitoso (HTTP 200 OK - Sesión totalmente funcional) (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-formulario-login-listo-envio.png](screenshots/01-formulario-login-listo-envio.png) — Formulario de inicio de sesión en /login con credenciales cargadas listo para enviar.
- [02-ui-reaccion-corte-red-login.png](screenshots/02-ui-reaccion-corte-red-login.png) — Reacción de la UI ante el corte de red simulado justo tras el envío del POST /sesiones/.
- [03-reintento-login-red-restablecida.png](screenshots/03-reintento-login-red-restablecida.png) — Reintento de login exitoso tras restaurar la conectividad real con el servidor.
- [04-confirmacion-api-sesion-valida.png](screenshots/04-confirmacion-api-sesion-valida.png) — Comprobación por API REST consumiendo GET /sesiones/me/permisos con el nuevo JWT emitido.
- [tc-m01-104-interrupcion-red-login.cy.ts.mp4](videos/tc-m01-104-interrupcion-red-login.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
