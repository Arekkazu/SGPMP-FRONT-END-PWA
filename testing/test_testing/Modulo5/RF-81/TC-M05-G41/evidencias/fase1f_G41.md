# INFORME TÉCNICO DE QA — FASE 1F
## Validación Directa del Historial del Activo 1624 (`SEED-M05-HIST-500`) con Rol Gestor de Granja
### Caso Agrupado: TC-M05-G41 (RF-81: Consulta de Historial de Suministros por Activo)

---

## (1) RESUMEN EJECUTIVO (≤ 8 líneas)
1. Login como **Gestor de Granja** exitoso (**HTTP 200**, `70fc2ce4-9626-4bd5-b569-0359cb74dce0`).
2. `GET /suministros/historial?id_activo_biologico=1624` respondió **HTTP 200** en las 3 páginas (`200+200+100 = 500` filas, `0` duplicados, `0` fallos de orden `fecha_aplicacion DESC`).
3. Todas las cifras del DBA coincidieron con diferencia `0.0000`: `total_registros_filtrados=500`, `monto_total_filtrado="63753757.5000"`, tipos `125` c/u, orígenes `MANUAL=251` / `M40_AUTOMATICO=249`, fases `#701=150` / `#702=150` / `#703=200`.
4. La paginación por defecto devolvió `50` filas (`total_paginas=10`, HTTP `200`).
5. Con `registros_por_pagina=201`, la API **no** aplicó el máximo ni respondió `422`: rechazó con **HTTP 400 `VAL_ENTRADA`** (`"Input should be less than or equal to 200"`).
6. El filtro combinado `2.6 a)` (`MEDICAMENTO` + `MANUAL` + `2026-04-23..2026-07-31` + `[100000, 300000]`) devolvió `8` filas exactas (`monto="900079.8800"`), coincidiendo al 100% con el cálculo en memoria.
7. Los filtros vacíos `2.6 b)` y `2.6 c)` devolvieron HTTP `200`, `items=[]` y `resumen` en ceros; los simples `2.6 d)` coincidieron con `125`, `251` y `249`.
8. Oráculo guardado en `evidencias\oraculo_D.json`; 1 POST + 11 GET ejecutados (0 sandbox, 0 fugas de secretos).

---

## (2) TABLAS Y RESULTADOS DE LOS PASOS

### 2.1 Login por API (Gestor de Granja)

| Paso | Método / URL | HTTP | Tiempo (ms) | Hora UTC | x-request-id | Archivo Crudo |
|:----:|--------------|:----:|:-----------:|:--------:|:------------:|---------------|
| 2.1 | `POST https://api.inmero.co/api-sgpmp-test/sesiones/` | 200 | 1290 | `2026-11-11T02:55:08.327Z` | `70fc2ce4-9626-4bd5-b569-0359cb74dce0` | `evidencias\diag_g41\35_login_gestor_granja.json` |

### 2.2 y 2.3 Historial sin Filtros (`id_activo_biologico=1624`, `registros_por_pagina=200`, `X-Zona-Horaria: America/Bogota`)

| Paso | Página | HTTP | Tiempo (ms) | Filas en `items` | Hora UTC | x-request-id | Archivo Crudo |
|:----:|:------:|:----:|:-----------:|:----------------:|:--------:|:------------:|---------------|
| 2.2 | 1 | 200 | 215 | 200 | `2026-11-11T02:55:08.563Z` | `c72a53a4-4a83-4b4f-8fc2-f241158b882d` | `evidencias\diag_g41\36_historial_1624_p1.json` |
| 2.3 | 2 | 200 | 188 | 200 | `2026-11-11T02:55:09.136Z` | `3216823e-459c-4022-bd8a-9a2235713abf` | `evidencias\diag_g41\37_historial_1624_p2.json` |
| 2.3 | 3 | 200 | 180 | 100 | `2026-11-11T02:55:09.438Z` | `243161e9-ad90-413a-8eca-dca7ee8cee76` | `evidencias\diag_g41\38_historial_1624_p3.json` |

#### Campos de `resumen` de la Página 1 (`36_historial_1624_p1.json`)

