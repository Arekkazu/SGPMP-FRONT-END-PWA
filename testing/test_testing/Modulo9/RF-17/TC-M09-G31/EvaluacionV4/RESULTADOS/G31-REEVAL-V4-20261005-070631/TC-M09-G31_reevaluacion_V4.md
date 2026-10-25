# TC-M09-G31 — CUARTA EVALUACIÓN (V4)

**Grupo:** Clasificación semafórica de una medición (normal, precaución, crítico)
**Requerimiento:** RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
**Caso de uso:** CU-03 — Configurar Umbrales y Alertas Ambientales por Especie
**Casos:** TC-M09-66 (NORMAL/VERDE) · TC-M09-67 (PRECAUCIÓN/AMARILLO) · TC-M09-68 (CRÍTICO/ROJO)
**Responsable QA:** Juan Esteban
**RUN_ID:** `G31-REEVAL-V4-20261005-070631`
**Fecha:** 2026-10-05 · **Ambiente decisorio:** TEST
**Incidencia en seguimiento:** INC-M09-106-G31 (Issue #297)

---

## DECISIÓN GENERAL

### TC-M09-G31: BLOQUEADO / NO VERIFICABLE

### TC-M09-66: BLOQUEADO / NO VERIFICABLE
### TC-M09-67: NO EJECUTADO
### TC-M09-68: NO EJECUTADO

La medición de TC-M09-66 se ingirió correctamente —HTTP 201, telemetría **56**, valor efectivo
**15.00 °C**, dentro de la banda NORMAL del umbral RF-17 #46—, pero **la ingesta no generó ningún
registro de vinculación lectura → activo**: `GET /iot/vinculaciones?id_telemetria=56` devuelve
`total: 0`, sin filas en ningún estado, ni `SIN_VINCULAR` ni `AMBIGUA`.

Sin fila de vinculación **no hay nada que resolver ni corregir**, de modo que la vía funcional
oficial que esta reevaluación tenía autorizada —`PATCH /iot/vinculaciones/{id}/resolver` y
`POST /iot/vinculaciones/{id}/corregir`— no es aplicable. Sin activo no hay especie, sin especie no
hay umbral RF-17 y el clasificador `ReclasificarSemaforoUseCase` nunca llega a ejecutarse.

Conforme a la regla de parada del paquete, **el RUN se detuvo en TC-M09-66** y no se enviaron las
mediciones de TC-M09-67 ni TC-M09-68, para no repetir tres veces la misma causa.

| Caso | Resultado V4 | Motivo |
| --- | --- | --- |
| TC-M09-66 | **BLOQUEADO / NO VERIFICABLE** | La lectura ingerida no generó registro de vinculación; el clasificador RF-17 no se alcanza |
| TC-M09-67 | **NO EJECUTADO** | RUN detenido en TC-M09-66 |
| TC-M09-68 | **NO EJECUTADO** | RUN detenido en TC-M09-66 |
| **Grupo TC-M09-G31** | **BLOQUEADO / NO VERIFICABLE** | La precondición lectura → activo sigue sin poder satisfacerse para lecturas nuevas |

**Advertencia importante sobre el color del dashboard.** Después de la parada, el dashboard del
sensor 1 muestra **VERDE** para esta misma lectura, que es justamente el color que TC-M09-66
espera. **Ese VERDE no aprueba el caso.** Lo fija el trigger de ingesta
`fn_actualizar_estado_sensor`, no la clasificación RF-17: en el historial la misma lectura aparece
con `estado_semaforo_historico = GRIS`, `id_especie = null` e `id_umbral_ambiental = null`. Es una
coincidencia accidental, y el criterio del caso prohíbe expresamente aceptarla.

---

## RESUMEN DEL RESULTADO

**Escrituras funcionales: 1** (una sola ingesta de telemetría). 0 escrituras de vinculación —no
hubo fila sobre la que actuar—, 0 SQL de escritura, 0 cambios de código, 0 cambios de
configuración RF-17, 0 reintentos.

| Elemento | Resultado |
| --- | --- |
| Ingesta TC-M09-66 | HTTP **201**, `id_telemetria` **56**, `estado_calidad` `LECTURA_VALIDA` |
| Valor efectivo alcanzado | **15.00 °C** (crudo `-10.50` compensando la calibración vigente) |
| Banda RF-17 correspondiente | NORMAL `10.00 – 20.00` → el valor es interior, no frontera |
| Registro de vinculación de la lectura | **ninguno** (`total: 0`) |
| Acción resolver / corregir | **no aplicable**: no existe fila |
| `id_activo_biologico` en el historial | `null` |
| `id_especie` en el historial | `null` |
| `id_umbral_ambiental` en el historial | `null` |
| Clasificación en el historial | **GRIS** |
| Clasificación en el dashboard | VERDE, por el trigger de ingesta, no por RF-17 |
| Alerta M03 sobre el sensor | ninguna (`id_alerta: null`, `alertas_activas_count: 0`) |
| Verificación UI | no realizada: no hubo clasificación RF-17 que representar |
| Assertions ejecutadas | **3** · superadas **2** · fallidas **1** |

La única assertion fallida es precisamente la que define el bloqueo: «la ingesta genera un registro
de vinculación para la lectura».

---

## ANTECEDENTES

| Evaluación | RUN / evidencia | Ambiente | TC-66 | TC-67 | TC-68 | Causa |
| --- | --- | --- | --- | --- | --- | --- |
| **V1** | `RESULTADOS/run-20260906-071500/` | TEST | BLOCKED | BLOCKED | BLOCKED | No existía una combinación demostrable especie–activo–sensor–variable para una ingesta RF-17 válida |
| **V2** | `EvaluacionV2/RESULTADOS/G31-REEVAL-V2-20260913-103722/` | TEST (contrastado en DEV) | DESAPROBADO | DESAPROBADO | DESAPROBADO | No existía clasificador por niveles RF-17: la ingesta fijaba VERDE constante y el historial salía GRIS por un adaptador de umbral que devolvía `None` |
| **V3** | `EvaluacionV3/RESULTADOS/G31-REEVAL-V3-20260927-051628/` | TEST | BLOQUEADO / NO VERIFICABLE | BLOQUEADO / NO VERIFICABLE | BLOQUEADO / NO VERIFICABLE | El clasificador ya existía, pero la lectura no obtenía contexto activo → especie, de modo que no se alcanzaba |
| **V4** | `EvaluacionV4/RESULTADOS/G31-REEVAL-V4-20261005-070631/` | TEST | **BLOQUEADO / NO VERIFICABLE** | **NO EJECUTADO** | **NO EJECUTADO** | **La ingesta no crea registro de vinculación, de modo que ni la vía manual oficial puede satisfacer la precondición** |

V1, V2 y V3 se conservan intactas. Los resultados históricos no se reescriben.

El avance real entre V2 y V3 —la aparición de un clasificador por niveles RF-17— **sigue presente y
se reconfirmó en V4 por revisión de código**. Lo que V4 añade respecto de V3 es una precisión
relevante: el problema no es solo que la vinculación automática no resuelva el activo, sino que
**no se crea ninguna fila**, lo que deja sin efecto la vía manual que el paquete autorizaba.

---

## ENTORNO

| Elemento | Valor |
| --- | --- |
| Ambiente decisorio | **TEST** |
| Backend TEST | `https://api.inmero.co/back-sigab-test` |
| `GET /health` | 200 |
| `GET /openapi.json` | 200, versión 1.0.0 |
| Dominio histórico `sslip.io` | responde 200 y sirve el mismo despliegue (OpenAPI de idéntico tamaño) |
| Rama QA (backend y frontend) | `qa/juan-esteban-cuarta-evaluacion-M09-y-M02` |
| HEAD frontend | `cd3af47c07302f7310b17e6800642aab2253f479` (`2 0` respecto de `origin/test`) |
| HEAD backend | `0371f2ec1d97ddfe7f3f33526d0db071d016e6ea` (= `origin/test`, `0 0`) |

**DEV no se utilizó.** El preflight comprobó que la credencial DEV autorizada autentica y que el
ambiente responde, pero no se ejecutó ninguna medición ni verificación en DEV: no habría aportado
evidencia sobre el bloqueo, que es de código común a ambos ambientes.

Endpoints verificados como desplegados: `POST /iot/telemetria`, `GET /iot/vinculaciones`,
`PATCH /iot/vinculaciones/{id}/resolver`, `POST /iot/vinculaciones/{id}/corregir`,
`GET /iot/monitoreo/dashboard`, `GET /iot/monitoreo/dashboard/{id_infraestructura}`,
`GET /iot/monitoreo/historial`.

---

## ACTOR / IDENTIDAD TÉCNICA

| Campo | Valor |
| --- | --- |
| Correo | `administador.dev@gmail.com` |
| `id_usuario` | 104 |
| Rol | Administrador |
| Estado de cuenta | Activo |
| Permisos sobre recurso 37 `vinculaciones_lecturas` | lectura (2) y actualización (3) |

Se reutilizó la credencial TEST ya autorizada y configurada de forma segura en el entorno de QA
—la misma que empleó V3—, tomada de una variable de entorno del proceso. **No se adivinó ninguna
contraseña** y no se sustituyó TEST por DEV. La contraseña no aparece en ningún artefacto; tampoco
JWT, cabeceras `Authorization`, cookies ni el `access_key` del dispositivo, que se sustituyó por el
marcador `[REDACTED_ACCESS_KEY]`.

---

## CONFIGURACIÓN UTILIZADA / FIXTURE

El fixture de V3 **se revalidó pieza por pieza y se reutilizó sin cambios**.

| Elemento | V3 | V4 (revalidado) | Válido |
| --- | --- | --- | --- |
| Sensor | 1 — Sensor temperatura estanque-01 | 1, categoría `TEMPERATURA`, activo | sí |
| Dispositivo IoT | 1 | 1, activo (serial omitido: se usa como `access_key` de ingesta) | sí |
| Infraestructura | 1 | 1 — Estanque-01, finca 1, activa | sí |
| Asociación sensor–área | — | sensor 1 asociado a infraestructura 1, sin fecha de finalización | sí |
| Activo biológico | 616 | 616, INDIVIDUAL, estado ACTIVO, infraestructura 1 | sí |
| Especie | 2 — Trucha Arcoíris | 2 — Trucha Arcoíris, activa | sí |
| Umbral RF-17 | 46 | 46, activo, variable 9, `10.00 – 40.00 °C` | sí |
| Variable | 9 — Temperatura Ambiental | 9, °C, límites físicos `-50 … 100` | sí |

Bandas del umbral 46, sin modificar:

| Nivel | Límite inferior | Límite superior | Color esperado |
| --- | ---: | ---: | --- |
| `normal` | 10.00 | 20.00 | VERDE |
| `precaucion` | 20.00 | 30.00 | AMARILLO |
| `critico` | 30.00 | 40.00 | ROJO |

Se conservaron los valores efectivos de V3 —**15.00 / 25.00 / 35.00 °C**—, interiores a cada banda,
para que el caso no dependa de la semántica inclusiva o exclusiva de los límites. No se usaron las
fronteras 20, 30 ni 40, ni los valores 36/38/40 de la matriz histórica, que frente a este umbral no
representan las tres clases.

### Calibración

Calibración vigente del sensor 1 en el dispositivo 1 —la más reciente por fecha, igual que hace
`CalibracionM09Adapter`:

| `id_calibracion` | Ganancia | Offset | Fecha |
| ---: | ---: | ---: | --- |
| 8 | 1.0000 | 25.5000 | 2026-06-21 |

Compensación aplicada (modelo RF-24 `valor_ajustado = ganancia × crudo + offset`):

```
crudo = (objetivo − offset) / ganancia

TC-M09-66:  (15.00 − 25.50) / 1.0 = −10.50  →  efectivo 15.00
TC-M09-67:  (25.00 − 25.50) / 1.0 =  −0.50  →  efectivo 25.00
TC-M09-68:  (35.00 − 25.50) / 1.0 =   9.50  →  efectivo 35.00
```

La compensación se verificó en la práctica: se envió el crudo `-10.50` y el historial registra
`valor = 15.0000` y `valor_ajustado = 15.0000`. El valor evaluado fue exactamente el objetivo.

### Alertas M03 (precondición del oráculo)

| Comprobación | Valor |
| --- | --- |
| `id_alerta` del sensor 1 | `null` |
| `severidad_alerta` | `null` |
| `alertas_activas_count` de la infraestructura | 0 |

**El oráculo del dashboard no está contaminado por alertas M03.** No se cerró ni modificó ninguna
alerta: simplemente no había ninguna activa. El fixture de V3 no necesitó sustitución por este
motivo.

---

## TC-M09-66 — NORMAL / VERDE

**Resultado: BLOQUEADO / NO VERIFICABLE.**

### Ingesta (una sola escritura)

```
POST /iot/telemetria
  device_id: 1   sensor_id: 1   tipo_variable: TEMPERATURA_AMBIENTAL
  valor: "-10.50"   unidad: "°C"   origen: TIEMPO_REAL
  timestamp_captura: 2026-10-05T07:11:57.000Z
  access_key: [REDACTED_ACCESS_KEY]

→ HTTP 201 en 137 ms
  id_telemetria: 56
  estado_calidad: LECTURA_VALIDA
```

### Vinculación de la lectura

```
GET /iot/vinculaciones?id_telemetria=56
→ HTTP 200 · total: 0 · sin filas
```

No existe fila en ningún estado. El censo completo de vinculaciones de TEST sigue conteniendo
**6 filas, todas de las telemetrías 31–35**, ninguna de la lectura 56 ni de ninguna otra lectura
ingerida por API.

Al no haber fila:

- `PATCH /iot/vinculaciones/{id}/resolver` no es aplicable —es la vía para una vinculación
  `AMBIGUA`, y no hay ninguna—;
- `POST /iot/vinculaciones/{id}/corregir` tampoco —no hay vinculación que corregir.

**No se forzó la relación por ninguna otra vía.** No se ejecutó SQL, no se actualizaron tablas, no
se modificaron claves ajenas y no se alteró código.

### Oráculo API tras la parada (solo lectura)

`GET /iot/monitoreo/historial` (sensor 1), lectura 56:

| Campo | Valor |
| --- | --- |
| `valor` / `valor_ajustado` | `15.0000` / `15.0000` |
| `unidad_medida` | `°C` |
| `timestamp_captura` | `2026-10-05T07:11:57Z` |
| `estado_calidad` | `LECTURA_VALIDA` |
| **`estado_semaforo_historico`** | **`GRIS`** |
| `id_activo_biologico` | `null` |
| `id_especie` / `especie` | `null` / `null` |
| `id_umbral_ambiental` | `null` |
| `valor_min_umbral` / `valor_max_umbral` | `null` / `null` |
| `version_umbral` | `null` |
| `id_alerta` | `null` |

`GET /iot/monitoreo/dashboard/1`, sensor 1:

| Campo | Valor |
| --- | --- |
| `ultimo_valor` | `15.0000` |
| `ultimo_timestamp_captura` | `2026-10-05T07:11:57Z` — corresponde a la lectura de esta ejecución |
| `estado_semaforo` | `VERDE` |
| `id_alerta` | `null` |

### Veredicto

El dashboard muestra VERDE y TC-M09-66 espera VERDE, pero **la cadena RF-17 no quedó demostrada**:
sin activo, sin especie y sin umbral aplicado, no hay evaluación de niveles que haya producido ese
color. El VERDE proviene del trigger de ingesta `fn_actualizar_estado_sensor`, que marca VERDE toda
lectura válida —el mismo mecanismo que V2 ya había identificado—, y el historial, que sí intenta
clasificar contra RF-17, deja la lectura en GRIS porque no encuentra umbral.

Aceptar ese VERDE sería aprobar el caso por una coincidencia de color. El criterio de aprobación lo
excluye expresamente, y además demuestra por qué: con el mismo mecanismo, TC-M09-67 y TC-M09-68
habrían mostrado VERDE donde se espera AMARILLO y ROJO.

---

## TC-M09-67 — PRECAUCIÓN / AMARILLO

**Resultado: NO EJECUTADO.**

No se envió ninguna medición. El RUN se detuvo en TC-M09-66 al comprobarse que la ingesta no genera
registro de vinculación: enviar las otras dos mediciones habría reproducido exactamente la misma
causa, generando dos escrituras más sin información nueva.

El valor objetivo previsto era **25.00 °C** (crudo `-0.50`), interior a la banda `precaucion`
`20.00 – 30.00`. El plan del caso queda registrado en la evidencia, listo para ejecutarse en cuanto
la precondición se resuelva.

---

## TC-M09-68 — CRÍTICO / ROJO

**Resultado: NO EJECUTADO.**

Mismo motivo. El valor objetivo previsto era **35.00 °C** (crudo `9.50`), interior a la banda
`critico` `30.00 – 40.00`.

---

## RESULTADO DEL ORÁCULO

| Assertion | Caso | Resultado | Observado |
| --- | --- | --- | --- |
| El valor efectivo 15.00 es interior a la banda `normal` del umbral RF-17 | TC-M09-66 | **CUMPLE** | banda `10.00 … 20.00` |
| La ingesta de la medición responde HTTP 201 | TC-M09-66 | **CUMPLE** | 201 |
| La ingesta genera un registro de vinculación para la lectura | TC-M09-66 | **NO CUMPLE** | ninguna fila |

**Total: 3 · superadas: 2 · fallidas: 1.**

Las assertions restantes del oráculo —lectura VINCULADA, activo del fixture, especie, umbral
aplicado, color en historial, color en dashboard, correlación de `ultimo_timestamp_captura`— no
llegaron a evaluarse porque la cadena se interrumpió antes. No se eliminó, redujo ni relajó ninguna
assertion, y no se adaptó el oráculo al comportamiento del producto.

### Preflight de código (verificado en `origin/test`, que es el código desplegado)

| Comprobación | Resultado |
| --- | --- |
| 1. Existe `ReclasificarSemaforoUseCase` | **Sí** |
| 2. Obtiene la especie a partir de `id_activo_biologico` | **Sí**, vía `EspecieActivoPort` |
| 3. Consulta `UmbralHistoricoM09Adapter` real | **Sí**, adaptador real, no stub |
| 4. Usa los niveles RF-17 | **Sí**, `umbral['niveles']` |
| 5. Usa `SemaforoCalculator.calcular_por_niveles` | **Sí** |
| 6. Actualiza `estado_semaforo` | **Sí**, `actualizar_estado_semaforo_si_vigente` |
| 7. `ResolverVinculacionUseCase` invoca la reclasificación | **Sí** (`vinculacion_router.py:154`) |
| 8. `CorregirVinculacionUseCase` invoca la reclasificación | **Sí** (`vinculacion_router.py:186`) |
| 9. `telemetria_router` conecta `VincularLecturaActivoUseCase` | **Sí** (`telemetria_router.py:55`) |
| 10. Sigue usando `ActivoBiologicoStubAdapter` | **Sí** (`telemetria_router.py:58`) |

El mapa de clasificación es el correcto: `{'normal': 'VERDE', 'precaucion': 'AMARILLO',
'critico': 'ROJO'}`.

**El clasificador RF-17 está bien construido y correctamente conectado a los tres puntos previstos.
El problema está antes, en la creación del registro de vinculación.**

---

## COMPARACIÓN V1 VS V2 VS V3 VS V4

| Aspecto | V1 | V2 | V3 | **V4** |
| --- | --- | --- | --- | --- |
| TC-M09-66 | BLOCKED | DESAPROBADO | BLOQUEADO / NO VERIFICABLE | **BLOQUEADO / NO VERIFICABLE** |
| TC-M09-67 | BLOCKED | DESAPROBADO | BLOQUEADO / NO VERIFICABLE | **NO EJECUTADO** |
| TC-M09-68 | BLOCKED | DESAPROBADO | BLOQUEADO / NO VERIFICABLE | **NO EJECUTADO** |
| Grupo | BLOCKED | DESAPROBADA | BLOQUEADO / NO VERIFICABLE | **BLOQUEADO / NO VERIFICABLE** |
| Mediciones ingeridas | 0 | 0 (solo lectura) | 3 | **1** |
| Escrituras totales | 0 | 0 | 3 ingestas | **1 ingesta** |
| ¿Existe clasificador por niveles RF-17? | n/d | **No** | **Sí** | **Sí (confirmado)** |
| Adaptador de umbral del historial | n/d | stub que devuelve `None` | `UmbralHistoricoM09Adapter` real | **real** |
| Reclasificación conectada a resolver/corregir | n/d | No | Sí | **Sí** |
| ¿La lectura obtiene activo? | n/d | n/d | **No** | **No** |
| ¿Se crea fila de vinculación para la lectura? | n/d | n/d | **No** | **No (confirmado por `total: 0`)** |
| Vía manual resolver/corregir | n/d | n/d | no aplicable (sin fila) | **no aplicable (sin fila)** |
| `id_especie` de la lectura | n/d | n/d | `null` | **`null`** |
| `id_umbral_ambiental` de la lectura | n/d | n/d | `null` | **`null`** |
| Dashboard | n/d | VERDE constante | VERDE fijo | **VERDE por el trigger de ingesta** |
| Historial | n/d | GRIS | GRIS | **GRIS** |
| Fixture | sin combinación válida | — | sensor 1 / activo 616 / umbral 46 | **el mismo, revalidado íntegro** |
| Alertas M03 interfiriendo | n/d | AMARILLO/ROJO solo por alertas | — | **ninguna activa** |

La serie muestra que el trabajo de producto avanzó en la parte de clasificación —V2 no tenía
clasificador, V3 y V4 sí— y que el bloqueo se ha desplazado y estabilizado en un único punto
anterior de la cadena: la creación del registro de vinculación.

---

## COMPARACIÓN TEST VS DEV

No aplica. DEV no se ejecutó. El preflight confirmó que la credencial DEV autorizada autentica con
rol Administrador y permisos sobre el recurso 37, pero no se envió ninguna medición ni se consultó
el monitoreo de DEV: el bloqueo se localizó en código común a ambos ambientes
(`VincularLecturaActivoUseCase` y el adaptador de activos), de modo que contrastar DEV no habría
aportado evidencia nueva y habría consumido escrituras innecesarias.

---

## ORIGEN / INTERPRETACIÓN DEL RESULTADO

### Clasificación RF-17 — no es el origen del bloqueo

El clasificador existe, está completo y está correctamente conectado. Su lógica de bandas es la
correcta y usa los niveles reales de RF-17 a través de un adaptador real. **No se encontró ningún
defecto en la clasificación por niveles**, y esta ejecución tampoco puede certificarla: nunca se
llegó a ejecutar.

### Vinculación automática RF-61-A — origen real del bloqueo

La cadena en el código desplegado es:

```
POST /iot/telemetria
      ↓ (commit de la telemetría: HTTP 201)
VincularLecturaActivoUseCase
      ↓
ActivoBiologicoStubAdapter.obtener_activos_en_momento(...) → []
      ↓ len(activos) == 0
estado = 'SIN_VINCULAR' · id_activo = None · modelo_manejo = 'INDIVIDUAL'
      ↓ INSERT en modulo3.vinculaciones_lecturas
CHECK chk_vinculacion_modelo: (INDIVIDUAL ∧ id_activo IS NOT NULL)
                            ∨ (POBLACIONAL ∧ id_activo IS NULL)
      ↓ la combinación INDIVIDUAL + NULL viola la restricción
excepción → rollback → la excepción se registra como warning y se descarta
      ↓
la ingesta devuelve 201 y NO queda ninguna fila de vinculación
```

Es decir, hay **dos cuestiones encadenadas**, y conviene separarlas:

1. **El stub de M02** devuelve lista vacía, de modo que ninguna lectura nueva resuelve su activo
   automáticamente. Esto es la dependencia conocida de M03/M02 y, por sí sola, no invalidaría el
   caso: para eso estaba prevista la vía manual.
2. **La rama de «sin activos» es internamente inconsistente**: asigna `modelo_manejo = 'INDIVIDUAL'`
   junto con `id_activo_biologico = None`, combinación que la propia base de datos prohíbe. El
   resultado es que no se crea ni la fila `SIN_VINCULAR` que el código pretende crear. Esto **sí es
   un defecto de producto propio**, independiente de la disponibilidad de M02, y es lo que deja sin
   efecto la vía manual: no se puede resolver ni corregir una vinculación que no existe.

El segundo punto es el hallazgo que V4 precisa respecto de V3.

### Vinculación manual RF-61-C — disponible pero inaplicable

Ambos endpoints están desplegados, el actor tiene los permisos necesarios (recurso 37, acciones 2 y
3) y el código confirma que ambos disparan la reclasificación. La vía es correcta y estaba lista
para usarse; simplemente **no tiene sujeto sobre el que operar** mientras la ingesta no deje una
fila.

Basta con que la rama de «sin activos» cree la fila con un modelo coherente —o que el stub se
sustituya por el adaptador real de M02— para que esta reevaluación pueda completarse sin ningún
otro cambio.

### UI — no evaluada, y no es un hallazgo

La verificación visual no se realizó porque el backend nunca produjo una clasificación RF-17 para la
lectura nueva: no había nada que la interfaz pudiera representar. No se generaron capturas
`TC-M09-66-ui.png`, `TC-M09-67-ui.png` ni `TC-M09-68-ui.png`, para no producir evidencia que
mostrara un estado ajeno al oráculo del caso.

Por el mismo motivo, **la observación visual que V3 registró en la pantalla de Historial no se
reverificó en V4** y no se convierte en hallazgo de esta ejecución. Queda pendiente de comprobar en
la primera ejecución que logre atravesar la cadena. No se creó ninguna incidencia por ello.

### Alertas M03 — sin interferencia

El sensor del fixture no tenía ninguna alerta activa, de modo que el oráculo del dashboard no quedó
enmascarado. No se cerró ni se modificó ninguna alerta.

### Nota de trazabilidad sobre la ejecución

Un primer envío de la medición de TC-M09-66 respondió **HTTP 500 `ERROR_INTERNO`**. La causa se
identificó y es de la automatización, no del producto: el `timestamp_captura` se derivó del reloj de
la máquina de pruebas, que iba entre 1 y 2 segundos adelantado respecto del servidor, y el trigger
RF-53 `fn_validar_timestamp_telemetria` rechaza toda captura posterior a `now()`, error que afloró
como un 500 genérico.

Conforme a las reglas de la ejecución **no se reintentó la escritura a ciegas**: primero se
reconcilió por `GET /iot/monitoreo/historial`, que confirmó que **la lectura no había persistido**
—el historial del sensor 1 contenía únicamente las telemetrías 49–54 de V3—. Con 0 filas
persistidas, se corrigió el anclaje del reloj en el runner y se completó la ingesta del caso dentro
del **mismo RUN**, sin abrir un segundo RUN ni duplicar evidencia. El intento descartado queda
registrado en `evidencia-g31-v4.json` bajo `intentoDescartadoPorDesfaseDeReloj`. El total de
escrituras que llegaron a persistir es **1**.

---

## INCIDENCIA

**INC-M09-106-G31 — Issue #297.**

Estado tras V4: **VIGENTE — NO VERIFICABLE EN ESTA EJECUCIÓN.**

| Alcance de la incidencia | Estado en V4 | Evidencia |
| --- | --- | --- |
| Existencia de un clasificador por niveles RF-17 | **Corregido** (desde V3) | `ReclasificarSemaforoUseCase` + `SemaforoCalculator.calcular_por_niveles` |
| Adaptador de umbral real en lugar de stub | **Corregido** | `UmbralHistoricoM09Adapter` real inyectado |
| Reclasificación conectada a resolver y corregir | **Corregido** | `vinculacion_router.py:154` y `:186` |
| Clasificación efectiva de una lectura nueva | **No verificable** | La lectura no obtiene activo ni especie; el clasificador no se ejecuta |
| Creación del registro de vinculación en la ingesta | **No corregido** | `INDIVIDUAL` + `id_activo = NULL` viola `chk_vinculacion_modelo`; 0 filas creadas |

**No se creó ninguna incidencia nueva** y **no se modificó ni reabrió el Issue #297.** La
corrección de la clasificación RF-17 **no puede declararse verificada funcionalmente en V4**,
porque no se alcanzó a ejecutar el clasificador sobre ninguna lectura nueva.

Se recomienda **actualizar #297** —no con un fallo del clasificador, que no se observó, sino
añadiendo la precondición que lo bloquea: la rama de «sin activos» de `VincularLecturaActivoUseCase`
no logra crear la fila de vinculación, lo que deja sin efecto la vía manual RF-61-C prevista para
esta verificación. La vinculación automática RF-61-A continúa siendo una dependencia separada de
M03/M02 y **no es lo que esta ejecución pretendía certificar**.

---

## CONCLUSIÓN

La cuarta evaluación de TC-M09-G31 cerró **BLOQUEADA / NO VERIFICABLE**, con **una sola escritura
funcional** y sin ningún cambio de código, de configuración RF-17 ni de datos por vía no oficial.

El fixture de V3 se revalidó íntegro y se reutilizó sin cambios, la calibración se compensó
correctamente —el valor evaluado fue exactamente 15.00 °C, interior a la banda NORMAL del umbral
46— y el sensor no tenía ninguna alerta M03 que pudiera enmascarar el oráculo. Es decir, **todas
las precondiciones que dependían de QA y del entorno estaban en orden**.

El bloqueo es de producto y está localizado con precisión: la ingesta devuelve 201 pero **no deja
ningún registro de vinculación** para la lectura, porque la rama que debería crear la fila
`SIN_VINCULAR` la construye con `modelo_manejo = 'INDIVIDUAL'` y `id_activo_biologico = NULL`, una
combinación que la restricción `chk_vinculacion_modelo` prohíbe; la excepción se descarta como
advertencia y la ingesta responde correctamente igual. Sin fila no hay vía manual que resolver ni
corregir, sin activo no hay especie, sin especie no hay umbral y el clasificador no se ejecuta.

Por eso TC-M09-67 y TC-M09-68 no se enviaron: habrían repetido la misma causa con dos escrituras
más y ninguna información nueva.

Conviene subrayar lo que **no** es este resultado: no es un defecto de la clasificación semafórica.
El clasificador RF-17 está completo, usa los niveles reales y está conectado a los tres puntos
previstos. Está listo para ser verificado en cuanto una lectura nueva consiga llegar a él. Y
conviene subrayar también que el **VERDE que muestra el dashboard no aprueba TC-M09-66**: lo fija el
trigger de ingesta, el historial deja la misma lectura en GRIS con especie y umbral nulos, y la
coincidencia con el color esperado es casual.

**INC-M09-106-G31 / #297 permanece vigente.** V1, V2 y V3 quedan intactas.

---

### Artefactos de este RUN

`EvaluacionV4/RESULTADOS/G31-REEVAL-V4-20261005-070631/`

| Archivo | Contenido |
| --- | --- |
| `evidencia-g31-v4.json` | Evidencia consolidada: Git inicial y final, actor, fixture revalidado, umbral RF-17 y sus niveles, calibración, reloj del servidor, targets, la telemetría creada con su valor crudo y efectivo, la consulta de vinculación, la reconciliación posterior a la parada, escrituras, oráculo con sus assertions, seguridad y comprobaciones de cierre |
| `TC-M09-G31_reevaluacion_V4.md` | Este informe |

`EvaluacionV4/run-v4.cjs` contiene la automatización. Existe porque la fase oficial de
`EvaluacionV3/run-newman.cjs` escribe dentro de `EvaluacionV3/RESULTADOS/` y reescribe su propia
colección: reutilizarla habría modificado V3. Conserva los mismos casos, orden, fixture, oráculo y
assertions de V3.

No se generó reporte Newman —la ejecución no usó Newman, sino peticiones directas con oráculo
propio, igual que la lógica de V3—, ni capturas de UI, ni colección duplicada, ni archivos
separados de preflight, Git o seguridad: toda esa información está consolidada en
`evidencia-g31-v4.json`.
