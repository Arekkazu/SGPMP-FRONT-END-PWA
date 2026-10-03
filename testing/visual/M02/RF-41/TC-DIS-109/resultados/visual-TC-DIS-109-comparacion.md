# TC-DIS-109 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 21:38:27 | 52 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 21:39:23 | 52 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Diagnóstico (tipo por defecto) vacío | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Diagnóstico (tipo por defecto) vacío | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Diagnóstico (tipo por defecto) vacío | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diagnóstico lleno ("Columnaris") | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diagnóstico lleno ("Columnaris") | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Diagnóstico lleno ("Columnaris") | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Vacunación llena (medicamento, dosis, unidad) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Vacunación llena (medicamento, dosis, unidad) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Vacunación llena (medicamento, dosis, unidad) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Tratamiento lleno (frecuencia, duración, cambio de estado) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Tratamiento lleno (frecuencia, duración, cambio de estado) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Tratamiento lleno (frecuencia, duración, cambio de estado) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Control preventivo lleno (observaciones) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Control preventivo lleno (observaciones) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Control preventivo lleno (observaciones) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de cliente: Tratamiento enviado sin los obligatorios | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de cliente: Tratamiento enviado sin los obligatorios | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de cliente: Tratamiento enviado sin los obligatorios | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 400 "dosis fuera de rango" (route.fulfill) con Vacunación llena | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 400 "dosis fuera de rango" (route.fulfill) con Vacunación llena | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 400 "dosis fuera de rango" (route.fulfill) con Vacunación llena | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
