# TC-M09-G28 — RESULTADO

## DECISIÓN GENERAL

**DESAPROBADO**

La causa es exclusivamente TC-M09-60: la creación de un umbral válido devuelve
**HTTP 500** y no persiste, así que la precisión numérica no pudo demostrarse sobre
un registro propio. TC-M09-61 quedó **APROBADO**: la persistencia entre sesiones se
demostró de extremo a extremo en UI y API, con el recorrido Cypress en verde.

| Caso | Resultado | Motivo | ¿Reportar a Desarrollo? |
| --------- | -------------------------------- | ------ | ----------------------- |
| TC-M09-60 | DESAPROBADO — DEFECTO DEL PRODUCTO | Dos POST de creación válidos devolvieron HTTP 500 `ERROR_INTERNO` («Error inesperado en base de datos») sin persistir nada. Sin registro creado no hay valor almacenado que comparar, de modo que la precisión `numeric(5,2)` no pudo evaluarse | **Sí** |
| TC-M09-61 | APROBADO | Sesión A → logout real por la interfaz → sesión B autenticada de nuevo: el mismo umbral **#4** aparece con ID, rango, niveles y estado idénticos en UI, y el GET de la sesión B devuelve los mismos valores. Recorrido Cypress PASS | No |

Responsable: Juan Esteban. M09 / RF-17 / CU-03 (trazabilidad de los originales:
CU-07). Prioridad alta. Herramientas: Pytest, PostgreSQL read-only y Cypress.
Actor: Administrador TEST. G22, G23, G24, G25, G26 y G27 no se ejecutaron ni se
modificaron. G29 no se inició.

---

## ORIGEN DE LOS FALLOS

### TC-M09-60 — la creación válida devuelve HTTP 500

- **Producto:** **Sí** — el rechazo no es controlado: RF-17 debe permitir crear una
  configuración válida y el backend responde 500 sin persistir.
- **Automatización/prueba:** No — el payload se construyó con datos descubiertos
  dinámicamente, combinación libre, especie y variable activas, `min < max` dentro
  del rango físico y tres niveles contiguos. La comparación de precisión está
  implementada con `Decimal`, pero nunca llegó a ejecutarse porque no hay registro.
- **Entorno:** No — TEST accesible: login 200, catálogos 200 y GET posteriores 200
  en las mismas ventanas de los dos POST.
- **Bloqueo:** No — el caso se ejecutó y el producto respondió.
- **Acción:** `REPORTAR A DESARROLLO`.

TC-M09-61 quedó APROBADO y no tiene entrada en esta sección. El único incidente de
ejecución fue el primer recorrido Cypress, cuyo origen fue una comparación demasiado
estricta de la propia prueba —no del producto—; se corrigió en archivos QA y el
segundo recorrido pasó. El detalle está en la sección del caso.

## DECISIÓN SOBRE EL CIERRE DE TC-M09-61

La comprobación por PostgreSQL no se ejecutó: no había credencial disponible y la
contraseña no se inventa ni se codifica en el repositorio. Aun así **el caso se
cierra como APROBADO**, por este fundamento:

1. **El propio caso define PostgreSQL como comprobación complementaria**, no como
   oráculo principal: «complementar la validación mediante PostgreSQL read-only» y
   «esto complementa Cypress». El oráculo del caso es que la configuración siga
   disponible con los mismos valores tras una sesión nueva.
2. **Esa propiedad quedó demostrada de extremo a extremo**: sesión A real, logout
   real por la interfaz, limpieza de cookies y almacenamiento, sesión B autenticada
   de nuevo, y el mismo registro **#4** con ID, rango `0.00 – 100.00 °C`, los tres
   niveles y el estado Activo idénticos en ambas sesiones.
3. **El GET de la sesión B se sirve desde la misma base de datos.** Que la API
   devuelva el registro con los mismos valores después de un ciclo completo de
   sesión es, en sí, evidencia de que el dato persiste en la base: no existe un
   escenario en el que UI y API lo muestren de forma consistente en dos sesiones y
   la tabla no lo contenga.
4. **Retrasar el cierre no aportaría certeza**, solo trazabilidad pendiente. La
   consulta de solo lectura queda implementada y disponible por si en una revisión
   se quiere añadir esa profundidad; no cambia la conclusión.

Queda registrado con transparencia: la fila «PostgreSQL final» de la tabla de
persistencia figura como **no ejecutada**, y los tests de base de datos aparecen
omitidos con motivo explícito en el log y en el XML de JUnit. No se declara ejecutado
nada que no se haya ejecutado.

