# Diseño de TC-M08-G022 (RF-106; TC-M08-054, TC-M08-055 y TC-M08-056)

| Fecha | Nombre | Qué se hizo |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 aprobada (diseño de Claude) y Fase 2 v1 (construcción con `PROMPT_CONSTRUCCION_ARGON_G022_v1.md`). Detención en `prueba_herramienta_v1` porque el control `vitest_simulador_conflicto` dio OK falso en CP-07 |
| 2026-11-20 | Juan Sebastian Gutierrez | v1.1: corrección autorizada en `tc-m08-g022.test.tsx` (CP-07 y CP-08 buscan el total de conflictos fuera del texto de la TVCO). Prueba de la herramienta completa en `prueba_herramienta_v2`: 8 corridas Vitest y 5 corridas Playwright local |
| 2026-11-21 | Juan Sebastian Gutierrez | Reintento 1 (INC-M08-NN-G022, GitHub #726): Fase 1 y adaptación de la herramienta por Claude (Vitest y Playwright v1.3, runner con 9 + 4 checkpoints). CP-02 pasa a observación OBS-4 (decisión de Sebastian del 2026-11-20) |
| 2026-11-23 | Juan Sebastian Gutierrez | Reintento 2 (INC-M08-396-G022, GitHub sgpmp-backend 1229): Fase 1 y Fase 2 mínima por Claude. Herramienta v1.3 sin cambios (mismos SHA); solo cambia `-Reintento 2`. Prueba de la herramienta en `evidencias/prueba_herramienta_reintento2/` con el control nuevo `backend_evaluables` |

**Casos:** TC-M08-054 (TVCO y tasa de error), TC-M08-055 (conflictos de retroalimentación: ícono, exclusión en TVCO, tooltip y concordancia) y TC-M08-056 (predicciones pendientes de evaluar con más de 48 h, orden y paginación).

**Fuente normativa:** hoja «Modulo 8», RF-106 v1.0. Se usan Proceso 4, Proceso 5, Restricción 4, Restricción 6 (a, b, c), Salida (`tasa_error`), CA-3, CA-4, CA-8 y CA-9.

## 1. Qué calcula cada lado (Fase 1)

**Backend** (`sgpmp-backend`, HEAD `135bc318`):

- `src/reporting/domain/historial_predictivo.py` (:52-70 y :107-110) y `consultar_historial_predictivo_use_case.py` (:96-142, `POR_PAGINA = 20`):
  - **TVCO (`calcular_tvco`):** construye el mapa `id_inferencia → conjunto de valoraciones distintas`. Las inferencias sin valoración son `sin_retro`; con más de 1 valoración distinta son `conflicto`; con exactamente 1 son `validadas`; y entre las validadas cuyo conjunto es `{CORRECTO}` son `correctas`.
    - Si `validadas = 0`: `porcentaje = null`, `texto = "Sin datos suficientes para calcular"`, `tasa_error = null`.
    - Si `validadas > 0`: `porcentaje = round(correctas/validadas * 100, 2)`, `tasa_error = round(100 - porcentaje, 2)`, `texto` con formato CA-3 (`<p>% (<n> validada|validadas[; <excluidas> excluida|excluidas: [k conflicto][ + ][s sin retro]])`).
  - **Pendientes:** inferencias sin ninguna valoración y con `ahora − fecha > 48 h` (estricto), ordenadas por `(nivel_riesgo ?? 0, fecha)` descendente; página `pagina_pendientes` (por defecto 1) de 20.
  - **Forma real de la respuesta:** `tvco`, `pendientes`, `metadatos` (`total_inferencias`, `total_eventos_sanitarios`, `total_retroalimentaciones`, `total_pendientes`, `total_conflictos`), `tiene_retroalimentacion` y `en_conflicto` en predicciones, `id_resultado_inferencia`, `valoracion`, `veterinario`, `observaciones` y `en_conflicto` en retroalimentaciones.

**Vista** (`SGPMP-FRONT-END-PWA`, rama `test-JuanSG`, HEAD `3358b032`, `src/prediction/pages/HistorialPredictivoView.tsx`):

- TVCO (:204-205): muestra `datos.tvco.texto` bajo el título «Tasa de validación clínica». No muestra `datos.tvco.tasa_error` (OBS-3).
- Totales (:212-213): «N pendientes de evaluar» y «N con evaluaciones contradictorias».
- Retroalimentaciones en la gráfica (:239-245): segundo `Scatter`, dibuja un `<text>` con `⚠` si `en_conflicto` y si no `✓ ✗ ◐ ○`, sin atributo `fill` amarillo en conflicto y sin tooltip que muestre ambas valoraciones del conflicto.
- Pendientes (:269-293): `<h3>` «Predicciones sin evaluar (más de 48 horas)», `<ul>` con `fecha · nivel · condición` y botón «Registrar retroalimentación»; si `total > por_pagina`, botones «Anterior» y «Siguiente» que cambian `pagina_pendientes`.

## 2. Checkpoints (14 en total)

### 2.1 Parte Vitest (`tc-m08-g022.test.tsx`, CP-01 a CP-10)

Respuestas simuladas con la forma real del backend; el simulador calcula TVCO, conflictos y pendientes con la regla exacta de `historial_predictivo.py` (sin esperados copiados). Una precondición en `beforeAll` verifica el simulador en los escenarios 5001–5008.

| CP | Caso | Esperado | Fuente | Previsto | Prueba (`v2`) |
|---|---|---|---|---|---|
| CP-01 | TC-M08-054 a (5001) | La TVCO muestra exactamente «75% (4 validadas; 1 excluida: sin retro)» | RF-106 CA-3 (Prueba A); Proceso 4 | OK | OK |
| CP-02 | TC-M08-054 a, d y e (5001, 5004, 5005) | Se ve la tasa de error junto a la TVCO: 25 %, 100 % y 0 % | RF-106 Salida (`tasa_error`); TC-M08-054 (a, d, e) | FALLA | FALLA (`(sin tasa de error visible; ...)`) |
| CP-03 | TC-M08-054 b (5002) | «50% (6 validadas; 1 excluida: sin retro)» | RF-106 CA-3; Proceso 4 | OK | OK |
| CP-04 | TC-M08-054 c (5003) | «Sin datos suficientes para calcular», sin «NaN», «Infinity» ni «undefined» en la pantalla | RF-106 CA-3; Restricción 4 | OK | OK |
| CP-05 | TC-M08-054 d y e (5004, 5005) | «0% (3 validadas)» y «100% (3 validadas)» | RF-106 CA-3; Proceso 4 | OK | OK |
| CP-06 | TC-M08-055 a (5006) | Las dos valoraciones en conflicto con ícono de conflicto y la otra con ✓ (3 marcadores) | RF-106 Restricción 6 a; CA-8 (a) | OK | OK |
| CP-07 | TC-M08-055 a (5006) | TVCO «100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)» y total de conflictos 1 | RF-106 CA-3 (Prueba B); CA-8 (c) y (d) | OK | OK |
| CP-08 | TC-M08-055 b (5007) | Sin ícono de conflicto (2 ✓), TVCO «100% (1 validada)» y total de conflictos 0 | RF-106 Restricción 6 c | OK | OK |
| CP-09 | TC-M08-056 b (5008, página 1) | 20 ítems en el orden de `pendientes.items`, cada uno con «Registrar retroalimentación»; aparecen «Sin riesgo» y «Bajo» | RF-106 Proceso 5; CA-9; CA-4 | OK | OK |
| CP-10 | TC-M08-056 b (5008, paginación) | «Siguiente» pide `pagina_pendientes=2` y muestra solo el ítem 21; «Anterior» pide `pagina_pendientes=1` y vuelve a 20 | RF-106 Proceso 5 | OK | OK |

