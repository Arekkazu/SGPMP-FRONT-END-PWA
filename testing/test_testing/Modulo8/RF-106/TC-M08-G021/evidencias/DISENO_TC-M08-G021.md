# Diseño de TC-M08-G021 (RF-106; TC-M08-052 y TC-M08-053)

| Fecha | Nombre | Qué se hizo |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 y Fase 2 (construcción de Claude; la primera construcción de Argon se detuvo y borró la carpeta). Prueba de la herramienta en el contenedor: Vitest ×3 más 3 controles, y Playwright contra un build local más 4 controles |
| 2026-11-20 | Juan Sebastian Gutierrez | Decisiones de Sebastian: OBS-7 queda como observación para Desarrollo; la corrida oficial la ejecuta Gemini Argon con un prompt cerrado. Sin cambios en los scripts |

**Casos:** TC-M08-052 (ventana de correspondencia entre inferencia y evento sanitario) y TC-M08-053 (colisión de eventos y orden al expandir el grupo).

**Fuente normativa:** hoja «Modulo 8», RF-106 v1.0. Se usan las Restricciones 5b, 5c y 5d, el Proceso 2.1 (normalización temporal) y CA-7 (A), (B) y (C).

## 1. Decisiones (Sebastian, 2026-11-20)

- **Herramientas:** la presentación se prueba con Vitest y respuestas simuladas. Además hay una parte Playwright contra TEST, en solo lectura, con los datos reales del 885. Si hay FALLA, se confirma a mano en TEST.
- **Construcción:** la hace Claude. Argon se detuvo con el tooltip (§4, R-1) y borró la carpeta parcial; no quedó nada de esa construcción.
- **OBS-7 (el `tipo` del evento llega con el tipo clínico):** queda como observación, para que la tenga en cuenta Desarrollo Backend (causa en `consultar_historial_predictivo_use_case.py`:105 y :118-119). CP-09 y CP-17 exigen el orden, identificado por la fecha, y no la etiqueta, porque R5c define el orden y no los textos.
- **Ejecución oficial:** la hace Gemini Argon con un prompt cerrado (verifica los SHA, corre la verificación estática, ejecuta una vez y entrega los archivos literales). Claude la valida contra los archivos del equipo.
- **Ventana de 12 h:** se toma la Restricción 5b, que también es el valor por defecto y el de TEST (`ventana_correspondencia_horas = 12`). La diferencia con CA-12 (±24 h) se registra como OBS-3, para los líderes.

## 2. Qué calcula cada lado (Fase 1)

**Backend** (`sgpmp-backend`, rama `test-JuanSG`, HEAD `135bc318`):

- `src/reporting/domain/historial_predictivo.py`:
  - `correspondencias()` (:91-104): pares predicción–evento con |Δt| ≤ ventana. Es inclusivo y funciona en los dos sentidos. Entrega `diferencia_minutos`, el texto «Diferencia: H h [M min]» y `colision` (Δt ≤ 1 h).
  - `agrupar_colisiones()` (:80-88): grupos encadenados de marcadores a 1 h o menos entre sí. Dentro de cada grupo ordena retroalimentación, evento y predicción.
- `consultar_historial_predictivo_use_case.py` (:129): entrega solo los grupos de más de un marcador, en cualquier modo.

**Forma real de la respuesta** (`consultar_historial_predictivo_use_case.py`:105 y :118-119):

- `serial()` arma cada marcador como `{"tipo": m.tipo, "fecha": …, **m.datos}`.
- En los eventos, `datos` también trae `"tipo": e["tipo"]`, que pisa la clave anterior. Por eso un evento llega con su tipo clínico (`DIAGNOSTICO`, `CONTROL_PREVENTIVO`, `TRATAMIENTO`) y no con `EVENTO_SANITARIO`.
- En TEST lo confirma la sonda DBA-885 (`A_HISTORIAL_EVENTOS`, 2026-11-20 13:08). Ver OBS-7.

**Vista** (`SGPMP-FRONT-END-PWA`, HEAD `3358b032`, `src/prediction/pages/HistorialPredictivoView.tsx`):

- La gráfica no dibuja conectores (:237-244).
- Las correspondencias salen como texto, en un desplegable debajo de la gráfica (:261-266).
- Los grupos salen como lista desplegable, solo en modo Agrupada (:248-260).
- No hay marcador «N eventos» en la gráfica.
- El campo `colision` no se usa.

## 3. Checkpoints

### 3.1 Parte Vitest (CP-01 a CP-09)

Se usan respuestas simuladas con la forma real del backend. Las correspondencias y los grupos los calcula el simulador con una traducción literal de `historial_predictivo.py`:80-104. Una precondición comprueba que el simulador produce exactamente lo que daría el backend.

