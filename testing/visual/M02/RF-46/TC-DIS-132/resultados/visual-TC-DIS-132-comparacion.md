# TC-DIS-132 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 1/10/2026, 21:31:31 | 17 s | 4 pasan · 0 fallan | — |
| 2 | 1/10/2026, 21:31:54 | 17 s | 4 pasan · 0 fallan | — |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 0. Precondición - el historial real del activo responde | movil | — | — |
| 0. Precondición - el historial real del activo responde | tablet | — | — |
| 0. Precondición - el historial real del activo responde | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Listado paginado sin filtros - página 1 y página 2 | movil | — | — |
| 1. Listado paginado sin filtros - página 1 y página 2 | tablet | — | — |
| 1. Listado paginado sin filtros - página 1 y página 2 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Listado con filtros de categoría y rango de fechas | movil | — | — |
| 2. Listado con filtros de categoría y rango de fechas | tablet | — | — |
| 2. Listado con filtros de categoría y rango de fechas | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Estado sin resultados | movil | — | — |
| 3. Estado sin resultados | tablet | — | — |
| 3. Estado sin resultados | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