| Campo | Valor Literal |
|-------|---------------|
| `total_registros_filtrados` | `500` |
| `monto_total_filtrado` | `"63753757.5000"` |
| `total_paginas` | `3` |
| `pagina_actual` | `1` |
| `nivel_volumen` | `1` |
| `datos_contexto_no_disponibles` | `false` |
| `datos_actualizados_hasta` | `"2026-11-11T02:55:08.424941Z"` |
| `mensaje` | `null` |

**Diccionario `desglose_por_tipo_suministro` (pegado tal cual):**
```json
{
  "ALIMENTO": {
    "total": 125,
    "monto": "1875935.0000"
  },
  "INSEMINACION": {
    "total": 125,
    "monto": "22500941.2500"
  },
  "MEDICAMENTO": {
    "total": 125,
    "monto": "9375938.7500"
  },
  "SERVICIO_VETERINARIO": {
    "total": 125,
    "monto": "30000942.5000"
  }
}
```

**Diccionario `desglose_por_ciclo` (pegado tal cual; tiene `3` claves):**
```json
{
  "Ciclo completo cachama 2025-A #701": {
    "total": 150,
    "monto": "18995339.7500"
  },
  "Ciclo completo cachama 2025-A #702": {
    "total": 150,
    "monto": "19256014.7500"
  },
  "Ciclo completo cachama 2025-A #703": {
    "total": 200,
    "monto": "25502403.0000"
  }
}
```

---

### 2.4 Verificación Offline sobre las 500 Filas Guardadas

#### (a) Suma de `costo_registro` vs `monto_total_filtrado` vs DBA (`63.753.757,50`)
| Fuente | Valor Literal | Diferencia vs Suma 500 Filas |
|--------|---------------|:----------------------------:|
| Suma exacta `costo_registro` (500 filas) | `63753757.50` (`63753757.5`) | — |
| API `resumen.monto_total_filtrado` | `"63753757.5000"` | `0.0000` |
| Declarado por DBA | `63.753.757,50` (`63753757.50`) | `0.0000` |

#### (b) Conteo por `tipo_suministro` × `origen_precio` vs Tabla del DBA
| Tipo Suministro | `M40_AUTOMATICO` (Obs / DBA) | `MANUAL` (Obs / DBA) | Total Tipo (Obs / DBA) |
|-----------------|:----------------------------:|:--------------------:|:----------------------:|
| `ALIMENTO` | `63` / `63` | `62` / `62` | `125` / `125` |
| `MEDICAMENTO` | `62` / `62` | `63` / `63` | `125` / `125` |
| `SERVICIO_VETERINARIO` | `62` / `62` | `63` / `63` | `125` / `125` |
| `INSEMINACION` | `62` / `62` | `63` / `63` | `125` / `125` |
| **Total Origen** | **`249`** / **`249`** | **`251`** / **`251`** | **`500`** / **`500`** |

Diferencias observadas: **0** en toda la matriz.

#### (c) Conteo por Fase (Ventanas de Fecha del DBA vs `desglose_por_ciclo`)
| Fase (Ventana DBA) | Filas Calculadas (Ventana) | Declarado DBA | Clave en `desglose_por_ciclo` | `total` API | Suma Costos Ventana vs `monto` API | Diferencia |
|--------------------|:--------------------------:|:-------------:|-------------------------------|:-----------:|:----------------------------------:|:----------:|
| `701` (`2026-01-13` → `2026-04-22`) | `150` | `150` | `"Ciclo completo cachama 2025-A #701"` | `150` | `18995339.75` vs `"18995339.7500"` | `0` |
| `702` (`2026-04-23` → `2026-07-31`) | `150` | `150` | `"Ciclo completo cachama 2025-A #702"` | `150` | `19256014.75` vs `"19256014.7500"` | `0` |
| `703` (`2026-08-01` → activa) | `200` | `200` | `"Ciclo completo cachama 2025-A #703"` | `200` | `25502403.00` vs `"25502403.0000"` | `0` |

Filas anteriores a `2026-01-13`: `0`.

