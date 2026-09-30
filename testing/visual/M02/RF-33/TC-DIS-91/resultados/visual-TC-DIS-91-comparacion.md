# TC-DIS-91 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio`: pasa solo si 0 píxeles difieren). Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 14:23:29 | 39 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 14:24:14 | 40 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Formulario INDIVIDUAL vacío | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Formulario INDIVIDUAL vacío | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Formulario INDIVIDUAL vacío | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Formulario POBLACIONAL vacío | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Formulario POBLACIONAL vacío | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Formulario POBLACIONAL vacío | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Error 409 "identificador ya registrado" (route.fulfill) con el formulario lleno | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Error 409 "identificador ya registrado" (route.fulfill) con el formulario lleno | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Error 409 "identificador ya registrado" (route.fulfill) con el formulario lleno | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Error de cantidad inválida (cantidad 0, validación del cliente) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Error de cantidad inválida (cantidad 0, validación del cliente) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Error de cantidad inválida (cantidad 0, validación del cliente) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
