# TC-DIS-97 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 15:04:49 | 58 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 15:05:55 | 57 s | 12 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Modal "Cambiar / avanzar fase" vacío (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Modal lleno con valores fijos, SIN guardar (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Historial con una fase FINALIZADA (fixture simulado a partir del real) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
