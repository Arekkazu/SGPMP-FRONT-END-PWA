# TC-M01-074 — Intentar exportar auditoría sin conexión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-10 |
| Tipo / Equipo | Negativa / Offline · Frontend |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T15:24:27.907Z |
| Precondiciones | Sesión admin@pecuaria.co, vista /auditoria, 3932 eventos cargados |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Activar modo offline | navigator.onLine = false | navigator.onLine = false | **OK** |
| ¿Existe el botón "Exportar CSV" al quedar offline? | Debe seguir presente en el DOM | Presente | **OK** |
| ¿La vista avisa que no hay conexión? | Debería mostrar aviso de offline | No muestra ningún aviso | **OBSERVACION** |
| Estado del botón "Exportar CSV" al quedar offline | Habilitado (hay eventos en memoria) | Habilitado | **OK** |
| ¿El botón "Exportar CSV" es alcanzable con un clic real (sin forzar)? | Dentro del viewport, sin overlap | Se sale del viewport (right=1446, viewportWidth=1280) | **FALLA** |
| Clic en "Exportar CSV" offline → generación del archivo | Se genera un Blob CSV en el cliente | NO se generó archivo | **FALLA** |
| Disparo de la descarga | a.click() ejecutado | Descarga NO disparada | **FALLA** |
| Contenido del CSV exportado offline | Encabezado "ID,Usuario,Tipo evento,Módulo,Descripción,Resultado,IP,Fecha/Hora,Hash" + filas visibles | Encabezado: "" · 0 filas | **FALLA** |
| Alertas de error tras exportar offline | Ninguna | 1: Error al exportar CSVOcurrió un error inesperado. Intenta nuevamente. | **OBSERVACION** |
| Recargar datos estando offline (botón ↻) | Alerta de error de red visible | Muestra "Error al cargar auditoría" | **OK** |
| Estado de "Exportar CSV" tras recargar fallido offline | Sigue habilitado (eventos previos en memoria) | Habilitado | **OK** |

## Veredicto: CON FALLAS

## Comportamiento registrado / hallazgos
- Activar modo offline -> navigator.onLine = false (OK)
- ¿Existe el botón "Exportar CSV" al quedar offline? -> Presente (OK)
- ¿La vista avisa que no hay conexión? -> No muestra ningún aviso (OBSERVACION)
- Estado del botón "Exportar CSV" al quedar offline -> Habilitado (OK)
- ¿El botón "Exportar CSV" es alcanzable con un clic real (sin forzar)? -> Se sale del viewport (right=1446, viewportWidth=1280) (FALLA)
- Clic en "Exportar CSV" offline → generación del archivo -> NO se generó archivo (FALLA)
- Disparo de la descarga -> Descarga NO disparada (FALLA)
- Contenido del CSV exportado offline -> Encabezado: "" · 0 filas (FALLA)
- Alertas de error tras exportar offline -> 1: Error al exportar CSVOcurrió un error inesperado. Intenta nuevamente. (OBSERVACION)
- Recargar datos estando offline (botón ↻) -> Muestra "Error al cargar auditoría" (OK)
- Estado de "Exportar CSV" tras recargar fallido offline -> Habilitado (OK)

## Evidencia
- `screenshots/01_offline_export.png`
- `screenshots/02_offline_recargar_error.png`
- `videos/tc-m01-074-exportar-auditoria-offline.cy.ts.mp4`
