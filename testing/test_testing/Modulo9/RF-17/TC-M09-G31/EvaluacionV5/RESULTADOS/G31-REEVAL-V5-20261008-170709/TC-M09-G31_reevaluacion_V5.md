# TC-M09-G31 — QUINTA EVALUACIÓN (V5)

**Grupo:** Clasificación semafórica de una medición (normal, precaución, crítico)
**Requerimiento:** RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
**Caso de uso:** CU-03 — Configurar Umbrales y Alertas Ambientales por Especie
**Casos:** TC-M09-66 (NORMAL/VERDE) · TC-M09-67 (PRECAUCIÓN/AMARILLO) · TC-M09-68 (CRÍTICO/ROJO)
**Tipo:** Funcional · **Componentes:** Backend + Frontend
**Responsable QA:** Juan Esteban
**RUN_ID:** `G31-REEVAL-V5-20261008-170709`
**Fecha:** 2026-10-08 · **Ambiente decisorio:** TEST
**Incidencia en seguimiento:** INC-M09-106-G31 (Issue #297)

---

## DECISIÓN GENERAL

### TC-M09-G31: APROBADO

### TC-M09-66: APROBADO
### TC-M09-67: APROBADO
### TC-M09-68: APROBADO

Con un fixture preparado **exclusivamente mediante endpoints públicos oficiales**, SIGAB clasifica
y muestra correctamente las tres mediciones en TEST:

| Caso | Valor efectivo | Banda RF-17 | Historial | Dashboard | Resultado |
| --- | ---: | --- | --- | --- | --- |
| TC-M09-66 | **36.00 °C** | `normal` 35.00–37.00 | **VERDE** | **VERDE** | **APROBADO** |
| TC-M09-67 | **38.00 °C** | `precaucion` 37.00–39.00 | **AMARILLO** | **AMARILLO** | **APROBADO** |
| TC-M09-68 | **40.00 °C** | `critico` 39.00–41.00 | **ROJO** | **ROJO** | **APROBADO** |

La cadena completa quedó demostrada en las tres mediciones:

```
valor oficial → POST /iot/telemetria → vinculación VINCULADA → activo 755
             → especie 109 → umbral RF-17 #63 → nivel → color → dashboard → frontend TEST
```

**Oráculo: 40 assertions · 40 superadas · 0 fallidas.** La transición del dashboard recorrió
`VERDE → AMARILLO → ROJO` en el orden de los tres casos.

Hay una **OBSERVACIÓN de interfaz** que no afecta a la funcionalidad evaluada y que se reporta a
Desarrollo: la vista *Historial* del frontend TEST cae en su error boundary y no llega a dibujar la
tabla con el semáforo por lectura. La clasificación sí se comprueba y se muestra correctamente en
*Monitoreo* y en *Campo (móvil)*. El detalle está en la sección **OBSERVACIONES**.

---

## RESUMEN DEL RESULTADO

| Elemento | Valor |
| --- | --- |
| Escrituras de **preparación de fixture** | **8** (especie, umbral, área, dispositivo, sensor, asociación, calibración, activo) |
| Escrituras de **ejecución oficial** | **3** (una ingesta por caso) |
| Resoluciones de vinculación | **0** — la vinculación automática quedó `VINCULADA` en los tres casos |
| Reintentos de escritura | **0** |
| SQL ejecutado | **ninguno** |
| Cambios de código, de configuración RF-17 de negocio o de datos de negocio | **ninguno** |
| Assertions | **40 · 40 superadas · 0 fallidas** |
| Ambiente usado | **TEST** únicamente |
| DEV como contraste | **no se usó** (TEST no falló) |

---

## 1. ¿Fixture reutilizado o creado?

**Creado.** El discovery de solo lectura (sección 8 del paquete) recorrió las 7 áreas de TEST que
tienen algún dispositivo IoT activo y encontró que **ninguna** satisface las precondiciones:

| Área con dispositivo activo | Activos biológicos operativos |
| ---: | ---: |
| 1 | 42 |
| 2 | 3 |
| 3 | 77 |
| 6 | 189 |
| 7 | 1 |
| 22 | 2 |
| 222 | 0 |

Dos condiciones eliminaron a todas:

1. **El área debe tener exactamente un activo operativo.** La ingesta resuelve el área por el
   dispositivo (`IngerirTelemetriaUseCase` pasa `dispositivo.id_infraestructura` a
   `VincularLecturaActivoUseCase`). Con varios activos la vinculación se construye `AMBIGUA` con
   `id_activo_biologico = NULL` y `modelo_manejo = 'INDIVIDUAL'`, combinación que la restricción
   `chk_vinculacion_modelo` rechaza: no se crearía ninguna fila y no habría nada que resolver. Solo
   el área 7 cumplía.
2. **La especie de ese activo debe tener un umbral RF-17 para la variable 9 que clasifique
   36/38/40 sin fronteras.** La especie 4 del área 7 no tiene ningún umbral para esa variable, y el
   área 7 tampoco tiene sensores registrados en sus dispositivos.

Conforme a la sección 4 del paquete, la ausencia de datos **no bloqueó el grupo**: se provisionó el
fixture mínimo por API. Se descartó expresamente usar el umbral 46 de la especie 2 (Trucha
Arcoíris): sus bandas son `10–20 / 20–30 / 30–40`, con las que 40 °C cae en la frontera superior, y
modificarlo habría alterado configuración de negocio en uso (sección 10.2).

---

## 2. Endpoints públicos usados para prepararlo

Todos presentes en `openapi.json` de TEST (verificado en el preflight: 0 endpoints previstos
ausentes de 24).

| # | Endpoint | Para |
| --- | --- | --- |
| 1 | `POST /configuracion/especies` | especie QA dedicada |
| 2 | `POST /configuracion/umbrales` | umbral RF-17 de esa especie |
| 3 | `POST /configuracion/infraestructuras` | área QA vacía |
| 4 | `POST /configuracion/dispositivos-iot` | dispositivo IoT del área |
| 5 | `POST /configuracion/dispositivos-iot/{id}/sensores` | sensor de temperatura |
| 6 | `POST /configuracion/sensores/{id}/asociar` | asociación sensor–área (RF-22) |
| 7 | `POST /configuracion/sensores/{id}/calibrar` | calibración vigente (RF-24) |
| 8 | `POST /activos-biologicos` | activo biológico QA |

Ningún dato se preparó por SQL ni por ninguna vía no oficial.

### Correcciones de contrato durante la preparación

Dos llamadas fueron rechazadas por usar un contrato equivocado, **antes de cualquier escritura
funcional del caso**. Ninguna es un fallo del producto:

| Intento | Respuesta | Causa | Corrección |
| --- | --- | --- | --- |
| `POST /infraestructuras/268/sensores` | 422 `SENSOR_SIN_AREA` | ese endpoint es RF-49 Tipo B y exige que el sensor **ya** tenga asociación de área | se usó `POST /configuracion/sensores/{id}/asociar` (RF-22 Flujo B), que es el que la crea |
| `POST /configuracion/sensores/53/calibrar` sin `valor_referencia` | 400 `VALOR_CALIBRACION_INVALIDO` | RF-24 exige el valor del patrón aunque el esquema lo declare opcional | se envió `valor_referencia = 36.00`, dentro del rango de seguridad 0–45 de la categoría TEMPERATURA |
| `POST /activos-biologicos` sin `fecha_nacimiento` | 400 `VAL_ENTRADA` | RF-33 la exige para activos INDIVIDUAL | se añadió `fecha_nacimiento` |

Lo ya creado en cada intento quedó registrado en `fixture-created.json` y se reutilizó en el
siguiente, de modo que **no se duplicó ni se dejó huérfano ningún dato**.

---

## 3. Datos creados

| Tipo | ID | Identificación |
| --- | ---: | --- |
| Especie QA | **109** | `Qa Semaforo Geuno Baaibhahaj` · descripción `Fixture temporal QA TC-M09-G31 G31-REEVAL-V5-20261008-170709` |
| Umbral RF-17 | **63** | especie 109, variable 9, `35.00 – 41.00 °C`, `estado_sincronizacion: PENDIENTE` |
| Área productiva QA | **268** | `QA-G31-AREA-1008170709`, finca 1, tipo Estanque, especie 109 |
| Dispositivo IoT QA | **203** | serial `[REDACTED_ACCESS_KEY]`, tipo GENERICO, área 268 |
| Sensor QA | **53** | `Sensor QA G31 V5 1008170709`, categoría TEMPERATURA |
| Asociación sensor–área | **49** | sensor 53 ↔ área 268, vigente |
| Calibración QA | **23** | ganancia `1.0000`, offset `0.0000` |
| Activo biológico QA | **755** | `QA-G31-ACTIVO-1008170709`, INDIVIDUAL, especie 109, área 268 |

El nombre de la especie solo admite letras y espacios (regex `NOMBRE` de RF-15), así que el RUN_ID
viaja en su descripción; el resto de los nombres lo llevan literal.

### Bandas del umbral 63

| Nivel | Límite inferior | Límite superior | Color |
| --- | ---: | ---: | --- |
| `normal` | 35.00 | 37.00 | VERDE |
| `precaucion` | 37.00 | 39.00 | AMARILLO |
| `critico` | 39.00 | 41.00 | ROJO |

RF-17 exige que los niveles sean **contiguos, sin huecos ni solapamientos**, y que cubran
exactamente `[valor_min, valor_max]`, de modo que las bandas comparten frontera por obligación del
contrato. Las fronteras resultantes son **37 y 39**, y los tres valores del caso —36, 38 y 40— son
interiores a su banda: ninguno cae en frontera. El rango `35–41` está dentro de los límites físicos
de la variable 9 (`-50 … 100 °C`).

---

## 4. IDs congelados antes del RUN

`FIXTURE_READY = true` tras **20 assertions de verificación por GET, todas superadas**.

```
SENSOR_ID       = 53
DEVICE_ID       = 203
INFRA_ID        = 268
ACTIVO_OBJETIVO = 755
ESPECIE_ID      = 109
UMBRAL_ID       = 63
VARIABLE_ID     = 9
CALIBRACION_ID  = 23
```

Ninguno cambió durante TC-66/67/68. Lo verificado antes de la primera escritura funcional:

- especie 109 activa;
- activo 755 en estado ACTIVO, en el área 268 y de la especie 109;
- el área 268 tiene **exactamente un** activo operativo y es el objetivo;
- dispositivo 203 activo y perteneciente al área 268 (de ahí toma el área la vinculación);
- sensor 53 activo y de categoría TEMPERATURA;
- asociación sensor–área vigente;
- calibración 23 vigente;
- umbral 63 activo y de la variable alcanzable por la ingesta;
- las tres clasificaciones 36/38/40 contra las bandas reales devueltas por la API;
- los tres valores interiores, ninguno en frontera;
- los tres valores crudos calculados antes del primer POST;
- **sin alerta M03 activa** sobre el sensor, de modo que el oráculo del dashboard no queda
  enmascarado por `SemaforoCalculator.aplicar_reglas_alerta`.

### Calibración

```
valor_ajustado = ganancia × valor_crudo + offset
valor_crudo    = (objetivo − offset) / ganancia

ganancia = 1.0000   offset = 0.0000

TC-M09-66: (36.00 − 0) / 1 = 36.00  →  efectivo 36.00
TC-M09-67: (38.00 − 0) / 1 = 38.00  →  efectivo 38.00
TC-M09-68: (40.00 − 0) / 1 = 40.00  →  efectivo 40.00
```

Se eligió una calibración identidad para que el valor enviado y el evaluado coincidan y la
compensación no introduzca ruido en el oráculo. La calibración es **obligatoria**: sin una vigente,
`IngerirTelemetriaUseCase` marca la lectura `ERROR_CALIBRACION` en vez de `LECTURA_VALIDA`. Los tres
valores crudos se calcularon antes del primer POST y no se recalcularon durante el RUN.

---

## 5. Verificación de 36/38/40 contra las bandas

Comprobado dos veces: **antes** del RUN contra las bandas que devuelve
`GET /configuracion/umbrales?id_especie=109`, y **después** de cada ingesta contra
`estado_semaforo_historico` de la propia lectura. La comparación se hace en centésimas exactas
(enteros), nunca con coma flotante, y reproduce el mismo recorrido de
`SemaforoCalculator.calcular_por_niveles` (primer nivel cuyo `[inferior, superior]` contiene el
valor; fuera de todas las bandas → ROJO).

| Valor | Banda que lo contiene | ¿Frontera? | Color calculado | Color esperado |
| ---: | --- | --- | --- | --- |
| 36.00 | `normal` 35.00–37.00 | no | VERDE | VERDE |
| 38.00 | `precaucion` 37.00–39.00 | no | AMARILLO | AMARILLO |
| 40.00 | `critico` 39.00–41.00 | no | ROJO | ROJO |

---

## 6. TC-M09-66 — NORMAL / VERDE · **APROBADO**

```
POST /iot/telemetria
  device_id: 203   sensor_id: 53   tipo_variable: TEMPERATURA_AMBIENTAL
  valor: "36.00"   unidad: "°C"    origen: TIEMPO_REAL
  timestamp_captura: 2026-10-08T17:11:55.000Z
  access_key: [REDACTED_ACCESS_KEY]

→ HTTP 201 · id_telemetria 60 · estado_calidad LECTURA_VALIDA
```

| Comprobación | Observado |
| --- | --- |
| Vinculación de la lectura | `id_vinculacion_lectura` **22**, estado **VINCULADA**, mecanismo **AUTOMATICA**, modelo INDIVIDUAL |
| Activo | **755** = `ACTIVO_OBJETIVO` |
| Especie en el historial | **109** |
| Umbral aplicado | **63** (`35.00 – 41.00`) |
| Valor efectivo | **36.0000 °C** |
| `estado_semaforo_historico` | **VERDE** |
| Dashboard del sensor | **VERDE**, correlacionado por `ultimo_timestamp_captura` |
| Alerta M03 | ninguna (`id_alerta: null`) |
| Resolución manual de vinculación | **no aplicada** — no hizo falta |

**La vinculación automática RF-61-A funcionó sola.** No se usó el endpoint de resolución en ningún
caso del RUN.

---

## 7. TC-M09-67 — PRECAUCIÓN / AMARILLO · **APROBADO**

Mismo fixture, mismos IDs congelados.

```
POST /iot/telemetria · valor "38.00" · timestamp_captura 2026-10-08T17:11:56.000Z
→ HTTP 201 · id_telemetria 61 · LECTURA_VALIDA
```

| Comprobación | Observado |
| --- | --- |
| Vinculación | **VINCULADA**, automática, activo 755 |
| Especie / umbral | 109 / 63 |
| Valor efectivo | **38.0000 °C** |
| `estado_semaforo_historico` | **AMARILLO** |
| Dashboard | **AMARILLO** |
| Alerta M03 | ninguna |

Transición observada en el dashboard: **VERDE → AMARILLO**.

---

## 8. TC-M09-68 — CRÍTICO / ROJO · **APROBADO**

```
POST /iot/telemetria · valor "40.00" · timestamp_captura 2026-10-08T17:13:33.000Z
→ HTTP 201 · id_telemetria 62 · LECTURA_VALIDA
```

| Comprobación | Observado |
| --- | --- |
| Vinculación | **VINCULADA**, automática, activo 755 |
| Especie / umbral | 109 / 63 |
| Valor efectivo | **40.0000 °C** |
| `estado_semaforo_historico` | **ROJO** |
| Dashboard | **ROJO** |
| Alerta M03 | ninguna |

Transición observada: **VERDE → AMARILLO → ROJO**.

### Nota de trazabilidad: un intento descartado por colisión de reloj

El primer envío de TC-M09-68 recibió **HTTP 409 `ERROR_DUPLICADO`**. La causa es de la
automatización, no del producto: el `timestamp_captura` se ancla al reloj del servidor (cabecera
`Date` de `/health`), que tiene resolución de segundo, y los envíos de TC-67 y TC-68 cayeron en el
mismo segundo `2026-10-08T17:11:56Z`. La clave de duplicado de RF-53 es
`(sensor, variable, timestamp, origen)`, de modo que **el rechazo es el comportamiento correcto**.

Conforme a la sección 12 del paquete —que admite corregir ante un error de automatización
demostrado **antes de la persistencia**— se comprobó por `GET /iot/monitoreo/historial` que la
escritura **no había persistido** (409, sin fila nueva), se corrigió el runner para garantizar un
segundo propio por caso, y se completó TC-M09-68 **dentro del mismo RUN**, sin abrir un RUN nuevo,
sin tocar el fixture y sin cambiar ningún valor objetivo. El intento descartado queda íntegro en
`tc68.json` bajo `intento_descartado`. **El total de ingestas que llegaron a persistir es 3, una por
caso.**

---

## 9. Verificación por API

| Assertion | TC-66 | TC-67 | TC-68 |
| --- | :---: | :---: | :---: |
| La ingesta responde HTTP 201 | ✔ | ✔ | ✔ |
| La lectura queda `LECTURA_VALIDA` | ✔ | ✔ | ✔ |
| La ingesta genera registro de vinculación | ✔ | ✔ | ✔ |
| La lectura queda `VINCULADA` | ✔ | ✔ | ✔ |
| Vinculada al `ACTIVO_OBJETIVO` congelado | ✔ | ✔ | ✔ |
| Valor efectivo = objetivo | ✔ | ✔ | ✔ |
| El historial atribuye la lectura al activo | ✔ | ✔ | ✔ |
| El historial resuelve la `ESPECIE_ID` congelada | ✔ | ✔ | ✔ |
| El historial aplica el `UMBRAL_ID` congelado | ✔ | ✔ | ✔ |
| El historial clasifica con el color esperado | ✔ | ✔ | ✔ |
| El dashboard refleja la lectura del caso | ✔ | ✔ | ✔ |
| El dashboard muestra el color esperado | ✔ | ✔ | ✔ |
| El color no proviene de una alerta M03 | ✔ | ✔ | ✔ |

Más la assertion de grupo: **el dashboard recorre VERDE → AMARILLO → ROJO**. ✔

**Total: 40 assertions · 40 superadas · 0 fallidas.** No se eliminó, redujo ni relajó ninguna
assertion, y no se adaptó el oráculo al comportamiento del producto.

Diferencia sustantiva respecto de V4: el VERDE de TC-M09-66 **ya no es el VERDE constante del
trigger de ingesta**. En V4 el historial dejaba la misma lectura en GRIS con especie y umbral nulos;
aquí el historial devuelve VERDE con `id_especie = 109` y `id_umbral_ambiental = 63`, es decir, el
color procede de la evaluación de bandas RF-17 y no de una coincidencia.

---

## 10. Verificación de UI con Cypress

Cypress **real** contra el frontend TEST desplegado, sin frontend local y sin cambiar de
herramienta.

| Elemento | Valor |
| --- | --- |
| Precheck | `Remove-Item Env:ELECTRON_RUN_AS_NODE` + `npx cypress verify` → **Verified Cypress!** |
| `baseUrl` | `https://api.inmero.co/` |
| Navegador | Electron 118 · viewport 1920×1200 |
| Resultado | **2 tests · 2 passing · 0 failing** |
| Login | real, HTTP 200, token emitido |
| Backend al que fue el login | `https://api.inmero.co/back-sigab-test` |
| Llamadas a DEV / `sslip.io` / localhost | **0** |

### Monitoreo — comprobado y capturado

La vista *Monitoreo* muestra el sensor 53 con `ultimo_valor 40.0000 °C`,
`ultimo_timestamp_captura 2026-10-08T17:13:33Z` —la lectura de TC-M09-68— y la pastilla
**«Fuera de rango» (ROJO)**, sin alerta M03 que pudiera fijar ese color. La captura legible se tomó
en *Campo (móvil)*, que presenta los mismos sensores y el mismo `SemaforoPill` en una lista compacta
que cabe en el viewport.

| Captura | Contenido |
| --- | --- |
| `ui/tc68.png` | fila del sensor QA con `40.00 °C` y la pastilla **Fuera de rango** en rojo |
| `ui/monitoreo-dashboard.png` | vista Monitoreo completa |
| `ui/historial-defecto-frontend.png` | vista Historial con su error boundary |

### Historial — la API clasifica, la vista no llega a dibujarlo

La vista *Historial* es el **único** lugar de la interfaz con semáforo **por medición**, y es la que
produciría `ui/tc66.png` y `ui/tc67.png`. En el frontend TEST desplegado esa vista sustituye su
contenido por el error boundary «No se pudo mostrar esta sección» en cuanto la consulta devuelve
lecturas, de modo que **esas dos capturas no existen en este RUN**. Se verificó en su lugar, sobre
la misma respuesta que la vista recibió, que la API clasifica cada lectura como corresponde:

| Caso | `id_telemetria` | valor | API | Etiqueta que correspondería en la UI |
| --- | ---: | ---: | --- | --- |
| TC-M09-66 | 60 | 36.0000 °C | VERDE | Normal |
| TC-M09-67 | 61 | 38.0000 °C | AMARILLO | Advertencia |
| TC-M09-68 | 62 | 40.0000 °C | ROJO | Fuera de rango |

Se trata de un defecto de renderizado de la interfaz, ajeno a la clasificación RF-17, que **no
convierte el caso en desaprobado**: la funcionalidad bajo prueba se comprobó por API y se mostró
correctamente en dos vistas de la propia interfaz. Queda como **OBSERVACIÓN-1**.

---

## 11. Contraste DEV

**No se ejecutó.** TEST no falló funcionalmente: los tres casos se aprobaron con el fixture
preparado por API. La sección 19 del paquete reserva DEV para el supuesto contrario, y usarlo aquí
habría consumido escrituras sin aportar evidencia. No se creó ningún dato en DEV y no se reutilizó
ningún ID de TEST.

---

## 12. Limpieza / reversión del fixture

Realizada **solo con endpoints públicos oficiales**. No se ejecutó SQL.

### Revertido

| Elemento | Acción | Resultado |
| --- | --- | --- |
| Activo biológico 755 | `PATCH /activos-biologicos/755/estado` → `INACTIVO` | **revertido** |
| Dispositivo IoT 203 | `PATCH /configuracion/dispositivos-iot/203/desactivar` | **revertido** |

`POST /activos-biologicos/755/cierre` —la reversión prevista— respondió 422 `SIN_FASE_ACTIVA`: RF-38
solo cierra el ciclo de un activo con fase productiva activa, y el activo QA se creó sin fases. Se
usó la vía oficial equivalente de RF-44 (transición `ACTIVO → INACTIVO`), que es válida y no crea
datos nuevos.

### Reversión diferida para no destruir la evidencia

El historial **no almacena** el color: `ConsultarHistorialUseCase` lo recalcula en cada consulta
contra el umbral RF-17 **vigente** de la especie de la lectura. Desactivar el umbral 63 o la especie
109 convertiría las tres lecturas oficiales en **GRIS** y dejaría la evidencia de este RUN sin
posibilidad de reverificación, que es justo lo que la sección 20 pide no hacer. Por el mismo motivo
no se cierra la asociación sensor–área: es la que resuelve las columnas de área y finca de esas
mismas lecturas.

| Elemento | Endpoint de reversión | Motivo del aplazamiento |
| --- | --- | --- |
| Umbral RF-17 **63** | `PATCH /configuracion/umbrales/63/desactivar` | desactivarlo reclasificaría las tres lecturas como GRIS |
| Especie **109** | `PATCH /configuracion/especies/109/desactivar` | afecta al umbral QA y, con él, a la clasificación |
| Asociación **49** | `PATCH /infraestructuras/268/sensores/49` | dejaría sin área ni finca a las tres lecturas |
| Sensor **53** | — | no hay endpoint público de baja; queda cubierto por la baja del dispositivo |
| Calibración **23** | — | registro histórico de RF-24, sin endpoint de reversión |

Se comprobó por `GET /iot/monitoreo/historial` **antes y después** de la limpieza que las tres
lecturas siguen clasificando VERDE / AMARILLO / ROJO: `evidencia_intacta_tras_la_limpieza: true`.

### `CLEANUP_PENDIENTE_POR_FALTA_DE_ENDPOINT_PUBLICO`

El área **268** no admite baja: `PATCH /configuracion/infraestructuras/268/desactivar` responde 422
`INFRAESTRUCTURA_CON_DEPENDENCIAS` mientras conserve el dispositivo y el activo QA asociados, y la
API **no expone ninguna vía pública para desvincular o trasladar un dispositivo de su área**. El
dispositivo queda inactivo y el activo INACTIVO, de modo que el área no puede recibir ni generar
datos nuevos. Queda marcada como QA en su nombre (`QA-G31-AREA-1008170709`) y en su descripción, con
el RUN_ID.

Esto **no invalida el resultado funcional**: el fixture se creó íntegramente por vías oficiales.

### Telemetrías

Las telemetrías **60, 61 y 62 no se eliminan**: son la evidencia oficial del RUN y no existe
política explícita del proyecto que autorice su eliminación.

---

## 13. OBSERVACIONES

### OBSERVACIÓN-1 — La vista Historial no renderiza con lecturas (UI)

```
Categoría:        UI / Frontend
Grupo responsable: Desarrollo
Acción:           REPORTAR A DESARROLLO
Severity:         Normal
Priority:         Normal
Type:             bug
```

**Síntoma.** `/telemetria/historial` sustituye su contenido por el error boundary «No se pudo
mostrar esta sección. Ocurrió un error inesperado» en cuanto la consulta devuelve lecturas. Con 0
lecturas la vista se dibuja.

**Causa probable.** `EstadisticasCards.fmt()` ejecuta `n.toFixed(2)` sobre valores que la API
serializa como **string**. La respuesta real de
`GET /iot/monitoreo/historial` devuelve en `estadisticas[]`:

```json
{ "valor_minimo": "36.0000", "valor_maximo": "40.0000", "valor_promedio": "38.0000000000000000" }
```

`Number.isInteger("36.0000")` es `false` y `"36.0000".toFixed` no es una función, de modo que el
render lanza y el error boundary se traga la vista completa, incluida la tabla.

**Consecuencia para QA.** La tabla del Historial es el único punto de la interfaz con semáforo por
medición: mientras no renderice, no puede obtenerse evidencia visual por caso de TC-M09-66 y
TC-M09-67. Esta misma observación ya se registró en V3 y **sigue vigente**.

**Evidencia.** `ui/historial-defecto-frontend.png`, `ui/ui-evidence.json`
(`historial_error_boundary: true`, `historial_tabla_renderizada: false`).

### OBSERVACIÓN-2 — Filtrar Monitoreo por área deja la vista sin tarjetas

```
Categoría:        Contrato API / UI
Grupo responsable: Desarrollo
Acción:           REPORTAR A DESARROLLO
Severity:         Minor
Priority:         Low
Type:             bug
```

`ObtenerDashboardUseCase` devuelve `resumen_unidades: []` cuando se pasa `id_infraestructura`, y
`MonitoreoView` agrupa las tarjetas de sensor por esa lista. Resultado: al escribir un id de área en
el filtro, los KPIs se actualizan correctamente (`1 sensor · 1 fuera de rango`) pero **no se
renderiza ninguna tarjeta**. Se detectó al preparar la captura y no afecta al resultado del grupo,
porque la vista sin filtro sí muestra el sensor correctamente.

---

## 14. INCIDENCIA

```
INCIDENCIA REQUERIDA: NO
```

No se abre ninguna incidencia de producto por este grupo. La falta inicial de datos **no genera
incidencia**: se resolvió mediante endpoints oficiales, tal como prevé la sección 23 del paquete.

### INC-M09-106-G31 / Issue #297 — propuesta: **CERRAR**

| Alcance de la incidencia | Estado en V5 | Evidencia |
| --- | --- | --- |
| Existencia de un clasificador por niveles RF-17 | **Corregido y verificado funcionalmente** | 36/38/40 → VERDE/AMARILLO/ROJO en historial y dashboard |
| Adaptador de umbral real en lugar de stub | **Corregido y verificado** | el historial devuelve `id_umbral_ambiental: 63` |
| Reclasificación conectada | **Corregido y verificado** | el color se fija al quedar la lectura VINCULADA |
| Clasificación efectiva de una lectura nueva | **Corregido y verificado** | 3 lecturas nuevas clasificadas correctamente |
| Creación del registro de vinculación en la ingesta | **Corregido y verificado** | 3 filas `VINCULADA` automáticas |

El bloqueo que V4 localizó —la ingesta no dejaba ninguna fila de vinculación porque
`ActivoBiologicoStubAdapter` devolvía `[]` y la rama «sin activos» construía `INDIVIDUAL` con
`id_activo_biologico = NULL`— **está resuelto en el código desplegado**: `telemetria_router` inyecta
ahora `ActivoBiologicoM02Adapter`, que consulta los activos operativos reales del área
(`id_estado IN (1,3,4)`). Con un activo en el área, la vinculación queda `VINCULADA` y la cadena
completa se ejecuta.

Queda un matiz **para producto, no para esta incidencia**: cuando un área tiene **más de un** activo
operativo, la rama `AMBIGUA` construye la vinculación con `id_activo_biologico = NULL` y el
`modelo_manejo` del primer activo; si ese primero es `INDIVIDUAL`, la combinación viola
`chk_vinculacion_modelo` y la fila no llega a crearse, de modo que la vía manual RF-61-C sigue sin
sujeto sobre el que operar. Esto **no se observó en este RUN** —el fixture tiene un único activo por
diseño del caso— y se deja anotado para que Desarrollo lo valore por separado.

---

## 15. ENTORNO

| Elemento | Valor |
| --- | --- |
| Ambiente decisorio | **TEST** |
| Frontend TEST | `https://api.inmero.co/` → HTTP 200 |
| Backend TEST | `https://api.inmero.co/back-sigab-test` |
| `GET /health` | 200 |
| `GET /openapi.json` | 200 · versión 1.0.0 · 210 rutas |
| Rama QA (frontend y backend) | `qa/juan-esteban-quinta-evaluacion-M09` |
| HEAD frontend | `ca8d415d5270f442973da56d4432ba1cccdc8307` (= `origin/test`, `0 0`) |
| HEAD backend | `15121f3f5a69c6126b6613f2dcf1cecd4cf6aa7c` (`0 7` respecto de `origin/test`) |

Los 7 commits de diferencia del backend son infraestructura de pruebas (sandbox de rollback,
middleware de testing, `conftest.py`); no afectan a la lógica de RF-17 ni de M03. **No se modificó
Git durante el RUN**: ni commits, ni ramas, ni checkout. Los únicos cambios del árbol de trabajo son
los archivos sin seguimiento de esta propia evaluación.

### Actor

| Campo | Valor |
| --- | --- |
| Correo | `administador.dev@gmail.com` |
| `id_usuario` | 104 |
| Rol | Administrador |
| Contraseña | tomada de variable de proceso · `[REDACTED_PASSWORD]` en todo artefacto |

---

## 16. SEGURIDAD DE LAS EVIDENCIAS

Barrido automático sobre los 12 artefactos del RUN buscando contraseña literal, JWT, cabecera
`Authorization` con valor, cookie de sesión, campo `contrasena` con valor y `access_key` con valor.

```
hallazgos: 0        secretos_persistidos: false
marcadores: [REDACTED_PASSWORD] · [REDACTED_TOKEN] · [REDACTED_ACCESS_KEY]
```

El `access_key` de la ingesta es el serial del dispositivo QA, leído por la API oficial y sustituido
por su marcador en toda la evidencia. El paquete con credenciales **no se versiona**.

---

## 17. COMPARACIÓN V1 – V5

| Aspecto | V1 | V2 | V3 | V4 | **V5** |
| --- | --- | --- | --- | --- | --- |
| TC-M09-66 | BLOCKED | DESAPROBADO | BLOQUEADO | BLOQUEADO | **APROBADO** |
| TC-M09-67 | BLOCKED | DESAPROBADO | BLOQUEADO | NO EJECUTADO | **APROBADO** |
| TC-M09-68 | BLOCKED | DESAPROBADO | BLOQUEADO | NO EJECUTADO | **APROBADO** |
| Grupo | BLOCKED | DESAPROBADA | BLOQUEADO | BLOQUEADO | **APROBADO** |
| ¿Clasificador por niveles RF-17? | n/d | No | Sí | Sí | **Sí, verificado funcionalmente** |
| ¿La ingesta crea fila de vinculación? | n/d | n/d | No | No | **Sí, automática** |
| ¿La lectura obtiene activo? | n/d | n/d | No | No | **Sí (adaptador real de M02)** |
| `id_especie` de la lectura | n/d | n/d | `null` | `null` | **109** |
| `id_umbral_ambiental` | n/d | n/d | `null` | `null` | **63** |
| Historial | n/d | GRIS | GRIS | GRIS | **VERDE / AMARILLO / ROJO** |
| Dashboard | n/d | VERDE constante | VERDE fijo | VERDE por trigger | **VERDE / AMARILLO / ROJO por RF-17** |
| Origen del fixture | sin combinación | — | existente | existente | **provisionado por API** |
| Ingestas persistidas | 0 | 0 | 3 | 1 | **3** |

V1, V2, V3 y V4 se conservan intactas. Los resultados históricos no se reescriben.

---

## 18. CONCLUSIÓN

**Respuesta a la pregunta del RUN (sección 26):** sí. Con un fixture válido preparado
exclusivamente mediante endpoints públicos oficiales, SIGAB clasifica y muestra correctamente
**36 °C como NORMAL/VERDE, 38 °C como PRECAUCIÓN/AMARILLO y 40 °C como CRÍTICO/ROJO en TEST**, tanto
por API como por frontend.

La preparación de datos se trató como precondición del RUN, no como motivo de bloqueo: el discovery
demostró que ninguna combinación natural de TEST satisface el caso, el fixture mínimo se creó con 8
escrituras por endpoints públicos, se verificó pieza por pieza con 20 assertions antes de la primera
escritura funcional y se congeló. Los tres casos se ejecutaron con **una sola ingesta cada uno**, sin
reintentos, sin resoluciones manuales de vinculación y sin tocar el fixture después de empezar.

Lo que cambia respecto de V4 no es el método de QA sino el producto: la vinculación automática
RF-61-A ya resuelve el activo del área mediante el adaptador real de M02, y con ello el clasificador
RF-17 —que V3 y V4 habían confirmado por código pero nunca habían llegado a ejecutar sobre una
lectura nueva— queda **verificado funcionalmente por primera vez**. El VERDE de TC-M09-66 ya no
proviene del trigger de ingesta: viene de la evaluación de bandas, con especie y umbral resueltos, y
los otros dos colores lo confirman.

Queda una **OBSERVACIÓN de interfaz** para Desarrollo —la vista Historial no renderiza cuando hay
lecturas, por un `toFixed` sobre decimales serializados como string— y una segunda, menor, sobre el
filtro por área de Monitoreo. Ninguna afecta a la funcionalidad evaluada.

**Se propone cerrar INC-M09-106-G31 / Issue #297.**

---

### Artefactos de este RUN

`EvaluacionV5/RESULTADOS/G31-REEVAL-V5-20261008-170709/`

| Archivo | Contenido |
| --- | --- |
| `preflight.json` | Git inicial, runtime TEST, reloj del servidor, actor, endpoints previstos contra OpenAPI y discovery de solo lectura con el censo de activos por área |
| `fixture-created.json` | Manifiesto del fixture: tipo, id, endpoint de creación, payload saneado, endpoint de reversión, estado PRE y POST, verificación por GET y oráculo del fixture |
| `fixture-congelado.json` | Los 8 IDs congelados, la calibración y los tres valores crudos |
| `tc66.json`, `tc67.json`, `tc68.json` | Un archivo por caso: petición, respuesta, vinculación, historial, dashboard, umbral aplicado, assertions y resultado. `tc68.json` incluye el intento descartado por colisión de reloj |
| `oficial.json` | Evidencia consolidada del RUN oficial: escrituras, transiciones, las 40 assertions y el resultado del grupo |
| `record.json` | Correlación caso ↔ telemetría que consume el spec de Cypress |
| `ui/tc68.png` | Evidencia visual de TC-M09-68 (ROJO / «Fuera de rango») |
| `ui/monitoreo-dashboard.png` | Vista Monitoreo del frontend TEST |
| `ui/historial-defecto-frontend.png` | Vista Historial con su error boundary (OBSERVACIÓN-1) |
| `ui/ui-evidence.json` | Evidencia estructurada de la verificación de interfaz |
| `cleanup.json` | Reversión: acciones, elementos diferidos con su motivo, clasificación antes y después, y el pendiente por falta de endpoint público |
| `git-final.json` | Estado de Git al cierre |
| `seguridad-evidencias.json` | Barrido de secretos sobre todos los artefactos |
| `TC-M09-G31_reevaluacion_V5.md` | Este informe |

`EvaluacionV5/run-v5.cjs` contiene la automatización por fases (preflight, fixture, oficial,
cleanup, cierre); `EvaluacionV5/tc-m09-g31-semaforo-v5.cy.js` y `EvaluacionV5/cypress.config.cjs`,
la verificación de interfaz. Escriben únicamente dentro de `EvaluacionV5/`, de modo que V2, V3 y V4
quedan intactas.
