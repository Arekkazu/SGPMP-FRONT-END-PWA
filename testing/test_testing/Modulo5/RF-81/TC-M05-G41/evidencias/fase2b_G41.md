# INFORME DE AUTOMATIZACIÓN QA — FASE 2B (`TC-M05-G41`)
## Caso Agrupado: `TC-M05-G41` · RF-81 · Consulta de Historial de Suministros por Activo (Módulo 5)

---

### (1) Resumen
- **Corrida oficial**: **Sí ejecutada** (`G41_MODO=oficial` → [consola_TC-M05-G41_run1.txt](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/consola_TC-M05-G41_run1.txt) y [resultado_TC-M05-G41.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/resultados/resultado_TC-M05-G41.json)).
- **Resultado global**: **17/17 checkpoints `OK`**, **0 `FALLA`**, **0 errores de script** (`8 passing, 0 failing` en `1m 0s`).
- **`TC-M05-098`** (`098-01..098-07`): **7 `OK`**, `0 FALLA`, `0` errores de script.
- **`TC-M05-099`** (`099-01..099-08`): **8 `OK`**, `0 FALLA`, `0` errores de script.
- **`TC-M05-104`** (`104-01..104-02`, con `104-01 [SIMULADO]` en UI): **2 `OK`**, `0 FALLA`, `0` errores de script.

---

### (2) Correcciones de Script Realizadas y Motivo

Cambios aplicados sobre [historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts) después de `ensayo3` (verificados con `pnpm typecheck` con código `0`):

