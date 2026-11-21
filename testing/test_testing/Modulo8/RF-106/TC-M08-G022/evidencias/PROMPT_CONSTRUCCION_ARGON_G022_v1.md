# PROMPT CERRADO PARA GEMINI ARGON: CONSTRUCCIÓN DE TC-M08-G022 (Fase 2) — v1

Autor del diseño: Claude (Fase 1 aprobada por Sebastian, 2026-11-20 21:44). Tú solo construyes y pruebas la herramienta.

## 0. Reglas (si incumples una, la construcción no sirve)

- **Prohibido borrar, mover o renombrar cualquier archivo o carpeta**, salvo lo que este prompt pida. **Si te detienes, deja todo como esté** y entrega la lista de lo creado con sus SHA-256.
- No abras `.env.test` (ni del frontend ni del backend). No uses credenciales reales. No te conectes a TEST ni a ninguna URL externa. No toques `src/`, `testing/playwright.config.ts`, `testing/package.json`, `package.json` ni `pnpm-lock.yaml`. No instales nada. Nada de git.
- No ejecutes el runner `.ps1` (solo `ParseFile`). No modifiques nada de `TC-M08-G021` (solo lo copias).
- Si algo de este prompt no se puede cumplir tal cual (un selector que no existe, un texto que no aparece, un conteo distinto al previsto), **DETENTE** y responde con el error literal y la lista de lo creado. No improvises.
- Nada de `skip`/`only`, aserciones condicionales ni bucles que puedan pasar vacíos. Ningún `expect`, `findBy*` ni espera que pueda lanzar **antes** de `anotar()`: los errores de espera o selección se escriben en el `obtenido` y el checkpoint da FALLA (patrón `seleccionar()` de G021, que devuelve `''` o el error).
- El `obtenido` siempre es lo medido (texto real, conteo, parámetro), nunca una copia del esperado.
- Archivos de texto nuevos en UTF-8; el `.ps1` en **ASCII puro, sin BOM, CRLF**.

