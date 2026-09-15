# TC-M01-088 — Verificar que el perfil no exponga el ID del usuario en la URL

| Campo | Valor |
|---|---|
| Requisito | RF-13 |
| Herramienta | Cypress |
| Usuario | admin.dev@gmail.com |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Ambiente | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Navegador | electron 118.0.5993.159 |
| Fecha | 2026-09-15T02:23:45.491Z |

## Checkpoints
| Request | Esperado | Obtenido | Estado |
|---|---|---|---|
| Login | HTTP 200 y JWT válido para iniciar la navegación autenticada | POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/sesiones/ -> HTTP 200 | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Origen de los datos

No determinado