**Datos fijos:**

| Activo | Contenido |
|---|---|
| 4001 | Pares P1–E1 (+10 h), P2–E2 (+12 h 00), P3–E3 (+12 h 01), P4–E4 (+20 h) y P5–E5 (−10 h), con 3 días entre par y par |
| 4002 | P6–E6 (30 min), P7–E7 (60 min), P8–E8 (61 min) y el grupo de tres P9, E9 (+20 min) y R9 (+40 min) |

**Cómo se mide:**

- **Punto de la predicción i:** el i-ésimo `.recharts-line-dots circle`.
- **Marcador del evento j:** el j-ésimo `.recharts-scatter-symbol path`, en el orden de la respuesta.
- **Conector:** un `line` o un `path` con `stroke-dasharray`, fuera de `.recharts-cartesian-grid`, con un extremo a 3 px o menos de cada marcador.
- **Marcador de grupo:** un `text` «N eventos» dentro de `svg.recharts-surface`, con x entre los miembros ±3 px.

| CP | Caso | Esperado | Fuente | Previsto | Prueba |
|---|---|---|---|---|---|
| CP-01 | 052, 10 h | 1 conector P1–E1 | R5b; Proceso 2.1; CA-7 (A) | FALLA | FALLA (0) |
| CP-02 | 052, 12 h 00 | 1 conector P2–E2 | R5b (≤ 12 h) | FALLA | FALLA (0) |
| CP-03 | 052, −10 h | 1 conector P5–E5 | R5b (bidireccional) | FALLA | FALLA (0) |
| CP-04 | 052, 12 h 01 y 20 h | 0 conectores P3–E3 y P4–E4 | R5b; CA-7 (B) | OK | OK |
| CP-05 | 052, Agrupada | 1, 1, 0, 0 y 1 conectores | CA-7 (LINEAL y AGRUPADO) | FALLA | FALLA |
| CP-06 | 053, 30 min | «2 eventos» en la gráfica, en Lineal y en Agrupada | R5c; CA-7 (C) | FALLA | FALLA (solo en la lista de Agrupada) |
| CP-07 | 053, 60 min | Ídem | R5c (≤ 1 h) | FALLA | FALLA |
| CP-08 | 053, 61 min | Sin grupo y con 1 conector P8–E8 | R5d | FALLA | FALLA |
| CP-09 | 053, grupo de 3 | Orden R9, E9, P9, identificado por la fecha | R5c | OK | OK |

### 3.2 Parte Playwright (CP-10 a CP-17), en TEST con el 885

Cuenta: Veterinario 97. Es una sola sesión y la guardia de G026 está activa. No se pulsa «Exportar». El paso a Agrupada solo hace otro GET.

**Precondiciones:**

- La ventana es de 12 h.
- Están los pares d1f3cc43–2684 (600 min), f056f99d–2685 (30 min) y 511a6d66–2686 (1200 min), con las distancias calculadas a partir de la respuesta.
- El bundle contiene los textos de #693.
- No hay ninguna escritura no permitida.

Los esperados se calculan con las reglas del RF a partir de las fechas de la propia respuesta. La clase de cada marcador se deduce de sus campos: `id_evento` indica evento y `valoracion` indica retroalimentación, porque el campo `tipo` del evento no sirve (OBS-7).

| CP | Esperado | Fuente | Previsto | Prueba (API simulada) |
|---|---|---|---|---|
| CP-10 | La correspondencia d1f3cc43–2684 viene con 600, «Diferencia: 10 h» y `colision` false | R5b; CA-7 (A) | OK | OK |
| CP-11 | No hay correspondencia 511a6d66–2686 | R5b; CA-7 (B) | OK | OK |
| CP-12 | Hay un grupo con f056f99d y 2685, y el evento va antes que la predicción | R5c; CA-7 (C) | OK | OK |
| CP-13 | `correspondencias` es exactamente igual a los pares con Δt ≤ 12 h, con sus minutos | R5b; Proceso 2.1 | OK | OK |
| CP-14 | En los dos modos: 1 conector d1f3cc43–2684, y el texto que aparece al pasar el ratón contiene «Diferencia: 10 h» | R5b; CA-7 (A) | FALLA | FALLA |
| CP-15 | En los dos modos: 0 conectores 511a6d66–2686 | R5b; CA-7 (B) | OK | OK |
| CP-16 | En los dos modos: «N eventos» en la gráfica, en la posición de f056f99d/2685 | R5c; CA-7 (C) | FALLA | FALLA |
| CP-17 | Al expandir en Agrupada, el grupo de CP-12 sigue el orden de la regla, identificado por la fecha | R5c | OK | OK |