#### (d) Mínimos y Máximos de Costo y Fecha por Fase vs DBA
| Fase | Costo Mín (Obs / DBA) | Costo Máx (Obs / DBA) | Fecha Mín (Obs / DBA) | Fecha Máx (Obs / DBA) | Diferencia |
|:----:|:---------------------:|:---------------------:|:---------------------:|:---------------------:|:----------:|
| `701` | `5000.20` / `5.000,20` | `400006.70` / `400.006,70` | `2026-01-13` / `2026-01-13` | `2026-04-22` / `2026-04-22` | `0` |
| `702` | `5001.60` / `5.001,60` | `400014.70` / `400.014,70` | `2026-04-23` / `2026-04-23` | `2026-07-31` / `2026-07-31` | `0` |
| `703` | `5003.20` / `5.003,20` | `400024.70` / `400.024,70` | `2026-08-01` / `2026-08-01` | `2026-11-08` / `2026-11-08` | `0` |

#### (e) Orden `fecha_aplicacion DESC` y (f) Unicidad de `id_registro_suministro`
| Verificación | Resultado Literal |
|--------------|-------------------|
| Orden no creciente de `fecha_aplicacion` a lo largo de las 3 páginas (500 filas) | **0 fallos** (`fecha_aplicacion[i] >= fecha_aplicacion[i+1]` en las 499 transiciones) |
| Total filas recolectadas vs `id_registro_suministro` únicos | `500` filas / `500` IDs únicos (**0 duplicados** entre páginas) |

---

### 2.5 Paginación por Defecto y Límite (`registros_por_pagina=201`)

| Prueba | URL | HTTP | ms | x-request-id | Resultado Observado | Archivo Crudo |
|--------|-----|:----:|:--:|:------------:|---------------------|---------------|
| Sin `registros_por_pagina` | `.../historial?id_activo_biologico=1624` | 200 | 190 | `bf8479b7-7f9a-495b-9243-a91bf5e21bab` | `items.length = 50`, `total_paginas = 10`, `pagina_actual = 1` | `39_historial_1624_default.json` |
| `registros_por_pagina=201` | `.../historial?id_activo_biologico=1624&registros_por_pagina=201` | 400 | 157 | `5aab650e-7299-4765-b735-978833030c14` | `error_code: "VAL_ENTRADA"`, `message: "Errores de validacion en la solicitud"`, `fields: [{"field": "registros_por_pagina", "message": "Input should be less than or equal to 200"}]` | `40_historial_1624_201.json` |

*Hallazgo de contrato*: Con `registros_por_pagina=201`, la API **no** aplica silenciosamente el límite de `200` (como indica la especificación) ni devuelve `422` estándar de FastAPI (como indicaba el contrato esperado): el manejador de validación convierte el error de Pydantic en **HTTP 400 `VAL_ENTRADA`**.

---

### 2.6 Filtros para TC-M05-099 (Memoria vs API)

#### Resumen Comparativo de Filtros (`2.6 a`, `b`, `c`, `d`)
| Caso | Filtros Aplicados | HTTP | ms | x-request-id | Esperado Memoria (`total` / `monto`) | API (`total` / `monto`) | Mensaje / Coincidencia | Archivo |
|------|-------------------|:----:|:--:|:------------:|:------------------------------------:|:-----------------------:|------------------------|---------|
| `2.6 a)` | `tipo=MEDICAMENTO`, `origen=MANUAL`, `fecha=2026-04-23..2026-07-31`, `costo=100000..300000` (sin ajuste; `8` está entre `5` y `40`) | 200 | 177 | `116a9912-9df0-4e60-b080-85de572f5c1b` | `8` / `900079.88` | `8` / `"900079.8800"` | Mismos 8 UUIDs; 8/8 filas cumplen los 4 filtros | `41_filtro_2_6_a.json` |
| `2.6 b)` | `tipo=MEDICAMENTO`, `costo_min=500000` | 200 | 202 | `81d6bd39-bb4a-4699-ad4b-db074a748fc0` | `0` / `0` | `0` / `"0"` (`items=[]`, `total_paginas=1`, desgloses `{}`) | `"No se encontraron registros de suministros con los filtros aplicados para el activo 1624."` | `42_filtro_2_6_b.json` |
| `2.6 c)` | `fecha_inicio=2025-01-01`, `fecha_fin=2025-12-31` | 200 | 173 | `f7e06c9e-dd51-4ff6-ab5a-b97652835743` | `0` / `0` | `0` / `"0"` (`items=[]`, `total_paginas=1`, desgloses `{}`) | `"No se encontraron registros de suministros con los filtros aplicados para el activo 1624."` | `43_filtro_2_6_c.json` |
| `2.6 d1)` | `tipo_suministro_filtro=MEDICAMENTO` | 200 | 178 | `8955d277-02c1-423b-a70d-16568a8bdea4` | `125` / `9375938.75` (DBA: `125`) | `125` / `"9375938.7500"` | Coincidencia 100% | `44_filtro_2_6_d_medicamento.json` |
| `2.6 d2)` | `origen_precio_filtro=MANUAL` | 200 | 176 | `b1dc83fd-4fef-4695-b8e2-8c03d44345af` | `251` / `32181891.39` (DBA: `251`) | `251` / `"32181891.3900"` | Coincidencia 100% | `45_filtro_2_6_d_manual.json` |
| `2.6 d3)` | `origen_precio_filtro=M40_AUTOMATICO` | 200 | 188 | `e2dff820-f1be-4b01-b56a-d13b8777f78d` | `249` / `31571866.11` (DBA: `249`) | `249` / `"31571866.1100"` | Coincidencia 100% | `46_filtro_2_6_d_m40.json` |

