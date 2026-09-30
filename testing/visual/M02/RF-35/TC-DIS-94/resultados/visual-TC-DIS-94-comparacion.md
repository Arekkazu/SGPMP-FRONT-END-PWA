# TC-DIS-94 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio`: pasa solo si 0 píxeles difieren). Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 14:22:22 | 28 s | 6 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 14:22:55 | 26 s | 6 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Pestaña "Datos" con encabezado y acciones del activo (fixtures) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Pestaña "Datos" con encabezado y acciones del activo (fixtures) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 1. Pestaña "Datos" con encabezado y acciones del activo (fixtures) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Editar activo" abierto, sin guardar (fixtures) | movil | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Editar activo" abierto, sin guardar (fixtures) | tablet | pasa · 0 px de diferencia | pasa · 0 px de diferencia |
| 2. Modal "Editar activo" abierto, sin guardar (fixtures) | escritorio | pasa · 0 px de diferencia | pasa · 0 px de diferencia |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
