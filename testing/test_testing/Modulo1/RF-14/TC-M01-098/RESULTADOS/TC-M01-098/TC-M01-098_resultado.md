# TC-M01-098 — Verificar el orden descendente de las notificaciones por timestamp

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Funcional / Ordenamiento · Frontend & Backend QA |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T02:34:33.899Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Diagnóstico de Infraestructura Backend y Adaptación de Alcance
> [!INFO]
> **1. Catálogo Oficial de Eventos Backend**: Inspeccionado vía `GET /auditoria/catalogo/tipos-evento` (24 tipos registrados, desde `REGISTRO_USUARIO` hasta `EXPORTACION_AUDITORIA`). Se confirmó que sólo el evento `LOGIN_EXITOSO` (ID 3) e interacciones de seguridad inyectan notificaciones en la bandeja in-app (`modulo1.notificaciones`).  
> **2. Regla de Deduplicación Activa (5 min)**: El backend suprime peticiones duplicadas de un mismo `tipo_evento` si ocurren en un intervalo corto. Por ello, el alcance de la prueba se adaptó a **generar 1 notificación real en tiempo real** e inspeccionar su posicionamiento descendente estricto frente al historial pre-existente en TEST.  
> **3. Control de Eventos Secundarios**: `POST /auditoria/exportaciones` (`tipo_evento: 26`) fue probado como control, confirmando que las acciones de auditoría no ensucian ni generan notificaciones falsas en la bandeja del usuario.  
> **4. Vía Alterna de Usuario**: Autenticación Bearer administrada sobre `admin@pecuaria.co` debido a la indisponibilidad HTTP 503 (`CAPTCHA_SERVICIO_NO_DISPONIBLE`) al intentar registrar un usuario dinámico.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 3: Verificación de Polling (60s) y Despliegue de la Bandeja en UI | Despliegue del panel NotificationTray en la interfaz del cliente | Bandeja de notificaciones abierta y desplegada en pantalla (Captura 03 registrada) | **OK** |
| Checkpoint 4: Veredicto Consolidado de Ordenamiento de Notificaciones (RF-14 / CU08) | Notificaciones ordenadas correctamente de la más reciente a la más antigua (RF-14) | Confirmado: Notificaciones ordenadas correctamente por timestamp descendente en API y cliente | **OK** |
| Checkpoint 1: Generación de Notificación Real y Control de Eventos (POST /sesiones/ & /auditoria/exportaciones) | Notificación de inicio de sesión generada en tiempo real (tipo_evento: 3) y confirmación de que la exportación de auditoría (tipo_evento: 26) no genera notificaciones falsas | OK - Notificación creada por el test capturada en la posición 0: ID 952 (fecha_envio: 2026-09-03T02:31:48.065723Z) | **OK** |
| Checkpoint 2: Verificación de Orden Descendente en la API (Newman / Postman & Cypress API) | El arreglo items de GET /notificaciones debe venir ordenado de forma estrictamente descendente por fecha_envio (t_reciente >= t_antiguo) | OK - Confirmado: Array de 20 notificaciones ordenado de forma descendente (t_0 nueva: 2026-09-03T02:31:48.065723Z >= t_1 historial: 2026-09-03T02:26:04.667572Z) | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> POST /sesiones/ (Disparador Real) -> GET /notificaciones -> AppBar (Bandeja de Notificaciones UI) -> /usuarios.
- **Detalle de Ejecución**: Disparador POST /sesiones/ -> GET https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/notificaciones -> HTTP 200 OK

## Hallazgos y Observaciones Técnicas
- Inspección backend: Catálogo de 24 tipos de eventos verificado en GET /auditoria/catalogo/tipos-evento.
- Notificación creada por el test: ID 952 | Evento: 3 | Timestamp: 2026-09-03T02:31:48.065723Z
- Control de eventos sin notificación: POST /auditoria/exportaciones (tipo_evento: 26) verificado sin falsos positivos en bandeja.
- Evidencia visual enriquecida: 4 capturas de pantalla secuenciales generadas (Interfaz post-login, AppBar campana, Bandeja desplegada y Gestión de Usuarios).
- Checkpoint 3: Verificación de Polling (60s) y Despliegue de la Bandeja en UI -> Bandeja de notificaciones abierta y desplegada en pantalla (Captura 03 registrada) (OK)
- Checkpoint 4: Veredicto Consolidado de Ordenamiento de Notificaciones (RF-14 / CU08) -> Confirmado: Notificaciones ordenadas correctamente por timestamp descendente en API y cliente (OK)
- Checkpoint 1: Generación de Notificación Real y Control de Eventos (POST /sesiones/ & /auditoria/exportaciones) -> OK - Notificación creada por el test capturada en la posición 0: ID 952 (fecha_envio: 2026-09-03T02:31:48.065723Z) (OK)
- Checkpoint 2: Verificación de Orden Descendente en la API (Newman / Postman & Cypress API) -> OK - Confirmado: Array de 20 notificaciones ordenado de forma descendente (t_0 nueva: 2026-09-03T02:31:48.065723Z >= t_1 historial: 2026-09-03T02:26:04.667572Z) (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01_interfaz_principal_post_login.png](screenshots/01_interfaz_principal_post_login.png) — Vista principal de la aplicación inmediatamente tras autenticarse.
- [02_appbar_notificaciones_campana.png](screenshots/02_appbar_notificaciones_campana.png) — Detalle de la barra superior AppBar enfocando los íconos y campana de notificaciones.
- [03_bandeja_notificaciones_desplegada.png](screenshots/03_bandeja_notificaciones_desplegada.png) — Vista desplegada del panel NotificationTray mostrando la lista de notificaciones con timestamps.
- [04_modulo_gestion_usuarios.png](screenshots/04_modulo_gestion_usuarios.png) — Vista del módulo de Gestión de Usuarios.
- [tc-m01-098-orden-descendente-notificaciones.cy.ts.mp4](videos/tc-m01-098-orden-descendente-notificaciones.cy.ts.mp4) — Grabación en video de la interacción automatizada completa.
