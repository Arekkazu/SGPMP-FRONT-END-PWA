# INFORME DE AUTOMATIZACIÓN QA — FASE 2 (`TC-M05-G41`)
## Caso Agrupado: `TC-M05-G41` · RF-81 · Consulta de Historial de Suministros por Activo (Módulo 5)

---

## 1. Resumen Ejecutivo y Estado Final

- **Estado del caso (`TC-M05-G41`)**: **Pendiente** (NO ejecutado en modo `oficial`).
- **Motivo de detención (Puerta de P4)**: Tras los **3 ensayos máximos permitidos** (`consola_TC-M05-G41_ensayo1.txt`, `consola_TC-M05-G41_ensayo2.txt`, `consola_TC-M05-G41_ensayo3.txt`), el tercer ensayo evaluó **13 de 17 checkpoints** (11 `OK`, 2 `FALLA` causadas por un regex de fecha `dd/mm/yyyy` en el spec frente a `d/M/yyyy` en UI) y dejó **4 checkpoints sin evaluar** (`099-03`, `099-04`, `104-01`, `104-02`) por **2 errores de script** (`Timeout` en `#historial-tipo` y elemento `#historial-activo` desprendido del DOM). En cumplimiento de la puerta de P4, **no se ejecutó `ensayo4` ni la corrida `oficial`**, y la carpeta `resultados/` permanece **vacía**.
- **Nota sobre el total de checkpoints**: Aunque el requerimiento mencionaba «Total 18 checkpoints», la especificación enumeró **17 IDs explícitos** (`098-01..07`, `099-01..08`, `104-01..02`). No se inventó un checkpoint 18.
- **Sandbox y limpieza en TEST**: En `ensayo3` el sandbox transaccional fue confirmado (`sandbox.confirmado: true`), las consultas `GET /suministros/historial` quedaron contabilizadas (`totalGetHistorial: 25`) y el `rollbackSandbox` respondió HTTP `200` (`sinSandboxMensaje: ""`).

---

## 2. Hallazgos de P1 (Código Frontend Real y Plantilla G13)

### 2.1 Selectores Reales Observados (`HistorialView.tsx`, `SelectorActivo.tsx`, `Paginacion.tsx`)
- Formulario de búsqueda ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L113)): `form[role="search"]`.
- Campo activo ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L114)): `#historial-activo` (`SelectorActivo`). Acepta el ID numérico `"1624"` sin depender de `GET /activos-biologicos` (403 para Gestor de Granja).
- Fecha desde ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L115)): `#historial-desde` (`type="date"`).
- Fecha hasta ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L116)): `#historial-hasta` (`type="date"`, error cliente en `#historial-hasta-err` cuando `desde > hasta`).
- Tipo suministro ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L117-L119)): `#historial-tipo` (`<select>`: `TODOS`, `ALIMENTO`, `MEDICAMENTO`, `SERVICIO_VETERINARIO`, `INSEMINACION`).
- Origen precio ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L120-L122)): `#historial-origen` (`<select>`: `TODOS`, `MANUAL`, `M40_AUTOMATICO`).
- Costo mínimo y máximo ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L123-L125)): `#historial-min`, `#historial-max` (error cliente en `#historial-max-err` cuando `Number(costoMin) > Number(costoMax)`).
- Botón consultar ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L127)): `form[role="search"] button[type="submit"]` (`Consultar` en `es-CO` / `Look up` en `en-US`).
- Sección de resumen: `section[aria-label="Resumen del historial"]` (`es-CO`) / `section[aria-label="History summary"]` (`en-US`).
- Región de tabla: `div[role="region"][aria-label="Historial de suministros"]` (`es-CO`) / `Supplies history` (`en-US`). `POR_PAGINA = 50` ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L29)).

