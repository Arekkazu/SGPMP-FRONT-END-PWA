# TC-M01-088 — Verificar que el perfil no exponga el ID del usuario en la URL

| Campo | Valor |
|---|---|
| Requisito | RF-13 |
| Herramienta | Cypress |
| Usuario | supervisor.dev@gmail.com |
| Backend | http://localhost:8000/api |
| Ambiente | http://localhost:5174 |
| Navegador | electron 118.0.5993.159 |
| Fecha | 2026-09-03T05:37:48.787Z |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| Login | HTTP 200 y JWT válido para iniciar la navegación autenticada | POST http://localhost:8000/api/sesiones/ -> HTTP 403 | **FALLA** |

## Veredicto: CON FALLAS

## Origen de los datos

No determinado
