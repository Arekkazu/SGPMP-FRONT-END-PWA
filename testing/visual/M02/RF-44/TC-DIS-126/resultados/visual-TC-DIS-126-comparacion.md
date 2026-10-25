# TC-DIS-126 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 1/10/2026, 21:30:23 | 31 s | 5 pasan · 0 fallan | — |
| 2 | 1/10/2026, 21:31:04 | 22 s | 5 pasan · 0 fallan | — |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| Estado de origen ACTIVO - activo #296 | movil | — | — |
| Estado de origen ACTIVO - activo #296 | tablet | — | — |
| Estado de origen ACTIVO - activo #296 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| Estado de origen INACTIVO - activo #468 | movil | — | — |
| Estado de origen INACTIVO - activo #468 | tablet | — | — |
| Estado de origen INACTIVO - activo #468 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| Estado de origen EN_TRATAMIENTO (simulado) - activo #296 | movil | — | — |
| Estado de origen EN_TRATAMIENTO (simulado) - activo #296 | tablet | — | — |
| Estado de origen EN_TRATAMIENTO (simulado) - activo #296 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| Estado de origen AISLADO (simulado) - activo #296 | movil | — | — |
| Estado de origen AISLADO (simulado) - activo #296 | tablet | — | — |
| Estado de origen AISLADO (simulado) - activo #296 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| Estado de origen CERRADO - activo #288 | movil | — | — |
| Estado de origen CERRADO - activo #288 | tablet | — | — |
| Estado de origen CERRADO - activo #288 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
