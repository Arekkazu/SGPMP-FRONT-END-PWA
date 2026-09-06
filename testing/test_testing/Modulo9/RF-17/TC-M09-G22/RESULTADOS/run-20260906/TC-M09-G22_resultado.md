# TC-M09-G22 — RESULTADO

## DECISIÓN GENERAL

**DESAPROBADO**

Los cuatro originales se ejecutaron íntegramente contra el TEST actual, con datos
descubiertos en esta misma ejecución. Ninguna configuración ambiental válida pudo
crearse: los ocho POST devolvieron **HTTP 500 `ERROR_INTERNO`** y no persistió nada.
No hay bloqueo: TEST estaba accesible, las cuatro variables exigidas existen y
estaban activas, y todas las combinaciones estaban libres antes de cada intento.

| Caso | Resultado | Motivo | ¿Reportar a Desarrollo? |
| --------- | -------------------------------- | ------ | ----------------------- |
| TC-M09-46 | DESAPROBADO — DEFECTO DEL PRODUCTO | Configuración base válida para especie activa (Cachama Blanca + Temperatura Ambiental, `-5.00 – 55.00`): HTTP 500 `ERROR_INTERNO` en los dos intentos, sin ID y sin persistencia | **Sí** |
| TC-M09-47 | DESAPROBADO — DEFECTO DEL PRODUCTO | Temperatura con los valores del ejemplo académico (`35.50 – 39.20`), dentro de los límites físicos reales: HTTP 500 en los dos intentos, sin persistencia | **Sí** |
| TC-M09-48 | DESAPROBADO — DEFECTO DEL PRODUCTO | Humedad Relativa (`30.00 – 70.00`, físico 0–100 %): HTTP 500 en los dos intentos, sin persistencia | **Sí** |
| TC-M09-49 | DESAPROBADO — DEFECTO DEL PRODUCTO | pH del agua (`6.50 – 8.00`, dentro de 0–14 y del rango físico real): HTTP 500 en los dos intentos, sin persistencia | **Sí** |

Responsable: Juan Esteban. M09 / RF-17 / CU-03 (trazabilidad de los originales:
CU-07). Prioridad alta. Tipo: funcional. Herramienta API: Newman; evidencia visual:
Cypress. Actor: Administrador. G23, G24 y G25 no se ejecutaron ni se iniciaron.

**Esta es una ejecución nueva y completa.** No se reutilizó ningún payload, ID,
conclusión ni explicación causal de la ejecución histórica de G22; de hecho la
carpeta del grupo estaba vacía al comenzar y toda la automatización se escribió de
cero. El veredicto de arriba se sostiene únicamente en la evidencia obtenida hoy.

---

## ORIGEN DE LOS FALLOS

Los cuatro originales comparten el mismo origen y el mismo síntoma.

### TC-M09-46 · TC-M09-47 · TC-M09-48 · TC-M09-49

`Producto:` **Sí**

`Automatización/prueba:` **No**

`Entorno:` **No**

`Bloqueo:` **No**

`Acción:` **REPORTAR A DESARROLLO**

En cada caso, **todas las assertions de precondición pasaron** antes de que fallaran
las de creación: la especie estaba activa, la variable pertenecía al catálogo activo,
la combinación estaba libre inmediatamente antes del POST, `valor_min < valor_max`,
el rango cabía dentro de los límites físicos reales publicados por el catálogo y los
tres niveles obligatorios eran contiguos, sin solapamiento y cubrían exactamente el
rango padre. Las únicas assertions fallidas son consecuencia directa del 500.

No es un problema de entorno: el preflight del frontend, `/health` y `/openapi.json`
respondieron 200 antes de cada ejecución, el login fue real y todos los GET
posteriores devolvieron 200. La API responde con normalidad a las lecturas; lo que
falla es la creación.

---

## Entorno

- Fecha: 2026-09-06 UTC. POST entre 07:05 y 07:12 aproximadamente; los JSON conservan
  los timestamps exactos que devolvió el servidor.
