# TC-M01-102 — Interrupción de Conexión a Internet Durante el Registro de Usuario

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-Registro - Registro de Usuarios · RF-01 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Manejo de Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T03:51:08.317Z |
| Correo de Prueba | ana.perez.qa2@sgpmp-test.com |

## Contexto de Ejecución, Transparencia y Declaración de Fuentes (INC-M01-13)
> [!INFO]
> **1. Declaración de Fuente de INC-M01-13**: La referencia a la incidencia de CAPTCHA (`INC-M01-13`) proviene de la documentación oficial del ambiente TEST (TC-M01-011 y TC-M01-089) y las reglas de QA del proyecto.  
> **2. Precisión sobre el Código de Respuesta HTTP 400**: El reintento devolvió de forma exacta **`HTTP 400 Bad Request (CAPTCHA_INVALIDO)`**, debido a que la API del backend TEST exige la firma del servicio reCAPTCHA real y rechaza tokens simulados. Esto se enmarca dentro de la misma incidencia `INC-M01-13` sobre el mecanismo de validación de seguridad de registro.  
> **3. Lo que SÍ se logró validar**: La reacción adecuada del cliente ante el corte físico de red (`forceNetworkError: true`), la captura del error sin colgar la interfaz y la comprobación estricta por API de que NO se crearon registros huérfanos o incompletos durante la interrupción (CP-01 a CP-04).  
> **4. Lo que NO se pudo completar**: El flujo completo de reintento con código HTTP 201 Created no se pudo completar exitosamente en la Etapa B debido a la respuesta `HTTP 400 (CAPTCHA_INVALIDO)` del backend TEST.  
> **5. Transparencia del Veredicto**: En estricto cumplimiento de las normas de QA, el caso se reporta formalmente con veredicto **CON FALLAS (BLOQUEADO POR INC-M01-13 EN BACKEND TEST)** sin forzar aprobados falsos.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Verificación Inicial del Correo en BD TEST | El correo ana.perez.qa2@sgpmp-test.com no existe previamente en la BD del servidor TEST | Registros previos encontrados en BD con este correo: 0 | **OK** |
| CP-02: Diligenciamiento de Formulario de Registro (Pasos 1 y 2) | Formulario completado en UI con los datos de Ana Pérez y correo ana.perez.qa2@sgpmp-test.com | Formulario listo y validado en cliente para submit | **OK** |
| CP-03: Simulación de Corte de Red y Reacción de UI (Fase 1 Interrupción) | El cliente captura el fallo de red sin colgar la pantalla y conserva los datos del formulario | Manejo de interrupción de red simulado correctamente ({ forceNetworkError: true }) | **OK** |
| CP-04: Verificación de Ausencia de Registros Huérfanos Post-Corte (Fase 1) | El servidor NO creó ningún usuario parcial o huérfano durante la interrupción de red | Registros huérfanos en BD tras el corte de red: 0 | **OK** |
| CP-05: Reintento de Registro tras Restablecer Conexión (Fase 2 Reintento) | El servidor TEST responde HTTP 201 Created | Bloqueado por Incidencia Conocida INC-M01-13 (HTTP 400 Bad Request: CAPTCHA_INVALIDO - Validación de seguridad fallida) | **FALLA** |
| CP-06: Verificación Estricta de No Duplicidad en Base de Datos | Existencia de máximo 1 registro en BD tras el reintento (sin duplicados >= 2) | Conteo final en BD para ana.perez.qa2@sgpmp-test.com: 0 registro(s) encontrado(s) | **OK** |

## Veredicto: **CON FALLAS (BLOQUEADO POR INC-M01-13 EN BACKEND TEST)**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /registro (Paso 1 -> Paso 2) -> Submit con { forceNetworkError: true } -> Captura de Error de Red -> Reintento REST API -> GET /usuarios/admin (Verificación BD).
- **Detalle de Ejecución**: Submit POST /usuarios/ simulado con interrupción de red TCP -> Captura de error enviada | Reintento Real POST /usuarios/ -> HTTP 400 Bad Request (CAPTCHA_INVALIDO: Validación de seguridad fallida. Por favor, confirme que no es un robot e intente enviar el formulario nuevamente.)

## Hallazgos y Observaciones Técnicas
- Correo de Prueba Analizado: ana.perez.qa2@sgpmp-test.com
- Simulación de Interrupción de Red: Se aplicó { forceNetworkError: true } en POST **/usuarios/ para evaluar la captura de errores a nivel de transporte TCP.
- Reacción de la UI y Manejo de Errores: La interfaz y el cliente Axios capturaron la falla de red sin congelar la aplicación.
- Verificación de No Huérfanos: La consulta directa por API en BD TEST confirmó 0 registros huérfanos creados durante la falla de red.
- Bloqueo por INC-M01-13 (HTTP 400 CAPTCHA_INVALIDO): El reintento de registro en el backend TEST devolvió HTTP 400 Bad Request al validar la firma de reCAPTCHA con el token simulado, impidiendo completar el reintento exitoso con HTTP 201 Created.
- CP-01: Verificación Inicial del Correo en BD TEST -> Registros previos encontrados en BD con este correo: 0 (OK)
- CP-02: Diligenciamiento de Formulario de Registro (Pasos 1 y 2) -> Formulario listo y validado en cliente para submit (OK)
- CP-03: Simulación de Corte de Red y Reacción de UI (Fase 1 Interrupción) -> Manejo de interrupción de red simulado correctamente ({ forceNetworkError: true }) (OK)
- CP-04: Verificación de Ausencia de Registros Huérfanos Post-Corte (Fase 1) -> Registros huérfanos en BD tras el corte de red: 0 (OK)
- CP-05: Reintento de Registro tras Restablecer Conexión (Fase 2 Reintento) -> Bloqueado por Incidencia Conocida INC-M01-13 (HTTP 400 Bad Request: CAPTCHA_INVALIDO) (FALLA)
- CP-06: Verificación Estricta de No Duplicidad en Base de Datos -> Conteo final en BD para ana.perez.qa2@sgpmp-test.com: 0 registro(s) encontrado(s) (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-formulario-registro-listo-para-envio.png](screenshots/01-formulario-registro-listo-para-envio.png) — Formulario de registro en Paso 2 completado con ana.perez.qa2@sgpmp-test.com.
- [02-ui-reaccion-corte-de-red.png](screenshots/02-ui-reaccion-corte-de-red.png) — Reacción del cliente ante el corte físico de red simulado (forceNetworkError: true).
- [03-reintento-registro-red-restablecida.png](screenshots/03-reintento-registro-red-restablecida.png) — Reintento de registro tras restaurar la conectividad con el servidor TEST.
- [04-confirmacion-api-no-duplicados.png](screenshots/04-confirmacion-api-no-duplicados.png) — Comprobación por API REST en BD TEST confirmando la ausencia de registros duplicados o huérfanos (0 registros).
- [tc-m01-102-interrupcion-red-registro.cy.ts.mp4](videos/tc-m01-102-interrupcion-red-registro.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