### 2.2 Parte Playwright (`tc-m08-g022.pw.ts`, CP-11 a CP-14)

Cuenta Veterinario 97, activo 885, solo lectura con guardia activa (un solo login, sin pulsar «Exportar» ni «Registrar retroalimentación»). Parte A mide datos reales del 885 sin interceptar; Parte B simula un conflicto en la respuesta de `AGRUPADO` con `page.route` (sin escribir en el servidor).

| CP | Caso | Esperado | Fuente | Previsto | Prueba (`v2`) |
|---|---|---|---|---|---|
| CP-11 | TC-M08-054, 885 real | La TVCO de la respuesta coincide con la calculada por la regla del RF y la vista muestra ese texto | RF-106 Proceso 4; CA-3; Salida (`tasa_error`) | OK | OK |
| CP-12 | TC-M08-056, 885 real | `pendientes` contiene las predicciones sin valoración > 48 h ordenadas por `(nivel_riesgo, fecha)` descendente y la lista de la vista muestra los mismos ítems con «Registrar retroalimentación» | RF-106 Proceso 5; CA-9; CA-4 | OK | OK |
| CP-13 | TC-M08-055, navegador, conflicto simulado | Al pasar el ratón sobre una valoración en conflicto se muestran ambas (`QA Vet A → Correcta · <ts_A> / QA Vet B → Incorrecta · <ts_B>`) | RF-106 Restricción 6 a; CA-8 (b) | FALLA | FALLA (`(sin tooltip)`) |
| CP-14 | TC-M08-055, navegador, conflicto simulado | El ícono de conflicto de las dos valoraciones es un triángulo amarillo (medición por píxeles) | RF-106 Restricción 6 a; CA-8 (a) | FALLA | FALLA (`fill="rgb(0, 0, 0)", amarillos=7`) |