Raíz del frontend: `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA` (rama `test-JuanSG`, HEAD esperado `3358b032`; si es otro, DETENTE).
Base que se copia: `testing\test_testing\Modulo8\RF-106\TC-M08-G021\`.
Carpeta nueva: `testing\test_testing\Modulo8\RF-106\TC-M08-G022\` (ya existe `evidencias\` con este prompt; no lo borres).

## 1. Archivos a crear

| Archivo | Origen |
|---|---|
| `tc-m08-g022.test.tsx` | Nuevo, con la infraestructura de `tc-m08-g021.test.tsx` (sección 3) |
| `tc-m08-g022.pw.ts` | Nuevo, con la infraestructura de `tc-m08-g021.pw.ts` (sección 4) |
| `playwright.config.ts` | Copia **idéntica** de la de G021 (solo cambia la línea de cabecera de historial, si la tiene) |
| `unir_reporte_tc_m08_g022.mjs` | Copia de la de G021: `TC = 'TC-M08-G022'`, cabecera y `herramientas: 'Vitest (jsdom, respuestas simuladas) + Playwright (Chromium contra TEST, Veterinario 97, activo 885, solo lectura; conflicto simulado con page.route)'`. Nada más |
| `ejecutar_tc_m08_g022.ps1` | Copia del runner de G021 con los cambios de la sección 5 |
| `resultados\.gitkeep` | Vacío |
| `evidencias\DISENO_TC-M08-G022.md` | Sección 7 |
| `evidencias\prueba_herramienta_v1\...` | Sección 6 |

## 2. Contexto que no debes cambiar (Fase 1, observado en el código)

- Backend `135bc318`: la TVCO, los conflictos y los pendientes los calcula el servidor (`src/reporting/domain/historial_predictivo.py`:52-70 y :107-110; caso de uso `consultar_historial_predictivo_use_case.py`:96-142, `POR_PAGINA = 20`). Forma real de la respuesta:
  - `tvco: { porcentaje: number|null, texto, tvco_denominador, tvco_excluidas_conflicto, excluidas_sin_retroalimentacion, tasa_error: number|null }`
  - `pendientes: { total, pagina, por_pagina: 20, items: [{ id_resultado_inferencia, fecha_inferencia, nivel_riesgo, condicion }] }`
  - `metadatos: { total_inferencias, total_eventos_sanitarios, total_retroalimentaciones, total_pendientes, total_conflictos }`
  - cada predicción lleva `tiene_retroalimentacion` y `en_conflicto`; cada retroalimentación lleva `id_resultado_inferencia`, `valoracion`, `veterinario`, `observaciones`, `en_conflicto`; el `tipo` de cada marcador es `PREDICCION` / `RETROALIMENTACION` y, en eventos, el tipo clínico.
- Regla del backend (`calcular_tvco`), que el simulador debe reproducir **exactamente**:
  - `valoraciones` = mapa id_inferencia → conjunto de valoraciones distintas.
  - `sin_retro` = inferencias sin valoración; `conflicto` = inferencias con más de 1 valoración distinta; `validadas` = con exactamente 1; `correctas` = validadas cuyo conjunto es {CORRECTO}.
  - Si `validadas` = 0 → `porcentaje = null`, `texto = "Sin datos suficientes para calcular"`, `tasa_error = null`.
  - Si no: `porcentaje = round(correctas/validadas*100, 2)`; `tasa_error = round(100 - porcentaje, 2)`; `texto = "<p>% (<n> validada|validadas"` (`<p>` sin ceros sobrantes: 75 → "75", 33.33 → "33.33"); si `excluidas = sin_retro + conflicto > 0`: `"; <excluidas> excluida|excluidas: "` + partes unidas por `" + "`, donde la parte de conflicto es `"conflicto"` si `sin_retro = 0` o `"<k> conflicto"` si no, y la parte sin retro es `"sin retro"` si `conflicto = 0` o `"<s> sin retro"` si no (conflicto primero); al final `")"`.
- Pendientes: inferencias **sin ninguna** valoración y con `ahora − fecha > 48 h` (estricto), ordenadas por `(nivel_riesgo ?? 0, fecha)` descendente; página `pagina_pendientes` (por defecto 1) de 20.
- Vista `src/prediction/pages/HistorialPredictivoView.tsx` (HEAD `3358b032`):
  - TVCO: `<div>{t('historialpredictivo.tvco')}</div><div ...>{datos.tvco.texto}</div>` (:204-205); totales (:212-213): «N pendientes de evaluar» y «N con evaluaciones contradictorias».
  - Retroalimentaciones en la gráfica: el segundo `Scatter`, con `shape` que dibuja un `<text>` con `⚠` si `en_conflicto` y si no ✓ ✗ ◐ ○ (:239-245), en el orden de `datos.retroalimentaciones`.
  - Pendientes (:269-293): `<h3>` «Predicciones sin evaluar (más de 48 horas)», `<ul>` con un `<li>` por ítem: texto `fecha · nivel · condición` y botón «Registrar retroalimentación»; si `total > por_pagina`, botones «Anterior» y «Siguiente» que cambian `pagina_pendientes`.
  - Textos es-CO (`src/shared/i18n/locales/es-CO/prediction.json`, `historialpredictivo`): `tvco` = «Tasa de validación clínica», `pendientes_titulo` = «Predicciones sin evaluar (más de 48 horas)», `registrar_retro` = «Registrar retroalimentación», `anterior` = «Anterior», `siguiente` = «Siguiente», `total_conflictos_other` = «{{count}} con evaluaciones contradictorias», `nivel` = {0: «Sin riesgo», 1: «Bajo», 2: «Medio», 3: «Alto»}, `valoracion` = {CORRECTO: «Correcta», INCORRECTO: «Incorrecta», PARCIAL: «Parcial», SIN_EVENTO: «Sin evento»}.

## 3. Spec Vitest `tc-m08-g022.test.tsx` (CP-01 a CP-10)

### 3.1 Infraestructura (copiar de `tc-m08-g021.test.tsx` sin cambiar su lógica)

Copia literalmente: cabecera de historial (adaptada a G022), imports, `TC`, `AQUI`, `RAIZ_FRONT`, `anotar`, el `vi.mock('recharts')` con `ResponsiveContainer` 800×320, `iso`, `ms`, `serial`, `gruposBackend`, `correspondenciasBackend`, `PeticionRegistrada`/`peticiones`/`adaptadorOriginal`/`adaptadorSimulado` (con `ESCENARIOS` y `construirRespuesta` nuevos), `PERMISOS_VET`, `crearAuth`, `montar`, `norm`, `seleccionar`, `esperarEstable`, `fechaBogota`, `beforeEach`, `afterEach` y `afterAll` (con `TC` nuevo). Cambios obligatorios:
- `firma()` = `[document.querySelectorAll('.recharts-scatter-symbol').length, document.querySelectorAll('li').length, tvcoTexto(), screen.queryByText('No se pudo cargar el historial') !== null].join('|')`.
- Quita las funciones de G021 que no se usen (conectores, grupos, ubicar, medirPar, abrirGrupos, textosLista, cambiarModo).
- Precondiciones en `beforeAll`: zona `America/Bogota` (igual que G021); la línea de permiso de `PrediccionPage.tsx` (igual); textos es-CO de la sección 2 iguales a los leídos de `prediction.json` (`tvco`, `pendientes_titulo`, `registrar_retro`, `anterior`, `siguiente`, `total_conflictos_other`); y **el simulador reproduce el backend**: para 5001 a 5007, `construirRespuesta(id).tvco.texto`, `tasa_error` y `metadatos.total_conflictos` iguales a la tabla 3.2 (literal); para 5008, `pendientes.total = 21` y la página 1 con 20 ítems.

### 3.2 Escenarios (todos con `eventos: []`; reloj `2026-11-20T17:00:00Z`; fechas en `Z`, serializadas con `iso()`)

Vet A = «QA Vet A», Vet B = «QA Vet B». `condicion` de cada predicción: `QA-<id>-P<n>`. Etiqueta del buscador: `QA-<id>`.

| id | Caso | Predicciones (fecha 15:00Z, nivel) | Retroalimentaciones (en este orden) | `tvco.texto` esperado | `tasa_error` | `total_conflictos` |
|---|---|---|---|---|---|---|
| 5001 | 054 a | P1 09-01 n1, P2 09-05 n2, P3 09-10 n3, P4 09-15 n2, P5 09-20 n1 | P1 CORRECTO A 09-02; P2 CORRECTO A 09-06; P3 CORRECTO A 09-11; P4 INCORRECTO A 09-16 | `75% (4 validadas; 1 excluida: sin retro)` | 25 | 0 |
| 5002 | 054 b | las de 5001 + P6 09-25 n2, P7 09-30 n1 | las de 5001 + P6 PARCIAL A 09-26; P7 SIN_EVENTO A 10-01 | `50% (6 validadas; 1 excluida: sin retro)` | 50 | 0 |
| 5003 | 054 c | P1 09-01 n1, P2 09-05 n2, P3 09-10 n3 | ninguna | `Sin datos suficientes para calcular` | null | 0 |
| 5004 | 054 d | P1 09-01 n1, P2 09-05 n2, P3 09-10 n3 | P1, P2, P3 INCORRECTO A (día siguiente) | `0% (3 validadas)` | 100 | 0 |
| 5005 | 054 e | P1 09-01 n1, P2 09-05 n2, P3 09-10 n3 | P1, P2, P3 CORRECTO A (día siguiente) | `100% (3 validadas)` | 0 | 0 |
| 5006 | 055 a | P1 09-01 n1, P2 09-10 n2, P3 09-20 n3 | P1 CORRECTO A 09-02; P2 CORRECTO A 09-11; P2 INCORRECTO B 09-13 | `100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)` | 0 | 1 |
| 5007 | 055 b | P1 09-10 n2 | P1 CORRECTO A 09-11; P1 CORRECTO B 09-13 | `100% (1 validada)` | 0 | 0 |
| 5008 | 056 b | 21 predicciones sin retro: k = 1..21, fecha `2026-07-01T15:00Z + 4(k−1) días`, nivel por k: 1-5 → 3, 6-10 → 2, 11-15 → 1, 16-21 → 0 | ninguna | `Sin datos suficientes para calcular` | null | 0 |

`construirRespuesta(id, params)` reproduce el backend (sección 2): TVCO, `en_conflicto` en predicciones y retroalimentaciones, `tiene_retroalimentacion`, pendientes con `pagina_pendientes` de los params y `por_pagina` 20, `metadatos`, `grupos` con `gruposBackend` y `correspondencias` con `correspondenciasBackend` (quedarán vacíos), `fuentes_no_disponibles: []`, `mensaje: null`, `ventana_correspondencia_horas: 12`, mismo `activo` y `rango_fechas_aplicado` que G021. **No hay ningún valor esperado copiado dentro del simulador**: todo se calcula.

### 3.3 Lecturas

- `tvcoTexto()`: el `nextElementSibling` del elemento cuyo texto normalizado es exactamente «Tasa de validación clínica»; `norm(textContent)` o `'(sin TVCO)'`.
- `textoVisible()`: `norm(document.body.textContent)`.
- `iconosRetro()`: `Array.from(document.querySelectorAll('.recharts-scatter-symbol text')).map((t) => norm(t.textContent))`. Ícono de conflicto = `⚠`, `⚠️`, `▲` o `△`.
- `itemsPendientes()`: desde el `<h3>` «Predicciones sin evaluar (más de 48 horas)», su contenedor (`parentElement`), los `ul > li`; por ítem: `texto` y la lista de textos de sus `button`.
- `tasaVisible(n)`: `true` si `textoVisible()` cumple `new RegExp(`error[^%\\d]{0,40}(?<![\\d.,])${n}([.,]0+)? ?%|(?<![\\d.,])${n}([.,]0+)? ?%[^\\d]{0,40}error`, 'i')`; el obtenido es el fragmento que coincidió o `(sin tasa de error visible; TVCO="<tvcoTexto()>")`.

### 3.4 Checkpoints (cada `it` monta, selecciona `QA-<id>` con `seleccionar()` y mide; si `seleccionar` devuelve error, ese texto va al obtenido y FALLA)

| CP | Caso | Esperado (texto literal del JSON) | Fuente | Medición y OK |
|---|---|---|---|---|
| CP-01 | TC-M08-054 a (5001) | La TVCO muestra exactamente «75% (4 validadas; 1 excluida: sin retro)» | RF-106 CA-3 (Prueba A); Proceso 4 | `tvcoTexto() === literal` |
| CP-02 | TC-M08-054 a, d y e (5001, 5004, 5005) | Se ve la tasa de error junto a la TVCO: 25 %, 100 % y 0 % | RF-106 Salida («tasa_error (%) = 100% - tvco»); TC-M08-054 (a, d, e) | `tasaVisible(25)`, `tasaVisible(100)` y `tasaVisible(0)` en su escenario; obtenido con los tres resultados |
| CP-03 | TC-M08-054 b (5002) | «50% (6 validadas; 1 excluida: sin retro)» | RF-106 CA-3; Proceso 4 (PARCIAL y SIN_EVENTO en el denominador) | igualdad literal |
| CP-04 | TC-M08-054 c (5003) | «Sin datos suficientes para calcular», sin «NaN», «Infinity» ni «undefined» en la pantalla | RF-106 CA-3; Restricción 4 | igualdad + ausencia de los tres textos en `textoVisible()` |
| CP-05 | TC-M08-054 d y e (5004, 5005) | «0% (3 validadas)» y «100% (3 validadas)» | RF-106 CA-3; Proceso 4 | las dos igualdades |
| CP-06 | TC-M08-055 a (5006) | Las dos valoraciones en conflicto con ícono de conflicto y la otra con ✓ (3 marcadores) | RF-106 Restricción 6 a; CA-8 (a) | `iconosRetro()` tiene 3 elementos: posiciones 2 y 3 ícono de conflicto, posición 1 `✓` |
| CP-07 | TC-M08-055 a (5006) | TVCO «100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)» y total de conflictos 1 | RF-106 CA-3 (Prueba B); CA-8 (c) y (d) | igualdad literal + `textoVisible()` cumple `/(?<!\d)1\s*con evaluaciones contradictorias|(?<!\d)1\s*(conflicto|en conflicto)/i` |
| CP-08 | TC-M08-055 b (5007) | Sin ícono de conflicto (2 ✓), TVCO «100% (1 validada)» y total de conflictos 0 | RF-106 Restricción 6 c | `iconosRetro()` = [`✓`, `✓`] + igualdad + `/(?<!\d)0\s*con evaluaciones contradictorias|(?<!\d)0\s*(conflictos?|en conflicto)/i` |
| CP-09 | TC-M08-056 b (5008, página 1) | 20 ítems en el orden de `pendientes.items` de la respuesta, cada uno con un botón «Registrar retroalimentación»; aparecen niveles «Sin riesgo» y «Bajo» | RF-106 Proceso 5; CA-9; CA-4 | `itemsPendientes()` tiene 20; el ítem i contiene la `condicion` del ítem i de la última respuesta simulada; cada uno tiene exactamente 1 botón con texto «Registrar retroalimentación»; algún ítem contiene «Sin riesgo» y alguno «Bajo». Obtenido: conteo, las 20 condiciones en orden y los botones |
| CP-10 | TC-M08-056 b (5008, paginación) | «Siguiente» pide `pagina_pendientes=2` y muestra solo el ítem 21; «Anterior» pide `pagina_pendientes=1` y vuelve a 20 | RF-106 Proceso 5 («el resto accesible con paginación») | tras pulsar «Siguiente»: la última petición a `/historial-predictivo/5008` lleva `pagina_pendientes=2` (en `uri`), `itemsPendientes()` = 1 con `QA-5008-P` del ítem 21 de la respuesta de página 2; tras «Anterior»: `pagina_pendientes=1` y 20 ítems. Esperas con `waitFor` dentro de `try/catch`; un error va al obtenido |

`retirados` (en el JSON de Vitest, literal):
1. `TC-M08-056 a (47 h 59 min, 48 h 00 min y 48 h 01 min)` — «El límite de 48 h lo calcula el backend (historial_predictivo.py:22 y :109, estricto). En TEST no hay inferencias con esas antigüedades y lo escrito en el sandbox no lo ve el historial (instantanea_reportes.py:40-41). Con Vitest solo se prueba la presentación».
2. `TC-M08-055 con datos reales` — «En TEST no hay ninguna inferencia con dos valoraciones distintas ni un segundo veterinario en .env.test. El conflicto se mide con respuestas simuladas (CP-06 a CP-08) y en navegador real con la respuesta simulada por page.route (CP-13 y CP-14)».
3. `CA-8 prueba de ida y vuelta (modificar una valoración)` — «RF-72 es de solo agregar (append-only); la vista no edita valoraciones».

`observaciones` (literal, en el JSON de Vitest):
- `OBS-1: la especificación da tres formatos para el texto de la TVCO: Proceso 4 «X% (N validadas; M excluidas: K sin retro + J con conflicto)», CA-3 «100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)» y Restricción 6 b «N excluidas por conflicto (ver detalle)». El backend sigue CA-3 (historial_predictivo.py:61-70); los checkpoints usan CA-3. Para los líderes.`
- `OBS-2: con nivel_riesgo nulo, el backend ordena el pendiente como nivel 0 (historial_predictivo.py:110). La especificación no define el caso.`
- `OBS-3: la vista no tiene texto i18n para la tasa de error (prediction.json, historialpredictivo); la respuesta sí trae tvco.tasa_error.`

## 4. Spec Playwright `tc-m08-g022.pw.ts` (CP-11 a CP-14)

### 4.1 Infraestructura (copiar de `tc-m08-g021.pw.ts`)

Copia literalmente: cabecera (adaptada: «parte Playwright (CP-11 a CP-14); datos reales del 885 en TEST y conflicto simulado con page.route»), imports, `TC = 'TC-M08-G022'`, `ACTIVO = 885`, `BASE`, `STAGING`, `REINTENTO`, `anotar`, `precondicion`, `captura`, `guardia` (sin cambios), `norm`, `ms`, `corto`, `clase`, `fechaBogota`, `test.afterAll` (igual), y el bloque de login + selección del 885 en Lineal hasta obtener `rLineal` y `h` (igual). Quita lo que no se use (conectores, grupos, tooltips de eventos, ventana).

### 4.2 Parte A: datos reales del 885 (sin interceptar)

Precondición de línea base (si falla, todos FALLA por precondición): `h.predicciones.length ≥ 2`, al menos 1 predicción con valoración y 1 sin valoración, `h.pendientes.total ≥ 2` con al menos 2 niveles distintos, y `h.pendientes.total ≤ 20` (detalle con los conteos). `ahora` = cabecera `date` de `rLineal` (si falta, `Date.now()`; anótalo en el detalle).

- **CP-11** (TC-M08-054, 885 real). Esperado: «La TVCO de la respuesta coincide con la calculada con la regla del RF a partir de "predicciones" y "retroalimentaciones" de la misma respuesta (porcentaje, tvco_denominador, tasa_error y texto con el formato de CA-3), y la vista muestra ese texto». Fuente: «RF-106 Proceso 4; CA-3; Salida (tasa_error)». Cálculo: la regla de la sección 2 aplicada a `h.predicciones` (ids) y `h.retroalimentaciones`. OK si `h.tvco.porcentaje`, `tvco_denominador`, `tasa_error`, `texto` y `h.metadatos.total_conflictos` son iguales a los calculados **y** el texto de la tarjeta (`xpath=//div[normalize-space(.)="Tasa de validación clínica"]/following-sibling::div[1]`) es igual a `h.tvco.texto`. Obtenido: calculado, backend y pantalla.
- **CP-12** (TC-M08-056, 885 real). Esperado: «"pendientes" contiene exactamente las predicciones sin valoración con más de 48 h, ordenadas por nivel_riesgo descendente y luego por fecha descendente, y la lista de la vista muestra los mismos ítems en ese orden, cada uno con "Registrar retroalimentación"». Fuente: «RF-106 Proceso 5; CA-9; CA-4». Cálculo con `h.predicciones`, `h.retroalimentaciones` y `ahora`. OK si `h.pendientes.total` y la secuencia de ids (`corto`) de `h.pendientes.items` son iguales a los calculados, y los `li` de la lista (desde el `h3` «Predicciones sin evaluar (más de 48 horas)») son tantos como ítems y el `li` i contiene `fechaBogota(items[i].fecha_inferencia)`, la etiqueta de su nivel y el botón «Registrar retroalimentación». No se pulsa ningún botón.
- Captura `historial_885` después de medir (con las máscaras de G021).