---

## Entorno

- Fecha: 2026-09-06 UTC. POST de TC-M09-60 a las 01:00:05 (intento 1) y 01:02:16
  (intento 2). Recorridos Cypress a continuación. Los JSON conservan los timestamps.
- Frontend TEST: `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`
- Backend TEST: `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`
- Rama frontend: `qa/juan-esteban-m09` · SHA local `966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`
- Rama backend: `qa/juan-esteban-m09` · SHA local `adc3932b9f0293a76ebec7e89ed877274791b6a1`
- **SHA desplegado en TEST no confirmado.** Los SHA anteriores son locales.
- Status Git inicial: frontend con untracked de TC-M09-G22 y de este grupo; backend
  con untracked de TC-M09-G24 a TC-M09-G27. Ningún archivo versionado modificado.
- Dependencias verificadas, ninguna instalada: Python **3.13.13**, pytest **9.0.3**,
  psycopg2 **2.9.12**, Cypress **13.17.0**, TypeScript 5.9.3.

## Revisión del contrato y precisión declarada

Revisión enfocada y de solo lectura, una sola vez antes del primer POST.

| Punto | Hallazgo |
|---|---|
| Endpoint de creación | `POST /configuracion/umbrales`, `status_code=201` en éxito |
| Endpoint de consulta | `GET /configuracion/umbrales?id_especie={id}` |
| Campos numéricos | `valor_min`, `valor_max` (`Decimal` en DTO y schema de respuesta) |
| Niveles | Obligatorios: exactamente 3 (`normal`, `precaucion`, `critico`) |
| Tabla real para el SELECT | `modulo9.umbrales_ambientales`, columnas `valor_min` y `valor_max` |
| Tipo numérico en el ORM | `mapped_column(Numeric)` — **sin precisión ni escala declaradas** |

**Discrepancia documentada.** RF-17 declara `numeric(5,2)`, pero
`umbral_ambiental_model.py` mapea ambos campos como `Numeric` a secas, mientras
otros modelos del proyecto sí usan `Numeric(5, 2)` explícito (por ejemplo
`configuracion_motor_ia_model.py` y `telemetria_model.py`). El ORM no fija la escala,
así que la escala real solo puede confirmarse contra la metadata del esquema
desplegado. **Esa verificación quedó pendiente de la credencial de PostgreSQL**; la
consulta está implementada (`information_schema.columns`, precisión y escala de las
dos columnas) y se ejecuta automáticamente en cuanto la credencial esté disponible.

Evidencia indirecta disponible sin BD: la API devuelve estos valores como cadenas
con dos decimales (`"0.00"`, `"100.00"`, `"12.00"`), lo que es coherente con una
columna `numeric` de escala 2, pero **no lo demuestra**. No se modificó la BD ni el
requisito.

---

## TC-M09-60 — DESAPROBADO — DEFECTO DEL PRODUCTO — REPORTAR A DESARROLLO

**Verificar precisión y almacenamiento de valores numéricos.**

### Datos dinámicos descubiertos

| Dato | Valor |
|---|---|
| Especie ID / nombre | **10** / Tilapia |
| Especie activa | Sí |
| Variable ID / nombre | **1** / Temperatura del agua |
| Unidad | °C |
| Límites físicos | `[0.00, 45.00]` |
| Combinación libre previa | Sí — la especie 10 no tenía ningún umbral |
| valor_min enviado | **35.50** |
| valor_max enviado | **39.20** |
| Niveles enviados | `35.50–37.00`, `37.00–38.00`, `38.00–39.20` |
| ID creado | **ninguno** |
| Timestamps | 2026-09-06T01:00:05.735Z y 2026-09-06T01:02:16.438Z |

Se conservó la intención del original: variable de **Temperatura** y valores con dos
decimales significativos, `35.50` y `39.20`, dentro del rango físico. Ningún ID fue
fijado en la automatización.

### Payload enviado

```json
{
  "id_especie": 10,
  "id_variable_ambiental": 1,
  "valor_min": 35.50,
  "valor_max": 39.20,
  "niveles": [
    { "nivel": "normal",     "limite_inferior": 35.50, "limite_superior": 37.00 },
    { "nivel": "precaucion", "limite_inferior": 37.00, "limite_superior": 38.00 },
    { "nivel": "critico",    "limite_inferior": 38.00, "limite_superior": 39.20 }
  ]
}
```