**Previsto en total:** 8 OK y 9 FALLA de 17.

## 4. Riesgos y hallazgos de la herramienta

- **R-1. Tooltip de recharts 3.10:**
  - El `ComposedChart` solo admite tooltip por eje (`ComposedChart.js`, `allowedTooltipTypes = ['axis']`).
  - Con el eje X numérico, el tooltip solo se ubica en los extremos del dominio (`tooltipSelectors.js`, `scale.domain()`).
  - `marcadorTooltip` lee `payload[0]`, que es la línea (`HistorialPredictivoView.tsx`:124).
  - En jsdom el tooltip ni siquiera se activa: el contenedor no tiene tamaño, y con `mouseEnter`/`mouseMove` sobre el símbolo y sobre `.recharts-wrapper` queda vacío y oculto.
  - **Decisión de diseño:** en Vitest los checkpoints miden solo el conector. El tooltip se mide en navegador real (CP-14). Los tooltips de 12 h 00, −10 h y 61 min quedan como retirados.
  - La medición es independiente de cómo se implemente: lee el tooltip de recharts si está visible, los `<title>` del marcador y cualquier `role="tooltip"`.
- **R-2. Cuadrícula punteada:** usa `strokeDasharray="3 3"`, así que se excluye `.recharts-cartesian-grid` al contar conectores.
- **R-3. Lista desplegable:** `details`/`summary` en jsdom se abre con el clic (`details_open=true` en todas las corridas).
- **R-4. Hora:** las fechas se comparan con `toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' })`, el mismo criterio de CP-04 de G020. El runner fija `TZ=America/Bogota`.
- **R-5. Cambios respecto de la Fase 1:** se quitó el tooltip de los checkpoints de Vitest (R-1) y CP-09/CP-17 identifican los elementos por su fecha y no por su etiqueta (OBS-7).

## 5. Retirados

1. **Límites exactos con datos reales** (12 h 00, 12 h 01, 60 y 61 min, −10 h). El cálculo es del backend y en TEST no hay esos pares: el 885 tiene 600, 30 y 1200 min.
2. **Tooltip con la diferencia en 12 h 00, −10 h y 61 min.** jsdom no activa el tooltip de recharts (R-1) y en TEST solo existe el par de 10 h, que se mide en CP-14.

## 6. Observaciones

| Id | Observación |
|---|---|
| OBS-1 | Los límites los calcula el backend (`historial_predictivo.py`:21, :84, :96-97). |
| OBS-2 | La agrupación es encadenada y R5c no define las cadenas. |
| OBS-3 | CA-12 (±24 h) frente a R5b (±12 h). |
| OBS-4 | Medida: en las posiciones de un grupo siguen dibujados el punto y el marcador del evento por separado. |
| OBS-5 | Medida: el texto de la lista de correspondencias. Para menos de 1 h dice «Diferencia: 0 h 30 min». |
| OBS-6 | La vista no usa `colision`. |
| OBS-7 | Medida, en la prueba: el `tipo` de un evento llega con su tipo clínico. La lista de grupos muestra la clave sin traducir `historialpredictivo.tipo.CONTROL_PREVENTIVO` en lugar de «Evento sanitario», y el tooltip de un evento nunca entra en la rama `EVENTO_SANITARIO` (:130). |
| OBS-8 | Medida en navegador real: el texto que aparece al pasar el ratón sobre cada evento. En la API simulada, 2684 y 2686 dan «(sin tooltip)» y 2685 muestra los datos de una predicción. |

## 7. Prueba de la herramienta (`evidencias/prueba_herramienta_v1/`)

El código es el del HEAD `3358b032`, empaquetado desde el equipo (`node_modules/.cache/qa_g021/fe_src.tgz`, SHA `F3D6B344…`) e instalado con `pnpm install --frozen-lockfile` (recharts 3.10.0). Los SHA de `src` probados coinciden con los del equipo (§8).

### 7.1 Vitest

| Corrida | Resultado | Lo que cambia |
|---|---|---|
| `vitest_normal_1` a `_3` | 2 OK (CP-04 y CP-09) y 7 FALLA, idénticas (hash `ec45ca8b…`) | — |
| `vitest_vista_control` (con `controles/vite.control.config.ts`) | 9/9 OK | Conectores 1/1/0/0/1; «2 eventos» en x = miembros; P8–E8 con 1 conector |
| `vitest_ventana_13` (ventana del simulador = 13, con la vista de control) | 7 OK y 2 FALLA | Solo CP-04 y CP-05, con `conectores_P3_E3=1` |
| `vitest_grupo_desorden` (grupo sin ordenar, vista real) | 1 OK y 8 FALLA | Solo cambia CP-09, a FALLA, con `orden_identificado=[P9, E9, R9]`; el resto como en la corrida normal |