- Frontend TEST: `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`
- Backend TEST: `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`
- Rama frontend: `qa/juan-esteban-m09` · SHA local `966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`
- Rama backend: `qa/juan-esteban-m09` · SHA local `adc3932b9f0293a76ebec7e89ed877274791b6a1`
- **SHA desplegado en TEST no confirmado.** Los SHA anteriores corresponden a los
  repositorios locales inspeccionados; no existe evidencia de que Dokploy esté
  ejecutando exactamente esos commits.
- Dependencias verificadas, ninguna instalada ni modificada: Newman **6.2.2**,
  `newman-reporter-htmlextra` **1.23.1**, Cypress **13.17.0**.
- Estado inicial de la carpeta del grupo: **vacía**. El contenido de la ejecución
  histórica ya no estaba en el árbol de trabajo, y el archivo versionado
  `TC-M09-G22/.gitkeep` figura como eliminado desde antes de empezar. No se restauró
  ni se revirtió nada; se documenta más abajo.

## Revisión del contrato

Revisión enfocada y de solo lectura, una sola vez antes del primer POST, reutilizada
después para los cuatro originales.

| Punto | Hallazgo |
|---|---|
| Endpoint de creación | `POST /configuracion/umbrales` |
| Método y éxito | POST; el `openapi.json` desplegado declara **201** como única respuesta 2xx, verificado en el preflight de cada ejecución |
| Campos obligatorios | `id_especie`, `id_variable_ambiental`, `valor_min`, `valor_max`, `niveles` |
| Tipo numérico | `Decimal`; la API devuelve los valores como cadenas con dos decimales |
| Niveles | **Obligatorios**: exactamente 3 (`normal`, `precaucion`, `critico`), cada uno con `limite_inferior < limite_superior`, contiguos y cubriendo el rango padre |
| Estructura de respuesta | `UmbralAmbientalResponse`: `id_umbral_ambiental`, `id_especie`, `id_variable_ambiental`, `valor_min`, `valor_max`, `es_activo`, `niveles` |
| GET de persistencia | `GET /configuracion/umbrales?id_especie={id}`; incluye activos e inactivos |
| Duplicados | Unicidad por `(especie, variable)`; el conflicto se emite como 409 `UMBRAL_DUPLICADO` |
| Especies activas | `GET /configuracion/especies` con `es_activo` |
| Variables activas | `GET /configuracion/variables-ambientales` publica únicamente las activas |
| Límites físicos | `valor_fisico_min` / `valor_fisico_max` de ese mismo catálogo |

La assertion de éxito se fijó en **201** solo después de comprobarlo contra el
OpenAPI desplegado. El runner aborta antes de enviar nada si el contrato dejara de
declarar 201, para no consumir un intento con una expectativa desactualizada.

## Datos dinámicos utilizados

Descubiertos en esta ejecución, sin asumir ningún ID. La disponibilidad se
**reevaluó por GET inmediatamente antes de cada original**, no con un único snapshot.

| Dato | TC-M09-46 | TC-M09-47 | TC-M09-48 | TC-M09-49 |
|---|---|---|---|---|
| Especie ID / nombre | 4 / Cachama Blanca | 4 / Cachama Blanca | 4 / Cachama Blanca | 4 / Cachama Blanca |
| Especie activa | Sí | Sí | Sí | Sí |
| Variable ID / nombre | 9 / Temperatura Ambiental | 9 / Temperatura Ambiental | 10 / Humedad Relativa | 2 / pH del agua |
| Unidad | °C | °C | % | pH |
| Variable activa | Sí | Sí | Sí | Sí |
| Límite físico min | −50 | −50 | 0 | 0 |
| Límite físico max | 100 | 100 | 100 | 14 |
| Rango elegido | `-5.00 – 55.00` | `35.50 – 39.20` | `30.00 – 70.00` | `6.50 – 8.00` |
| Niveles enviados | −5/15/35/55 | 35.50/36.70/37.90/39.20 | 30.00/43.33/56.66/70.00 | 6.50/7.00/7.50/8.00 |
| Combinación libre antes del POST | Sí | Sí | Sí | Sí |
| ID creado | **ninguno** | **ninguno** | **ninguno** | **ninguno** |

**Adaptaciones respecto al ejemplo académico**, todas documentadas:

- No existe una especie «Bovino» en el catálogo de TEST; se usó una especie activa
  real. El catálogo es acuícola (Cachama Blanca, Camarón Blanco, Mojarra Plateada,
  Tilapia, Trucha Arcoíris).