**Previsto en total:** 11 OK y 3 FALLA de 14 (FALLA prevista: CP-02, CP-13 y CP-14).

## 3. Retirados

1. **TC-M08-056 a (47 h 59 min, 48 h 00 min y 48 h 01 min):** el límite de 48 h lo calcula el backend (`historial_predictivo.py`:22 y :109, estricto). En TEST no hay inferencias con esas antigüedades y lo escrito en el sandbox no lo ve el historial (`instantanea_reportes.py`:40-41). Con Vitest solo se prueba la presentación.
2. **TC-M08-055 con datos reales:** en TEST no hay ninguna inferencia con dos valoraciones distintas ni un segundo veterinario en `.env.test`. El conflicto se mide con respuestas simuladas (CP-06 a CP-08) y en navegador real con la respuesta simulada por `page.route` (CP-13 y CP-14).
3. **CA-8 prueba de ida y vuelta (modificar una valoración):** RF-72 es de solo agregar (append-only); la vista no edita valoraciones.

## 4. Observaciones

| Id | Observación |
|---|---|
| OBS-1 | La especificación da tres formatos para el texto de la TVCO: Proceso 4 «X% (N validadas; M excluidas: K sin retro + J con conflicto)», CA-3 «100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)» y Restricción 6 b «N excluidas por conflicto (ver detalle)». El backend sigue CA-3 (`historial_predictivo.py`:61-70); los checkpoints usan CA-3. Para los líderes. |
| OBS-2 | Con `nivel_riesgo` nulo, el backend ordena el pendiente como nivel 0 (`historial_predictivo.py`:110). La especificación no define el caso. |
| OBS-3 | La vista no tiene texto i18n para la tasa de error (`prediction.json`, `historialpredictivo`); la respuesta sí trae `tvco.tasa_error`. |

## 5. Prueba de la herramienta

### 5.1 Detención en `evidencias/prueba_herramienta_v1/` y corrección v1.1

En `prueba_herramienta_v1`, el control `vitest_simulador_conflicto` (con `en_conflicto = false` y `metadatos.total_conflictos = 0` en 5006 al servir) dio `CP-06 = FALLA` (`iconos=["✓", "✓", "✗"]`) pero **`CP-07 = OK`** (`conflictos="1 conflicto"`), porque la regex sobre `textoVisible()` coincidía con la subcadena `"1 conflicto"` dentro del propio texto de la TVCO (`"100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)"`). Se detuvo la construcción y se conservó `prueba_herramienta_v1/` intacta como evidencia.

Con autorización del usuario se aplicó la corrección **v1.1** en `tc-m08-g022.test.tsx` (2 líneas: `textoVisible().split(tvco).join(' ').match(...)` en CP-07 y CP-08) y se repitió toda la prueba en `evidencias/prueba_herramienta_v2/`.

### 5.2 Vitest en `evidencias/prueba_herramienta_v2/`

| Corrida | Resultado | Checkpoints que cambian y obtenido literal |
|---|---|---|
| `vitest_normal_1`, `_2`, `_3` | 9/10 OK, 1 FALLA (CP-02), idénticas en las 3 corridas; 11/11 precondiciones OK | CP-02 FALLA: `QA-5001 (25%): (sin tasa de error visible; TVCO="75% (4 validadas; 1 excluida: sin retro)") \| QA-5004 (100%): (sin tasa de error visible; TVCO="0% (3 validadas)") \| QA-5005 (0%): (sin tasa de error visible; TVCO="100% (3 validadas)")`; CP-07 OK: `TVCO="100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)"; conflictos="1 con evaluaciones contradictorias"` |
| `vitest_vista_control` | 10/10 OK, 0 FALLA | CP-02 pasa a OK: `QA-5001 (25%): error: 25% \| QA-5004 (100%): error: 100% \| QA-5005 (0%): error: 0%` |
| `vitest_simulador_tvco` | 8/10 OK, 2 FALLA (CP-01 y CP-02) | CP-01 pasa a FALLA: `74% (4 validadas; 1 excluida: sin retro)` |
| `vitest_simulador_conflicto` | 7/10 OK, 3 FALLA (CP-02, CP-06 y CP-07) | CP-06 pasa a FALLA: `iconos=["✓", "✓", "✗"] (total=3)`; CP-07 pasa a FALLA: `TVCO="100% (1 validada; 2 excluidas: 1 conflicto + 1 sin retro)"; conflictos=(no encontrado)` |
| `vitest_vista_orden` | 8/10 OK, 2 FALLA (CP-02 y CP-09) | CP-09 pasa a FALLA: `conteo=20; sin_riesgo=true; bajo=true; condiciones=[QA-5008-P17, QA-5008-P18, ..., QA-5008-P5]` |
| `vitest_vista_pagina` | 8/10 OK, 2 FALLA (CP-02 y CP-10) | CP-10 pasa a FALLA: `siguiente: uri="...&pagina_pendientes=1", items=20 [QA-5008-P5, ...] (esperado QA-5008-P5) \| anterior: uri="...&pagina_pendientes=1", items=20` |

