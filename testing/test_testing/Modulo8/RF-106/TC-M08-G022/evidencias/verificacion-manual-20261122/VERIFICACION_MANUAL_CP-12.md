# Verificación manual de CP-12 en TEST (reintento 1 de TC-M08-G022)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-22 | Juan Sebastian Gutierrez | Verificación manual de CP-12 (pendientes del historial predictivo) en TEST, solo lectura, pedida por Sebastian |
| 2026-11-22 | Juan Sebastian Gutierrez | Texto literal de RF-106 y petición directa al endpoint comparada con la vista (08:04) |
| 2026-11-22 | Juan Sebastian Gutierrez | Las 16 que faltan, contrastadas con RF-67 (inferencias del animal) y RF-72 (bandeja) (11:04) |

**Ambiente:** `https://api.inmero.co/sigab-test/` (bundle `index-BUhd1sjz.js`), navegador integrado de la app de escritorio.
**Sesión:** la inició Sebastian. Cuenta comprobada con `GET /usuarios/me` (respuesta del registro de red): Veterinario, id 159, fincas 84, 184 y 57.
**Hora:** 2026-11-22 07:57 (America/Bogota); cabecera `Date` de la respuesta: `Sun, 22 Nov 2026 12:57:11 GMT`.
**Solo lectura:** Claude eligió el activo en el buscador y alternó Agrupada → Lineal. Para leer la respuesta completa con su X-Request-Id se instaló en la página un lector de respuestas XHR (solo lectura, filtrado a `historial-predictivo/885`) que se retiró al recargar. Peticiones de la sesión: GET y los `POST /sesiones/refresh` de la propia app; ninguna escritura.

## Medición

`GET /historial-predictivo/885?fecha_inicio=2025-11-22&fecha_fin=2026-11-22&modo_visualizacion=LINEAL&incluir_eventos_sanitarios=true&incluir_retroalimentacion=true&pagina_pendientes=1` → 200, **X-Request-Id `dc7e55da-e348-489a-967f-15952b3df0d1`** (la de Agrupada: `f43628fd-c834-4152-bac1-b1c90e4afa66`).

Respuesta: 24 predicciones, 4 con valoración, 3 eventos.

| Fuente | Total | Pendientes (id corto, nivel), en orden |
|---|---|---|
| **Regla de RF-106 Proceso 5** (sin valoración y con más de 48 h; orden nivel ↓ y fecha ↓), calculada con las `predicciones` y `retroalimentaciones` de la misma respuesta | **20** | 511a6d66 (Alto), 997b8cda (Medio), 5dbe4510 (Medio), cb261b4f (Medio), 2363c367 (Medio), d1f3cc43 (Bajo), 98c7697c (Bajo), 31e7239e (Bajo), b36ac73c (Bajo), d929c162 (Bajo), 7c215bf1 (Bajo), 8f7c7542 (Bajo), 50e68201 (Bajo), 11e12f40 (Bajo), ac952c1d (Bajo), fb07d478 (Bajo), 7d597a54 (Bajo), f056f99d (Sin riesgo), f7fea6d3 (Sin riesgo), 86ebfac8 (Sin riesgo) |
| **Backend** (`pendientes`, página 1 de 20 por página; `metadatos.total_pendientes`) | **4** | 511a6d66 (Alto), 997b8cda (Medio), 5dbe4510 (Medio), 2363c367 (Medio) |
| **Vista** («Predicciones sin evaluar (más de 48 horas)» y tarjeta de totales) | **4** | «27/10/26, 7:06 p. m. · Alto · Estrés térmico», «25/10/26, 8:06 p. m. · Medio · Deshidratación», «23/10/26, 6:06 p. m. · Medio · Gastroenteritis infecciosa», «1/07/26, 6:34 a. m. · Medio · Septicemia o infección sistémica»; tarjeta «4 pendientes de evaluar» |

Quedan fuera **16** predicciones sin evaluar y con más de 48 h: 12 de riesgo Bajo, 3 Sin riesgo y 1 Medio (cb261b4f, que sigue al episodio Medio de 2363c367 dos horas antes). Entre ellas, `d1f3cc43` (Bajo, la que usa CP-02 de G023).