### 4.3 Parte B: conflicto simulado (solo lectura; la respuesta la da `page.route`, no el servidor)

1. Construye `hB` a partir de `h` (copia profunda) con: `retroalimentaciones` = 3 elementos sobre tres predicciones de `h` elegidas así: `pA` = la predicción con fecha más antigua, `pB` = la siguiente con al menos 10 días de diferencia; elementos `[pA CORRECTO «QA Vet A» en fecha(pA)+1 día, en_conflicto false; pB CORRECTO «QA Vet A» en fecha(pB)+1 día, en_conflicto true; pB INCORRECTO «QA Vet B» en fecha(pB)+3 días, en_conflicto true]` con `observaciones: null`, `tipo: 'RETROALIMENTACION'` e `id_resultado_inferencia` real; `grupos: []`; `correspondencias: []`; `eventos_sanitarios: []`; en `predicciones`, `en_conflicto` true solo en pB; `metadatos.total_conflictos = 1`; `tvco` calculado con la regla. Precondición: ninguna de las 3 fechas queda a menos de 1 h de una predicción.
2. `await page.route(new RegExp(`/historial-predictivo/${ACTIVO}\\?`), (route) => { simuladas += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hB) }); })` (registrada **después** de la guardia, para que tenga prioridad).
3. Pulsa el radio «Agrupada» y espera la respuesta (simulada) con `modo_visualizacion=AGRUPADO`; `esperarEstable` con una firma de `.recharts-scatter-symbol` + `li`.
4. Precondición: `simuladas ≥ 1` y la vista dibuja 3 marcadores de retroalimentación (`.recharts-scatter-symbol text`).