#### Verificación Fila a Fila del Subconjunto `2.6 a)` (`41_filtro_2_6_a.json`)
| # | `id_registro_suministro` | `tipo_suministro` | `origen_precio` | `fecha_aplicacion` | `costo_registro` | Cumple 4 Filtros |
|---|--------------------------|-------------------|-----------------|--------------------|-----------------:|:----------------:|
| 1 | `967ae69b-8e10-4728-a572-0625254f9191` | `MEDICAMENTO` | `MANUAL` | `2026-07-30` | `125012.4500` | Sí |
| 2 | `8dbc4e7b-c533-406d-b89d-25317189ea8b` | `MEDICAMENTO` | `MANUAL` | `2026-07-14` | `100009.3200` | Sí |
| 3 | `ffcf7897-46c2-4a9f-a6fe-a582bcce219b` | `MEDICAMENTO` | `MANUAL` | `2026-06-20` | `125010.4500` | Sí |
| 4 | `053275ac-04d4-4f71-9981-521c1633b4df` | `MEDICAMENTO` | `MANUAL` | `2026-06-04` | `100007.7200` | Sí |
| 5 | `5302e45f-56ce-4bee-b44b-99ba90a72b67` | `MEDICAMENTO` | `MANUAL` | `2026-05-31` | `125014.4500` | Sí |
| 6 | `9e1acbb8-c2d7-4754-9e2b-669bf8737ae5` | `MEDICAMENTO` | `MANUAL` | `2026-05-15` | `100010.9200` | Sí |
| 7 | `9deb31b3-c914-4a0b-8dcf-d13a6c630ce7` | `MEDICAMENTO` | `MANUAL` | `2026-05-11` | `125008.4500` | Sí |
| 8 | `82250ae5-4ea0-4026-9f21-46c9d2656f0e` | `MEDICAMENTO` | `MANUAL` | `2026-04-25` | `100006.1200` | Sí |

---

### 2.7 Archivo de Oráculo y Scripts Auxiliares Eliminados
- Se generó [oraculo_D.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/oraculo_D.json) con las cifras esperadas para `TC-M05-098` y `TC-M05-099`.
- **Scripts auxiliares temporales utilizados y eliminados tras finalizar (Regla 5)**:
  1. `C:\Users\Juansegutt\.gemini\antigravity\brain\a62fc8b8-cac9-4fbc-9bf2-fa9740e71432\scratch\probe_1f.mjs` (sondeo HTTP en TEST; leyó `.env.test` en memoria sin imprimir credenciales y redactó en memoria antes de escribir a disco; eliminado y verificado `False`).
  2. `C:\Users\Juansegutt\.gemini\antigravity\brain\a62fc8b8-cac9-4fbc-9bf2-fa9740e71432\scratch\analyze_1f.mjs` (cálculos offline sobre JSONs guardados sin credenciales; eliminado y verificado `False`).

---

## (3) OBSERVADO VS HIPÓTESIS

