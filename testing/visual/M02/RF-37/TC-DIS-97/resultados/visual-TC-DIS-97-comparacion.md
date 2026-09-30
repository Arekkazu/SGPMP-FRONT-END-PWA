# TC-DIS-97 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio`: pasa solo si 0 píxeles difieren). Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 14:36:10 | 40 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 14:36:56 | 42 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