**Control `vista_control`:** un plugin aplica en memoria, al compilar, tres reemplazos en `HistorialPredictivoView.tsx`. Cada texto viejo debe aparecer exactamente una vez. `src/` en disco no se toca. Los cambios son:

- `Symbols` con `<title>` que muestra la diferencia;
- `Line` punteadas para las correspondencias sin colisión;
- un `Scatter` con el texto «N eventos» por grupo.

### 7.2 Playwright

Se probó con un build local (`VITE_BASE_PATH=/sigab-test/`) y la API simulada `controles/servidor_api_simulada.mjs.txt`. El 885 sintético tiene los tres pares con las fechas reales de los eventos del DBA y la forma real de la respuesta.

| Corrida | Resultado | Lo que cambia |
|---|---|---|
| `playwright_normal` | 6 OK y 2 FALLA (CP-14 y CP-16) | 1 login y 0 escrituras |
| `playwright_vista_control` (build con el control) | 8/8 OK | Tooltip «— \| Diferencia: 10 h»; «2 eventos» @x = 867,8 |
| `playwright_backend_24h` (el backend vincula hasta 24 h) | 4 OK y 4 FALLA | CP-11 y CP-13 pasan a FALLA, con 511a6d66–2686 a 1200 min; CP-14 y CP-16 siguen en FALLA |
| `playwright_grupo_desorden` (backend sin ordenar el grupo) | 4 OK y 4 FALLA | CP-12 y CP-17 pasan a FALLA, con el orden real [PRED, EVT]; CP-14 y CP-16 siguen en FALLA |
| `playwright_guardia` (copia que pulsa «Exportar») | 0 OK, corrida inválida | `POST /reportes` abortado; la API simulada no lo recibió; precondición «Ninguna escritura no permitida» falsa |

**Revisión:**

- La captura `playwright_normal/captura_TC-M08-G021_linea_tiempo.png` tiene enmascaradas la zona de usuario del AppBar (`.ds-appbar__right`) y el pie del menú lateral con el nombre de la cuenta (`.ds-sidebar__footer`, `Sidebar.tsx`:172).
- La herramienta de transferencia al equipo vuelve a codificar los PNG: la captura del equipo tiene otro SHA del archivo (`C5679C5B…`, frente a `CD32CB73…` en el contenedor), pero los mismos píxeles (SHA de los píxeles RGBA `03F28C2A…`, 1366 × 768, comprobado en los dos lados).
- `error-context.md` queda con `about:blank`.
- No se encontraron credenciales de prueba en las salidas.

### 7.3 Runner y unión

- `ejecutar_tc_m08_g021.ps1` es el runner de G026 con 13 cambios de texto: TC, conteos 9 + 8, rutas, lista de `src` (la de G020), `runId` y textos del resumen. La lógica no cambia: escaneo al final, códigos de salida y validación de exits.
- Está en ASCII, CRLF y sin BOM. El `ParseFile` lo hace el agente (no se ejecuta PowerShell en el contenedor).
- La unión de los parciales de prueba da 17 checkpoints (8 OK y 9 FALLA), de CP-01 a CP-17 consecutivos.

## 8. SHA-256

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g021.test.tsx` | `2197E084DB18FA5A4223D4B5AE2889F2A04D425458E36BBB0C1A38F1398E9600` |
| `tc-m08-g021.pw.ts` | `5FE93861C115C1F80641B0A044D28938A62FFFDA61E7852BBEF2F00C26F03831` |
| `playwright.config.ts` | `97F210B0FC6D48CDE7F1FC7C24E69442C53406A45BD7B150505A1AC79228BEEC` |
| `unir_reporte_tc_m08_g021.mjs` | `2FAFA8A5B77C66E7324B652E3789E923C41FA57A11E640C52BC19D94704965F3` |
| `ejecutar_tc_m08_g021.ps1` | `540E5492A417F417F268D8D6747A9F3A00F67DE57C8B7D6D9BE627E4C2B18039` |
| `controles/vite.control.config.ts` | `3D7FC106438531FB45D2D665EFAD6C0EB4867347FC6A2497E5F5D3338C6764ED` |

**`src` probado:** `HistorialPredictivoView.tsx` `EFB39090…`, `PrediccionPage.tsx` `3A7B576F…`, `historialPredictivoApi.ts` `EEBCB360…`, `es-CO/prediction.json` `B51867FB…`.
