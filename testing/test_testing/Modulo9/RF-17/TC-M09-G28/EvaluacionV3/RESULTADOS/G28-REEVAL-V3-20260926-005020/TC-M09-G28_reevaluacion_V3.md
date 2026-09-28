# TC-M09-G28 — REEVALUACIÓN V3

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
CU-03 — Configurar Umbrales y Alertas Ambientales por Especie

Casos: TC-M09-60 (precisión y almacenamiento de valores numéricos) · TC-M09-61 (persistencia
tras nueva sesión)
Tipo: Exactitud / Integración
Responsable QA: Juan Esteban
RUN_ID: `G28-REEVAL-V3-20260926-005020`
Fecha: 2026-09-26
Entorno decisorio: **TEST**

---

## 0. DECISIÓN GENERAL

**TC-M09-60: APROBADO.** Los decimales configurados se conservan exactos en todo el
recorrido. `35.57` y `39.23`, y los seis límites de los tres niveles, coinciden byte a byte
—comparados con `Decimal`, nunca con float— entre input, GET de la API, PostgreSQL y la
interfaz. No hay truncamiento ni redondeo.

**TC-M09-61: APROBADO.** La **misma** configuración (`id_umbral_ambiental = 54`) sobrevive
íntegra a un cierre de sesión real: logout HTTP 200, token descartado, cookies,
`localStorage` y `sessionStorage` limpiados, nuevo login con token distinto y misma
identidad. Tras la sesión B, API, UI y un `SELECT` posterior devuelven exactamente los
mismos valores, niveles y estado.

**Resultado general: APROBADO.**

**Hallazgos colaterales**

1. **HTTP/Integración Backend–Edge (no afecta al criterio de G28).** El único POST devolvió
   **HTTP 500 `FALLO_SINCRONIZACION_EDGE`** pese a guardar el registro completo y correcto.
   Es exactamente el comportamiento ya documentado en **TC-M09-G22 V3** —adaptador Edge en
   stub que siempre responde `PENDIENTE`— y no se abre incidencia duplicada. El registro
   quedó con `estado_sincronizacion = PENDIENTE`. Este hallazgo se evalúa en una prueba
   separada (`test_tc60_contrato_http_creacion`, en rojo a propósito) y **no** se mezcla con
   el criterio de precisión.