### OBSERVADO
1. **Visibilidad del activo 1624 para Gestor de Granja en `/suministros/historial`**: A diferencia de `/activos-biologicos` (`403`), la consulta directa `GET /suministros/historial?id_activo_biologico=1624` bajo el rol Gestor de Granja responde **HTTP 200** y devuelve los 500 registros semilla.
2. **Coincidencia exacta con la declaración del DBA**: `500` registros, suma `63753757.5000`, desglose `ALIMENTO 63/62`, `MEDICAMENTO 62/63`, `SERVICIO_VETERINARIO 62/63`, `INSEMINACION 62/63`, totales `125` c/u, orígenes `MANUAL 251` / `M40_AUTOMATICO 249`, fases `#701` (`150`), `#702` (`150`), `#703` (`200`), rangos exactos de costos y fechas, `0` duplicados y `0` fallos de orden descendente.
3. **Metadatos del activo 1624 en ítems del historial**: `nombre_activo: null`, `especie: "Cachama Blanca"`, `nombre_ciclo: "Ciclo completo cachama 2025-A"`, `descripcion` en filas: `"SEED-M05-HIST-500 fila <n>"`.
4. **Paginación por defecto y límite superior**: Sin `registros_por_pagina` retorna `50` filas y `10` páginas; con `registros_por_pagina=201` responde **HTTP 400 `VAL_ENTRADA`** (ni clamping a `200` ni HTTP `422`).
5. **Filtros combinados y simples (`TC-M05-099`)**: Exacta concordancia entre el cálculo en memoria sobre las 500 filas y la API (`8` filas en `2.6 a)`, `0` en `2.6 b)` y `2.6 c)`, y `125`/`251`/`249` en `2.6 d)`).

### HIPÓTESIS
1. El rol Gestor de Granja de `.env.test` tiene efectivamente acceso de alcance a la finca donde reside el activo `1624` (declarada como finca `81` por el DBA), permitiendo que `AlcanceActivoM02Adapter` incluya el ID `1624` en `ids_activos_permitidos`. No se consultó M02 ni BD para confirmar directamente los IDs de finca/infraestructura en TEST.

---

## (4) NO DETERMINABLE
1. **`id_finca` e `id_infraestructura` del activo `1624` directamente en TEST vía API**: El endpoint `/suministros/historial` no retorna `id_finca` ni `id_infraestructura` en sus items ni en `resumen`, y `GET /activos-biologicos` responde `403` para Gestor de Granja; por tanto, `finca 81` e `infraestructura 1052` quedan como dato declarado por el DBA (no verificado directamente desde la API bajo este rol).
2. **Comportamiento del endpoint asíncrono (`202`)**: Con 500 filas el endpoint permanece en `nivel_volumen: 1` (síncrono `200`), por lo que el flujo `202` / batch queda fuera de este volumen de datos.

---

## (5) REGISTRO DE TODAS LAS PETICIONES HTTP (FASE 1F)

Total ejecutado: **1 POST (login) + 11 GET = 12 peticiones** (límite máximo permitido: 25 GET).

