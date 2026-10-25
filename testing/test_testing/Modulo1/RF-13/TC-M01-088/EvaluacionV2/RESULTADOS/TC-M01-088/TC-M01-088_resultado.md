# TC-M01-088 — Verificar que el perfil no exponga el ID del usuario en la URL

| Campo | Valor |
|---|---|
| Requisito | RF-13 |
| Herramienta | Cypress |
| Usuario | admin.rol@gmail.com |
| Backend | https://api.inmero.co/back-sigab-test |
| Ambiente | https://api.inmero.co |
| Navegador | chrome 154.0.8037.98 |
| Fecha | 2026-10-11T13:58:45.797Z |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| Login | HTTP 200 y JWT válido para iniciar la navegación autenticada | POST https://api.inmero.co/back-sigab-test/sesiones/ -> HTTP 200 | **OK** |
| GET /usuarios/me | Los datos del perfil provienen del endpoint autenticado, no de un ID en la URL | GET https://api.inmero.co/back-sigab-test/usuarios/me -> HTTP 200 | **OK** |
| URL de perfil | La URL debe ser exactamente /perfil, sin /perfil/{id} | URL actual: /perfil | **OK** |
| Enlaces de navegación | No debe existir un enlace dinámico /perfil/{id} | No se encontró ningún enlace con ID en la ruta del perfil | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Origen de los datos

GET https://api.inmero.co/back-sigab-test/usuarios/me con header Authorization Bearer; respuesta HTTP 200.
