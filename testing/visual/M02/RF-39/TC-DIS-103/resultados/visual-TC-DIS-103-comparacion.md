# TC-DIS-103 — Evidencia de comparación visual contra baseline

Corridas SIN `--update-snapshots` contra la baseline versionada (`*-win32.png`), umbral por defecto de Playwright (sin `maxDiffPixelRatio` ni `maxDiffPixels`; `threshold` por píxel 0.2 en espacio YIQ): pasa solo si 0 píxeles superan esa tolerancia de color por píxel. Diferencias de color pequeñas por píxel (p. ej. el tono de un botón en hover) quedan por debajo del umbral y no cuentan. Rama de la baseline y spec en esta carpeta.

| Corrida | Inicio (hora Colombia) | Duración | Resultado | Tema / idioma |
|---|---|---|---|---|
| 1 | 30/9/2026, 15:13:12 | 64 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |
| 2 | 30/9/2026, 15:14:23 | 73 s | 21 pasan · 0 fallan | tema=light · idioma=es-CO |

## Resultado por estado y viewport

| Estado | Viewport | Corrida 1 | Corrida 2 |
|---|---|---|---|
| 1. Pestaña "Eventos" con los botones de registro (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Eventos" con los botones de registro (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 1. Pestaña "Eventos" con los botones de registro (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario de evento "Crecimiento" recién abierto (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario de evento "Crecimiento" recién abierto (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 2. Formulario de evento "Crecimiento" recién abierto (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Formulario de evento "Sanitario" recién abierto (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Formulario de evento "Sanitario" recién abierto (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 3. Formulario de evento "Sanitario" recién abierto (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Formulario de evento "Reproductivo" recién abierto (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Formulario de evento "Reproductivo" recién abierto (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 4. Formulario de evento "Reproductivo" recién abierto (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Formulario de evento "Productivo" recién abierto (fixtures) | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Formulario de evento "Productivo" recién abierto (fixtures) | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 5. Formulario de evento "Productivo" recién abierto (fixtures) | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de validación: crecimiento enviado vacío | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de validación: crecimiento enviado vacío | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 6. Error de validación: crecimiento enviado vacío | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 409 al registrar crecimiento (route.fulfill) con el formulario lleno | movil | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 409 al registrar crecimiento (route.fulfill) con el formulario lleno | tablet | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |
| 7. Error 409 al registrar crecimiento (route.fulfill) con el formulario lleno | escritorio | pasa · 0 px sobre el umbral | pasa · 0 px sobre el umbral |

Generado a partir del reporte JSON de Playwright de cada corrida (no se versiona el JSON crudo ni playwright-report).