| # | Método | URL Completa (Sin Tokens) | HTTP | ms | Hora UTC | x-request-id | Archivo Crudo |
|---|:------:|---------------------------|:----:|:--:|:--------:|:------------:|---------------|
| 1 | `POST` | `https://api.inmero.co/api-sgpmp-test/sesiones/` | 200 | 1290 | `2026-11-11T02:55:08.327Z` | `70fc2ce4-9626-4bd5-b569-0359cb74dce0` | [35_login_gestor_granja.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/35_login_gestor_granja.json) |
| 2 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&registros_por_pagina=200&pagina=1` | 200 | 215 | `2026-11-11T02:55:08.563Z` | `c72a53a4-4a83-4b4f-8fc2-f241158b882d` | [36_historial_1624_p1.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/36_historial_1624_p1.json) |
| 3 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&registros_por_pagina=200&pagina=2` | 200 | 188 | `2026-11-11T02:55:09.136Z` | `3216823e-459c-4022-bd8a-9a2235713abf` | [37_historial_1624_p2.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/37_historial_1624_p2.json) |
| 4 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&registros_por_pagina=200&pagina=3` | 200 | 180 | `2026-11-11T02:55:09.438Z` | `243161e9-ad90-413a-8eca-dca7ee8cee76` | [38_historial_1624_p3.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/38_historial_1624_p3.json) |
| 5 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624` | 200 | 190 | `2026-11-11T02:55:09.630Z` | `bf8479b7-7f9a-495b-9243-a91bf5e21bab` | [39_historial_1624_default.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/39_historial_1624_default.json) |
| 6 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&registros_por_pagina=201` | 400 | 157 | `2026-11-11T02:55:09.790Z` | `5aab650e-7299-4765-b735-978833030c14` | [40_historial_1624_201.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/40_historial_1624_201.json) |
| 7 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&tipo_suministro_filtro=MEDICAMENTO&origen_precio_filtro=MANUAL&fecha_inicio_filtro=2026-04-23&fecha_fin_filtro=2026-07-31&costo_min=100000&costo_max=300000&registros_por_pagina=200` | 200 | 177 | `2026-11-11T02:55:09.969Z` | `116a9912-9df0-4e60-b080-85de572f5c1b` | [41_filtro_2_6_a.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/41_filtro_2_6_a.json) |
| 8 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&tipo_suministro_filtro=MEDICAMENTO&costo_min=500000&registros_por_pagina=50` | 200 | 202 | `2026-11-11T02:55:10.174Z` | `81d6bd39-bb4a-4699-ad4b-db074a748fc0` | [42_filtro_2_6_b.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/42_filtro_2_6_b.json) |
| 9 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&fecha_inicio_filtro=2025-01-01&fecha_fin_filtro=2025-12-31&registros_por_pagina=50` | 200 | 173 | `2026-11-11T02:55:10.351Z` | `f7e06c9e-dd51-4ff6-ab5a-b97652835743` | [43_filtro_2_6_c.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/43_filtro_2_6_c.json) |
| 10 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&tipo_suministro_filtro=MEDICAMENTO&registros_por_pagina=200` | 200 | 178 | `2026-11-11T02:55:10.531Z` | `8955d277-02c1-423b-a70d-16568a8bdea4` | [44_filtro_2_6_d_medicamento.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/44_filtro_2_6_d_medicamento.json) |
| 11 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&origen_precio_filtro=MANUAL&registros_por_pagina=50` | 200 | 176 | `2026-11-11T02:55:10.713Z` | `b1dc83fd-4fef-4695-b8e2-8c03d44345af` | [45_filtro_2_6_d_manual.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/45_filtro_2_6_d_manual.json) |
| 12 | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=1624&origen_precio_filtro=M40_AUTOMATICO&registros_por_pagina=50` | 200 | 188 | `2026-11-11T02:55:10.903Z` | `e2dff820-f1be-4b01-b56a-d13b8777f78d` | [46_filtro_2_6_d_m40.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/46_filtro_2_6_d_m40.json) |

---

## (6) CONFIRMACIÓN DE SEGURIDAD Y COMPROBACIÓN EXPLÍCITA
Verificación automática ejecutada sobre [fase1f_G41.md](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/fase1f_G41.md), [oraculo_D.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/oraculo_D.json) y toda la carpeta `evidencias\diag_g41\` (`48` archivos `.json` + `fase1f_G41.md` + `oraculo_D.json` = `50` archivos escaneados):
1. Ningún token fue escrito a disco en ningún momento: `35_login_gestor_granja.json` se guardó directamente con `token: "[REDACTED]"` y `set-cookie: "[REDACTED]"`, sin edición posterior de archivos ya guardados.
2. Ninguna cabecera `Authorization`, contraseña, correo sensible ni secreto de `.env.test` aparece en archivos nuevos, diagnósticos o consola.
3. Comprobación explícita mediante PowerShell contra `20` variables sensibles de `.env.test` (`EMAIL|PASSWORD|SECRET|TOKEN|KEY`), el patrón JWT `eyJ[A-Za-z0-9_\-]{10,}\.`, el patrón de cookie de sesión (`refresh_token` con valor real) y cabecera `Authorization` con portador `Bearer`: resultado observado `ScannedFiles=50 SecretVarsChecked=20 SecretHits=0 JwtHits=0 CookieAuthHits=0`.