**Confirma el resultado de CP-12 de la corrida oficial** `qa-m08-g022-20261121-202950` (calculados 20, backend 4, vista 4).

## Causa (observada en el código)

`sgpmp-backend`, rama `test-JuanSG`, commit `655bc00af` (2026-11-20 23:39, «fix(rf106-mod8): pendientes del historial con el criterio de la bandeja de retroalimentacion», respuesta a QA M08 CU04 H-01), integrado con #1208:
- `src/reporting/domain/historial_predictivo.py`: nueva `evaluables()` (solo nivel ≥ 2 que cambia respecto de la anterior, o con alerta generada) y `pendientes()` filtra sobre `evaluables(inferencias)`.
- `consultar_historial_predictivo_use_case.py`:115 usa `pendientes(...)` para la lista y el total.

La vista solo muestra lo que recibe.

## Especificación

- RF-106 Proceso 5: la vista lista las inferencias sin retroalimentación con antigüedad > 48 horas (sin filtro de nivel), con el botón «Registrar retroalimentación».
- RF-72 CA-1: se puede registrar retroalimentación sobre cualquier inferencia de RF-67; RF-72 v1.2 (RFC-023 C23.4): la bandeja complementa la entrada desde el historial del animal, no la reemplaza.
- El arreglo de #727 (G023) hace que el formulario abra también para riesgo Bajo o Sin riesgo; con este filtro esas predicciones ya no aparecen como pendientes en el historial.

## Texto literal de RF-106 (hoja «Modulo 8», filas vigentes)

- **Descripción:** «Lista de inferencias sin retroalimentación con antigüedad > 48 horas, con acceso directo al formulario de RF-72.»
- **Proceso, paso 5:** «5. El sistema lista las inferencias sin retroalimentación con antigüedad > 48 horas: Ordenadas por nivel_riesgo DESC, luego por timestamp DESC. Máximo 20 en la lista principal; el resto accesible con paginación. Cada ítem tiene un botón "Registrar retroalimentación" que abre el formulario de RF-72 prellenado con el id_resultado_inferencia.»
- **Salida:** «Lista de inferencias pendientes de retroalimentación.» … «total_pendientes»
- **CA-4:** «El Veterinario puede hacer clic en el botón "Registrar retroalimentación" de una inferencia pendiente y accede al formulario de RF-72 con el id_resultado_inferencia prellenado.»
- **CA-9:** «La lista de inferencias pendientes debe estar ordenada por: nivel_riesgo DESC, luego timestamp DESC.»

No hay filtro por nivel de riesgo ni por episodio: las dos condiciones son «sin retroalimentación» y «antigüedad > 48 horas».

## Petición directa al endpoint (2026-11-22 08:04, America/Bogota)

Desde la página de TEST, con la sesión del Veterinario 159 (el encabezado `Authorization` de la app se tomó en memoria de la página, no se leyó ni se copió, y se descartó; la página se recargó al terminar):

`GET https://api.inmero.co/api-sgpmp-test/historial-predictivo/885?fecha_inicio=2025-11-22&fecha_fin=2026-11-22&modo_visualizacion=LINEAL&incluir_eventos_sanitarios=true&incluir_retroalimentacion=true&pagina_pendientes=1` con `X-Zona-Horaria: America/Bogota` → **200**, X-Request-Id **`fb6b996f-59fc-4c23-8cc8-c7837ef05446`**, `Date: Sun, 22 Nov 2026 13:04:21 GMT`.

| Fuente | Total | Ítems |
|---|---|---|
| Endpoint (`pendientes.total`, `metadatos.total_pendientes`) | 4 | 511a6d66 Alto 2026-10-28T00:06:22Z; 997b8cda Medio 2026-10-26T01:06:22Z; 5dbe4510 Medio 2026-10-23T23:06:22Z; 2363c367 Medio 2026-07-01T11:34:36Z |
| Regla literal de RF-106 Proceso 5, con las predicciones y retroalimentaciones de la misma respuesta | 20 | los 4 anteriores más cb261b4f (Medio), 12 de riesgo Bajo (d1f3cc43, 98c7697c, 31e7239e, b36ac73c, d929c162, 7c215bf1, 8f7c7542, 50e68201, 11e12f40, ac952c1d, fb07d478, 7d597a54) y 3 Sin riesgo (f056f99d, f7fea6d3, 86ebfac8), en orden nivel ↓ y fecha ↓ |
| Vista | 4 | los mismos 4 que el endpoint, en el mismo orden; tarjeta «4 pendientes de evaluar» |

