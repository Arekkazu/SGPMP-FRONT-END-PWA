# TC-M01-074 — Intentar exportar auditoría sin conexión

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-10 |
| Tipo / Equipo | Negativa / Offline · Frontend |
| Ambiente (front) | https://api.inmero.co |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 154.0.8037.98 |
| Fecha ejecución | 2026-10-11T13:56:18.433Z |
| Precondiciones | Sesión admin@pecuaria.co, vista /auditoria, 50170 eventos cargados |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Activar modo offline | navigator.onLine = false | navigator.onLine = false | **OK** |
| ¿Existe el botón "Exportar CSV" al quedar offline? | Debe seguir presente en el DOM | Presente | **OK** |
| ¿La vista avisa que no hay conexión? | Debería mostrar aviso de offline | Muestra aviso | **OK** |
| Estado del botón "Exportar CSV" al quedar offline | Habilitado (hay eventos en memoria) | Deshabilitado | **OBSERVACION** |
| ¿El botón "Exportar CSV" es alcanzable con un clic real (sin forzar)? | Dentro del viewport, sin overlap | Dentro del viewport pero cubierto por otro elemento | **FALLA** |
| Clic en "Exportar CSV" offline → generación del archivo | Se genera un Blob CSV en el cliente | NO se generó archivo | **FALLA** |
| Disparo de la descarga | a.click() ejecutado | Descarga NO disparada | **FALLA** |
| Contenido del CSV exportado offline | Encabezado "ID,Usuario,Tipo evento,Módulo,Descripción,Resultado,IP,Fecha/Hora,Hash" + filas visibles | Encabezado: "" · 0 filas | **FALLA** |
| Alertas de error tras exportar offline | Ninguna | 1: Sin conexión Exportar el historial requiere conexión. Vuelve a intentarlo cuando se restablezca. | **OBSERVACION** |
| Recargar datos estando offline (botón ↻) | Alerta de error de red visible | No muestra alerta | **FALLA** |
| Estado de "Exportar CSV" tras recargar fallido offline | Sigue habilitado (eventos previos en memoria) | Deshabilitado | **OBSERVACION** |

## Veredicto: CON FALLAS

## Comportamiento registrado / hallazgos
- Activar modo offline -> navigator.onLine = false (OK)
- ¿Existe el botón "Exportar CSV" al quedar offline? -> Presente (OK)
- ¿La vista avisa que no hay conexión? -> Muestra aviso (OK)
- Estado del botón "Exportar CSV" al quedar offline -> Deshabilitado (OBSERVACION)
- ¿El botón "Exportar CSV" es alcanzable con un clic real (sin forzar)? -> Dentro del viewport pero cubierto por otro elemento (FALLA)
- Clic en "Exportar CSV" offline → generación del archivo -> NO se generó archivo (FALLA)
- Disparo de la descarga -> Descarga NO disparada (FALLA)
- Contenido del CSV exportado offline -> Encabezado: "" · 0 filas (FALLA)
- Alertas de error tras exportar offline -> 1: Sin conexión Exportar el historial requiere conexión. Vuelve a intentarlo cuando se restablezca. (OBSERVACION)
- Recargar datos estando offline (botón ↻) -> No muestra alerta (FALLA)
- Estado de "Exportar CSV" tras recargar fallido offline -> Deshabilitado (OBSERVACION)

## Evidencia
- `screenshots/01_offline_export.png`
- `screenshots/02_offline_recargar_error.png`
- `videos/tc-m01-074-exportar-auditoria-offline.cy.ts.mp4`