### 5.3 Playwright local en `evidencias/prueba_herramienta_v2/`

Se compilaron dos builds locales en `prueba_herramienta_v2/build_normal` y `build_vista_control` (`VITE_BASE_PATH=/sigab-test/`, `VITE_API_BASE_URL=http://127.0.0.1:4173/sigab-test/api`) servidos por `controles/servidor_api_simulada.mjs.txt` (lanzado por `controles/lanzar_mock.mjs`) con un 885 sintético de 8 predicciones (2 con valoración, 6 pendientes de niveles 0–3).

| Corrida | Resultado | Checkpoints que cambian y obtenido literal |
|---|---|---|
| `playwright_normal` | 2/4 OK (CP-11, CP-12), 2 FALLA (CP-13, CP-14); 10/10 precondiciones OK | CP-13 FALLA: `marcador[1]="(sin tooltip)" \| marcador[2]="(sin tooltip)" (esperado fechas 16/07/26, 10:00 a. m. y 18/07/26, 10:00 a. m.)`; CP-14 FALLA: `marcador[1]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=7, no_blancos=74} \| marcador[2]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=7, no_blancos=81}` |
| `playwright_vista_control` | 4/4 OK, 0 FALLA; 10/10 precondiciones OK | CP-13 pasa a OK: `marcador[1]="QA Vet A → Correcta · 16/07/26, 10:00 a. m. / QA Vet B → Incorrecta · 18/07/26, 10:00 a. m." \| marcador[2]="..."`; CP-14 pasa a OK: `marcador[1]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=21, no_blancos=63} \| marcador[2]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=22, no_blancos=69}` |
| `playwright_backend_tvco` | 1/4 OK (CP-12), 3 FALLA (CP-11, CP-13, CP-14) | CP-11 pasa a FALLA: `calculado={..., texto="50% (2 validadas; 6 excluidas: sin retro)"} \| backend={..., texto="49% (2 validadas; 6 excluidas: sin retro)"} \| pantalla="49% (2 validadas; 6 excluidas: sin retro)"` |
| `playwright_backend_orden` | 1/4 OK (CP-11), 3 FALLA (CP-12, CP-13, CP-14) | CP-12 pasa a FALLA: `calculados(6)=[dd000007, dd000003, dd000005, dd000006, dd000008, dd000004] \| backend(total=6)=[dd000004, dd000008, dd000006, dd000005, dd000003, dd000007]` |
| `playwright_guardia` | 0/4 OK, 4 FALLA por precondición (`9/10` precondiciones OK) | Precondición falsa: `Ninguna escritura no permitida hacia TEST [POST /sigab-test/api/reportes]`; `mock.log` no registra ningún `POST /reportes` |

## 6. SHA-256