1. **`parseFechaTabla`** ([historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts#L222-L237)):
   - **Qué cambió**: regex numérica de `/^(\d{2})\/(\d{2})\/(\d{4})$/` a `/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/` interpretando grupo 1 como día y grupo 2 como mes, validado con `Date.UTC(anio, mes - 1, dia)` y formateado con `padStart(2, '0')`. En `098-03` ([historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts#L497-L500)), si `sinParse > 0`, además de dejar el checkpoint en `FALLA`, se registra explícitamente en `scriptErrors`.
   - **Motivo**: la UI renderiza fechas numéricas sin cero a la izquierda (`d/M/yyyy`, p. ej. `"8/11/2026"`), lo que había producido `sinParse=16` en `098-03` y falsos negativos en `099-02`.
2. **Estabilización de navegación y entrada de datos (`irAHistorialFresco`, `escribirActivo`, `escribirInput`, `asegurarVisible`)** ([historial_G41.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/e2e/historial_G41.cy.ts#L278-L347)):
   - **Qué cambió**: tras `visitar('/suministros/historial')`, esperar visibilidad de `form[role="search"]`, `#historial-activo` (visible y `not.be.disabled`) y `#historial-tipo` (timeout `30000` sin añadir `cy.wait(ms)` fijos); separar `.clear()` de `.type(...)` mediante una nueva consulta `cy.get(...)`; verificar visibilidad de cada control (`#historial-desde`, `#historial-hasta`, `#historial-tipo`, `#historial-origen`, `#historial-min`, `#historial-max`) antes de operarlo; y capturar `cy.url()`, primeros 300 caracteres del texto visible del `body` y `cy.screenshot(...)` en caso de ausencia de selector.
   - **Motivo**: evitar los errores de nodo desprendido del DOM (`DOM detached` en `104-01`) y selector `#historial-tipo` ausente tras recarga de SPA (`099-03`) provocados por re-renderizados asíncronos post-`cy.visit`.

---

### (3) Salida Literal del Bloque `(Results)` de Cada Corrida Nueva

#### Ensayo 4 (`evidencias\consola_TC-M05-G41_ensayo4.txt`, líneas 54–78)
```text
  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        8                                                                                │
  │ Passing:      8                                                                                │
  │ Failing:      0                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  0                                                                                │
  │ Video:        false                                                                            │
  │ Duration:     27 seconds                                                                       │
  │ Spec Ran:     historial_G41.cy.ts                                                              │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


====================================================================================================

  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ √  historial_G41.cy.ts                      00:27        8        8        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    √  All specs passed!                        00:27        8        8        -        -        -  
```

#### Corrida Oficial `run1` (`evidencias\consola_TC-M05-G41_run1.txt`, líneas 54–78)
```text
  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        8                                                                                │
  │ Passing:      8                                                                                │
  │ Failing:      0                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  0                                                                                │
  │ Video:        false                                                                            │
  │ Duration:     1 minute, 0 seconds                                                              │
  │ Spec Ran:     historial_G41.cy.ts                                                              │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


====================================================================================================

  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ √  historial_G41.cy.ts                      01:00        8        8        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    √  All specs passed!                        01:00        8        8        -        -        -  
```

---

### (4) Tabla de los 17 Checkpoints — Corrida Oficial (`resultados\resultado_TC-M05-G41.json`)

| Paso | Esperado | Obtenido (Literal) | Estado |
| :--- | :--- | :--- | :--- |
| `098-01 UI: tabla página 1 sin filtros muestra 50 filas` | `50 filas` | `filas página 1 = 50` | **OK** |
| `098-02 UI: resumen sin filtros muestra total 500 y monto 63753757.50` | `500 y ≈63753757.50 (\|diff\| <= 0.5)` | `total=500; montoTexto="$ 63.753.757,5" (parsed=63753757.5, diff=0)` | **OK** |
| `098-03 UI: fechas de columna fecha página 1 en orden descendente (0 inversiones)` | `0 inversiones` | `filas=50; sinParse=0; inversiones=0; muestra=[8/11/2026 .. 15/10/2026]` | **OK** |
| `098-04 UI: Anterior deshabilitado en pág 1; Siguiente pasa a pág 2 con 50 filas distintas` | `Anterior deshabilitado pág 1; pág 2 con 50 filas y 1a fila distinta` | `pág1 Anterior disabled=true; enPág2=true; filasPág2=50; primeraFilaDistinta=true` | **OK** |
| `098-05 UI: navegar hasta última página (10) muestra 50 filas y Siguiente deshabilitado` | `50 filas, Siguiente deshabilitado` | `enPág10=true; filas=50; Siguiente disabled=true` | **OK** |
| `098-06 API: GET historial?id_activo_biologico=1624 por defecto (pág 1 / 50 filas)` | `HTTP 200, 50 items, total_paginas 10, total 500, monto 63753757.50, tipos 125 c/u, ciclos 3 (150/150/200), nivel_volumen 1, contexto false` | `HTTP 200; items=50; pags=10; total=500; monto=63753757.5000; tipos125=true; ciclos=[150,150,200]; vol=1; ctxNoDisp=false` | **OK** |
| `098-07 API: registros_por_pagina=200 págs 1-3 suman 500 IDs únicos y fecha DESC` | `200+200+100 filas, 500 IDs únicos, fecha_aplicacion no creciente en 499 transiciones` | `HTTP [200,200,200]; filas=[200,200,100]; idsUnicos=500; inversionesFecha=0` | **OK** |
| `099-01 UI: filtro combinado MEDICAMENTO+MANUAL+2026-04-23..2026-07-31+100000..300000` | `8 filas, resumen total 8 y monto ≈900079.88` | `filas=8; resumenTotal=8; montoTexto="$ 900.079,88" (parsed=900079.88, diff=0)` | **OK** |
| `099-02 UI: conjunto de costos de las 8 filas igual al oráculo y cumplimiento de 4 filtros` | `Mismo conjunto numérico de 8 costos y 8/8 filas cumplen tipo/origen/fecha` | `setIgual=true; cumplen4Filtros=true; costosUI=[125012.45,100009.32,125010.45,100007.72,125014.45,100010.92,125008.45,100006.12]` | **OK** |
| `099-03 UI: vacío por costo (MEDICAMENTO + costo_min=500000)` | `0 filas, resumen en cero y estado vacío visible` | `filas=0; total=0; monto=0; vacio="Sin suministros con esos filtrosAmplía el rango de fechas o quita filtros."; alertMensaje="Permisos actualizados Sus permisos han sido actualizados. La interfaz se recargará automáticamente para reflejar los nuevos accesos."` | **OK** |
| `099-04 UI: vacío por fecha (2025-01-01..2025-12-31)` | `0 filas, resumen en cero y estado vacío visible` | `filas=0; total=0; monto=0; vacio="Sin suministros con esos filtrosAmplía el rango de fechas o quita filtros."` | **OK** |
| `099-05 UI: desde > hasta muestra error de validación y envía 0 GET historial` | `Error de validación visible y 0 GET /suministros/historial` | `error="La fecha final debe ser igual o posterior a la inicial."; GET enviados=0` | **OK** |
| `099-06 UI: costo_min > costo_max muestra error de validación y envía 0 GET historial` | `Error de validación visible y 0 GET /suministros/historial` | `error="El costo máximo debe ser mayor o igual al mínimo."; GET enviados=0` | **OK** |
| `099-07 API: combinado, simples (MEDICAMENTO/MANUAL/M40_AUTOMATICO) y 2 vacíos con mensaje literal` | `8 (900079.88), 125, 251, 249, y 2 vacíos HTTP 200 items=[] ceros con mensaje literal activo 1624` | `comb=8/900079.8800; MED=125; MANUAL=251; M40=249; vacioC=200/No se encontraron registros de suministros con los filtros aplicados para el activo 1624.; vacioF=200/No se encontraron registros de suministros con los filtros aplicados para el activo 1624.` | **OK** |
| `099-08 API: rangos inválidos fecha_fin < fecha_inicio y costo_max < costo_min → HTTP 422` | `HTTP 422 en ambos casos` | `fecha_inv: HTTP 422 error_code="COMBINACION_FILTROS_INVALIDA" msg="Combinación de filtros inválida: fecha_fin_filtro (2026-04-01) es anterior a fecha_inicio_filtro (2026-08-01)." \| costo_inv: HTTP 422 error_code="COMBINACION_FILTROS_INVALIDA" msg="Combinación de filtros inválida: costo_max (100000) es menor que costo_min (300000)."` | **OK** |
| `[SIMULADO] 104-01 UI: datos_contexto_no_disponibles=true y nombre_ciclo/especie=null` | `Aviso de datos de contexto no disponibles visible y tabla con filas > 0` | `avisoContextoNoDisponible=true; filas=50; colCicloFila1="#4ACTIVO"; textoResumen="Servicio veterinario$ 30.000.942,5 · 125Datos hasta 10/11/2026, 10:26 p. m. · algunos datos de contexto (activo, ciclo) no están disponibles"` | **OK** |
| `104-02 API real: datos_contexto_no_disponibles=false en 1624 (M02 disponible)` | `datos_contexto_no_disponibles=false` | `HTTP 200; datos_contexto_no_disponibles=false` | **OK** |

---

### (5) Observaciones de UI/API (`observaciones_oficial_G41.json`) y Desviación de Service Worker

Fuente literal: [observaciones_oficial_G41.json](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/observaciones_oficial_G41.json).

- **Idioma por defecto**: `"es-CO (default sin key)"`.
- **Columnas de tabla (8)**: `["Fecha", "Tipo", "Descripción", "Ciclo", "Cantidad", "Precio unitario", "Costo", "Operación"]`.
- **Formatos observados (primera fila UI)**: `["8/11/2026", "Alimento", "SEED-M05-HIST-500 fila 400SEED-M05-HIST-500 fila 400", "Ciclo completo cachama 2025-AACTIVO", "1 kg", "$ 5.004Precio manual", "$ 5.004", "Registro"]`:
  - Fechas en formato corto `d/M/yyyy` sin cero inicial (`"8/11/2026"`).
  - Moneda en `es-CO` con `$ `, separador de miles `.` y decimal `,` (`"$ 63.753.757,5"`, `"$ 900.079,88"`).
  - Precio unitario incluye el origen del precio en la misma celda (`"$ 5.004Precio manual"`).
- **Desglose en resumen**: `porTipo: true` (`["Alimento", "Inseminación", "Medicamento", "Servicio veterinario"]`), `porCiclo: false`. No existe filtro por ciclo en UI (`existeFiltroCicloEnUI: false`).
- **Estado vacío (`[role="status"]`)**: `"Sin suministros con esos filtrosAmplía el rango de fechas o quita filtros."`.
- **Captura de `resumen.mensaje` (`doc.querySelector('.ds-alert--info')`)**: en `099-03` la variable `muestraResumenMensajeAlert` registró `true` con `resumenMensajeTextoLiteral: "Permisos actualizados Sus permisos han sido actualizados. La interfaz se recargará automáticamente para reflejar los nuevos accesos."` (primer `.ds-alert--info` en el DOM, correspondiente al aviso de actualización de permisos del shell, no al de `resumen.mensaje`; en [HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L182) existe el render `{resumen?.mensaje && <Alert variant="info" title={resumen.mensaje} ... />}`, pero la captura global con `querySelector` único quedó sombreada por el banner previo).
- **Respuesta con `registros_por_pagina=201`**: HTTP `400`, `error_code: "VAL_ENTRADA"`, `message: "Errores de validacion en la solicitud"`, campo `registros_por_pagina`: `"Input should be less than or equal to 200"`.
- **Desviación de Service Worker (PWA)**:
  - En `ensayo2`, `visitar('/login')` agotó `pageLoadTimeout` (`120000ms`) esperando `load` sobre la PWA desplegada en `/sigab-test`.
  - En [aplicarSandbox](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/support/commands.ts#L217-L221) se interceptó `GET /\/(registerSW|sw|firebase-messaging-sw)\.js(\?|$)/` respondiendo HTTP `200` (`content-type: application/javascript`) con cuerpo vacío `''`.
  - En [visitar](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/cypress/support/commands.ts#L119-L128) se invoca `win.navigator?.serviceWorker?.getRegistrations()` en `onBeforeLoad` para desregistrar (`unregister()`) Service Workers activos antes de cada navegación.

---

### (6) Sandbox

- **Confirmado**: **Sí** (`sandbox.confirmado: true`, sesión registrada `POST /api-sgpmp-test/sesiones/` → `200`).
- **Número de peticiones `GET /suministros/historial`**: **`29`** en la corrida oficial (`observaciones_oficial_G41.json:61`) y **`29`** en el ensayo 4 (`observaciones_ensayo.json:61`).
- **Rollback**: HTTP **`200`** (`rollbackStatus: 200`, `sinSandboxMensaje: ""`).

---

### (7) Salida de Seguridad (Paso 7)

Resultado ejecutado con PowerShell buscando `eyJ[A-Za-z0-9_\-]{10,}\.` y las 20 claves sensibles de `.env.test` (`EMAIL|PASSWORD|SECRET|TOKEN|KEY`):

- **Archivos de Fase 2** (`16` archivos analizados: `cypress.config.js`, `commands.ts`, `historial_G41.cy.ts`, `consola_TC-M05-G41_ensayo1..4.txt`, `consola_TC-M05-G41_run1.txt`, `incompleto_G41.json`, `observaciones_ensayo.json`, `observaciones_oficial_G41.json`, `evidencias/ensayo/observaciones_ensayo.json`, `evidencias/ensayo/resultado_ensayo_run1.json`, `fase2_G41.md`, `fase2b_G41.md`, `resultados/resultado_TC-M05-G41.json`):
  - **`jwtHits=0`**
  - **`secretHits=0`**
- **Archivos preexistentes de Fase 1 (NO editados ni borrados)**:
  - `fase1b_G41.md`: coincidencia con `CONTADOR_PASSWORD` en línea **256**.
  - `fase1d_G41.md`: coincidencia con `REVISOR_FISCAL_EMAIL` en línea **155** y `VET_EMAIL` en línea **159**.

---

### (8) OBSERVADO vs HIPÓTESIS vs NO DETERMINABLE

- **OBSERVADO**:
  - La corrida oficial (`consola_TC-M05-G41_run1.txt`, `resultado_TC-M05-G41.json`) completó **8/8 bloques en 1m 0s** y evaluó **17/17 checkpoints en `OK`** con **0 errores de script**, confirmando el oráculo del activo `1624` (`500` registros, `$ 63.753.757,50`, `8` coincidencias combinadas con `$ 900.079,88`, `125` MEDICAMENTO, `251` MANUAL, `249` M40_AUTOMATICO, `422` `COMBINACION_FILTROS_INVALIDA` y `400` `VAL_ENTRADA` para `registros_por_pagina=201`).
  - La UI formatea fechas cortas como `d/M/yyyy` sin cero inicial (`"8/11/2026"`).
  - En `099-03` apareció en el DOM un `.ds-alert--info` con texto `"Permisos actualizados Sus permisos han sido actualizados. La interfaz se recargará automáticamente para reflejar los nuevos accesos."`.
  - Con la intercepción de M02 simulada (`104-01`), la UI mostró el aviso `"algunos datos de contexto (activo, ciclo) no están disponibles"` y sustituyó el nombre de ciclo por `"#4"` en la primera fila (`colCicloFila1="#4ACTIVO"`).
- **HIPÓTESIS**:
  - La aparición del aviso `"Permisos actualizados... La interfaz se recargará automáticamente..."` tras `visitar('/suministros/historial')` explica los re-renderizados/desmontajes (`DOM detached` y `#historial-tipo` ausente) ocurridos en `ensayo3` al interactuar de inmediato tras `cy.visit`, mitigados en `ensayo4` y `run1` mediante la espera explícita de `form[role="search"]`, `#historial-activo` habilitado y `#historial-tipo` antes de escribir.
- **NO DETERMINABLE**:
  - A partir de las observaciones guardadas en `observaciones_oficial_G41.json`, **no es determinable** si el `<Alert variant="info" title={resumen.mensaje} />` ([HistorialView.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L182)) era visible simultáneamente debajo del primer `.ds-alert--info` capturado por `doc.querySelector('.ds-alert--info')` (`"Permisos actualizados..."`), ni tampoco el comportamiento real de timeout de 3s frente a un M02 caído en producción/TEST sin interceptación (ya que en TEST `104-02` reportó `datos_contexto_no_disponibles=false` y `104-01` fue `[SIMULADO]`).
