# Diseño de TC-M08-G024 (RF-106; TC-M08-060)

| Fecha | Nombre | Qué se hizo |
|---|---|---|
| 2026-11-21 | Claude / Juan Sebastian Gutierrez | Fase 1 (análisis y diseño) y decisiones de Sebastian: Playwright Chromium y WebKit contra TEST en solo lectura con `GET /historial-predictivo/885` simulado vía `context.route`; CP-05 y CP-06 verifican únicamente la existencia del mecanismo |
| 2026-11-21 | Argon | Fase 2 v1: construcción de `tc-m08-g024.pw.ts`, `playwright.config.ts`, `ejecutar_tc_m08_g024.ps1`, controles y prueba local en `evidencias/prueba_herramienta_v1/` (detención en `control_brush` v1; corrección v2 autorizada por Claude; 8 corridas en total) |
| 2026-11-22 | Claude / Juan Sebastian Gutierrez | Reintento 1 (#728, INC-M08-391-G024): Fase 1 y spec v1.1 con ADAPT-1 (puntos de la línea contados con `.recharts-line-dots circle`), aprobado por Sebastian; prueba de la herramienta en `evidencias/prueba_herramienta_reintento1/` (Chromium); respaldo de la ronda 1 en `evidencias/fuentes_generador/ronda1/*.txt` (sección 9) |
| 2026-11-22 | Claude / Juan Sebastian Gutierrez | Reintento 1 cerrado: corrida oficial `qa-m08-g024-20261122-124205` Aprobado 6/6, promovida a `resultados/resultado_TC-M08-G024_reintento1.json` por orden de Sebastian (sección 9.5) |

**Caso:** TC-M08-060 (rendimiento de la vista del historial predictivo con 365 días de historial, 1.000 eventos combinados y 2.000 eventos en Chromium y WebKit; existencia de zoom/scroll y de paginación/virtualización de la gráfica).

**Fuente normativa:** hoja «Modulo 8», RF-106 v1.0 (CA-1, RNF-01, RNF-02, RNF-05) y TC-M08-060 (Chromium y WebKit).

## 1. Contexto técnico (Fase 1)

- **Requisitos:** RF-106 CA-1 exige que la línea de tiempo cargue en `<= 3 s` con 365 días de historial; RNF-01 exige renderizado en `<= 3 s` con hasta 1.000 eventos combinados; RNF-02 refiere interacción fluida (zoom, scroll, hover); RNF-05 refiere grandes volúmenes con paginación o virtualización de la gráfica. El caso pide Chromium y WebKit.
- **Vista (`src/prediction/pages/HistorialPredictivoView.tsx:229-246`):** utiliza `ComposedChart` de Recharts (`Line` con `dot` para predicciones y dos `Scatter` para eventos y valoraciones), alto 320 px, sin `Brush`, sin controles de zoom y sin scroll horizontal; dibuja todos los puntos recibidos. El backend no pagina predicciones, eventos ni valoraciones (solo `pendientes` de 20 en 20).
- **Decisiones de Sebastian (2026-11-21):**
  - CP-05 y CP-06 son checkpoints, pero **solo verifican la existencia del mecanismo**; RNF-02 y RNF-05 no definen un criterio medible (se registra como observación fija).
  - Solo lectura en TEST: login real del Veterinario 97 una sola vez en Chromium y continuación en WebKit por cookie de refresco; `GET /historial-predictivo/885` se responde mediante `context.route` con respuestas sintéticas grandes con la forma real del backend (`consultar_historial_predictivo_use_case.py:95-150` y `historial_predictivo.py:91-104`). Ninguna escritura.

## 2. Criterio de medición (CP-01 a CP-04)

- Se realizan **3 mediciones independientes** por escenario y navegador (`365d` = 365 predicciones + 60 eventos + 75 valoraciones = 500 marcadores; `1000` = 730 predicciones + 120 eventos + 150 valoraciones = 1.000 marcadores).
- En cada medición se instala un vigilante con `requestAnimationFrame` antes de elegir el activo 885 en el combobox «Animal o lote». El cronómetro inicia justo antes del clic en la opción y se detiene cuando `.recharts-line-dots .recharts-dot` iguala `L` (predicciones esperadas), `.recharts-scatter-symbol` iguala `S` (eventos + valoraciones esperados) y no existe el texto `Cargando historial...`.
- **Criterio de aprobación:** las **3 mediciones** deben completarse (`completas=3/3`) y **cada una debe ser `<= 3.000 ms`**.

## 3. Checkpoints (6 en total)

| CP | Caso | Esperado | Fuente | Previsto |
|---|---|---|---|---|
| CP-01 | TC-M08-060, Chromium, 365 días (500 marcadores) | La línea de tiempo queda dibujada completa (365 predicciones, 135 eventos y valoraciones) en `<= 3.000 ms` en cada una de 3 mediciones | RF-106 CA-1; RNF-01 | Se mide (OK en local) |
| CP-02 | TC-M08-060, Chromium, 1.000 eventos combinados | La línea de tiempo queda dibujada completa (730 predicciones, 270 eventos y valoraciones) en `<= 3.000 ms` en cada una de 3 mediciones | RF-106 RNF-01 | Se mide (OK en local) |
| CP-03 | TC-M08-060, WebKit, 365 días | La línea de tiempo queda dibujada completa (365 predicciones, 135 eventos y valoraciones) en `<= 3.000 ms` en cada una de 3 mediciones | RF-106 CA-1; RNF-01; TC-M08-060 (Chromium y WebKit) | Se mide (OK en local) |
| CP-04 | TC-M08-060, WebKit, 1.000 eventos combinados | La línea de tiempo queda dibujada completa (730 predicciones, 270 eventos y valoraciones) en `<= 3.000 ms` en cada una de 3 mediciones | RF-106 RNF-01; TC-M08-060 (Chromium y WebKit) | Se mide (OK en local) |
| CP-05 | TC-M08-060, zoom y scroll (existencia) | La gráfica ofrece zoom o desplazamiento: un `Brush` de recharts, la rueda del ratón cambia el rango del eje X, un contenedor con desplazamiento horizontal o botones de zoom | RF-106 RNF-02 (solo existencia; decisión de Sebastian 2026-11-21) | FALLA |
| CP-06 | TC-M08-060, más de 1.000 eventos (2.000) | Con 2.000 eventos la gráfica pagina (controles propios de la gráfica) o virtualiza (dibuja menos marcadores que los recibidos) | RF-106 RNF-05 (solo existencia; decisión de Sebastian 2026-11-21) | FALLA |

## 4. Retirado

- **TC-M08-060: tiempo de carga con 365 días de historial real (backend incluido):** TEST no tiene un activo con 365 días de historial; el caso pide respuestas simuladas. Se mide el frontend desplegado con la respuesta simulada (`page.route`); el tiempo real del backend con el 885 (24 predicciones) va como observación.

## 5. Observaciones

- **Fija 1:** RNF-02 y RNF-05 no definen un criterio medible; CP-05 y CP-06 solo verifican la existencia del mecanismo (decisión de Sebastian, 2026-11-21).
- **Fija 2:** El tooltip por marcador ya está reportado en INC-M08-NN-G021 e INC-M08-NN-G022.
- **Dinámicas por corrida:** tiempo real del 885 sin simular (`dibujado` y `duración GET`), tiempos de hover (20 movimientos sobre el área de trazado en Chromium con 1.000 eventos: mediana y máximo), versión de WebKit y bundle `index-*.js` servido.

## 6. Prueba de la herramienta (`evidencias/prueba_herramienta_v1/`)

Se compilaron 4 builds locales en `node_modules/.cache/qa_g024/` (`build_normal`, `build_control_brush`, `build_control_virtual`, `build_control_lento`) servidos en `127.0.0.1:4173` por `controles/servidor_api_simulada.mjs.txt` (`controles/lanzar_mock.mjs`). En todas las corridas hubo 0 «No alcanzado» y `mock.log` registró únicamente `POST /sesiones/` (1) y `POST /sesiones/refresh` como métodos distintos de `GET`.

| Corrida | Build | Exit | Summary | Tiempos y obtenido literal |
|---|---|---|---|---|
| `normal_1` | `build_normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[136, 102, 92] ms` (med 102); CP-02 OK `[149, 169, 138] ms` (med 149); CP-03 OK `[390, 237, 244] ms` (med 244); CP-04 OK `[302, 331, 293] ms` (med 302); CP-05 FALLA (`brush=0, botones_zoom=0, scroll_horizontal=0, etiquetas_cambian=false`); CP-06 FALLA (`dibujados=2000 de recibidos=2000 (1460/1460, 540/540), paginador=0 []`); 885 real `163 ms` (GET `9 ms`); hover med `50 ms` / max `52 ms` |
| `normal_2` | `build_normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[117, 108, 92] ms` (med 108); CP-02 OK `[175, 147, 137] ms` (med 147); CP-03 OK `[320, 245, 232] ms` (med 245); CP-04 OK `[331, 351, 299] ms` (med 331); CP-05 FALLA (`brush=0`); CP-06 FALLA (`dibujados=2000`); 885 real `137 ms` (GET `11 ms`); hover med `50 ms` / max `52 ms` |
| `normal_3` | `build_normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[116, 128, 95] ms` (med 116); CP-02 OK `[146, 145, 137] ms` (med 145); CP-03 OK `[335, 247, 229] ms` (med 247); CP-04 OK `[351, 359, 343] ms` (med 351); CP-05 FALLA (`brush=0`); CP-06 FALLA (`dibujados=2000`); 885 real `134 ms` (GET `10 ms`); hover med `50 ms` / max `51 ms` |
| `control_brush` (v1, detención) | `build_control_brush` (sin `data` en `ComposedChart`) | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[121, 105, 94] ms`; CP-02 OK `[146, 145, 133] ms`; CP-03 OK `[286, 237, 235] ms`; CP-04 OK `[337, 320, 316] ms`; CP-05 FALLA (`brush=0`, motivo de detención); CP-06 FALLA (`dibujados=2000`) |
| `control_brush_v2` | `build_control_brush` (con `data={puntos.linea}`) | 1 | 5 OK, 1 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[128, 114, 113] ms` (med 114); CP-02 OK `[172, 165, 155] ms` (med 165); CP-03 OK `[369, 294, 296] ms` (med 296); CP-04 OK `[435, 390, 421] ms` (med 421); **CP-05 OK** (`brush=1, botones_zoom=0, scroll_horizontal=0, etiquetas_cambian=false`); CP-06 FALLA (`dibujados=2000`) |
| `control_virtual` | `build_control_virtual` | 1 | 5 OK, 1 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 OK `[126, 105, 101] ms` (med 105); CP-02 OK `[152, 146, 129] ms` (med 146); CP-03 OK `[320, 232, 238] ms` (med 238); CP-04 OK `[284, 317, 312] ms` (med 312); CP-05 FALLA (`brush=0`); **CP-06 OK** (`dibujados=1740 de recibidos=2000 (1200/1460, 540/540), paginador=0 []`) |
| `control_lento` | `build_control_lento` | 1 | 0 OK, 6 FALLA (`Rechazado`); 0 precondiciones falsas | **CP-01 FALLA** `[3613, 3635, 3608] ms` (med 3613, `3/3`); **CP-02 FALLA** `[3658, 3643, 3640] ms` (med 3643, `3/3`); **CP-03 FALLA** `[3819, 3734, 3758] ms` (med 3758, `3/3`); **CP-04 FALLA** `[3836, 3821, 3852] ms` (med 3836, `3/3`); CP-05 FALLA (`brush=0`); CP-06 FALLA (`dibujados=2000`) |
| `control_exportar` | `build_normal` (spec con clic en Exportar PDF) | 1 | 0 OK, 6 FALLA (`Rechazado`); 1 precondición falsa | Precondición falsa: `Ninguna escritura no permitida hacia TEST [POST /sigab-test/api/reportes]`; `mock.log` sin `ESCRITURA_NO_PERMITIDA` |

## 7. Desviaciones autorizadas

1. **`control_lento`:** el minificador eliminaba el bucle `while` con cuerpo vacío (`/* QA */`); se agregó un contador con efecto observable (`window.__qaLento`) para conservar la espera de 3.500 ms en el bundle compilado (cambio de Argon, aceptado por Claude).
2. **`control_brush`:** la primera versión no dibujaba el `Brush` porque `<ComposedChart>` no tiene `data` propio (`lib/cartesian/Brush.js:802` devuelve `null` si `chartData` está vacío); corrección v2 autorizada por Claude agregando `data={puntos.linea}` en `vite.control_brush.config.ts`. La corrida `control_brush` (v1) se conserva como evidencia de la detención.
3. **`resultados\.gitkeep`:** contenía `CRLF`; Claude lo dejó vacío (0 bytes).

## 8. SHA-256 finales

### Archivos del caso (`TC-M08-G024`)

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g024.pw.ts` | `72B0E73A5A6899FD9D0C8A4D29DA2B05B652D722738E83FCA64FABC704CA310C` |
| `playwright.config.ts` | `64253AC04AC32CA46D3158B45D4B7415EF6A8A6FB9122AE75E6388B61A298C59` |
| `ejecutar_tc_m08_g024.ps1` | `AEB2C72E3650636E91233E21F0976CB9C4819A3784674F35542EE38715E9D342` |
| `resultados\.gitkeep` | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |

### Controles (`evidencias/prueba_herramienta_v1/controles/`)

| Archivo | SHA-256 |
|---|---|
| `servidor_api_simulada.mjs.txt` | `3EF27D8DE788F91986FE6E22179C5A52277D635B7A9EE312841833E05493FA5F` |
| `lanzar_mock.mjs` | `5D00F58B4CB82F8539D574F32897F0E011B765FF9EECE15AB8BDE67EA09ABA73` |
| `vite.control_brush.config.ts` | `EF49F8878FE597ECD12A0FB6D9997040C5315F544035B019348B4327F501F762` |
| `vite.control_virtual.config.ts` | `7283BFC7BA4CEDFD873E68BA72A08B6689C5E2E4E53A858A195A92592C11524D` |
| `vite.control_lento.config.ts` | `025BA6FF3C5D4161783330FCBEAB3BBE78B66F8E4EF3B03E578D13B5FB2928AA` |
| `control_exportar.pw.ts.txt` | `CDC621202DBB1B6BF3313A74134E45A6B87DF35FA9F137E731E6AE962D7ED33B` |

### Archivos de `src` registrados por el runner

| Archivo | SHA-256 |
|---|---|
| `src\prediction\pages\PrediccionPage.tsx` | `3A7B576FBE36BBE736335AAC4B574DFA018096D6AB54BFD67B4862B9132DDC13` |
| `src\prediction\pages\HistorialPredictivoView.tsx` | `EFB390901B03470EDCEB074D7E71DAA115C6DD00F1D2D9CF9C6E53B6986B3F36` |
| `src\prediction\api\historialPredictivoApi.ts` | `EEBCB360395D9FD6F89B3384DB8E8CED18D4A2363EE2892E1F9D417F2767D737` |
| `src\shared\api\http.ts` | `117C6708C01575885C943732162CD64108A015A403253CB50480A486258CCB08` |
| `src\reportes\api\reportesApi.ts` | `FC53F49E2486B37DB65117C332C3E78B63D5756D42003DD8C9BA9E9F3BCFCECA` |
| `src\shared\i18n\formato.ts` | `9710FDF5B3150B820F91C9D263BB209517B6CA8EF61B32B9C0648C0CD7C4F279` |
| `src\shared\i18n\locales\es-CO\prediction.json` | `B51867FB0B62AC3802C1A1DD94EADEAA8FAC272ED0798C7EEFD1AA75F459A252` |

## 9. Reintento 1 (2026-11-22)

### 9.1 Cambio de Desarrollo (observado)

- PR «Incidencias de QA de M08», issue #728 (INC-M08-391-G024). Commits `a74c51cb` y `d19d23c1`, integrados en `test-JuanSG` por `03086c80` (#732). Frontend HEAD `af93ae87` (desde `488f43f6` solo entraron pruebas de accesibilidad de M07; `src/` igual). Backend HEAD `b741c0e7` (en el historial solo `655bc00af`, ajeno a G024).
- `src/prediction/pages/HistorialPredictivoView.tsx` (`6043535E…`):
  - :35 `LIMITE_MARCADORES = 1000`; :54-61 `moverVentana()` (acercar hasta 1 h, desplazar media ventana, sin salir del rango).
  - :68-85 `marcadoresVisibles()`: solo lo que cae en la ventana visible; si pasa de 1.000, la línea se reduce por tramos quedándose con la predicción de mayor riesgo de cada tramo; eventos y valoraciones completos.
  - :164-171 ventana (`null` = todo el rango; se reinicia con cada consulta); :316-342 botones «Antes», «Acercar», «Alejar», «Después», «Ver todo el rango», aviso «Mostrando del … al …» y aviso de muestreo.
  - **:358-362: cada punto de la línea es un `<circle>` propio, sin la clase `recharts-dot`** (cambio del mismo PR, por el `<title>` de G021/G022).
- Despliegue en TEST (navegador integrado, sin sesión, 2026-11-22): bundle `index-BUhd1sjz.js`, chunk `PrediccionPage-Dy0FYjn5.js`, con `zoom_todo` «Ver todo el rango», `muestreo` y la reducción por mayor riesgo de `d19d23c1`.

### 9.2 Spec de la ronda 1 sin cambios contra el código actual

Build local de `af93ae87` con la API simulada de la ronda 1, Chromium (WebKit no se puede descargar en el contenedor): CP-01 y CP-02 FALLA por la herramienta (timeout; 0/365 y 0/730 puntos contados), CP-05 OK (`botones_zoom=2`), **CP-06 OK falso** (`dibujados=540`: 0/1460 puntos contados), CP-03 y CP-04 no alcanzados. Evidencia: `prueba_herramienta_reintento1/ronda1_sin_cambios/`.

### 9.3 Spec v1.1 (aprobado por Sebastian, 2026-11-22)

- **ADAPT-1:** los puntos de la línea se cuentan con `.recharts-line-dots circle` en lugar de `.recharts-line-dots .recharts-dot` (5 apariciones: vigilantes y lecturas de CP-01 a CP-04 y CP-06). El selector también cuenta los puntos estándar de recharts (también son `<circle>`).
- Observación fija 2 reescrita (el detalle por marcador se evalúa en G021 y G022, corregido en sus reintentos 1).
- Observación dinámica nueva: con 2.000 marcadores, avisos `role="status"` de la tarjeta «Línea de tiempo» y estado de los botones del grupo de zoom.
- Sin cambios: checkpoints, esperados, fuentes, retirado, guardia de escrituras, `playwright.config.ts` y runner (ya admite `-Reintento 1` y exige 6 checkpoints).
- Diff contra la ronda 1: `prueba_herramienta_reintento1/diff_spec_ronda1_vs_v1.1.txt`.

### 9.4 Prueba de la herramienta (`evidencias/prueba_herramienta_reintento1/`)

Build local de `af93ae87` (`VITE_BASE_PATH=/sigab-test/`, API simulada de la ronda 1 `prueba_herramienta_v1/controles/servidor_api_simulada.mjs.txt` en `127.0.0.1:4173`), Chromium 153 en el contenedor de Claude. Controles con plugin de Vite que reemplaza texto exacto en memoria (`controles/vite.control_*.config.ts`; cada texto viejo aparece una vez). En todas: CP-03 y CP-04 «No alcanzado» porque el contenedor no tiene WebKit; `mock.log` solo con `POST /sesiones/` (1) y `POST /sesiones/refresh`.

| Corrida | Build | Resultado (Chromium) |
|---|---|---|
| `normal_1` a `normal_3` | actual | CP-01 OK (med. 207, 193, 206 ms; 365/365, 135/135); CP-02 OK (med. 556, 513, 595 ms; 730/730, 270/270); CP-05 OK (`botones_zoom=2`); CP-06 OK (`dibujados=905`: 365/1460, 540/540); aviso «se muestran 365 de 1460» |
| `control_sin_zoom` | sin grupo de botones | solo CP-05 FALLA (`botones_zoom=0`) |
| `control_sin_muestreo` | `LIMITE_MARCADORES = 1_000_000` | solo CP-06 FALLA (`dibujados=2000`: 1460/1460, 540/540) |
| `control_lento` | 3.500 ms antes de dibujar | CP-01 FALLA (3815, 3721, 3718 ms) y CP-02 FALLA (4245, 4021, 4038 ms), completas 3/3 |
| `control_sin_circulos` | puntos como `<rect>` | CP-01 y CP-02 FALLA (timeout, 0/365 y 0/730); CP-06 sigue OK (540 < 2.000): limitación conocida del criterio de existencia, que no cambia |
| `control_exportar` | actual, spec con clic en «Exportar» | precondición «Ninguna escritura no permitida» falsa (`POST /sigab-test/api/reportes`), 6 FALLA; el simulador no recibió la escritura |

**WebKit en el equipo de Sebastian (Argon, prompt cerrado de Claude, 2026-11-22 12:23-12:31).** Builds locales de `af93ae87` en `node_modules\.cache\qa_g024_r1\` (`build_actual`, `build_lento`, `build_sin_circulos`, exit 0), misma API simulada, Chromium 159 (`chromium-1243`) y WebKit 27.2 (`webkit-2388`). Validado por Claude contra los archivos: en los cinco `mock.log`, solo `POST /sesiones/` (1) y `POST /sesiones/refresh` (16); ninguna precondición falsa.

| Corrida | Build | Resultado |
|---|---|---|
| `webkit_normal_1` a `webkit_normal_3` | actual | **6/6 OK**, exit 0. CP-01 (med. 291, 265, 250 ms), CP-02 (647, 663, 669 ms), CP-03 WebKit (490, 419, 410 ms), CP-04 WebKit (961, 966, 971 ms), siempre 365/365 y 730/730; CP-05 `botones_zoom=2`; CP-06 `dibujados=905` |
| `webkit_control_lento` | lento | CP-01 a CP-04 FALLA (Chromium 3756-4272 ms; WebKit 3986-4594 ms; completas 3/3); CP-05 y CP-06 OK |
| `webkit_control_sin_circulos` | sin círculos | CP-01 a CP-04 FALLA (timeout; 0/365 y 0/730 en los dos navegadores); CP-05 y CP-06 OK |

**Desvío de Argon (sin efecto en los resultados):** en su script, la variable del bucle `$p` sobrescribió `$P` (PowerShell no distingue mayúsculas) y la corrida `webkit_control_sin_circulos` escribió en `CP-06\webkit_control_sin_circulos`, en la raíz del frontend. Claude la movió a `prueba_herramienta_reintento1\` con los mismos SHA (9 archivos) y quitó la carpeta vacía `CP-06` (autorizado por Sebastian). No hubo reintentos ni archivos borrados.

ADAPT-1: puede dar FALLA (`control_sin_circulos` y `webkit_control_sin_circulos`, `control_lento` y `webkit_control_lento`, `control_sin_muestreo`) y OK (`normal_*` y `webkit_normal_*`), en Chromium y en WebKit.

### 9.5 Corrida oficial y promoción

- **RUN** `qa-m08-g024-20261122-124205` (staging `evidencias/run-20261122-124205/`), 2026-11-22 12:42-12:44, exit 0, `-Reintento 1`, ejecutada por el agente con el prompt cerrado (SHA, HEAD, `Test-Path` del `_reintento1.json` = False, `ParseFile`, `playwright --list` = 1 prueba en 1 archivo, una ejecución).
- **Validada por Claude contra los archivos del equipo:** SHA del spec, config, runner y de los 7 archivos de `src` (HEAD `af93ae87`, sin cambios locales; `prediction.json` `1EB717AB…`, cambiado por `a74c51cb`); una sola carpeta `run-*` nueva, sin archivos fuera del staging; 6 checkpoints OK, ninguno «No alcanzado»; 9 precondiciones OK (bundle `index-BUhd1sjz.js`); solo `POST /api-sgpmp-test/sesiones/` (1) y `/sesiones/refresh` (16) como peticiones distintas de GET; escaneo 0 hallazgos y revisión manual sin `eyJ`, `Bearer` ni correos; sin `error-context.md` (prueba aprobada); capturas de Chromium y WebKit con la cuenta y el pie del menú enmascarados; tiempos del orden de `webkit_normal_*`.

| CP | Obtenido | Estado |
|---|---|---|
| CP-01 | Chromium, 365 días: [299, 269, 270] ms, 3/3, 365/365, 135/135 | OK |
| CP-02 | Chromium, 1.000: [755, 711, 739] ms, 3/3, 730/730, 270/270 | OK |
| CP-03 | WebKit 27.2, 365 días: [561, 435, 467] ms, 3/3 | OK |
| CP-04 | WebKit 27.2, 1.000: [996, 1049, 1031] ms, 3/3 | OK |
| CP-05 | `brush=0, botones_zoom=2` («Acercar» y «Alejar») | OK (ronda 1: FALLA) |
| CP-06 | `dibujados=905 de 2000` (365/1460, 540/540); aviso «se muestran 365 de 1460» | OK (ronda 1: FALLA) |

- **Limitación de la observación del 885 real (no es checkpoint):** dio «24/24 y 9/7, dibujado=timeout» (ronda 1: 7/7 en 318 ms). Causa probable (código): los marcadores «N eventos» del arreglo de G021 se dibujan como `Scatter` (`HistorialPredictivoView.tsx`:386) y entran en `.recharts-scatter-symbol`; el 885 trae 2 grupos, así que se cuentan 7 + 2 y el vigilante nunca ve 7. Los escenarios sintéticos tienen `grupos: []`, por lo que CP-01 a CP-06 no se ven afectados. Si se repite el caso, excluir `.hp-grupo` de ese conteo.
- **Promoción** (2026-11-22, por orden de Sebastian): `resultados/resultado_TC-M08-G024_reintento1.json` = `C1ED87666570FD90714EE4FA87FD1AA2978D939F3225CB3D3D076DF3EAC9A9E2`, igual en origen y destino; ronda 1 intacta (`DE39BA0D…`). Registro `evidencias/PROMOCION_TC-M08-G024_reintento1.txt`. Lectura: total 6, passed 6, failed 0 → **Aprobado**. INC-M08-391-G024 (GitHub 728) corregido.

### 9.6 SHA-256 del reintento 1

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g024.pw.ts` (v1.1) | `288529502D4B45D3CC74AF1C8CBC6C6154159916453FAEE86BC23AB610A9E115` |
| `playwright.config.ts` (sin cambios) | `64253AC04AC32CA46D3158B45D4B7415EF6A8A6FB9122AE75E6388B61A298C59` |
| `ejecutar_tc_m08_g024.ps1` (sin cambios) | `AEB2C72E3650636E91233E21F0976CB9C4819A3784674F35542EE38715E9D342` |
| `fuentes_generador/ronda1/tc-m08-g024.pw.ts.txt` | `72B0E73A5A6899FD9D0C8A4D29DA2B05B652D722738E83FCA64FABC704CA310C` |
| `fuentes_generador/ronda1/DISENO_TC-M08-G024.md.txt` | `5C631F739990CBF59D473440827469B33F29E7A30EE789E1773C741CBE9B94E9` |
| `src/prediction/pages/HistorialPredictivoView.tsx` | `6043535E9EDEA1D8E86DFC4553ECCC8746CC4DEA733EDA968A0BDC154937F35F` |

Los SHA de los archivos de la prueba están en `prueba_herramienta_reintento1/SHA256SUMS.txt`.