Los valores se serializan como literales decimales exactos: el helper QA evita
`json.dumps` sobre `float` precisamente para que el dato que la prueba quiere
demostrar no pase por un binario inexacto antes de salir.

### Resultado obtenido, idéntico en los dos intentos

```json
{
  "error_code": "ERROR_INTERNO",
  "message": "Error inesperado en base de datos",
  "fields": [],
  "timestamp": "2026-09-06T01:02:16.438291+00:00"
}
```

HTTP **500**. Sin ID, sin cuerpo de umbral. GET posterior **200**: la especie 10
sigue con **0 umbrales**, es decir **ninguna persistencia** ni siquiera parcial.

### Presupuesto de intentos

**2 POST, el máximo permitido.** El segundo se autorizó tras comprobar que el
request llegó al servidor, que no hubo persistencia y que el payload era válido. El
runner impide por diseño un tercero: la propia prueba falla con
`Presupuesto agotado` si se intentara. No se creó ningún registro alternativo para
conseguir un PASS verde.

### PRECISIÓN NUMÉRICA

| Campo | Enviado | API GET | PostgreSQL | Coincide |
| --------- | ------: | ------: | ---------: | -------- |
| valor_min | 35.50 | — (no se creó registro) | — (sin registro que consultar) | No evaluable |
| valor_max | 39.20 | — (no se creó registro) | — (sin registro que consultar) | No evaluable |

La comparación está implementada con `decimal.Decimal` y `quantize(Decimal("0.01"))`,
nunca con `float`, y el JSON de respuesta se parsea con `parse_float=Decimal` para
que ningún valor pase por un flotante binario. Se comprobó explícitamente que un
cero final no altera el valor (`Decimal("35.5") == Decimal("35.50")`), de modo que
una serialización JSON sin el cero final no se habría contado como defecto. **Nada
de esto pudo aplicarse a datos reales porque el producto no creó el registro.**

### Pytest

| Python | pytest | Intento | POST | Status | Assertions | Fallidas | Log | XML | JSON |
|---|---|---:|---|---:|---:|---:|---|---|---|
| 3.13.13 | 9.0.3 | 1 | `POST /configuracion/umbrales` | 500 | 9 ejecutadas (4 de BD omitidas) | 7 | `pytest-TC-M09-60-intento1.log` | `pytest-TC-M09-60-intento1.xml` | evidencia en `estado-registro.json` |
| 3.13.13 | 9.0.3 | 2 | `POST /configuracion/umbrales` | 500 | 9 ejecutadas (4 de BD omitidas) | 7 | `pytest-TC-M09-60-intento2.log` | `pytest-TC-M09-60-intento2.xml` | `TC-M09-60-evidencia-intento2.json` |

Las dos assertions que sí pasaron en ambos intentos son las de precondiciones
(datos dinámicos, combinación libre y uso de `Decimal`); las siete restantes fallan
como consecuencia directa del 500. Las cuatro comprobaciones de base de datos
quedaron omitidas con el motivo explícito de la credencial ausente.

### Causa raíz

`Causa raíz no confirmada por QA.` El síntoma demostrado es concreto y reproducible
con la evidencia de este grupo: un payload válido, con combinación libre y datos
descubiertos dinámicamente, produce HTTP 500 sin persistir. G28 no investigó el
origen —no corresponde a su alcance— y no modificó producto, ORM ni base de datos
para averiguarlo. El mensaje del backend menciona la base de datos, pero eso no
demuestra qué componente falló.

---

## TC-M09-61 — APROBADO

**Verificar persistencia de configuración ambiental después de nueva sesión.**

### Registro utilizado

TC-M09-60 no logró crear ningún umbral, así que se aplicó el fallback previsto: se
descubrió por GET una configuración preexistente apta, **sin crear datos nuevos**.

| Dato | Valor |
|---|---|
| Origen | Preexistente descubierto por GET (TC-M09-60 no pudo crear registro) |
| ID utilizado | **#4** |
| Especie | 2 — Trucha Arcoíris (activa) |
| Variable | 1 — Temperatura del agua (°C) |
| valor_min | **0.00** |
| valor_max | **100.00** |
| Estado | Activo |
| Niveles | `12.00–18.00`, `8.00–12.00`, `18.00–25.00` |

Se mantuvo la preferencia por una variable de **Temperatura**. Los valores del
registro son datos preexistentes de TEST; G28 no los modificó.

### PERSISTENCIA ENTRE SESIONES