### Archivos entregados de `TC-M08-G022`

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g022.test.tsx` | `7AE6BBC3B5242F10E1892D59A5338E01CFF5AE190D26A263851C75277ADF9023` |
| `tc-m08-g022.pw.ts` | `C147B987DC55CA714AD69FA95B389F5A42FF131428A1B5018F7B8C072C9B7025` |
| `playwright.config.ts` | `0944565D2BABF8DA8C66B8A22FBAE5C8AAF05696A71C0B31EDCEE04C54A1013E` |
| `unir_reporte_tc_m08_g022.mjs` | `EB924789987D9DAF4AA28A2E55722F38B1DA42CF8198967F05180EC35D31197C` |
| `ejecutar_tc_m08_g022.ps1` | `C586BE973CFD5240A01E3F523169857EECD742E9C2EA028B8F4A04FF9AEF57EE` |
| `resultados\.gitkeep` | `7EB70257593DA06F682A3DDDA54A9D260D4FC514F645237F5CA74B08F8DA61A6` |

### Archivos de `src` registrados por el runner (HEAD `3358b032`, sin cambios locales)

| Archivo | SHA-256 |
|---|---|
| `src\prediction\pages\PrediccionPage.tsx` | `3A7B576FBE36BBE736335AAC4B574DFA018096D6AB54BFD67B4862B9132DDC13` |
| `src\prediction\pages\HistorialPredictivoView.tsx` | `EFB390901B03470EDCEB074D7E71DAA115C6DD00F1D2D9CF9C6E53B6986B3F36` |
| `src\prediction\api\historialPredictivoApi.ts` | `EEBCB360395D9FD6F89B3384DB8E8CED18D4A2363EE2892E1F9D417F2767D737` |
| `src\shared\design-system\PestanasModulo.tsx` | `13BA55DAB2DEB84150D29CFF9D3A1FBBEE6E221A37C7D91641873D3A9E28B312` |
| `src\shared\design-system\AccesoDenegado.tsx` | `C606FE4527F81A6F8BE1E7E19F91AF2B04323EA294E296745790CA810249D2F1` |
| `src\shared\auth\AuthContext.tsx` | `2941573C7F3CC4135A5266EF08C08657B26D49BB0BAE29CA08723C955004F455` |
| `src\shared\api\http.ts` | `117C6708C01575885C943732162CD64108A015A403253CB50480A486258CCB08` |
| `src\shared\api\errors.ts` | `27786CAB33D5F6A702E58A5C51E2CBA5521D46447F1C777851D4EAD720AE6190` |
| `src\reportes\api\reportesApi.ts` | `FC53F49E2486B37DB65117C332C3E78B63D5756D42003DD8C9BA9E9F3BCFCECA` |
| `src\shared\i18n\formato.ts` | `9710FDF5B3150B820F91C9D263BB209517B6CA8EF61B32B9C0648C0CD7C4F279` |
| `src\shared\i18n\locales\es-CO\prediction.json` | `B51867FB0B62AC3802C1A1DD94EADEAA8FAC272ED0798C7EEFD1AA75F459A252` |
| `src\shared\i18n\locales\es-CO\common.json` | `81E2B962499A555DD7EEE4DB360A610AF13DD8D91E24D2E542B8AD5A8056EA59` |

## 7. Construcción

- Construido por Argon a partir del prompt cerrado `evidencias\PROMPT_CONSTRUCCION_ARGON_G022_v1.md` (SHA-256 `687FCC62D3819365F54A21FCB270A1F9958A494C982A960E5973DC713001A589`).
- **Desvíos / correcciones autorizadas o del arnés local:**
  1. **Corrección autorizada v1.1 en `tc-m08-g022.test.tsx`:** tras la detención en `prueba_herramienta_v1`, se reemplazó `textoVisible().match(` por `textoVisible().split(tvco).join(' ').match(` en CP-07 y CP-08 y se agregó la fila v1.1 en el historial.
  2. **Runner `ejecutar_tc_m08_g022.ps1`:** además de los cambios de la sección 5, en el texto de resumen de la línea 233 se actualizó `TC-M08-052 y 053` a `TC-M08-054, 055 y 056`.
  3. **Arnés local de Playwright (`prueba_herramienta_v2/controles/`):** se corrigió el prefijo de los UUID sintéticos en `servidor_api_simulada.mjs.txt` (`dd00000${n}-...` en lugar de `dd000885-...`) para que `corto()` distinga cada predicción en `playwright_backend_orden`; se añadió `lanzar_mock.mjs` para ejecutar `servidor_api_simulada.mjs.txt` como ESM sin renombrarlo; y `playwright.guardia.config.ts` ejecutó `control_guardia.pw.ts` desde la carpeta scratch para no alterar `playwright --list` ni renombrar archivos adicionales.

## 8. Revisión de Claude (v1.2 del spec Vitest y v1.1 del spec Playwright)

### 8.1 Motivos de los cambios

1. **Comparación exacta en CP-09 y CP-10 (`tc-m08-g022.test.tsx` v1.2):** se reemplazó `.includes(c)` por `(texto.match(/QA-5008-P\d+/)?.[0] ?? '') === c` para que `QA-5008-P1` no pueda coincidir por subcadena con `QA-5008-P10` a `QA-5008-P19`.
2. **Decodificación en pestaña `about:blank` aparte en CP-14 (`tc-m08-g022.pw.ts` v1.1):** la captura recortada del marcador se decodifica en `page.context().newPage()` dentro de `try/catch/finally` (cerrándola siempre) para no depender de una posible política CSP de TEST que bloquee `img-src data:`.
3. **Proporción mínima de píxeles amarillos en CP-14 (`tc-m08-g022.pw.ts` v1.1):** además de `amarillos >= 10`, se exige `noBlancos > 0 && amarillos / noBlancos >= 0.2` (en `playwright_normal`: `7/74 = 0.09` y `7/81 = 0.09`; en `playwright_vista_control`: `21/63 = 0.33` y `22/69 = 0.32`).

### 8.2 Resultados literales en `evidencias/prueba_herramienta_v3/`

| Corrida | Resultado | Checkpoints y obtenido literal |
|---|---|---|
| `vitest_normal` | 9/10 OK, 1 FALLA (CP-02); precondiciones OK | CP-02 FALLA: `QA-5001 (25%): (sin tasa de error visible; TVCO="75% (4 validadas; 1 excluida: sin retro)") \| QA-5004 (100%): (sin tasa de error visible; TVCO="0% (3 validadas)") \| QA-5005 (0%): (sin tasa de error visible; TVCO="100% (3 validadas)")` · CP-09 OK: `conteo=20; sin_riesgo=true; bajo=true; condiciones=[QA-5008-P5, QA-5008-P4, QA-5008-P3, QA-5008-P2, QA-5008-P1, QA-5008-P10, QA-5008-P9, QA-5008-P8, QA-5008-P7, QA-5008-P6, QA-5008-P15, QA-5008-P14, QA-5008-P13, QA-5008-P12, QA-5008-P11, QA-5008-P21, QA-5008-P20, QA-5008-P19, QA-5008-P18, QA-5008-P17]` · CP-10 OK: `siguiente: uri="...&pagina_pendientes=2", items=1 [QA-5008-P16] (esperado QA-5008-P16) \| anterior: uri="...&pagina_pendientes=1", items=20` (demás OK, iguales a v2) |
| `vitest_vista_orden` | 8/10 OK, 2 FALLA (CP-02 y CP-09); precondiciones OK | CP-02 FALLA · CP-09 FALLA: `conteo=20; sin_riesgo=true; bajo=true; condiciones=[QA-5008-P17, QA-5008-P18, ..., QA-5008-P5]` |
| `vitest_vista_pagina` | 8/10 OK, 2 FALLA (CP-02 y CP-10); precondiciones OK | CP-02 FALLA · CP-10 FALLA: `siguiente: uri="...&pagina_pendientes=1", items=20 [QA-5008-P5, ...] (esperado QA-5008-P5) \| anterior: uri="...&pagina_pendientes=1", items=20` |
| `playwright_normal` | 2/4 OK (CP-11, CP-12), 2 FALLA (CP-13, CP-14); precondiciones OK | CP-11 OK · CP-12 OK · CP-13 FALLA: `marcador[1]="(sin tooltip)" \| marcador[2]="(sin tooltip)" (esperado fechas 16/07/26, 10:00 a. m. y 18/07/26, 10:00 a. m.)` · CP-14 FALLA: `marcador[1]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=7, no_blancos=74} \| marcador[2]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=7, no_blancos=81}` (sin `error_decodificando`) |
| `playwright_vista_control` | 4/4 OK, 0 FALLA; precondiciones OK | CP-11 OK · CP-12 OK · CP-13 OK: `marcador[1]="QA Vet A → Correcta · 16/07/26, 10:00 a. m. / QA Vet B → Incorrecta · 18/07/26, 10:00 a. m." \| marcador[2]="..."` · CP-14 OK: `marcador[1]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=21, no_blancos=63} \| marcador[2]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=22, no_blancos=69}` |

### 8.3 SHA-256 actualizados (tras v1.2 Vitest y v1.1 Playwright)

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g022.test.tsx` | `E52D591CE1409722F9E78011C2C6B2139F587576F1FF057103A00902E41EA150` |
| `tc-m08-g022.pw.ts` | `EBD172E6B635E0D3945BBCE36F84BA77B51A590DDFE387176F4B38F7AE0E59D7` |
| `playwright.config.ts` | `0944565D2BABF8DA8C66B8A22FBAE5C8AAF05696A71C0B31EDCEE04C54A1013E` |
| `unir_reporte_tc_m08_g022.mjs` | `EB924789987D9DAF4AA28A2E55722F38B1DA42CF8198967F05180EC35D31197C` |
| `ejecutar_tc_m08_g022.ps1` | `C586BE973CFD5240A01E3F523169857EECD742E9C2EA028B8F4A04FF9AEF57EE` |
| `resultados\.gitkeep` | `7EB70257593DA06F682A3DDDA54A9D260D4FC514F645237F5CA74B08F8DA61A6` |

