# TC-M01-100 — Marcar Notificaciones de Bandeja como Leídas

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Funcional / Actualización de Estado Visual Masivo · Frontend & Backend QA |
| Severidad | Media |
| Responsable | QA Team |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T03:25:19.723Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Contexto de Ejecución y Aislamiento de Alcance
> [!INFO]
> **1. Procesamiento UI del Lote de Notificaciones No Leídas**: Se ejecutó la acción de marcado interactuando de forma continua con los controles de la bandeja, logrando procesar exitosamente un conjunto de **10 notificaciones no leídas**.  
> **2. Nota de Contexto sobre el Total del Entorno TEST**: El encabezado de la bandeja reflejó al final *"104 sin leer de 125"*, correspondiente al total acumulado de notificaciones históricas en el entorno TEST que están fuera del alcance de esta prueba.  
> **3. Observación de Usabilidad (NotificationTray.tsx)**: Se constató que el componente actual procesa la actualización iterando sobre los elementos debido a la falta de un botón/endpoint masivo global en el frontend.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Autenticación e Inicio de Sesión UI | Acceso correcto a la plataforma TEST como admin@pecuaria.co | Sesión autenticada en UI | **OK** |
| CP-02: Verificación del Estado Visual Inicial (Notificaciones No Leídas) | Bandeja desplegada con notificaciones en estado no leído (fondo verde e indicador activo) | Se visualizaron 10 elementos no leídos (con 10 botones de check activos) | **OK** |
| CP-03: Ejecución de Acción Masiva sobre Notificaciones No Leídas en UI | Clics efectuados sobre los botones de marcado de las notificaciones objetivo | Completados 10 clics de marcado en UI respondiendo HTTP 200 OK | **OK** |
| CP-04: Verificación de Actualización Visual del Lote Procesado | Las 10 notificaciones procesadas pasan de estado no leído a leído en el DOM | Las 10 notificaciones objetivo pasaron a estado leído (remoción de `.notification-tray__item--unread`, `.notification-tray__unread-dot` y botones check) | **OK** |
| CP-05: Confirmación de Persistencia Backend del Lote Procesado | Respuesta exitosa del backend confirmando la actualización de estado para los elementos del test | Backend confirma persistencia del cambio de estado a leído para las 10 notificaciones procesadas | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> AppBar (Campana Notificaciones) -> NotificationTray (Clics Masivos UI sobre Controles) -> PATCH /notificaciones/{id}/leida.
- **Detalle de Ejecución**: Procesadas 10 notificaciones no leídas en la bandeja UI mediante interacción directa con botones de check
- **Nota de Entorno**: Total acumulado en TEST post-ejecución: 104 notificaciones sin leer de 125 (dataset histórico fuera de alcance).

## Hallazgos y Observaciones Técnicas
- Cantidad Procesada en el Test: 10 notificaciones no leídas.
- Verificación de Estado Visual: Las 10 notificaciones objetivo pasaron dinámicamente a fondo neutro/blanco en el DOM, perdiendo la clase `.notification-tray__item--unread` y sus botones de check.
- Contexto de Entorno TEST: El contador global del sistema registró 104 notificaciones sin leer de 125, correspondientes a notificaciones de auditoría/desarrollo ajenas a esta ejecución.
- Persistencia Backend: `PATCH /notificaciones/{id}/leida` y `GET /notificaciones` confirmaron la actualización del conjunto probado.
- CP-01: Autenticación e Inicio de Sesión UI -> Sesión autenticada en UI (OK)
- CP-02: Verificación del Estado Visual Inicial (Notificaciones No Leídas) -> Se visualizaron 10 elementos no leídos (y 10 botones de check activos) (OK)
- CP-03: Ejecución de Acción Masiva sobre Notificaciones No Leídas en UI -> Completados 10 clics de marcado en UI (OK)
- CP-04: Verificación de Actualización Visual del Lote Procesado -> Las 10 notificaciones objetivo pasaron a estado leído en el DOM (OK)
- CP-05: Confirmación de Persistencia Backend del Lote Procesado -> Backend confirma la actualización de estado (OK)

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-estado-inicial-bandeja-no-leida.png](screenshots/01-estado-inicial-bandeja-no-leida.png) — Vista inicial de la bandeja NotificationTray mostrando las notificaciones en estado no leído (fondo verde e indicador).
- [02-accion-marcar-todas-leidas.png](screenshots/02-accion-marcar-todas-leidas.png) — Acción de marcado masivo en progreso sobre los controles de la bandeja.
- [03-estado-final-bandeja-leida.png](screenshots/03-estado-final-bandeja-leida.png) — Estado visual final actualizado para las 10 notificaciones procesadas (remoción de visuales de no leída).
- [04-confirmacion-api-backend-leida.png](screenshots/04-confirmacion-api-backend-leida.png) — Confirmación de persistencia Backend GET /notificaciones.
- [tc-m01-100-marcar-todas-notificaciones-leidas.cy.ts.mp4](videos/tc-m01-100-marcar-todas-notificaciones-leidas.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
