# TC-DIS-118 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio`: pasa solo si 0 píxeles difieren). Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 14:20:32 | 41 s | 9 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 14:21:19 | 38 s | 9 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Ficha INDIVIDUAL #627 (fixture) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Ficha INDIVIDUAL #627 (fixture) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Ficha INDIVIDUAL #627 (fixture) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Ficha LOTE #353 con la sección 7 (fixture) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Ficha LOTE #353 con la sección 7 (fixture) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Ficha LOTE #353 con la sección 7 (fixture) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Ficha con secciones sin datos (fixture de #627 vaciado) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Ficha con secciones sin datos (fixture de #627 vaciado) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 3. Ficha con secciones sin datos (fixture de #627 vaciado) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