## 9. Corrida invalidada 20261120-223000 y v1.2 del spec Playwright

### 9.1 Causa de la invalidación (`evidencias/run-20261120-223000`, archivada como no oficial)

En la ejecución `run-20261120-223000` contra TEST (exit `3`), la precondición «Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción» dio falsa (`fechas=[2026-07-02T11:34:36.477+00:00, 2026-07-31T12:34:36.477+00:00, 2026-08-02T12:34:36.477+00:00]`), porque las fechas simuladas se calculaban como `predicción + 1 día` y el activo 885 real tiene una predicción exactamente 24 h después de la primera. La corrida quedó archivada en `evidencias/run-20261120-223000` como no oficial.

En `tc-m08-g022.pw.ts` **v1.2** (`76C34384365A291D9AD7A01E1B787B41293235F2805E7FD7C985CB86551FE0EB`), `tsA1`, `tsB1` y `tsB2` se eligen buscando la primera hora libre a más de 1 h de toda predicción del 885 y entre sí (`libre(desde, usadas)`).

### 9.2 Resultados literales en `evidencias/prueba_herramienta_v4/`

- **Fechas simuladas en la precondición de Parte B:** `[2026-07-01T21:00:00+00:00, 2026-07-15T21:00:00+00:00, 2026-07-18T03:00:00+00:00]` (`ok: true`, 10/10 precondiciones OK en ambas corridas).

