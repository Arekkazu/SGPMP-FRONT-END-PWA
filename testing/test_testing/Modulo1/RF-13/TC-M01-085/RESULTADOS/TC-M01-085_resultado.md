# TC-M01-085 — Consultar perfil propio con sesión JWT válida

| Campo | Valor |
|---|---|
| Requisito | RF-13 |
| Herramienta | Newman |
| Usuario | supervisor.dev@gmail.com |
| Backend | http://localhost:8000/api |
| Fecha | 2026-09-03 |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| POST login | HTTP 200 + JWT | HTTP 403 Forbidden; no se recibió token | FALLA |
| GET perfil | HTTP 200 + correo correcto | HTTP 401 Unauthorized; no se pudo autenticar porque el login no entregó JWT | FALLA |

## Veredicto: CON FALLAS

## Hallazgo

Los endpoints existen y las rutas verificadas en el código son `POST /sesiones/` y `GET /usuarios/me`. La ejecución no produjo `404`; el login fue rechazado con HTTP 403 usando las credenciales proporcionadas, por lo que la consulta autenticada devolvió HTTP 401.
