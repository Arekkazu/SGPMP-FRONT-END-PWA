# TC-M01-074 — Intentar exportar auditoría sin conexión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-10 |
| Tipo / Equipo | Negativa / Offline · Frontend |
| Ambiente (front) | https://api.inmero.co |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 154.0.8037.98 |
| Fecha ejecución | 2026-10-12T16:16:58.350Z |
| Precondiciones | Sesión admin@pecuaria.co, vista /auditoria, 0 eventos cargados |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Activar modo offline | navigator.onLine = false | navigator.onLine = false | **OK** |
| ¿Existe el botón "Exportar CSV" al quedar offline? | Debe seguir presente en el DOM | Presente | **OK** |
| ¿La vista avisa que no hay conexión? | Debería mostrar aviso de offline | Muestra aviso | **OK** |
| Estado del botón "Exportar CSV" al quedar offline | Deshabilitado (no se puede exportar sin conexión) | Deshabilitado | **OK** |
| Clic forzado en "Exportar CSV" offline → no se genera archivo | Sin Blob CSV | No se generó archivo | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Comportamiento registrado / hallazgos
- Activar modo offline -> navigator.onLine = false (OK)
- ¿Existe el botón "Exportar CSV" al quedar offline? -> Presente (OK)
- ¿La vista avisa que no hay conexión? -> Muestra aviso (OK)
- Estado del botón "Exportar CSV" al quedar offline -> Deshabilitado (OK)
- Clic forzado en "Exportar CSV" offline → no se genera archivo -> No se generó archivo (OK)

## Evidencia
- `screenshots/01_offline_export.png`
- `screenshots/02_offline_recargar_error.png`
- `videos/tc-m01-074-exportar-auditoria-offline.cy.ts.mp4`