- TC-M09-47 sí pudo usar los valores académicos `35.50 – 39.20`, porque caben en los
  límites físicos reales de la variable de Temperatura seleccionada.
- TC-M09-49 sí pudo usar `6.50 – 8.00`, dentro de la escala 0–14 y del rango físico
  real del catálogo.
- TC-M09-46 y TC-M09-48 usan intervalos interiores derivados del rango físico real,
  porque su enunciado pide «valores válidos» y no fija cifras.
- El rango físico de Humedad resultó ser `0–100 %`, comprobado en el catálogo y no
  supuesto.

**Sobre la coincidencia de combinación entre TC-46 y TC-47:** ambos acabaron usando
Cachama Blanca + Temperatura Ambiental. No se provocó ningún duplicado artificial:
como TC-46 **no llegó a crear ningún registro**, la combinación seguía libre, y el
GET previo a TC-47 lo confirmó devolviendo 0 registros para esa variable. Si TC-46
hubiera persistido, el descubrimiento habría seleccionado otra combinación libre.
Los dos casos se distinguen además por el rango: interior en TC-46 y el del ejemplo
académico en TC-47.

---

## Resultado obtenido, idéntico en los ocho POST

```json
{
  "error_code": "ERROR_INTERNO",
  "message": "Error inesperado en base de datos",
  "fields": [],
  "timestamp": "2026-09-06T07:05:50.326127+00:00"
}
```

HTTP **500**. Sin `id_umbral_ambiental`, sin cuerpo de umbral y sin estado de éxito.
La respuesta viene del servidor con su propio `timestamp`, de modo que la petición
llegó al backend y fue procesada allí.

`GET /configuracion/umbrales?id_especie=4` posterior a cada intento: **200**, total 2,
IDs `[10, 11]` —los preexistentes— y **0 registros** para la variable probada.

## Newman