### 2.2 Autenticación en SPA y Control de Permisos (`HistorialView.tsx`, `SuministrosPage.tsx`)
- La vista verifica `puedeLeer = usePermission(RECURSO_HISTORIAL, ACCION_R)` ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L33)) y si es falso renderiza `<AccesoDenegado>` ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L58)).
- El contenedor padre [SuministrosPage.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/SuministrosPage.tsx#L39-L72) calcula permisos de pestañas con `usePermission` y renderiza subpestañas + rutas `/suministros/*`.
- En [cypress.config.js](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress.config.js#L104) y en la plantilla G13 se usa `testIsolation: false`, conservando la cookie `httpOnly` entre pruebas; cada `cy.visit` recarga la SPA desde cero (limpiando el `accessToken` en memoria hasta completar `POST /sesiones/refresh`).

---

## 3. Entorno Creado e Inventario de Archivos en `TC-M05-G41`

Archivos nuevos creados en `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-81\TC-M05-G41\`:
- [package.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/package.json) (`cypress ^13.17.0`, `dotenv ^17.4.2`, `cross-env ^7.0.3`, `typescript ^5.9.3`, `@types/node ^20.19.0`)
- [pnpm-lock.yaml](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/pnpm-lock.yaml) (generado con `pnpm install --ignore-workspace --prefer-offline`)
- [tsconfig.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/tsconfig.json)
- [cypress.config.js](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress.config.js) (`CYPRESS_BASE_URL`, `CYPRESS_APP_BASE_PATH`, `CYPRESS_API_BASE_URL`, `.env.test` raíz, `TZ=America/Bogota`, `screenshotOnRunFailure: false`)
- `cypress/support/e2e.ts` y [commands.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/support/commands.ts)
- [historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts) (950 líneas)
- Evidencias generadas en P4:
  - [consola_TC-M05-G41_ensayo1.txt](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/consola_TC-M05-G41_ensayo1.txt)
  - [consola_TC-M05-G41_ensayo2.txt](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/consola_TC-M05-G41_ensayo2.txt)
  - [consola_TC-M05-G41_ensayo3.txt](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/consola_TC-M05-G41_ensayo3.txt)
  - [incompleto_G41.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/incompleto_G41.json)
  - [observaciones_ensayo.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/observaciones_ensayo.json)
  - [fase2_G41.md](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/fase2_G41.md)
- Carpeta `resultados/`: **vacía** (verificado).
- No se modificaron archivos existentes de `TC-M05-G13`, `src/`, ni archivos previos de Fase 1; `git status --short` únicamente muestra como nuevos (`??`) los archivos dentro de `TC-M05-G41/`.

---

## 4. Historial de Ensayos P4 (Máximo 3 Ensayos)

| Corrida | Resultado / Salida | Error observado | Corrección aplicada |
| :--- | :--- | :--- | :--- |
| **Ensayo 1** (`ensayo1.txt`) | Falló antes de iniciar Cypress | `"cross-env" no se reconoce` (`[WARN] Local package.json exists, but node_modules missing`) por hoisting del workspace pnpm. | Instalación aislada dentro de `TC-M05-G41\` con `pnpm install --ignore-workspace --prefer-offline` (+178 paquetes locales, `Cypress 13.17.0`). |
| **Ensayo 2** (`ensayo2.txt`) | `0 passing, 1 failing, 7 skipped` (`2m 34s`) | Timeout de `120000ms` esperando evento `load` en `visitar('/login')` dentro del hook `before all` (`commands.ts:46`). | (1) Mover `cy.loginUI(...)` y la navegación inicial de `before()` al primer `it()` (patrón de `TC-M05-G13`); (2) interceptar `/(registerSW\|sw\|firebase-messaging-sw)\.js` como JS vacío 200 en `aplicarSandbox()` y desregistrar Service Workers en `visitar()` ([commands.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/support/commands.ts#L119-L128)). |
| **Ensayo 3** (`ensayo3.txt`) | `5 passing, 3 failing` (`37s`) | 2 errores de script: (a) `#historial-tipo` no encontrado tras 15000ms en `099-03..099-04` (`historial_G41.cy.ts:633` / bundle `:518`); (b) elemento `#historial-activo` desprendido del DOM en `cy.type()` en `104-01..104-02` (`historial_G41.cy.ts:822` / bundle `:672`). Además, `parseFechaTabla` ([historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts#L223)) exigía `dd/mm/yyyy` (`\d{2}/\d{2}`), fallando con `"8/11/2026"` (`d/M/yyyy`). | **Detención por regla de puerta P4 (máximo 3 ensayos alcanzados)**. No se ejecutó `ensayo4` ni corrida `oficial`. El diagnóstico queda documentado en la sección 8. |

---

## 5. Resultados por Checkpoint en Ensayo 3 (`incompleto_G41.json`)

Fuente literal: [incompleto_G41.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/incompleto_G41.json#L15-L118).

| ID | Paso | Esperado | Obtenido (Literal en `ensayo3`) | Estado | Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `098-01` | UI: tabla página 1 sin filtros muestra 50 filas | `50 filas` | `filas página 1 = 50` | **OK** | Evaluado |
| `098-02` | UI: resumen sin filtros muestra total 500 y monto 63753757.50 | `500 y ≈63753757.50 (\|diff\| <= 0.5)` | `total=500; montoTexto="$ 63.753.757,5" (parsed=63753757.5, diff=0)` | **OK** | Evaluado |
| `098-03` | UI: fechas de columna fecha página 1 en orden descendente (0 inversiones) | `0 inversiones` | `filas=50; sinParse=16; inversiones=0; muestra=[8/11/2026 .. 15/10/2026]` | **FALLA** | **Defecto de script**: `parseFechaTabla` exige `\d{2}/\d{2}` pero UI muestra `d/M/yyyy` (`8/11/2026`). `inversiones=0` en las 34 fechas parseadas. |
| `098-04` | UI: Anterior deshabilitado en pág 1; Siguiente pasa a pág 2 con 50 filas distintas | `Anterior deshabilitado pág 1; pág 2 con 50 filas y 1a fila distinta` | `pág1 Anterior disabled=true; enPág2=true; filasPág2=50; primeraFilaDistinta=true` | **OK** | Evaluado |
| `098-05` | UI: navegar hasta última página (10) muestra 50 filas y Siguiente deshabilitado | `50 filas, Siguiente deshabilitado` | `enPág10=true; filas=50; Siguiente disabled=true` | **OK** | Evaluado |
| `098-06` | API: `GET historial?id_activo_biologico=1624` por defecto (pág 1 / 50 filas) | `HTTP 200, 50 items, total_paginas 10, total 500, monto 63753757.50, tipos 125 c/u, ciclos 3 (150/150/200), nivel_volumen 1, contexto false` | `HTTP 200; items=50; pags=10; total=500; monto=63753757.5000; tipos125=true; ciclos=[150,150,200]; vol=1; ctxNoDisp=false` | **OK** | Evaluado |
| `098-07` | API: `registros_por_pagina=200` págs 1-3 suman 500 IDs únicos y fecha DESC | `200+200+100 filas, 500 IDs únicos, fecha_aplicacion no creciente en 499 transiciones` | `HTTP [200,200,200]; filas=[200,200,100]; idsUnicos=500; inversionesFecha=0` | **OK** | Evaluado |
| `099-01` | UI: filtro combinado MEDICAMENTO+MANUAL+2026-04-23..2026-07-31+100000..300000 | `8 filas, resumen total 8 y monto ≈900079.88` | `filas=8; resumenTotal=8; montoTexto="$ 900.079,88" (parsed=900079.88, diff=0)` | **OK** | Evaluado |
| `099-02` | UI: conjunto de costos de las 8 filas igual al oráculo y cumplimiento de 4 filtros | `Mismo conjunto numérico de 8 costos y 8/8 filas cumplen tipo/origen/fecha` | `setIgual=true; cumplen4Filtros=false; costosUI=[125012.45,100009.32,125010.45,100007.72,125014.45,100010.92,125008.45,100006.12]` | **FALLA** | **Defecto de script**: `setIgual=true`; `cumplen4Filtros=false` porque fechas de julio/mayo/abril con día de 1 dígito (`d/M/yyyy`) no casan con `\d{2}/\d{2}` en `parseFechaTabla`. |
| `099-03` | UI: vacío por costo (MEDICAMENTO + costo_min=500000) | `0 filas, resumen en cero y estado vacío visible` | `No evaluado (error de script previo o bloque no ejecutado).` | **FALLA** | No evaluado por error de script (`#historial-tipo` no encontrado) |
| `099-04` | UI: vacío por fecha (2025-01-01..2025-12-31) | `0 filas, resumen en cero y estado vacío visible` | `No evaluado (error de script previo o bloque no ejecutado).` | **FALLA** | No evaluado (mismo bloque abortado en `099-03`) |
| `099-05` | UI: desde > hasta muestra error de validación y envía 0 GET historial | `Error de validación visible y 0 GET /suministros/historial` | `error="La fecha final debe ser igual o posterior a la inicial."; GET enviados=0` | **OK** | Evaluado |
| `099-06` | UI: costo_min > costo_max muestra error de validación y envía 0 GET historial | `Error de validación visible y 0 GET /suministros/historial` | `error="El costo máximo debe ser mayor o igual al mínimo."; GET enviados=0` | **OK** | Evaluado |
| `099-07` | API: combinado, simples (MEDICAMENTO/MANUAL/M40_AUTOMATICO) y 2 vacíos con mensaje literal | `8 (900079.88), 125, 251, 249, y 2 vacíos HTTP 200 items=[] ceros con mensaje literal activo 1624` | `comb=8/900079.8800; MED=125; MANUAL=251; M40=249; vacioC=200/No se encontraron registros de suministros con los filtros aplicados para el activo 1624.; vacioF=200/No se encontraron registros de suministros con los filtros aplicados para el activo 1624.` | **OK** | Evaluado |
| `099-08` | API: rangos inválidos fecha_fin < fecha_inicio y costo_max < costo_min → HTTP 422 | `HTTP 422 en ambos casos` | `fecha_inv: HTTP 422 error_code="COMBINACION_FILTROS_INVALIDA" ... \| costo_inv: HTTP 422 error_code="COMBINACION_FILTROS_INVALIDA" ...` | **OK** | Evaluado |
| `104-01` | [SIMULADO] UI: datos_contexto_no_disponibles=true y nombre_ciclo/especie=null | `Aviso de datos de contexto no disponibles visible y tabla con filas > 0` | `No evaluado (error de script previo o bloque no ejecutado).` | **FALLA** | No evaluado por error de script (`cy.type()` DOM detached) |
| `104-02` | API real: datos_contexto_no_disponibles=false en 1624 (M02 disponible) | `datos_contexto_no_disponibles=false` | `No evaluado (error de script previo o bloque no ejecutado).` | **FALLA** | No evaluado (mismo bloque abortado en `104-01`) |

---

## 6. Observaciones Recolectadas en Ensayo 3 (`observaciones_ensayo.json`)

Fuente literal: [observaciones_ensayo.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/observaciones_ensayo.json).

- **Idioma por defecto**: `"es-CO (default sin key)"`.
- **Columnas de tabla (8)**: `["Fecha", "Tipo", "Descripción", "Ciclo", "Cantidad", "Precio unitario", "Costo", "Operación"]`.
- **Primera fila observada en UI**: `["8/11/2026", "Alimento", "SEED-M05-HIST-500 fila 400SEED-M05-HIST-500 fila 400", "Ciclo completo cachama 2025-AACTIVO", "1 kg", "$ 5.004Precio manual", "$ 5.004", "Registro"]`.
  - **OBSERVADO**: La fecha se muestra como `"8/11/2026"` (día/mes sin cero a la izquierda).
- **Desglose en resumen**: `porTipo: true` (`["Alimento", "Inseminación", "Medicamento", "Servicio veterinario"]`), `porCiclo: false`.
- **Filtro de ciclo en UI**: `existeFiltroCicloEnUI: false`.
- **`registros_por_pagina=201` (API)**: HTTP `400`, `error_code: "VAL_ENTRADA"`, `message: "Errores de validacion en la solicitud"`, campo `registros_por_pagina`: `"Input should be less than or equal to 200"`.
- **Sandbox y auditoría**: `confirmado: true`, `sesiones: [{ method: "POST", url: "/api-sgpmp-test/sesiones/", statusCode: 200 }]`, `rollbackStatus: 200`, `sinSandboxMensaje: ""`, `totalGetHistorial: 25`.

---

## 7. Verificaciones P6

1. **`pnpm typecheck` (`tsc --noEmit`)**: ejecutado dentro de `TC-M05-G41\`, código de salida `0`.
2. **Escáner `qa-dashboard` / `scanner.py` / `asignaciones.csv`**: Se buscó en todo el workspace (`SGPMP-FRONT-END-PWA`, `sgpmp-backend`, `C:\Users\Juansegutt\MantenimientoPruebas` y raíces de disco locales); **no existen en la máquina**, por lo que no se pudo ejecutar esta herramienta externa.
3. **Escaneo de secretos**:
   - **Archivos creados en Fase 2** (`12` archivos en `cypress/**`, `package.json`, `tsconfig.json`, `cypress.config.js`, `evidencias/consola_TC-M05-G41_ensayo*.txt`, `evidencias/incompleto_G41.json`, `evidencias/observaciones_ensayo.json`, `evidencias/fase2_G41.md`) y `resultados/` (vacía): **`0` coincidencias de JWT (`eyJ...`) y `0` coincidencias** contra las 20 claves sensibles de `.env.test`.
   - *(Nota informativa sobre archivos heredados de Fase 1, no modificados en Fase 2)*: al escanear `evidencias/fase1*.md` aparecieron coincidencias preexistentes para `CONTADOR_PASSWORD` (`fase1b_G41.md`) y `VET_EMAIL` / `REVISOR_FISCAL_EMAIL` (`fase1d_G41.md`).

---

## 8. Diagnóstico Técnico y Próximos Pasos para Desbloquear P5 (`oficial`)

- **OBSERVADO**: Los 2 errores bloqueantes de `ensayo3` ocurrieron inmediatamente después de `irAHistorialFresco()` (`visitar('/suministros/historial')` + `cy.get('#historial-activo').should('be.visible')` seguido de `.clear().type('1624')` o `cy.get('#historial-tipo')`).
- **HIPÓTESIS**: Cada `visitar('/suministros/historial')` recarga la SPA, borra el `accessToken` en memoria y dispara asíncronamente `POST /sesiones/refresh` + descarga de permisos. Un re-renderizado entre la primera aparición de `#historial-activo` y los comandos inmediatos provoca el desmontaje transitorio del input (`DOM detached`) o la pérdida de la vista antes de que estabilicen los permisos de `SuministrosPage` / `HistorialView`.
- **Correcciones puntuales requeridas en [historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts) antes de autorizar una nueva tanda de ensayos**:
  1. En `parseFechaTabla` ([historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts#L223-L226)), cambiar `/^(\d{2})\/(\d{2})\/(\d{4})$/` a `/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/` con `.padStart(2, '0')` en día y mes.
  2. Estabilizar `irAHistorialFresco()` / transición entre bloques de filtros esperando a que la vista `/suministros/historial` termine de hidratar sesión/permisos (`#historial-activo` y `#historial-tipo` visibles y estables, o reutilizando la vista montada limpiando los campos en lugar de recargar la SPA con `cy.visit`) y separando `.clear()` / `.type()` con re-consulta del selector para evitar cadenas sobre nodos re-renderizados.