| Corrida | Resultado | Checkpoints y obtenido literal |
|---|---|---|
| `playwright_normal` | 2/4 OK (CP-11, CP-12), 2 FALLA (CP-13, CP-14); 10/10 precondiciones OK | CP-11 OK: `calculado={porcentaje=50, denom=2, tasa_error=50, conflictos=0, texto="50% (2 validadas; 6 excluidas: sin retro)"} \| backend={...} \| pantalla="50% (2 validadas; 6 excluidas: sin retro)"` · CP-12 OK: `calculados(6)=[dd000007, dd000003, dd000005, dd000006, dd000008, dd000004] \| backend(total=6)=[dd000007, dd000003, dd000005, dd000006, dd000008, dd000004] \| dom(count=6, domOk=true)` · CP-13 FALLA: `marcador[1]="(sin tooltip)" \| marcador[2]="(sin tooltip)" (esperado fechas 15/07/26, 4:00 p. m. y 17/07/26, 10:00 p. m.)` · CP-14 FALLA: `marcador[1]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=10, no_blancos=75} \| marcador[2]={texto="⚠", fill="rgb(0, 0, 0)", amarillos=6, no_blancos=75}` (`10/75 = 0.13 < 0.2`, `6/75 = 0.08 < 0.2`) |
| `playwright_vista_control` | 4/4 OK, 0 FALLA; 10/10 precondiciones OK | CP-11 OK · CP-12 OK · CP-13 OK: `marcador[1]="QA Vet A → Correcta · 15/07/26, 4:00 p. m. / QA Vet B → Incorrecta · 17/07/26, 10:00 p. m." \| marcador[2]="QA Vet A → Correcta · 15/07/26, 4:00 p. m. / QA Vet B → Incorrecta · 17/07/26, 10:00 p. m."` · CP-14 OK: `marcador[1]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=27, no_blancos=64} \| marcador[2]={texto="⚠", fill="rgb(234, 179, 8)", amarillos=21, no_blancos=69}` (`27/64 = 0.42 >= 0.2`, `21/69 = 0.30 >= 0.2`) |

## Reintento 1 (2026-11-21): adaptación de la herramienta (Claude)

