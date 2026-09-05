# TC-M01-099 — Marcar una Notificación Individual como Leída

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Funcional / Actualización de Estado Visual · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T03:01:24.518Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Contexto de Ejecución y Precondición de Datos
> [!INFO]
> **1. Generación/Garantía de Notificación No Leída**: Autenticación vía `POST /sesiones/` (`admin@pecuaria.co`) para garantizar o consultar notificaciones activas en estado `es_leido: false`.  
> **2. Verificación de Actualización de Estado Visual**: Validación de la bandeja `NotificationTray` enfocando la transición del indicador no leído (`.notification-tray__item--unread` y `.notification-tray__unread-dot`) a estado leído y decremento del contador superior.  
> **3. Persistencia en Backend**: Intercepción y validación de `PATCH /notificaciones/{id}/leida` con respuesta HTTP 200 OK y confirmación vía `GET /notificaciones`.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Autenticación API y Obtención de Notificación No Leída | Token JWT obtenido y notificación no leída encontrada | Notificación objetivo ID: 944 (es_leido: false) | **OK** |
| CP-02: Verificación del Estado Visual Inicial (No Leída) | Bandeja muestra ítems con resaltado .notification-tray__item--unread e indicador .notification-tray__unread-dot | Se detectaron 16 notificaciones en estado no leído | **OK** |
| CP-03: Ejecución de Acción Marcar como Leída y Solicitud HTTP | Respuesta HTTP 200 OK desde el Backend con es_leido: true | Respuesta HTTP 200 OK | es_leido: true | **OK** |
| CP-04: Verificación de Actualización de Estado Visual Final | El estado visual se actualiza en el DOM removiendo indicadores de no leída | Actualización visual completada correctamente (botones restantes de marcar leída: 15) | **OK** |
| CP-05: Confirmación de Persistencia Backend (GET Post-Actualización) | GET /notificaciones confirma es_leido: true para la notificación procesada | Backend confirma es_leido: true para ID: 944 | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> POST /sesiones/ -> AppBar (Campana Notificaciones) -> NotificationTray (Click Marcar Leída) -> PATCH /notificaciones/{id}/leida.
- **Detalle de Ejecución**: PATCH /notificaciones/944/leida -> HTTP 200 OK (es_leido: true)

## Hallazgos y Observaciones Técnicas
- Identificador de Notificación Probado: 944
- Verificación de Estado Visual: La UI respondió dinámicamente eliminando las clases de resaltado (.notification-tray__item--unread) y removiendo el punto indicador (.notification-tray__unread-dot).
- Persistencia en API: PATCH /notificaciones/{id}/leida confirmó HTTP 200 OK y la consulta POST verificó es_leido === true en el Backend TEST.
- CP-01: Autenticación API y Obtención de Notificación No Leída -> Notificación objetivo ID: 944 (es_leido: false) (OK)
- CP-02: Verificación del Estado Visual Inicial (No Leída) -> Se detectaron 16 notificaciones en estado no leído (OK)
- CP-03: Ejecución de Acción Marcar como Leída y Solicitud HTTP -> Respuesta HTTP 200 OK | es_leido: true (OK)
- CP-04: Verificación de Actualización de Estado Visual Final -> Actualización visual completada correctamente (botones restantes de marcar leída: 15) (OK)
- CP-05: Confirmación de Persistencia Backend (GET Post-Actualización) -> Backend confirma es_leido: true para ID: 944 (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-estado-inicial-bandeja-no-leida.png](screenshots/01-estado-inicial-bandeja-no-leida.png) — Vista inicial de la bandeja NotificationTray con notificaciones en estado "no leída" (resaltadas visualmente).
- [02-accion-marcar-como-leida.png](screenshots/02-accion-marcar-como-leida.png) — Acción de usuario haciendo clic en el botón de check "Marcar como leída".
- [03-estado-final-bandeja-leida.png](screenshots/03-estado-final-bandeja-leida.png) — Estado visual actualizado tras la acción (remoción de estilos no leídos e indicador visual).
- [04-confirmacion-api-backend-leida.png](screenshots/04-confirmacion-api-backend-leida.png) — Confirmación de persistencia de datos en Backend HTTP 200 OK.
- [tc-m01-099-marcar-notificacion-leida.cy.ts.mp4](videos/tc-m01-099-marcar-notificacion-leida.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