- **CP-13** (TC-M08-055, navegador, conflicto simulado). Esperado: «Al pasar el ratón sobre una de las dos valoraciones en conflicto se muestran ambas: autor, valoración y fecha y hora de cada una ("QA Vet A → Correcta · <ts_A> / QA Vet B → Incorrecta · <ts_B>")». Fuente: «RF-106 Restricción 6 a (tooltip "[Vet A] → [valor_A] · [ts_A] / [Vet B] → [valor_B] · [ts_B]"); CA-8 (b)». Medición: para cada uno de los dos marcadores en conflicto (índices 1 y 2 de `.recharts-scatter-symbol text`), mueve el ratón a su centro y lee el texto mostrado con la función `tooltipEn` de G021 **adaptada** a un elemento cualquiera (tooltip de recharts visible, `<title>` dentro del `.recharts-scatter-symbol` del marcador y `[role="tooltip"]`). OK si **alguno** de los dos textos contiene «QA Vet A», «QA Vet B», («Correcta» o «CORRECTO»), («Incorrecta» o «INCORRECTO»), `fechaBogota(ts_A)` y `fechaBogota(ts_B)`. Obtenido: los dos textos.
- **CP-14** (TC-M08-055, navegador, conflicto simulado). Esperado: «El ícono de conflicto de las dos valoraciones es un triángulo amarillo». Fuente: «RF-106 Restricción 6 a; CA-8 (a)». Medición por píxeles (no depende de cómo se implemente): para cada marcador en conflicto, `page.screenshot({ clip: caja del elemento ampliada 2 px, type: 'png' })`, pásalo en base64 a `page.evaluate`, cárgalo en un `Image`, dibújalo en un `canvas` y cuenta píxeles «amarillos» (`R ≥ 170 && G ≥ 130 && B ≤ 120 && R − B ≥ 80 && G − B ≥ 50`) y píxeles no blancos (`R+G+B < 700`). OK si en los dos marcadores hay ≥ 10 píxeles amarillos y el texto del marcador es un ícono de conflicto (sección 3.3). Obtenido por marcador: texto, `fill` calculado (`getComputedStyle(el).fill`), píxeles amarillos / no blancos.
5. Captura `conflicto_simulado`, `await page.unroute(...)` y, al final, `page.goto('about:blank')` (como G021).