2. **Observación estructural de V2 CORREGIDA.** V2 registró que las columnas estaban en
   `NUMERIC(8,2)` mientras RF-17 especifica `NUMERIC(5,2)`. V3 midió el esquema real y hoy
   **las cuatro columnas están en `numeric(5,2)`**, incluidas las de la tabla de niveles.
   Fuente del cambio: **INC-M09-103-G28 (#294)**, migraciones `1147428cd8fb` y
   `b9edb971f005` (2026-09-18). Se cierra esa discrepancia.

---

## 1. MOTIVO DE LA TERCERA EVALUACIÓN

- **V1** no pudo demostrar precisión: los POST válidos devolvieron HTTP 500 `ERROR_INTERNO`
  y no persistió ningún registro, así que TC-M09-60 quedó **RECHAZADO**. TC-M09-61 se
  verificó sobre un registro preexistente y quedó **APROBADO**, pero sin `SELECT` de
  PostgreSQL por falta de credencial.
- **V2** creó una única configuración (`#43`, Ave Qa Je + Temperatura del agua, 35.57–39.23)
  con HTTP 201 y verificó con ella los dos casos: ambos **APROBADOS**. Dejó una observación
  estructural: `NUMERIC(8,2)` frente al `NUMERIC(5,2)` de RF-17.
- **V3** reproduce esa misma lógica para confirmar que la exactitud y la persistencia siguen
  estables, midiendo de nuevo el esquema real y verificando la persistencia con una sesión
  genuinamente nueva.

---

## 2. EVALUACIÓN V1

Evidencia histórica en `TC-M09-G28/RESULTADOS/run-20260906/` — solo lectura, intacta.

| Caso | Datos | Resultado |
| --- | --- | --- |
| TC-M09-60 | Administrador · especie 10 Tilapia · variable 1 Temperatura del agua · 35.50–39.20 · niveles 35.50–37.00 / 37.00–38.00 / 38.00–39.20 · dos POST válidos | **RECHAZADO** — HTTP 500 `ERROR_INTERNO`, sin persistencia; imposible demostrar precisión almacenada |
| TC-M09-61 | Registro preexistente `#4`; persistencia UI/API tras nueva sesión; primer recorrido Cypress con error de sincronización de QA, segundo válido | **APROBADO** — sin `SELECT` de PostgreSQL por falta de credencial |

---

## 3. REEVALUACIÓN V2

Evidencia en `EvaluacionV2/RESULTADOS/run-20260913-functional-v2/` — solo lectura, intacta.

| Elemento | Valor |
| --- | --- |
| Configuración creada | `id_umbral_ambiental = 43` |
| Especie | 41 — Ave Qa Je |
| Variable | 1 — Temperatura del agua (0.00–45.00 °C) |
| Valores | `valor_min = 35.57` · `valor_max = 39.23` |
| Niveles | NORMAL 35.57–37.00 · PRECAUCIÓN 37.00–38.00 · CRÍTICO 38.00–39.23 |
| Creación | **HTTP 201** · 1 POST · 0 reintentos |
| TC-M09-60 | **APROBADO** — input, API, PostgreSQL y UI coinciden en 35.57 / 39.23 |
| TC-M09-61 | **APROBADO** — mismo `#43` tras logout real, token nuevo, misma especie, variable, valores, niveles, estado y `SELECT` idéntico |
| Observación | Columnas en `NUMERIC(8,2)` frente al `NUMERIC(5,2)` de RF-17 (tratada como observación de capacidad, no como fallo de precisión) |

La misma configuración `#43` sirvió para los dos casos, con un único POST. V3 reproduce esa
lógica.

---

## 4. OBJETIVO V3

**A. TC-M09-60 — precisión.** Que los valores decimales no pierdan exactitud en ningún
tramo: INPUT → API → PostgreSQL → GET → UI.

**B. TC-M09-61 — persistencia.** Que la **misma** configuración creada para TC-M09-60
conserve exactamente los mismos valores tras sesión A → logout real → descarte del token →
sesión B → nueva consulta API/UI → `SELECT` posterior.

Presupuesto de escritura: **1 POST `/configuracion/umbrales`** para todo G28 V3. Se
consumió exactamente uno, sin reintentos.

Se conservan deliberadamente los valores de V2, **35.57 / 39.23**, por ser decimales no
triviales; no se vuelve a 35.50 / 39.20. Toda comparación se hace con `Decimal`.

---

## 5. GIT / SHAs

| Repositorio | Rama | HEAD | `HEAD...origin/test` | Estado inicial |
| --- | --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-tercera-evaluacion-M09` | `ad2b1e59bb872491bae368ae812993a3ded08d63` | `0  0` | `?? .../TC-M09-G22/EvaluacionV3/` (evidencia ajena preexistente, de otro grupo) |
| sgpmp-backend | `qa/juan-esteban-tercera-evaluacion-M09` | `91f7738667a934a4eaf3db5519a57d7cf4803b0e` | `0  0` | Limpio |

---

## 6. ENTORNO

| Servicio | URL / dato | Estado |
| --- | --- | --- |
| Backend TEST | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` | API protegida responde 401 sin token |
| Frontend TEST | `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login` | HTTP 200 |
| PostgreSQL TEST | `158.69.200.27:5448` · `sgpmp_test` · usuario `member_qa` | Conexión **read-only** confirmada |

Todo por HTTPS; DEV no se usó; **G28 no utiliza MQTT**.

El preflight heredado de V2 consultaba las URL por **HTTP**; hoy el backend por HTTP
devuelve 404 del proxy y el frontend redirige 301 a HTTPS, así que V3 asienta la aserción
sobre HTTPS —el esquema decisorio— y deja el comportamiento HTTP registrado como evidencia.
Es un ajuste de automatización, no un cambio de criterio.

**PostgreSQL read-only verificado antes de leer nada:**
`SHOW transaction_read_only` → `on` · `SELECT current_database()` → `sgpmp_test`.
La sesión se abre con `default_transaction_read_only=on` y el helper rechaza por diseño
cualquier sentencia que no empiece por `SELECT`/`SHOW`. **Cero escrituras SQL.**

---

## 7. ACTOR

| Campo | Valor |
| --- | --- |
| Correo | `administador.dev@gmail.com` (escrito así en el sistema; no se corrige) |
| id_usuario | 104 |
| Rol | Administrador |
| Estado | Activo |
| Permisos recurso 20 | `[1, 2, 3, 4]` (crear, consultar, editar, desactivar) |

Mismo actor que V2. No se ejecutó con Veterinario ni con ningún otro rol: G28 no es una
prueba RBAC. La credencial se suministró únicamente por la variable de proceso
**`TEST_ADMIN_PASSWORD`**, y la de PostgreSQL por **`G28_DB_PASSWORD`**; ninguna se imprime
ni se escribe en artefactos.

---

## 8. GATE OPENAPI

`POST /configuracion/umbrales` existe. Contrato vigente:

| Elemento | Valor |
| --- | --- |
| Respuestas declaradas | `201, 401, 403, 404, 409, 422` |
| Único éxito declarado | **201** (sin cambios respecto del histórico) |
| DTO | `RegistrarUmbralDTO` |
| Requeridos | `id_especie`, `id_variable_ambiental`, `valor_min`, `valor_max`, `niveles` |
| `NivelDTO` requeridos | `nivel`, `limite_inferior`, `limite_superior` |
| Respuesta de éxito | `UmbralAmbientalResponse`, que ya incluye `estado_sincronizacion`, `fecha_ultima_sincronizacion` y `motivo_fallo_sincronizacion` |

El contrato **no declara ningún 500**. El 500 observado en la creación queda por tanto fuera
de la especificación publicada; se documenta como hallazgo de contrato/integración, separado
del criterio de exactitud de G28 (§19).

---

## 9. DISCOVERY

Solo GET antes de escribir.

| Elemento | Valor | Comprobación |
| --- | --- | --- |
| Variable | **1 — Temperatura del agua** (°C) | Localizada por nombre; el id coincide con el histórico (1) |
| Límite físico | **0 – 45** | Idéntico al de V2; admite 35.57 < 39.23 |
| Especie seleccionada | **44 — Equino Test Qa** | Activa, fixture de QA, combinación **libre** |
| Umbrales previos de la especie | ninguno | — |

La combinación de V2 (Ave Qa Je + Temperatura del agua, `#43`) permanece ocupada como
evidencia histórica, así que V3 seleccionó dinámicamente otra especie activa con la
combinación libre, prefiriendo un fixture de QA. G28 evalúa precisión y persistencia, no
compatibilidad biológica especie–variable, de modo que el cambio de especie no altera el
caso.

---

## 10. PLAN V3

`plan-v3.json`, creado antes del único POST.

| Campo | Valor |
| --- | --- |
| `id_especie` | 44 (Equino Test Qa, activa) |
| `id_variable_ambiental` | 1 (Temperatura del agua, °C, 0–45) |
| `valor_min` | `35.57` |
| `valor_max` | `39.23` |
| Niveles | NORMAL 35.57–37.00 · PRECAUCIÓN 37.00–38.00 · CRÍTICO 38.00–39.23 |
| Combinación libre | Sí |
| Presupuesto | 1 POST para todo G28 V3 |

Antes de enviar, el test validó con `Decimal`: rango dentro del límite físico, exactamente
dos decimales, niveles contiguos, sin huecos ni solapamientos y extremos que cubren el rango.

---

## 11. CONFIGURACIÓN CREADA

| Elemento | Valor |
| --- | --- |
| POST | `POST /configuracion/umbrales` — **uno solo**, 0 reintentos |
| HTTP observado | **500** con `error_code = FALLO_SINCRONIZACION_EDGE` |
| Esperado por contrato | 201 |
| Cuerpo de la respuesta | Sin `id_umbral_ambiental`; mensaje: «Configuración guardada en la base de datos, pero falló la actualización de los nodos Edge…» |
| ¿Persistió? | **Sí** — `id_umbral_ambiental = 54`, localizado por GET como único registro nuevo de la combinación |
| `estado_sincronizacion` | `PENDIENTE` |

**Flujo alterno Edge, descrito por separado.** El endpoint guardó el umbral y sus tres
niveles y después respondió 500 porque no pudo confirmar la propagación al Nodo Edge. Es el
mismo comportamiento verificado en **TC-M09-G22 V3**: el adaptador de sincronización es
todavía un stub que siempre devuelve `PENDIENTE`, y el caso de uso exige `APLICADA` para
responder 201. No se repitió el POST, no se hizo cleanup y no se abandonó TC60/TC61: ambos
continuaron en **solo lectura** sobre el registro `#54`, como indica el procedimiento.

---

## 12. TC-M09-60 — PRECISIÓN

| Fuente | `valor_min` | `valor_max` | Coincide |
| --- | --- | --- | --- |
| Input (payload) | `35.57` | `39.23` | — |
| POST (respuesta) | no aplica: el 500 no devuelve cuerpo con valores | — | n/a |
| GET `/configuracion/umbrales?id_especie=44` | `35.57` | `39.23` | **Sí** |
| PostgreSQL (`SELECT` read-only) | `35.57` | `39.23` | **Sí** |
| UI (Cypress, sesión A) | `35.57` | `39.23` | **Sí** |

**Niveles**

| Nivel | Esperado | GET | PostgreSQL | UI |
| --- | --- | --- | --- | --- |
| NORMAL | 35.57 – 37.00 | 35.57 – 37.00 | 35.57 – 37.00 | 35.57–37.00 |
| PRECAUCIÓN | 37.00 – 38.00 | 37.00 – 38.00 | 37.00 – 38.00 | 37.00–38.00 |
| CRÍTICO | 38.00 – 39.23 | 38.00 – 39.23 | 38.00 – 39.23 | 38.00–39.23 |

Verificaciones superadas: registro único e identificable (`#54`); `id_especie = 44`;
`id_variable_ambiental = 1`; `valor_min = Decimal("35.57")`; `valor_max = Decimal("39.23")`;
tres niveles exactamente; contiguos, sin huecos ni solapamientos; extremos que cubren el
rango; `es_activo = true`; GET conserva los valores; PostgreSQL conserva los valores; la UI
representa los mismos extremos; sin truncamiento; sin redondeo indebido.

Toda comparación se hizo con `Decimal` (el JSON se parsea con `parse_float=Decimal`), nunca
con float binario.

**Resultado TC-M09-60: APROBADO.**

---

## 13. POSTGRESQL

Sesión read-only (`transaction_read_only = on`, `current_database() = sgpmp_test`). Solo
`SELECT` y `SHOW`.

| Tabla.columna | Tipo observado en V3 | Observado en V2 |
| --- | --- | --- |
| `modulo9.umbrales_ambientales.valor_min` | **numeric(5,2)** | numeric(8,2) |
| `modulo9.umbrales_ambientales.valor_max` | **numeric(5,2)** | numeric(8,2) |
| `modulo9.niveles_alerta_ambientales.limite_inferior` | **numeric(5,2)** | no medido en V2 |
| `modulo9.niveles_alerta_ambientales.limite_superior` | **numeric(5,2)** | no medido en V2 |

**La discrepancia estructural que V2 documentó está corregida.** Fuente del cambio, leída en
el repositorio de backend (solo lectura): **INC-M09-103-G28 (#294)**, abierta a partir del
hallazgo de V2. La migración `1147428cd8fb` ajustó `umbrales_ambientales` a `NUMERIC(5,2)`
y la migración `b9edb971f005` (creada el 2026-09-18) extendió el ajuste a
`niveles_alerta_ambientales`, conforme a lo que especifica RF-17. `numeric(5,2)` admite
holgadamente 35.57 y 39.23, y la precisión se conserva exacta.

`SELECT` del registro `#54`: `id_especie = 44`, `id_variable_ambiental = 1`,
`valor_min = 35.57`, `valor_max = 39.23`, `es_activo = true`, tres niveles con sus límites
exactos. Evidencia en `tc60-precision.json` y `db-metadata-v3.json`.

---

## 14. TC-M09-61 — NUEVA SESIÓN

Recorrido real, sin `cy.session`, sin mocks y sin `force: true`:

| Paso | Evidencia |
| --- | --- |
| Sesión A — login | HTTP 200, token emitido; `/usuarios/me` → id 104, Administrador |
| Sesión A — configuración visible | Fila `#54` con variable, rango, niveles y «Activo»; GET de la API devuelve exactamente un registro con ese id |
| Logout | `DELETE /sesiones/` → **HTTP 200**; redirección a `/login`; token A descartado |
| Limpieza de estado | `cookies`, `localStorage` y `sessionStorage` limpiados |
| Sesión B — login | HTTP 200 con **token distinto del A** (comprobado en memoria, no persistido); `/usuarios/me` → id 104, Administrador |
| Sesión B — configuración | Mismo `#54`, misma especie, misma variable, mismos valores, mismos niveles, mismo estado |

| Comprobación | Antes del logout | Después de la sesión B |
| --- | --- | --- |
| `id_umbral_ambiental` | 54 | **54** |
| Especie | 44 Equino Test Qa | **44 Equino Test Qa** |
| Variable | Temperatura del agua | **Temperatura del agua** |
| `valor_min` / `valor_max` | 35.57 / 39.23 | **35.57 / 39.23** |
| Niveles | 35.57–37.00 / 37.00–38.00 / 38.00–39.23 | **idénticos** |
| Estado | Activo | **Activo** |

La comparación de la UI se hizo campo a campo (`uiB` debe ser exactamente igual a `uiA`), no
por texto completo renderizado, y los valores numéricos se extrajeron y compararon como
números.

**Resultado TC-M09-61: APROBADO.**

---

## 15. PERSISTENCIA POST SESIÓN

| Fuente (después de la sesión B) | `id` | `valor_min` | `valor_max` | Niveles | Activo |
| --- | --- | --- | --- | --- | --- |
| API (`GET` con el token B) | 54 | 35.57 | 39.23 | 3 exactos | Sí |
| UI (Cypress sesión B) | #54 | 35.57 | 39.23 | 3 exactos | Activo |
| PostgreSQL (`SELECT` posterior) | 54 | 35.57 | 39.23 | 3 exactos | Sí |

Las tres fuentes coinciden entre sí y con el input original y con el `SELECT` de TC-M09-60.
Evidencia en `tc61-db-after-session.json`. Sin cambios de ningún tipo.

---

## 16. EVIDENCIA FRONTEND

Cypress 13.17.0 con Electron 118 headless, un recorrido (`recorrido1`), **1 test, 1 pasado,
0 fallidos**. Intercepts pasivos; sin stubs de respuesta; sin `cy.session` entre A y B; sin
pausas fijas como prueba. Blackout de correo y contraseña en las capturas.

Capturas: `TC-M09-60-configuracion-visible.png` y `TC-M09-61-despues-nueva-sesion.png` en
`RESULTADOS/<RUN_ID>/cypress/recorrido1/screenshots/`.

Ajuste de automatización: la UI desplegada sirve el ítem «Configuración» como
`<a class="ds-sidebar__item">` (en V2 era `<button>`), así que el selector de navegación
acepta ambos. Es mantenimiento de QA, no un cambio de producto ni una relajación de
aserciones.

---

## 17. COMPARACIÓN V1 ↔ V2 ↔ V3

| Aspecto | V1 | V2 | V3 | Evolución |
| --- | --- | --- | --- | --- |
| Ambiente | TEST | TEST | TEST | Sin cambio |
| Actor | Administrador | Administrador (104) | **El mismo** (104, permisos `[1,2,3,4]`) | Sin cambio |
| Especie | 10 Tilapia | 41 Ave Qa Je | **44 Equino Test Qa** | Solo fixture |
| Variable | 1 Temperatura del agua | 1 Temperatura del agua | **1 Temperatura del agua** | Sin cambio |
| Min / Max | 35.50 / 39.20 | 35.57 / 39.23 | **35.57 / 39.23** | Igual que V2 |
| Niveles | 35.50–37.00 / 37.00–38.00 / 38.00–39.20 | 35.57–37.00 / 37.00–38.00 / 38.00–39.23 | **Idénticos a V2** | Sin cambio |
| POST | 2 | 1 | **1** | Presupuesto respetado |
| HTTP observado | 500 `ERROR_INTERNO` | **201** | **500 `FALLO_SINCRONIZACION_EDGE`** | Defecto distinto, sin pérdida de datos |
| ID | ninguno | 43 | **54** | — |
| Precisión API | no verificable | 35.57 / 39.23 | **35.57 / 39.23** | Estable |
| Precisión BD | sin credencial | 35.57 / 39.23 | **35.57 / 39.23** | Estable |
| Tipo en BD | no medido | `numeric(8,2)` (observación) | **`numeric(5,2)`** | **Corregido** (INC-M09-103-G28) |
| UI | sin registro | correcta | **correcta** | Sin cambio |
| Sesión nueva | verificada sobre `#4` | verificada sobre `#43` | **verificada sobre `#54`** | Sin cambio |
| Persistencia | parcial | completa | **completa** | Estable |
| Pytest | — | verde | **2 criterios verdes + 1 rojo colateral (contrato HTTP)** | Hallazgo aislado |
| Cypress | 2 recorridos (1 con error de QA) | 1 recorrido válido | **1 recorrido, PASS** | Mejor |
| Resultado TC-M09-60 | **RECHAZADO** | APROBADO | **APROBADO** | Estable desde V2 |
| Resultado TC-M09-61 | APROBADO | APROBADO | **APROBADO** | Estable |
| Resultado general | RECHAZADO | APROBADO | **APROBADO** | Estable |

---

## 18. COMPARACIÓN DE DATOS

| Elemento | V1 | V2 | V3 | Justificación |
| --- | --- | --- | --- | --- |
| Variable | Temperatura del agua | Temperatura del agua | Temperatura del agua | Obligatoria; no cambia |
| Valores | 35.50 – 39.20 | 35.57 – 39.23 | **35.57 – 39.23** | V2 eligió decimales no triviales para evaluar precisión; V3 los conserva deliberadamente |
| Niveles | 3 contiguos | 3 contiguos | **3 contiguos, idénticos a V2** | Sin cambio |
| Especie | 10 Tilapia | 41 Ave Qa Je | **44 Equino Test Qa** | La combinación de V2 sigue ocupada por `#43` (evidencia histórica); se eligió dinámicamente una especie activa con la combinación libre |
| Actor | Administrador | Administrador | Administrador | Sin cambio |
| Endpoint | `POST /configuracion/umbrales` | ídem | ídem | Sin cambio |

V3 reproduce V2 para exactitud y cambia únicamente el fixture de especie, porque la
combinación histórica ya no está disponible. G28 mide precisión y persistencia, no la
afinidad biológica entre especie y variable.

---

## 19. ORIGEN DE FALLOS / OBSERVACIONES

| Hallazgo | Producto | Automatización QA | Datos | Ambiente | Contrato | Diagnóstico |
| --- | --- | --- | --- | --- | --- | --- |
| HTTP 500 `FALLO_SINCRONIZACION_EDGE` con persistencia exacta | **Sí** (Backend / integración Edge) | No | No | No | **Sí** (500 no declarado en OpenAPI) | Causa ya confirmada en G22 V3: el adaptador Edge es un stub que siempre responde `PENDIENTE` y el caso de uso exige `APLICADA` para el 201. Hecho observado y causa confirmada; **no** es pérdida de precisión |
| Preflight heredado apuntaba a HTTP y obtenía 404 | No | **Sí** | No | Parcial | No | El ambiente decisorio es HTTPS; se corrigió el preflight y se dejó el comportamiento HTTP documentado |
| Selector `nav.ds-sidebar button` sin coincidencias | No | **Sí** | No | No | No | La UI sirve el ítem como `<a class="ds-sidebar__item">`; solo se actualizó el selector de navegación |
| Columnas en `numeric(8,2)` (observación de V2) | Resuelto | No | No | No | No | Corregido por INC-M09-103-G28; hoy `numeric(5,2)` en las cuatro columnas |
| Especie de V2 no reutilizable | No | No | **Sí** | Parcial | No | `#43` persiste como evidencia histórica; la unicidad `(especie, variable)` obliga a otro fixture |

Los hechos observados, las causas confirmadas y las hipótesis se mantienen separados: la
única causa que se declara confirmada es la del 500, verificada por lectura de código en
G22 V3 y reproducida aquí de forma idéntica.

---

## 20. INCIDENCIAS

**No se creó ninguna incidencia ni ningún ticket.**

- **Hallazgo Edge/HTTP**: es el mismo defecto ya documentado en **TC-M09-G22 V3** (adaptador
  Edge en stub; commits `40978d43` y `7d93323f`, ligados a **INC-M09-104-G29**). **No se abre
  duplicado**; se relaciona con ese antecedente. G28 aporta una confirmación adicional: el
  comportamiento se reproduce también con otra especie y no altera los datos guardados.
- **INC-M09-103-G28 (#294)** — observación estructural de V2 sobre `NUMERIC(8,2)`: V3
  **verifica que está corregida** (`numeric(5,2)` en umbrales y en niveles). Se sugiere
  marcarla como corrección verificada por QA, con referencia a este RUN_ID.
- No apareció ningún defecto nuevo específico de precisión o de persistencia.

---

## 21. SEGURIDAD

- `TEST_ADMIN_PASSWORD` y `G28_DB_PASSWORD` se usaron **solo** como variables de proceso;
  no se imprimieron ni se escribieron en código, colección, JSON, Markdown, reportes,
  capturas, logs, Cypress, Pytest ni Git.
- Tokens únicamente en memoria: el token A se descarta en el logout y ni él ni el token B
  ni ningún hash se guardan en la evidencia; solo se registra el hecho de que difieren.
- Cadena de conexión de PostgreSQL construida en memoria a partir de la variable de entorno.
- Capturas con blackout de correo y contraseña.

**Escaneo final de `EvaluacionV3/`** (`seguridad-evidencias.json`): **32 archivos revisados,
2 capturas, 0 hallazgos**. Sin valores de secreto en claro, sin JWT, sin `Authorization`
con valor y sin cadenas de conexión.

---

## 22. GIT FINAL

| Repositorio | Rama | HEAD | `status --short` | `diff --stat` |
| --- | --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-tercera-evaluacion-M09` | `ad2b1e59bb872491bae368ae812993a3ded08d63` | `?? .../TC-M09-G22/EvaluacionV3/` · `?? .../TC-M09-G28/EvaluacionV3/` | (vacío) |
| sgpmp-backend | `qa/juan-esteban-tercera-evaluacion-M09` | `91f7738667a934a4eaf3db5519a57d7cf4803b0e` | (vacío) | (vacío) |

- **V1 intacta · V2 intacta · código productivo intacto** en ambos repositorios.
- La única zona escrita por esta evaluación es `TC-M09-G28/EvaluacionV3/`. La entrada de
  `TC-M09-G22/EvaluacionV3/` es evidencia preexistente de otro grupo, ajena a G28.
- `RESULTADOS/` está ignorada por la regla `**/resultados/` de `testing/.gitignore`, igual
  que ya ocurría con la evidencia de V2. **No se usó `git add -f`**; la evidencia queda en
  disco.
- Sin commit, push, merge, rebase, reset, clean, stash, tag, PR ni deploy. **Sin escrituras
  SQL.**

---

## 23. VEREDICTO FINAL

**TC-M09-G28 V3: APROBADO.**

**TC-M09-60 (precisión): APROBADO.** Con un único POST se creó la configuración `#54`
(Equino Test Qa + Temperatura del agua, 35.57–39.23). Los valores y los seis límites de los
tres niveles se conservan exactos —comparados con `Decimal`— en input, GET, PostgreSQL y UI.
No hay truncamiento ni redondeo. Además, el esquema real de la base ya cumple el
`NUMERIC(5,2)` que especifica RF-17, con lo que la observación estructural de V2 queda
cerrada.

**TC-M09-61 (persistencia tras nueva sesión): APROBADO.** La misma configuración `#54`
sobrevive intacta a un logout real con token descartado y estado de sesión limpiado: tras el
nuevo login con un token distinto, API, UI y `SELECT` devuelven el mismo id, la misma
especie, la misma variable, los mismos valores, los mismos niveles y el mismo estado.

**Hallazgo colateral, no imputable al criterio de G28:** la creación respondió HTTP 500
`FALLO_SINCRONIZACION_EDGE` pese a guardar correctamente el registro. Es el defecto de
integración Backend–Edge ya documentado en TC-M09-G22 V3, se registra por separado y no se
duplica como incidencia. Conviene que el equipo decida si el alta debe responder 201 con
`estado_sincronizacion = PENDIENTE` o si el contrato debe declarar ese 500.
