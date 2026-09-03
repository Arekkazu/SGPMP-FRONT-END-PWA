# TC-M01-091 — Generar notificación por correo y notificación interna simultáneamente

| Campo | Valor |
|---|---|
| Requisito | RF-14 |
| Herramienta | Newman / Pytest + Cypress |
| Usuario probado | ingeniero@pecuaria.co |
| ID usuario | 4 |
| Backend | http://localhost:8000 |
| Frontend | http://127.0.0.1:5176 |
| Fecha | 2026-09-03 |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| Pytest - servicio central | EMAIL + INTERNO registrados y enviados para CAMBIO_CONTRASENA | Canal EMAIL: enviado; canal INTERNO: enviado; SMTP mock invocado | **OK** |
| Newman - POST /sesiones/ | HTTP 200 + JWT | HTTP 200 + JWT recibido | **OK** |
| Newman - PUT /contrasena/usuarios/4 | HTTP 200 y evento CAMBIO_CONTRASENA | HTTP 200 | **OK** |
| Newman - GET /notificaciones | HTTP 200 + notificación tipo_evento=6 | HTTP 200 + evento encontrado | **OK** |
| Cypress - bandeja interna UI | Mostrar “Cambio de contraseña” | La API responde 200 con el evento, pero la bandeja renderiza “No tienes notificaciones” | **FALLA** |

## Veredicto: CON FALLAS

## Hallazgos

- Pytest y Newman confirman la generación de los dos canales.
- La API no expone el contenido de una bandeja SMTP real; el canal EMAIL se validó mediante mock SMTP en Pytest.
- La respuesta de `GET /notificaciones` contiene `tipo_evento=6`, pero la bandeja visual no muestra el elemento y presenta “No tienes notificaciones”.
- Cypress generó evidencia en `screenshots/` y `videos/` durante la corrida que alcanzó la aplicación.