Precondición de despliegue (igual que G021, con otros textos): el bundle contiene «Predicciones sin evaluar (más de 48 horas)» y «Registrar retroalimentación».
`observaciones`: el bundle, los conteos de la línea base del 885 y `Parte B: GET simulados=<n>`.
`retirados: []`.

## 5. Runner `ejecutar_tc_m08_g022.ps1`

Copia de `ejecutar_tc_m08_g021.ps1` con **solo** estos cambios: todas las apariciones de `G021`/`g021` → `G022`/`g022`; `$cpVitest = 10`; `$cpPlaywright = 4`; en la cabecera y en el resumen, los rangos «Vitest (CP-01 a CP-10)» y «Playwright contra TEST (CP-11 a CP-14)» y «9 + 8» → «10 + 4»; el texto de herramientas del resumen añade «; conflicto simulado con page.route». La lista de archivos de `src` cuyo SHA se registra se queda **igual** que la de G021. Entrega el `diff` completo contra el de G021 (`git diff --no-index --ignore-cr-at-eol`), que debe tener solo esos cambios.

## 6. Prueba de la herramienta (en el equipo, sin red) → `evidencias\prueba_herramienta_v1\`

Desde la raíz del frontend, con `$env:TZ='America/Bogota'` y `$env:STAGING_DIR=<carpeta de la prueba>`. Guarda la consola (`consola.txt`) y el JSON parcial de cada corrida. Los controles son **copias** dentro de `prueba_herramienta_v1\controles\` (el spec copiado con sufijo `.test.tsx` mientras corre y renombrado a `.test.tsx.txt` al terminar, igual que G021; esa renombración es la única permitida). Nunca se toca `src\` ni los archivos oficiales.

**Vitest** (`pnpm exec vitest run <ruta> --reporter=verbose`):

| Corrida | Qué cambia | Resultado previsto |
|---|---|---|
| `vitest_normal_1`, `_2`, `_3` | nada | 10 checkpoints, idénticos en las tres: **OK** CP-01, 03, 04, 05, 06, 07, 08, 09, 10; **FALLA** CP-02 con obtenido «(sin tasa de error visible; …)». Precondiciones todas OK |
| `vitest_vista_control` | `vite.control.config.ts` (copia del de G021 con estos reemplazos en memoria; cada texto viejo exactamente 1 vez) usado con `--config`: `<small>{t('historialpredictivo.tvco_ayuda')}</small>` → `<small>{t('historialpredictivo.tvco_ayuda')}</small><div>Tasa de error: {datos.tvco.tasa_error ?? '—'}%</div>` | 10/10 OK (CP-02 OK con los tres fragmentos) |
| `vitest_simulador_tvco` | copia del spec con el `texto` de 5001 cambiado a `74%…` **después** de la precondición (solo en la respuesta servida) | solo CP-01 FALLA, con obtenido «74% …» |
| `vitest_simulador_conflicto` | copia del spec con `en_conflicto` en false y `total_conflictos` 0 en 5006 al servir | solo CP-06 y CP-07 FALLA, con obtenidos reales |
| `vitest_vista_orden` | control de vista: `datos.pendientes.items.map(` → `[...datos.pendientes.items].reverse().map(` | solo CP-09 FALLA (y CP-02 sigue FALLA) |
| `vitest_vista_pagina` | control de vista: `pagina_pendientes: pagina,` → `pagina_pendientes: 1,` | solo CP-10 FALLA (y CP-02 sigue FALLA) |

**Playwright local** (build con `VITE_BASE_PATH=/sigab-test/ VITE_API_BASE_URL=http://127.0.0.1:4173/sigab-test/api pnpm exec vite build --outDir <carpeta en prueba_herramienta_v1>` y un servidor Node adaptado de `servidor_api_simulada.mjs.txt` de G021 que sirva un 885 sintético con la forma real: 8 predicciones de niveles variados entre 2026-07-01 y 2026-10-10, 2 con valoración y 6 sin valorar, TVCO, pendientes y metadatos calculados con la regla de la sección 2; login y `/usuarios/me` simulados como en G021; `QA_FRONT_URL=http://127.0.0.1:4173/sigab-test/` y credenciales ficticias `QA_VET_EMAIL=qa@local.test`, `QA_VET_PASSWORD=qa-local`):

| Corrida | Qué cambia | Resultado previsto |
|---|---|---|
| `playwright_normal` | nada | CP-11 y CP-12 OK; CP-13 y CP-14 FALLA con su obtenido real; precondiciones OK salvo la del bundle, que con el build local también debe dar OK |
| `playwright_vista_control` | build con un control de vista que en la `shape` de las retroalimentaciones añade `fill={p.payload?.en_conflicto ? '#eab308' : undefined}` al `<text>` y, dentro, `<title>` con «veterinario → valoración traducida · fecha» de **todas** las retroalimentaciones con el mismo `id_resultado_inferencia`, unidas por « / » | 4/4 OK |
| `playwright_backend_tvco` | el servidor devuelve `tvco.texto` alterado | solo CP-11 FALLA |
| `playwright_backend_orden` | el servidor invierte `pendientes.items` | solo CP-12 FALLA |
| `playwright_guardia` | copia del spec que, tras la parte A, pulsa «Exportar historial sanitario (PDF)» | el POST se aborta, la precondición «Ninguna escritura no permitida» da false y todos los checkpoints FALLA por precondición; el servidor no registra ningún POST de exportación |

Si alguna corrida no da exactamente lo previsto, **DETENTE** y entrega la consola y el JSON literales de esa corrida (no corrijas por tu cuenta, salvo un error de sintaxis tuyo, que anotas).

## 7. `evidencias\DISENO_TC-M08-G022.md`

Con el formato del DISENO de G021: historial, alcance (TC-M08-054, 055 y 056), qué calcula cada lado (sección 2), tabla de los 14 checkpoints con esperado, fuente y previsión (FALLA prevista: CP-02, CP-13 y CP-14; los demás OK), retirados, observaciones, la prueba de la herramienta con los resultados **literales** de cada corrida (checkpoints que cambiaron y su obtenido), los SHA-256 de todos los archivos entregados y de los 12 archivos de `src` que registra el runner, y una sección «Construcción» que diga que lo construyó Argon con este prompt (`PROMPT_CONSTRUCCION_ARGON_G022_v1.md`, SHA) y cualquier desvío autorizado.

## 8. Verificaciones finales

1. `node --check unir_reporte_tc_m08_g022.mjs`.
2. `[System.Management.Automation.Language.Parser]::ParseFile` del `.ps1` = 0 errores; ASCII puro, sin BOM, CRLF (muestra la comprobación).
3. `pnpm exec playwright test --config testing/test_testing/Modulo8/RF-106/TC-M08-G022/playwright.config.ts --list` = 1 test.
4. `pnpm exec tsc --noEmit -p tsconfig.json` no es obligatorio; si lo corres, anota solo los errores de los archivos de G022.
5. `git status --porcelain -- src` vacío.

## 9. Respuesta

Responde SOLO con: lista de archivos creados con SHA-256; el `diff` del runner; la tabla de resultados de cada corrida de la sección 6 (checkpoint → estado y obtenido) y la ruta de cada JSON; la salida de las verificaciones de la sección 8; y cualquier desvío. Sin resúmenes ni recomendaciones.
