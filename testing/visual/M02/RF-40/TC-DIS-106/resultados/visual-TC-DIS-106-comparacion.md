# TC-DIS-106 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 21:30:58 | 52 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 21:31:54 | 52 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Formulario vacío (INDIVIDUAL #627, fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Formulario vacío (INDIVIDUAL #627, fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Formulario vacío (INDIVIDUAL #627, fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Tipo de medición "Peso" (PESO, kg) lleno | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Tipo de medición "Peso" (PESO, kg) lleno | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Tipo de medición "Peso" (PESO, kg) lleno | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Tipo de medición "peso_destete" (OTRO, kg) lleno | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Tipo de medición "peso_destete" (OTRO, kg) lleno | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Tipo de medición "peso_destete" (OTRO, kg) lleno | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353: formulario con los campos poblacionales (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353: formulario con los campos poblacionales (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353: formulario con los campos poblacionales (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error de cliente: valor 0 | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error de cliente: valor 0 | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Error de cliente: valor 0 | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "valor fuera de rango" (route.fulfill) con el formulario lleno | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "valor fuera de rango" (route.fulfill) con el formulario lleno | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "valor fuera de rango" (route.fulfill) con el formulario lleno | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Tipo de medición con otra unidad: "Talla (TALLA)" en cm (métrica simulada) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Tipo de medición con otra unidad: "Talla (TALLA)" en cm (métrica simulada) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Tipo de medición con otra unidad: "Talla (TALLA)" en cm (métrica simulada) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
