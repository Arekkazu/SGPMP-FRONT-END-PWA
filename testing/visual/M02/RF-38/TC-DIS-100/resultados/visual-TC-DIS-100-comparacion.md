# TC-DIS-100 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 14:46:06 | 32 s | 9 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 14:46:44 | 32 s | 9 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Pestaña "Estado" con las acciones del activo (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Estado" con las acciones del activo (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Estado" con las acciones del activo (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diálogo de cierre con la advertencia, recién abierto (fixtures, reloj fijo) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diálogo de cierre con la advertencia, recién abierto (fixtures, reloj fijo) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diálogo de cierre con la advertencia, recién abierto (fixtures, reloj fijo) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error 409 "operación redundante" (route.fulfill), nunca un cierre real | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error 409 "operación redundante" (route.fulfill), nunca un cierre real | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error 409 "operación redundante" (route.fulfill), nunca un cierre real | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