| Newman | Reporter | Caso | Intento | POST | Status | Error code | Assertions | Fallidas | Persistencia | HTML | JSON |
|---|---|---|---:|---|---:|---|---:|---:|---|---|---|
| 6.2.2 | htmlextra 1.23.1 | TC-M09-46 | 1 | `POST /configuracion/umbrales` | 500 | `ERROR_INTERNO` | 21 | 11 | Ninguna | `newman/newman-TC-M09-46-intento1.html` | `newman-TC-M09-46-intento1.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-46 | 2 | idem | 500 | `ERROR_INTERNO` | 21 | 11 | Ninguna | `newman/newman-TC-M09-46-intento2.html` | `newman-TC-M09-46-intento2.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-47 | 1 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-47-intento1.html` | `newman-TC-M09-47-intento1.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-47 | 2 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-47-intento2.html` | `newman-TC-M09-47-intento2.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-48 | 1 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-48-intento1.html` | `newman-TC-M09-48-intento1.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-48 | 2 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-48-intento2.html` | `newman-TC-M09-48-intento2.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-49 | 1 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-49-intento1.html` | `newman-TC-M09-49-intento1.json` |
| 6.2.2 | htmlextra 1.23.1 | TC-M09-49 | 2 | idem | 500 | `ERROR_INTERNO` | 22 | 11 | Ninguna | `newman/newman-TC-M09-49-intento2.html` | `newman-TC-M09-49-intento2.json` |

**8 POST en total: exactamente 2 por original, el máximo permitido. Nunca un tercero.**
El runner lo impide por diseño, y también impide reintentar un PASS o repetir un POST
sobre una combinación que ya hubiera persistido. Cada invocación ejecuta un único
original mediante `G22_CASE`. En cada caso, **10 u 11 assertions pasaron**: son las de
precondición y aislamiento, que demuestran que la prueba estaba bien construida.

Uso del segundo intento, justificado caso por caso antes de consumirlo: se comprobó
que la petición llegó al servidor, que la respuesta era un 500 de servidor, que el
payload seguía siendo válido, que la combinación seguía libre y que **no había
persistencia** del primer intento. No se alteraron los datos para esconder el fallo.

## Cypress

| Cypress | Browser | Caso | Recorrido | Resultado | POST de umbral emitidos | Capturas |
|---|---|---|---|---|---:|---:|
| 13.17.0 | Electron 118.0.5993.159 headless | TC-M09-46 | recorrido1 | PASS | **0** | 2 |
| 13.17.0 | Electron 118.0.5993.159 headless | TC-M09-47 | recorrido1 | PASS | **0** | 2 |
| 13.17.0 | Electron 118.0.5993.159 headless | TC-M09-48 | recorrido1 | PASS | **0** | 2 |
| 13.17.0 | Electron 118.0.5993.159 headless | TC-M09-49 | recorrido1 | PASS | **0** | 2 |

**Un recorrido por original, ninguno repetido.** Configuración aplicada:
`screenshotOnRunFailure: true`, `video: false`, `retries: 0`,
`trashAssetsBeforeRuns: false`, capturas bajo
`RESULTADOS/<G22_RUN_ID>/screenshots/<caso>/<recorrido>/`.

Como Newman no creó ningún registro, **Cypress no se convirtió en un intento
funcional adicional**: no emitió ningún POST de umbral —comprobado con un interceptor
observacional que cuenta las peticiones— y se limitó a documentar el estado
observable. Login real, navegación por el menú real hasta Configuración → Por especie
→ Cachama Blanca → Umbrales Ambientales, y verificación de que la tabla **no**
contiene la variable de cada caso. Los `cy.intercept` solo observan; ninguna respuesta
fue sustituida. Sin `cy.wait` numéricos, sin pausas fijas y sin `force:true`.

Registro localizado: ninguno, coherente con la ausencia de persistencia. Valores
visualizados: la especie conserva sus dos umbrales preexistentes (#10 y #11) y ninguno
de los cuatro nuevos aparece.

**No se observó el defecto visual `INC-M09-26-G23`** en estos recorridos, porque no
fue necesario abrir el modal de «Nuevo umbral ambiental»: Cypress no crea registros en
G22. Esta ejecución, por tanto, no aporta evidencia nueva sobre ese defecto visual, ni
a favor ni en contra.

## Persistencia

| Momento | Especie 4 — total | IDs | Registros de la variable probada |
|---|---:|---|---:|
| Antes de cada uno de los 8 POST | 2 | `[10, 11]` | 0 |
| Después de cada uno de los 8 POST | 2 | `[10, 11]` | 0 |
| Verificación final de cierre | 2 | `[10, 11]` | 0 |

Inventario completo al cierre: **13 umbrales en todo TEST**, repartidos como estaban
(especie 4: 2 · especie 3: 3 · especie 5: 2 · especie 1: 3 · especie 2: 3 · especies
10 y 11: 0). **G22 no creó, no eliminó y no modificó ningún registro.** No hubo nada
que conservar como evidencia de creación, y por tanto tampoco hubo cleanup que hacer.

---

## DEFECTO DETECTADO — DEBE REGISTRARSE COMO INCIDENCIA NUEVA

**Este hallazgo requiere crear una incidencia nueva en el Registro de Errores
vigente.** No es un duplicado ni la ampliación de un registro anterior: la ejecución
histórica de G22 fue eliminada, de modo que no existe ninguna incidencia previa viva
a la que asociar esta evidencia. Todo lo que sigue procede de la ejecución de hoy y
sostiene por sí solo el alta del defecto.

Los cuatro originales exhiben el mismo síntoma y la misma respuesta, así que la
incidencia nueva se describe **una sola vez**, cubriendo los cuatro casos con la
evidencia de los ocho intentos.

- **ID:** `ID pendiente de asignación según Registro de Errores`
- **Caso:** TC-M09-46, TC-M09-47, TC-M09-48 y TC-M09-49 · **RF:** RF-17 · **CU:** CU-03
- **Título provisional:** La creación de una configuración ambiental válida devuelve
  HTTP 500 y no persiste, para cualquier especie activa y variable del catálogo.
- **Precondiciones verificadas por API en cada caso:** login 200 como Administrador;
  permisos del recurso 20 (crear y consultar); especie 4 Cachama Blanca activa;
  variable del catálogo activo con sus límites físicos; combinación `(especie,
  variable)` libre, comprobada por GET inmediatamente antes del POST.
- **Datos reales:** los de la tabla de datos dinámicos.
- **Pasos:** autenticar como Administrador → consultar permisos, especies, variables y
  umbrales → comprobar que la combinación está libre → `POST /configuracion/umbrales`
  con un payload válido de tres niveles contiguos → `GET
  /configuracion/umbrales?id_especie=4`.
- **Endpoint / método:** `POST /configuracion/umbrales` / POST.
- **Esperado:** HTTP 201, ID positivo, asociación correcta, valores y niveles
  conservados, registro presente exactamente una vez en el GET posterior.
- **Obtenido:** HTTP **500**, `error_code: ERROR_INTERNO`, «Error inesperado en base
  de datos», sin ID.
- **Respuesta sanitizada:** la mostrada más arriba.
- **Persistencia:** **ninguna**, verificada por GET tras cada uno de los ocho intentos
  y en la comprobación final de cierre.
- **Reproducibilidad:** **8 de 8 intentos**, en cuatro combinaciones distintas de
  variable (Temperatura Ambiental, Humedad Relativa y pH del agua) y con cuatro rangos
  distintos, incluidos valores positivos y negativos. No depende de la variable ni de
  los valores concretos.
- **Intento 1 e intento 2:** idénticos en los cuatro casos; el detalle por intento está
  en la tabla de Newman.
- **Evidencia Newman:** los ocho HTML de htmlextra y sus ocho JSON sanitizados.
- **Evidencia Cypress:** cuatro recorridos con capturas que muestran que el registro no
  aparece en la interfaz, sin que Cypress emitiera ningún POST.
- **Origen:** producto. La prueba está demostrada correcta por las assertions de
  precondición, que pasan en los ocho intentos.
- **Equipo responsable:** **Desarrollo**.
- **Severidad:** `pendiente de validar contra Registro de Errores vigente`
- **Tiempo máximo:** `pendiente de validar contra Registro de Errores vigente`

### Causa raíz

`Causa raíz no confirmada por QA.`

Lo demostrado es el **síntoma**: un POST válido devuelve 500 y no persiste. El mensaje
del backend menciona la base de datos, pero eso no identifica qué componente falló y
no se investigó: G22 no modificó producto, ORM, esquema ni infraestructura, y no se
consultó PostgreSQL. Tampoco se reutilizó ninguna hipótesis causal de la ejecución
histórica del grupo. Cualquier atribución de causa corresponde a Desarrollo.

Dato acotado que sí aporta esta ejecución, por si resulta útil al diagnóstico: el
fallo es independiente de la variable, del rango y del signo de los valores, y ocurre
antes de que se cree cualquier fila visible por la API.

### Registro de la incidencia

La incidencia **debe darse de alta** con el contenido de esta sección. QA no la creó
directamente: no se abrió ningún GitHub Issue, ticket de Taiga ni PR, y el consecutivo
no se inventa. Corresponde a la revisión humana asignar el ID contra el Registro de
Errores vigente y crear el registro.

`ID pendiente de asignación según Registro de Errores` · `Equipo responsable:
Desarrollo` · `Acción: REPORTAR A DESARROLLO`

## Criterio aplicado antes de atribuir el defecto a Desarrollo

1. ¿Especie válida y activa? **Sí**, verificado en el catálogo y en el cierre.
2. ¿Variable válida y activa? **Sí**, publicada por el catálogo de activas.
3. ¿Combinación libre? **Sí**, por GET inmediatamente antes de cada POST.
4. ¿`valor_min < valor_max`? **Sí** en los cuatro casos.
5. ¿Dentro de límites físicos? **Sí**, contra los límites reales del catálogo.
6. ¿Payload conforme al DTO? **Sí**, incluidos los tres niveles obligatorios.
7. ¿Campos obligatorios presentes? **Sí**.
8. ¿Niveles válidos? **Sí**: contiguos, sin solapamiento y cubriendo el rango padre.
9. ¿Expectativa HTTP acorde al contrato? **Sí**, 201 confirmado en el OpenAPI
   desplegado antes de enviar.
10. ¿La petición llegó al servidor? **Sí**, respuesta con `timestamp` del backend.
11. ¿Falló también en el reintento permitido? **Sí**, en los cuatro originales.
12. ¿Existe persistencia? **No**, en ninguno de los ocho intentos.

## Seguridad

- No se almacenó la contraseña, ni Authorization, ni JWT, ni refresh token, ni
  cookies, ni credenciales de base de datos, ni cadenas de conexión. Las credenciales
  vivieron solo en memoria del proceso, vía `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD`.
- Reporter configurado con `omitHeaders`, `showEnvironmentData: false`,
  `showGlobalData: false` y `skipEnvironmentVars: ['token']`, más sanitización
  posterior de todo HTML y JSON escrito.
- Capturas Cypress con blackout de correo y contraseña.
- Escaneo final sobre los **34 artefactos** del run buscando valores de secreto: JWT,
  cabecera de autorización con token, cabecera de cookie, tokens y credenciales en
  pares clave-valor y cadenas de conexión. **Sin hallazgos.** Registrado en
  [seguridad-evidencias.json](seguridad-evidencias.json).
- **No se usó PostgreSQL, ni siquiera `SELECT`**: la API resolvió catálogo, límites,
  disponibilidad y persistencia. Ningún SQL de escritura.

## Confirmaciones finales

- No se modificó código funcional: ni `src/` del backend ni `src/` del frontend, ni
  routers, DTO, schemas, modelos, repositorios, servicios, casos de uso, migraciones o
  seeds. Solo se leyeron para revisar el contrato.
- No se instalaron ni actualizaron dependencias.
- No se modificó Docker, Dokploy, Nginx, workflows, CI/CD ni variables de despliegue.
- Sin SQL de escritura. Sin registros eliminados, desactivados ni modificados. Sin
  cleanup de ningún tipo.
- No hubo `git commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `clean`, `stash`,
  `checkout`, `switch`, creación o borrado de rama, tags ni PR.
