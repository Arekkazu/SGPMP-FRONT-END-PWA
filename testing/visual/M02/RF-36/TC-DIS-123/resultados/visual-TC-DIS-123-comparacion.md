# TC-DIS-123 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 1/10/2026, 21:29:43 | 18 s | 3 pasan · 0 fallan | — |
| 2 | 1/10/2026, 21:30:06 | 13 s | 3 pasan · 0 fallan | — |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 0. Precondición - el lote real sigue accesible y conserva los campos congelados | movil | — | — |
| 0. Precondición - el lote real sigue accesible y conserva los campos congelados | tablet | — | — |
| 0. Precondición - el lote real sigue accesible y conserva los campos congelados | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Ficha integral" con métricas congeladas | movil | — | — |
| 1. Pestaña "Ficha integral" con métricas congeladas | tablet | — | — |
| 1. Pestaña "Ficha integral" con métricas congeladas | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Pestaña "Datos" con métricas congeladas | movil | — | — |
| 2. Pestaña "Datos" con métricas congeladas | tablet | — | — |
| 2. Pestaña "Datos" con métricas congeladas | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
