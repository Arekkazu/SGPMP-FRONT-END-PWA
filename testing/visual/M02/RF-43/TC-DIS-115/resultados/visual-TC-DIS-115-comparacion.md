# TC-DIS-115 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 22:03:03 | 40 s | 15 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 22:03:47 | 40 s | 15 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Formulario vacío (fecha por defecto 30/09/2026) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Formulario vacío (fecha por defecto 30/09/2026) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Formulario vacío (fecha por defecto 30/09/2026) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario lleno (Leche, 12.5 litros) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario lleno (Leche, 12.5 litros) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario lleno (Leche, 12.5 litros) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error de cliente: enviado sin los obligatorios | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error de cliente: enviado sin los obligatorios | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Error de cliente: enviado sin los obligatorios | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Error de cliente: cantidad 0 | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Error de cliente: cantidad 0 | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Error de cliente: cantidad 0 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error 422 "producto no habilitado para la fase" (route.fulfill) con el formulario lleno | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error 422 "producto no habilitado para la fase" (route.fulfill) con el formulario lleno | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error 422 "producto no habilitado para la fase" (route.fulfill) con el formulario lleno | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