| Dato | Sesión A | Sesión B | PostgreSQL final | Coincide |
| --------- | -------- | -------- | ---------------- | -------- |
| ID | `#4` | `#4` | no ejecutado (complementario) | **Sí** |
| Variable | Temperatura del agua °C | Temperatura del agua °C | no ejecutado (complementario) | **Sí** |
| valor_min | `0.00` | `0.00` | no ejecutado (complementario) | **Sí** |
| valor_max | `100.00` | `100.00` | no ejecutado (complementario) | **Sí** |
| Estado | Activo | Activo | no ejecutado (complementario) | **Sí** |
| Niveles | `12.00–18.00 / 8.00–12.00 / 18.00–25.00` | idénticos | no ejecutado (complementario) | **Sí** |

La columna de PostgreSQL corresponde a la comprobación complementaria que no se
ejecutó; el motivo y el fundamento del cierre están en **DECISIÓN SOBRE EL CIERRE DE
TC-M09-61**. La coincidencia se establece entre las dos sesiones y contra la
respuesta de la API observada en la sesión B.

El rango visible se comparó como texto de celda (`0.00 – 100.00 °C`), con los dos
decimales presentes en ambas sesiones. No hubo que decidir sobre formato: la UI
muestra los dos decimales tal como los entrega la API.

### Ciclo de sesiones demostrado

1. **Sesión A**: login real contra TEST (`POST /sesiones/` 200), navegación por el
   menú real hasta Configuración → Por especie → Trucha Arcoíris → Umbrales
   Ambientales, y localización de la fila `#4`.
   Captura: `TC-M09-61-sesion-A-configuracion.png`.
2. **Fin de la sesión A**: se usó el **mecanismo real de la interfaz**, el botón
   «Cerrar sesión» de la barra lateral (`nav.ds-sidebar button.ds-sidebar__logout`),
   no una manipulación de tokens. Se verificó el retorno a `/login` con el
   formulario visible. **Solo después** se limpiaron cookies, `localStorage` y
   `sessionStorage`, para que la sesión B no fuera una restauración de la anterior.
3. **Sesión B**: segundo login real (`POST /sesiones/` 200) y nueva navegación
   completa hasta el mismo registro.
   Captura: `TC-M09-61-sesion-B-persistencia.png`.

No se usó `cy.session()` ni ningún mecanismo de caché de sesión: son dos ciclos
`login → logout → login` auténticos. Durante la sesión B **no se ejecutó ninguna
escritura**: solo consulta.

### Verificación por API en la sesión B

El `GET /configuracion/umbrales?id_especie=2` observado con el token de la sesión B
devolvió el registro con los mismos valores:

```json
{
  "id_umbral_ambiental": 4,
  "id_especie": 2,
  "id_variable_ambiental": 1,
  "valor_min": "0.00",
  "valor_max": "100.00",
  "es_activo": true
}
```

La comprobación equivalente desde Pytest (`test_22_api_devuelve_los_mismos_valores`,
marcador `persistencia`) pasó, comparando con `Decimal`.

### Comprobación complementaria disponible

El `SELECT` read-only por ID —`modulo9.umbrales_ambientales` filtrando por
`id_umbral_ambiental = 4`— queda implementado junto con la verificación de sesión
read-only, y se ejecuta automáticamente si en algún momento se define
`G28_DB_PASSWORD`. Añadiría profundidad a la evidencia; no cambia la conclusión del
caso, que ya está demostrada en UI y API.

### Cypress

| Cypress | Browser | Recorrido | Resultado | Login A | Logout | Login B | Registro localizado | Capturas |
|---|---|---|---|---|---|---|---|---:|
| 13.17.0 | Electron 118.0.5993.159 headless | recorrido1 | FAIL (prueba) | 200 | UI real | 200 | Sí, en ambas sesiones | 3 |
| 13.17.0 | Electron 118.0.5993.159 headless | recorrido2 | **PASS** | 200 | UI real | 200 | Sí, en ambas sesiones | 2 |

**Dos recorridos, el máximo permitido. No hubo un tercero.**

Configuración aplicada: `screenshotOnRunFailure: true`, `video: false`,
`retries: 0`, `trashAssetsBeforeRuns: false`, capturas bajo
`RESULTADOS/<G28_RUN_ID>/screenshots/<recorrido>/`. Los `cy.intercept` solo
observaron tráfico; ninguna respuesta fue sustituida. Sin `cy.wait` numéricos, sin
pausas fijas y **sin `force:true`**.