**Cambio de Desarrollo (observado).** `a74c51cb` (#726) en `test-JuanSG`, HEAD `488f43f6`, `src/` sin cambios locales. `HistorialPredictivoView.tsx` (`6043535E…`):371-375: el «⚠» de un conflicto lleva `fill="#f5c518"` con borde `var(--sem-warning)`; los demás íconos usan `var(--text-primary)`; cada marca lleva un `<title>` con todas las valoraciones de su predicción («Vet → Correcta · fecha / …», `tituloRetro`, :207-210). Desde `7297f934` las marcas van sobre su predicción (las dos en conflicto comparten posición).

**Specs de la ronda 1 sin cambios contra el código actual** (`prueba_herramienta_reintento1/`): Vitest 7/10 (CP-02 por la tasa de error, que ya era observación; CP-06 y CP-08 por la herramienta: el texto del ícono incluye su `<title>`); Playwright 3/4 (CP-14 por la herramienta: el texto incluye el `<title>`; el color ya era amarillo, `rgb(245,197,24)`).

**Cambios** (respaldos de la ronda 1 en `fuentes_generador/ronda1/*.txt`; diffs en `prueba_herramienta_reintento1/`):

| Archivo | SHA | Qué cambia |
|---|---|---|
| `tc-m08-g022.test.tsx` v1.3 | `6EE8FCA9…` | CP-02 sale de los checkpoints y se mide como OBS-4 (decisión de Sebastian, 2026-11-20); ADAPT-1: ícono sin `<title>` ni `hp-grupo` (CP-06, CP-08) |
| `tc-m08-g022.pw.ts` v1.3 | `D26F70D5…` | ADAPT-1 en CP-13 y CP-14; ADAPT-2 (pendiente de la ronda 1): CP-14 mide amarillos sobre los píxeles distintos del fondo real del recorte (color más frecuente del borde) y registra el tema |
| `ejecutar_tc_m08_g022.ps1` | `C314309F…` | 9 + 4 checkpoints; exige CP-01 y CP-03 a CP-14 |

Checkpoints (salvo CP-02), esperados, fuentes y retirados literales de la ronda 1. Config y unión sin cambios.

**Prueba de la herramienta** (contenedor, código de `488f43f6`):

| Parte | Corrida | Resultado |
|---|---|---|
| Vitest | normal ×3 | 9/9 idénticas; OBS-4: tasa de error no visible |
| Vitest | tvco_solo_porcentaje | CP-01, 03, 04, 05, 07 y 08 FALLA |
| Vitest | conflicto_sin_icono | solo CP-06 FALLA (✓, ✓, ✗) |
| Vitest | pendientes_invertidos | solo CP-09 FALLA (yo había previsto también CP-10; la página 2 tiene un solo ítem y no cambia: error de previsión, no de la herramienta) |
| Vitest | siguiente_no_pagina | solo CP-10 FALLA |
| Playwright | normal ×3 (build local + API simulada) | 4/4 |
| Playwright | backend_tvco / backend_orden | solo CP-11 / solo CP-12 FALLA |
| Playwright | conflicto_negro (tema claro) | solo CP-14 FALLA (0 amarillos) |
| Playwright | sin_title_retro | solo CP-13 FALLA («(sin tooltip)») |
| Playwright | title_solo_propia | solo CP-13 FALLA (una valoración por marca) |
| Playwright | tema oscuro (copia del spec con `data-theme=dark`) | 4/4: fondo `rgb(23,26,21)`, amarillos 108 de 141 distintos del fondo (con el criterio de la ronda 1, 108/575 no blancos = 0,19, habría dado FALLA falso) |
| Playwright | tema oscuro + conflicto_negro | solo CP-14 FALLA (0 amarillos) |

Ningún control dejó «No alcanzado». La guardia de escrituras no cambió y no se volvió a probar.

## Reintento 2 (2026-11-23): herramienta sin cambios (Claude)

**Motivo.** CP-12 falló en el reintento 1 por un defecto del backend (pendientes filtrados con el criterio de la bandeja de RF-72, `evaluables()` de `655bc00af`). Desarrollo lo corrigió en `f27e4bb4` (sgpmp-backend, PR 1230, «INC-M08-396-G022», Closes 1229): `pendientes()` toma toda inferencia sin retroalimentación con más de 48 h, de cualquier nivel, por nivel y fecha descendentes. Es la misma regla con la que el spec calcula el esperado de CP-12.

**Fase 1 (observado).** Backend `test-JuanSG` HEAD `bf3e5aeb` con el cambio (el revert del PR 1214 no lo toca). Frontend `f10009d5`: `HistorialPredictivoView.tsx` igual que en `488f43f6`; los 12 archivos de `src` del runner con el mismo SHA en el equipo y en el contenedor. TEST (2026-11-23 06:16, Veterinario 159, solo GET): el 885 tiene 24 predicciones, 4 con valoración; el backend y la vista dan 20 pendientes (niveles 0 a 3), los mismos 20 que da la regla; TVCO «25% (4 validadas; 20 excluidas: sin retro)». La más reciente sin valorar es del 2026-10-28, así que la precondición «2 ≤ pendientes ≤ 20» se cumple en el límite.

**Archivos.** Sin cambios: `tc-m08-g022.test.tsx` v1.3 `6EE8FCA9…`, `tc-m08-g022.pw.ts` v1.3 `D26F70D5…`, `playwright.config.ts` `0944565D…`, `unir_reporte_tc_m08_g022.mjs` `EB924789…`, `ejecutar_tc_m08_g022.ps1` `C314309F…`. Checkpoints, esperados, fuentes, retirados y observaciones del reintento 1, literales. Reporte: `resultado_TC-M08-G022_reintento2.json` (`-Reintento 2`).

**Prueba de la herramienta** (contenedor, código de `f10009d5`; detalle en `prueba_herramienta_reintento2/LEEME.txt`):

| Parte | Corrida | Resultado |
|---|---|---|
| Vitest | normal ×3 | 9/9, idénticas entre sí y al reintento 1 |
| Vitest | tvco_solo_porcentaje / conflicto_sin_icono / pendientes_invertidos / siguiente_no_pagina | iguales al reintento 1 (CP-01, 03, 04, 05, 07 y 08 / CP-06 / CP-09 / CP-10) |
| Playwright | normal ×3 (build local + API simulada) | 4/4, idénticas entre sí; solo POST de sesión |
| Playwright | backend_tvco, backend_orden, conflicto_negro, sin_title_retro, title_solo_propia, tema oscuro, tema oscuro + conflicto_negro | iguales al reintento 1 |
| Playwright | **backend_evaluables** (nuevo: la API simulada aplica el filtro de `655bc00af`) | solo CP-12 FALLA: calculados 6, backend 3, vista 3; precondiciones OK |

Ningún control dejó «No alcanzado». El único cambio del arnés es el escenario `backend_evaluables` (`diff_mock_reintento1_vs_reintento2.txt`).