- G23 no ejecutado. G24 no ejecutado. G25 no iniciado.

## Git final

Frontend (`qa/juan-esteban-m09`, `966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`): los
únicos archivos nuevos están dentro de
`testing/test_testing/Modulo9/RF-17/TC-M09-G22/`. El resto de untracked pertenece a
grupos anteriores y ya existía al comenzar.

`git diff --stat` del frontend **no está vacío**: figuran como **eliminados** dos
archivos versionados, ambos marcadores de carpeta vacía:

```text
 testing/test_testing/Modulo9/RF-17/TC-M09-G22/.gitkeep | 0
 testing/test_testing/Modulo9/RF-17/TC-M09-G31/.gitkeep | 0
 2 files changed, 0 insertions(+), 0 deletions(-)
```

Ambas eliminaciones son **anteriores a esta ejecución**: la de G22 se observó ya
durante el cierre de TC-M09-G75 y coincide con el vaciado de la carpeta del grupo para
poder rehacerlo desde cero. **La de TC-M09-G31 es ajena a G22**: este grupo no tocó
esa ruta en ningún momento. Conforme a las reglas de Git de solo lectura, **no se
restauró ni se revirtió ninguna de las dos**; se documentan para revisión humana.

El efecto del `.gitkeep` de G22 es nulo: solo servía para conservar la carpeta vacía
en Git y la carpeta vuelve a tener contenido. El de G31 queda pendiente de que alguien
decida si esa carpeta debe seguir existiendo vacía.

Backend (`qa/juan-esteban-m09`, `adc3932b9f0293a76ebec7e89ed877274791b6a1`):
`git diff --stat` vacío. **G22 no escribió nada en el repositorio de backend.**

Detalle en [git-final.json](git-final.json).

---

## Estado de cierre

G22 queda ejecutado por completo y detenido para revisión humana. Los cuatro
originales fueron ejecutados, ninguno quedó bloqueado y los cuatro quedan
**DESAPROBADOS — DEFECTO DEL PRODUCTO — REPORTAR A DESARROLLO**. Decisión general
**DESAPROBADO**.

**Acción pendiente para la revisión humana: dar de alta la incidencia nueva** descrita
en la sección de defecto, asignándole el ID que corresponda según el Registro de
Errores vigente. Al haberse eliminado la ejecución histórica de G22, este defecto no
cuenta con ningún registro previo y debe abrirse desde cero.

No se avanza a G23, G24, G25 ni ningún otro grupo.