Capturas: [sesión A](screenshots/recorrido2/tc-m09-g28-persistencia.cy.ts/TC-M09-61-sesion-A-configuracion.png) ·
[sesión B](screenshots/recorrido2/tc-m09-g28-persistencia.cy.ts/TC-M09-61-sesion-B-persistencia.png).
Evidencia estructurada: [UI recorrido 2](TC-M09-61-ui-recorrido2.json) ·
[resultado Cypress](cypress-TC-M09-61-recorrido2.json) ·
[registro seleccionado](TC-M09-61-registro-seleccionado.json) ·
[API tras sesión B](TC-M09-61-api-tras-sesion-b.json).

### Por qué falló el primer recorrido — error de prueba, no del producto

El recorrido 1 localizó el registro en **ambas** sesiones y capturó las dos
pantallas; falló al comparar el **texto completo** de la fila:

- Sesión A: `#4 📊Variable #1 0.00 – 100.00 …`
- Sesión B: `#4 📊Temperatura del agua °C 0.00 – 100.00 …`

Los valores funcionales eran idénticos; lo que cambiaba era el rótulo de la
variable. La prueba navegaba esperando únicamente la respuesta de umbrales, y la
tabla puede renderizarse antes de que llegue el catálogo de variables, momento en el
que muestra el marcador `Variable #N`. Es una **carrera de carga entre dos peticiones
y una sincronización insuficiente de la prueba**, no una pérdida de persistencia.

Corrección aplicada solo en archivos QA: se intercepta y se espera también
`GET /configuracion/variables-ambientales`, se exige que la fila muestre el nombre
real antes de capturar, y la comparación entre sesiones pasó a hacerse sobre los
valores funcionales (ID, rango, niveles y estado) en lugar del texto completo. El
recorrido 2 pasó con las dos capturas mostrando el nombre correcto.

**Observación de interfaz, sin severidad asignada por QA:** el marcador `Variable #N`
puede quedar visible mientras el catálogo carga. No afecta a la persistencia ni a los
valores, y no se propone como incidencia; se deja anotado para revisión humana.

---

## DEFECTO DETECTADO

- **ID:** `ID pendiente de asignación según Registro de Errores vigente`
- **Caso:** TC-M09-60 · **RF:** RF-17 · **CU:** CU-03
- **Título:** La creación de un umbral ambiental válido devuelve HTTP 500 y no persiste.
- **Precondiciones verificadas por API:** login 200; permisos del recurso 20 (crear y
  consultar); especie 10 Tilapia activa; variable 1 Temperatura del agua activa,
  °C, límites `[0.00, 45.00]`; combinación (10, 1) libre, comprobada antes del POST.
- **Datos:** `id_especie=10`, `id_variable_ambiental=1`, `valor_min=35.50`,
  `valor_max=39.20`, niveles `35.50–37.00`, `37.00–38.00`, `38.00–39.20`.
- **Pasos:** autenticar como Administrador TEST → consultar permisos y catálogos →
  comprobar combinación libre → `POST /configuracion/umbrales` con esos datos →
  `GET /configuracion/umbrales?id_especie=10`.
- **Endpoint / método:** `POST /configuracion/umbrales` / POST.
- **Esperado:** HTTP 201, ID positivo, valores conservados con dos decimales.
- **Obtenido:** HTTP **500**, `error_code: ERROR_INTERNO`,
  «Error inesperado en base de datos», sin ID.
- **Persistencia:** ninguna. GET posterior 200 con 0 umbrales para la especie 10,
  comprobado tras cada intento.
- **Reproducibilidad:** 2 de 2 intentos, con el mismo payload y el mismo resultado.
- **Evidencias:** `pytest-TC-M09-60-intento1.log/.xml`,
  `pytest-TC-M09-60-intento2.log/.xml`, `TC-M09-60-evidencia-intento2.json`,
  `estado-registro.json`.
- **Clasificación QA:** DESAPROBADO — DEFECTO DEL PRODUCTO.
- **Equipo responsable:** **Desarrollo**.
- **Severidad / tiempo máximo / fecha límite:**
  `Pendiente de validar contra Registro de Errores vigente.`
- **Causa raíz:** no confirmada por QA. No se modificó producto, ORM ni base de datos
  para investigarla.

No se creó ningún ticket en Taiga ni GitHub: la revisión humana decide el registro.

---

## PostgreSQL

