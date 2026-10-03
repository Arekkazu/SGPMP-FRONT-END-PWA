# TC-DIS-112 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 21:54:45 | 46 s | 18 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 21:55:35 | 47 s | 18 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. INDIVIDUAL #627 vacío (categoría por defecto: Inseminación) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. INDIVIDUAL #627 vacío (categoría por defecto: Inseminación) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. INDIVIDUAL #627 vacío (categoría por defecto: Inseminación) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. INDIVIDUAL #627 con relaciones genealógicas (Parto, padre, madre, crías) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. INDIVIDUAL #627 con relaciones genealógicas (Parto, padre, madre, crías) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. INDIVIDUAL #627 con relaciones genealógicas (Parto, padre, madre, crías) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. INDIVIDUAL #627: Aborto con resultado Fallido | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. INDIVIDUAL #627: Aborto con resultado Fallido | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. INDIVIDUAL #627: Aborto con resultado Fallido | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353 vacío: solo "Nacimiento", deshabilitado | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353 vacío: solo "Nacimiento", deshabilitado | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. LOTE #353 vacío: solo "Nacimiento", deshabilitado | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. LOTE #353: Nacimiento lleno (120 crías) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. LOTE #353: Nacimiento lleno (120 crías) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. LOTE #353: Nacimiento lleno (120 crías) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "la madre indicada no existe" (route.fulfill) con relaciones | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "la madre indicada no existe" (route.fulfill) con relaciones | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error 400 "la madre indicada no existe" (route.fulfill) con relaciones | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