**Resultado:** la vista coincide con el endpoint (muestra lo que recibe); el endpoint no coincide con RF-106 Proceso 5 (devuelve 4 de 20). El defecto está en el backend.

## Las 16 predicciones que faltan: ¿siguen existiendo y sin evaluar? (2026-11-22 11:04, America/Bogota)

Sesión nueva de Sebastian, Veterinario id 159 (fincas 84, 184 y 57), comprobada con `/usuarios/me`. Solo GET, con el encabezado de sesión de la app tomado en memoria de la página y descartado.

| Fuente | Petición (X-Request-Id) | Resultado |
|---|---|---|
| Historial predictivo (RF-106) | `GET /historial-predictivo/885?...&modo_visualizacion=LINEAL&...&pagina_pendientes=1` → 200 (`2498d011-e7d3-4b69-acef-2fb30a99f2a6`) | 24 predicciones, 4 con retroalimentación; regla de RF-106 = 20; `pendientes.total` = 4; faltan 16, todas con `tiene_retroalimentacion: false` y entre 643 y 3.458 horas de antigüedad |
| Inferencias del animal (RF-67) | `GET /prediccion/inferencias/paginado?id_activo_biologico=885&pagina=1&por_pagina=100` → 200 (`825b4ac5-7016-4a2e-93ff-d409439da9a1`) | total 24; **las 16 existen**, con la misma fecha y el mismo nivel que en el historial, y ninguna es de modo sombra |
| Bandeja de retroalimentación (RF-72) del animal | `GET /prediccion/retroalimentacion/bandeja?id_activo_biologico=885&pagina=1&por_pagina=100` → 200 (`497b4c33-f4f5-4c70-870b-d300423bd05e`) | indicadores: **4 evaluadas**, 3 pendientes, 0 vencidas; las 4 EVALUADO son 32985675, f80c05d9, 2895a389 y 6e0d4f0f (las mismas 4 retroalimentaciones del historial). **Ninguna de las 16 figura como evaluada.** La bandeja solo lista 7 ítems (su propio criterio: episodios de riesgo moderado o alto, con alerta o evaluadas, ventana de 90 días) |

Las 16 (id corto · nivel · fecha UTC): cb261b4f · Medio · 2026-07-01 13:34; 7d597a54 · Bajo · 07-30 12:34; fb07d478 · Bajo · 07-31 01:34; ac952c1d · Bajo · 07-31 12:34; 11e12f40 · Bajo · 08-01 12:34; 50e68201 · Bajo · 08-02 03:30; 8f7c7542 · Bajo · 08-02 16:30; 7c215bf1 · Bajo · 08-03 03:30; d929c162 · Bajo · 08-04 03:30; b36ac73c · Bajo · 10-08 22:06; 86ebfac8 · Sin riesgo · 10-14 21:06; 31e7239e · Bajo · 10-16 18:06; 98c7697c · Bajo · 10-19 20:06; f7fea6d3 · Sin riesgo · 10-22 17:06; d1f3cc43 · Bajo · 10-24 19:06; f056f99d · Sin riesgo · 10-26 21:06.

**Conclusión:** las 16 existen (RF-67), no tienen evaluación (historial y bandeja coinciden en que las únicas evaluadas del 885 son 4) y tienen más de 48 h. Por RF-106 Proceso 5 son pendientes, y el endpoint no las devuelve.

**Dato para G023 (no es de este caso):** pedir la bandeja con `id_resultado_inferencia=<id>` de cualquiera de las 16 devolvió 200 sin ese ítem (16 peticiones; por ejemplo d1f3cc43 → `e5d97d76-d1d4-466a-861c-5e2d860772bc`). El parámetro que necesita el arreglo de #727 (backend #1213) no tuvo efecto en TEST; revisarlo en el reintento de G023.