- **No se ejecutó ninguna consulta**: no había credencial disponible y la contraseña
  no se inventa ni se codifica en el repositorio. Los tests de base de datos quedaron
  omitidos con ese motivo explícito, visible en los logs y en el XML de JUnit.
- Para TC-M09-60 la consulta habría sido irrelevante de todos modos: no se creó
  registro que consultar. Para TC-M09-61 era la comprobación complementaria descrita
  en **DECISIÓN SOBRE EL CIERRE DE TC-M09-61**.
- La conexión está implementada con
  `options='-c default_transaction_read_only=on -c statement_timeout=15000'`, y la
  propia prueba verifica `current_setting('transaction_read_only') = 'on'` y
  `current_database() = 'sgpmp_test'` antes de leer nada.
- Consultas previstas, todas `SELECT` y por ID exacto:
  - `SELECT id_umbral_ambiental, id_especie, id_variable_ambiental, valor_min, valor_max, es_activo FROM modulo9.umbrales_ambientales WHERE id_umbral_ambiental = %s`
  - `SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema='modulo9' AND table_name='umbrales_ambientales' AND column_name IN ('valor_min','valor_max')`
- **Ninguna sentencia de escritura**, ni migración, ni cambio de esquema.
- No se incluye contraseña ni cadena de conexión en ningún archivo.

## Seguridad

- No se modificó código funcional: ni `src/` del frontend ni `src/` del backend.
- No se instalaron ni actualizaron dependencias. `pytest-html` está presente en el
  entorno pero no se usó ni se instaló nada.
- No se tocó infraestructura: Docker, Dokploy, Nginx, contenedores ni variables de
  despliegue. No se ejecutaron migraciones.
- Sin SQL de escritura. Sin datos eliminados, desactivados ni editados. **No hubo
  limpieza de ningún tipo**: TC-M09-60 no creó registro y TC-M09-61 solo consultó un
  registro preexistente.
- Contraseña y token solo en memoria del proceso. **Incidencia de higiene detectada y
  corregida durante la ejecución**: pytest volcó el valor del fixture de sesión en el
  traceback del intento 1, dejando un JWT en el log y en el XML. Se saneó el
  artefacto y se corrigió la causa —el token es ahora un tipo cuyo `repr` devuelve
  `[JWT REDACTED]`—, de modo que no puede repetirse. El intento 2 se generó ya limpio.
- Escaneo final de secretos sobre los 14 artefactos del run buscando **valores** y no
  vocabulario: JWT, cabecera de autorización con token real, cabecera de cookie,
  tokens en pares clave-valor, cadenas de conexión y el valor concreto de la
  contraseña y el correo TEST. **Sin hallazgos.** Registrado en
  [seguridad-evidencias.json](seguridad-evidencias.json).
- Capturas Cypress con blackout de correo y contraseña; las dos capturas finales solo
  muestran la fila del umbral.
- No hubo `git commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `clean`, `stash`,
  `checkout`, `switch`, creación o borrado de rama, tags ni PR.

## Git final

Frontend (`qa/juan-esteban-m09`, `966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`):
`git diff --stat` vacío — ningún archivo versionado modificado. Lo nuevo son los
archivos QA de este grupo bajo `testing/test_testing/Modulo9/RF-17/TC-M09-G28/`, más
los untracked previos de `TC-M09-G22/` que ya existían al comenzar.

Backend (`qa/juan-esteban-m09`, `adc3932b9f0293a76ebec7e89ed877274791b6a1`):
`git diff --stat` vacío y untracked únicamente de los grupos anteriores. **G28 no
escribió nada en el repositorio de backend.**

No aparecieron cambios funcionales fuera de la carpeta del caso. Detalle en
[git-final.json](git-final.json).

---

## Estado de cierre

G28 queda cerrado y detenido para revisión humana. TC-M09-60 DESAPROBADO por defecto
del producto, a reportar a Desarrollo. TC-M09-61 APROBADO: persistencia entre
sesiones demostrada en UI y API, con la comprobación complementaria de base de datos
documentada como no ejecutada. Decisión general **DESAPROBADO**, con la causa
exclusivamente en TC-M09-60. No se inicia G29.

Pendientes para revisión humana, ninguno bloqueante:

1. Confirmar contra la metadata del esquema desplegado la escala real de
   `valor_min` y `valor_max`, dado que el ORM los declara `Numeric` sin precisión
   mientras RF-17 declara `numeric(5,2)`. La consulta está implementada.
2. La observación de interfaz del marcador `Variable #N` mientras carga el catálogo,
   sin severidad asignada por QA.
