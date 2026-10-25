# TC-M09-G31 — REEVALUACIÓN V2

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
Casos: TC-M09-66 (Normal/Verde) · TC-M09-67 (Precaución/Amarillo) · TC-M09-68 (Crítico/Rojo)
Responsable QA: Juan Esteban · RUN_ID: `G31-REEVAL-V2-20260913-103722` · Fecha local: 2026-09-13 · Entorno decisorio: **TEST (confirmado en DEV)**

---

## DECISIÓN GENERAL

### REEVALUACIÓN DESAPROBADA — DEFECTO DEL PRODUCTO / FUNCIONALIDAD NO IMPLEMENTADA

El producto **no clasifica mediciones con los niveles Normal / Precaución /
Crítico configurados en RF-17**, ni en TEST ni en DEV:

- **Ingesta:** el trigger `trg_rf58_01_cache_estado_sensor` →
  `modulo3.fn_actualizar_estado_sensor()` fija `estado_semaforo = 'VERDE'` para
  toda lectura `LECTURA_VALIDA`, sea cual sea su valor.
- **AMARILLO y ROJO:** solo aparecen por alertas M03
  (`trg_aux_03_alerta_en_sensor_*` → `fn_sincronizar_alerta_en_sensor`:
  CRÍTICO → ROJO; otra severidad → AMARILLO), generadas por reglas propias de
  M03, no por niveles RF-17.
- **Historial:** calcula el semáforo con `UmbralHistoricoM09Adapter`, un stub
  que devuelve `None`, así que siempre sale GRIS. Además, `SemaforoCalculator`
  usa `umbral_min/umbral_max ± 10 %` y no los tres niveles RF-17.
- **Resto del código:** ningún componente de telemetría, predicción o compartido
  lee `niveles_alerta_ambientales`. El frontend solo muestra el `estado_semaforo`
  que recibe del backend (`SemaforoPill`), sin usar niveles RF-17.

Una medición de 38.00, 40.00 o 42.00 sobre la configuración de prueba quedaría
VERDE al ingerirse, salvo que exista una alerta M03 independiente. TC-66 podría
coincidir por casualidad, pero no porque se aplique RF-17. TC-67 y TC-68 no
pueden cumplirse. Como el clasificador es común, los tres originales comparten
el resultado.

| Caso | V1 | V2 | Ambiente decisorio | Valor | Esperado | API | UI | Categoría | Acción |
| --- | --- | --- | --- | --: | --- | --- | --- | --- | --- |
| TC-M09-66 | BLOCKED | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** | TEST (DEV confirma) | 38.00 (planificado, no enviado) | NORMAL / VERDE | No aplica: no existe clasificación RF-17 | No aplica: la UI muestra `estado_semaforo` del backend | FLUJO — Flujo / Proceso → Desarrollo | **REPORTAR A DESARROLLO** (actualizar/reabrir INC-M09-32-G31) |
| TC-M09-67 | BLOCKED | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** | TEST (DEV confirma) | 40.00 (planificado) | PRECAUCIÓN / AMARILLO | No aplica | No aplica | FLUJO → Desarrollo | Ídem |
| TC-M09-68 | BLOCKED | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** | TEST (DEV confirma) | 42.00 (planificado) | CRÍTICO / ROJO | No aplica | No aplica | FLUJO → Desarrollo | Ídem |

**Mediciones generadas: 0.** El checklist previo (§156) falla en el punto 6
(«¿Clasificador identificado?» = No). Ingerir telemetría escribiría datos sin un
clasificador RF-17 que evaluar. Además, V1 no logró demostrar la cadena
sensor → variable → activo → especie. La conclusión se apoya en el código de
ambos repositorios y en lecturas de TEST y DEV.

---

## RESUMEN V1

Evidencia V1: `RF-17/TC-M09-G31/RESULTADOS/run-20260906-071500/` (solo lectura, intacta).

| Aspecto | TC-M09-66 | TC-M09-67 | TC-M09-68 |
| --- | --- | --- | --- |
| Resultado V1 | BLOCKED | BLOCKED | BLOCKED |
| Ambiente | TEST | TEST | TEST |
| Configuración | Solo discovery: 10 configuraciones activas completas (Cachama, Camarón, Mojarra y Trucha) | Ídem | Ídem |
| Medición | No enviada (`POST /iot/telemetria` 0/2) | No enviada (0/2) | No enviada (0/2) |
| Respuesta API | Dashboard 200, 5 sensores GRIS | Ídem | Ídem |
| UI | El Administrador sin unidad productiva no habilitó el monitoreo; TC-66 con 2 recorridos no concluyentes (variable Electron y sesión perdida) | Captura «bloqueo sin unidad» | Captura «bloqueo sin unidad» |
| Motivo | Sin combinación vigente demostrable especie–activo–sensor–variable; la única especie con lecturas (Tilapia Roja) no tenía umbral | Ídem | Ídem |
| Categoría / equipo V1 | INFRAESTRUC (precondición TEST) → Implementación y AIoT | Ídem | Ídem |
| Incidencia | Registrada después por Desarrollo como **INC-M09-32-G31 (#159)** («faltan precondiciones TEST»), agrupada con INC-M09-33-G32 (#160) en `anotaciones/modulo_9/inc_m09_monitoreo_umbral_efectivo_bloqueado.md` | Ídem | Ídem |
| Problemas QA V1 | Intento 1 de discovery leía `valor_min/max` dentro de los niveles en lugar de `limite_inferior/superior`; corregido en el intento 2, sin mediciones | Ídem | Ídem |

V1 no clasificó mal ningún valor: no llegó a enviar mediciones. Su bloqueo
señalaba precondiciones de datos; V2 identifica una causa más profunda
(no existe clasificador RF-17).

---

## MOTIVO DE REEVALUACIÓN

Confirmar si, sobre el despliegue actual (rc.37), las mediciones se clasifican
con los niveles RF-17 y resolver si el bloqueo de V1 era solo de datos o de
funcionalidad. La comprobación se repitió en DEV (§19, §89 y §161).

---

## ENTORNO

| Elemento | Valor |
| --- | --- |
| TEST | Backend `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`. La URL suministrada `http://…` responde 404 del proxy; se usó HTTPS, criterio ya autorizado |
| DEV (contraste) | `https://sigab-backenddev-jpuya4-ea3a74-158-69-200-27.sslip.io/api-sgpmp` |
| Endpoints revisados | `GET /iot/monitoreo/dashboard`, `GET /iot/monitoreo/historial` (200 en ambos). OpenAPI: no hay endpoint de clasificación contra umbral RF-17; `/iot/calidad/{id}/evaluar` y `/iot/calidad/reevaluar` evalúan calidad del dato (drift o valores atípicos con parámetros stub), no el semáforo RF-17 |
| MQTT | No aplica: la ingesta REST existe; el problema no es el canal sino la clasificación |
| Herramientas | Newman 6.2.2 + htmlextra 1.23.1 (existentes); nada instalado |
| Cypress | **No ejecutado** (ver EVIDENCIA UI) |
| PostgreSQL | No utilizado; el trigger se revisó en `alembic/baseline/esquema_baseline.sql` y `alembic/versions` (ninguna migración lo redefine) |

---

## GIT / SHAs

| Repositorio | Rama | SHA | Uso |
| --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-re-evaluacion-M02` | `49966d244673eb44d0be61e7df25c27d460b2c1c` | Única zona escribible (`TC-M09-G31/EvaluacionV2/`) y lectura del componente de semáforo |
| sgpmp-backend | `qa/juan-esteban-re-evaluacion-M02` | `ff5f6c9f6161e46c94d3d6f325a7d07d80d84aa0` (= `origin/test`) | Solo lectura; `git diff --stat HEAD origin/dev -- src alembic` vacío (rc.37) |

---

## ACTOR

| Ambiente | Actor | Rol | Nota |
| --- | --- | --- | --- |
| TEST | `administador.dev@gmail.com` | Administrador, `Activo`, 0 fincas | El paquete lo cita como `admin.dev@gmail.com`; el responsable QA confirmó el correo correcto |
| DEV | `admin.general@pecuaria.co` | Administrador, `Activo`, 0 fincas | La cuenta común `administador.dev@gmail.com` respondió **401** en DEV (también en G32). Se usó el fallback DEV (§13) y no se repetirán más intentos con la cuenta común en DEV |

Solo hubo login y GET. No se configuró ni modificó RF-17.

---

## CONFIGURACIÓN RF-17 UTILIZADA

TEST: se eligió la configuración activa con mayor amplitud relativa por nivel
(§43). Es el **umbral 44**, creado por QA en TC-M09-G30 EvaluacionV2: Bovino +
Temperatura Corporal (°C).

| Nivel | Mínimo | Máximo | Valor V2 seleccionado (no enviado) |
| --- | --: | --: | --: |
| NORMAL | 37.00 | 39.00 | 38.00 (punto medio; 1.00 hasta cada frontera) |
| PRECAUCIÓN | 39.00 | 41.00 | 40.00 (punto medio) |
| CRÍTICO | 41.00 | 43.00 | 42.00 (punto medio) |
| General | 37.00 | 43.00 | — |

Los tres niveles son contiguos, sin solapamiento ni huecos. Los valores se
calcularon con aritmética decimal exacta (no se copiaron los 36/38/40 de la
matriz, aunque son parecidos).

DEV (solo lectura): umbral 8, Camarón Blanco + Salinidad. Valores interiores
planificados: 17.50 / 7.50 / 2.50.

## MECANISMO DE MEDICIÓN

| Etapa | Implementación real |
| --- | --- |
| Entrada de medición | `POST /iot/telemetria` (REST, módulo telemetría) → inserción en `modulo3.telemetrias` |
| Semáforo al ingerir | Trigger `trg_rf58_01_cache_estado_sensor` → `fn_actualizar_estado_sensor()` → `estado_semaforo = 'VERDE'` fijo para `LECTURA_VALIDA` |
| Semáforo AMARILLO/ROJO | Trigger de `modulo3.alertas` → severidad CRÍTICO → ROJO; otra → AMARILLO (alertas por reglas M03) |
| Dashboard | Lee `estados_actuales_sensores.estado_semaforo`; aplica GRIS si el dato está desactualizado y las reglas de alerta |
| Historial | `UmbralHistoricoM09Adapter` (stub) → GRIS |
| UI | `SensorCard` → `SemaforoPill estado={sensor.estado_semaforo}` y `semaforoToGauge(sensor.estado_semaforo)` |
| Uso de niveles RF-17 | **Ninguno**: 0 referencias a `niveles_alerta_ambientales`, `NivelAlertaAmbiental` o `limite_inferior` en `src/telemetry`, `src/prediction` y `src/shared` (backend), ni en `src/telemetry` (frontend) |

---

## TC-M09-66 — NORMAL

| Checklist §157 | Resultado |
| --- | --- |
| Valor inequívocamente normal | Sí: 38.00 en [37.00, 39.00] |
| Medición real | No generada (clasificador RF-17 inexistente) |
| API = NORMAL | No aplica: la ingesta asigna VERDE sin evaluar el nivel RF-17 |
| UI = NORMAL / verde | No aplica: la UI refleja `estado_semaforo` del backend |
| Misma configuración | Sí (umbral 44, sin cambios) |
| **Resultado** | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** |

## TC-M09-67 — PRECAUCIÓN

| Checklist §158 | Resultado |
| --- | --- |
| Valor inequívocamente de precaución | Sí: 40.00 en [39.00, 41.00] |
| API = PRECAUCIÓN | No: la ingesta asignaría VERDE; AMARILLO solo sale de alertas M03 |
| UI = PRECAUCIÓN / amarillo | No aplica |
| Misma configuración | Sí |
| **Resultado** | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** |

## TC-M09-68 — CRÍTICO

| Checklist §159 | Resultado |
| --- | --- |
| Valor inequívocamente crítico | Sí: 42.00 en [41.00, 43.00], dentro del rango general (el nivel crítico está dentro del general, según el contrato RF-17) |
| API = CRÍTICO | No: la ingesta asignaría VERDE; ROJO solo sale de alertas CRÍTICO de M03 |
| UI = CRÍTICO / rojo | No aplica |
| Misma configuración | Sí |
| **Resultado** | **DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA** |

---

## EVIDENCIA API

Newman de solo lectura (`newman-TC-M09-66-67-68-v2-TEST.html` y `-DEV.html`),
9 aserciones por ambiente:

| Aserción | TEST | DEV |
| --- | --- | --- |
| Actor `/usuarios/me` 200 · Administrador activo | PASS · PASS | PASS · PASS |
| Configuración RF-17 200 · activa con 3 niveles · sin solapamiento | PASS ×3 | PASS ×3 |
| Dashboard 200 | PASS | PASS |
| **Oráculo: el estado del sensor referencia el umbral o nivel RF-17 aplicado** | **FAIL** | **FAIL** |
| Historial 200 | PASS | PASS |
| **Oráculo: la clasificación histórica se calcula con umbral (no todo GRIS)** | **FAIL** (todo GRIS) | **FAIL** (todo GRIS) |

Semáforos observados: dashboard `[GRIS]` e historial `[GRIS]` en ambos
ambientes.

| Caso | API clasificación | UI etiqueta | UI semáforo | Coincide con RF-17 |
| --- | --- | --- | --- | --- |
| TC66 | No existe (VERDE fijo al ingerir) | `SemaforoPill` según backend | Según backend | No demostrable: no se aplica RF-17 |
| TC67 | No existe | Ídem | Ídem | No |
| TC68 | No existe | Ídem | Ídem | No |

## EVIDENCIA UI

**Cypress no se ejecutó.** No hay mediciones de TC-66/67/68 que buscar en la
interfaz, y no se deben crear desde la UI (§66). La revisión de código
(`SensorCard.tsx` → `SemaforoPill` y `semaforoToGauge` sobre
`sensor.estado_semaforo`) demuestra que la UI no aplica niveles RF-17 y solo
refleja el valor del backend. V1 ya capturó que el Administrador TEST, sin
unidad productiva, no tiene el monitoreo habilitado. Una captura de semáforos
GRIS no aportaría evidencia adicional sobre la clasificación.

## CONFIGURACIÓN BEFORE/AFTER

`THRESHOLD_CONFIG_AFTER == THRESHOLD_CONFIG_BEFORE`: **Sí** en TEST (umbral 44:
37.00–43.00, niveles y `fecha_actualizacion` idénticos) y en DEV (umbral 8). No
hubo escrituras.

---

## COMPARACIÓN V1 VS V2

| Caso | V1 | V2 | Valor V1 | Valor V2 | API V1 | API V2 | UI V1 | UI V2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC66 | BLOCKED | DESAPROBADO — NO IMPLEMENTADA | No seleccionado | 38.00 (planificado) | Dashboard GRIS; sin medición | Sin clasificador RF-17 (VERDE fijo al ingerir) | No concluyente (2 recorridos fallidos) | No ejecutada (la UI refleja el backend) |
| TC67 | BLOCKED | DESAPROBADO — NO IMPLEMENTADA | No seleccionado | 40.00 | Ídem | Ídem (AMARILLO solo por alerta M03) | Bloqueo sin unidad | No ejecutada |
| TC68 | BLOCKED | DESAPROBADO — NO IMPLEMENTADA | No seleccionado | 42.00 | Ídem | Ídem (ROJO solo por alerta CRÍTICO M03) | Bloqueo sin unidad | No ejecutada |

## COMPARACIÓN TEST VS DEV

| Aspecto | TEST | DEV | Interpretación |
| --- | --- | --- | --- |
| Clasificador por niveles RF-17 | No existe | No existe (código idéntico, rc.37) | **No hay desfase de despliegue: falta la funcionalidad** |
| NORMAL | VERDE fijo al ingerir, no evaluado | Ídem | — |
| PRECAUCIÓN | Solo por alerta M03 | Ídem | — |
| CRÍTICO | Solo por alerta CRÍTICO M03 | Ídem | — |
| UI semafórica | Refleja `estado_semaforo`; observado `[GRIS]` | Ídem `[GRIS]` | — |

---

## ORIGEN DEL FALLO

### TC-M09-66 · TC-M09-67 · TC-M09-68

`Producto: Sí (clasificación semafórica con niveles RF-17 no implementada)`

`Automatización: No`

`Entorno: No (TEST y DEV operativos)`

`Bloqueo: No determinante (sigue faltando la correlación de datos de V1, pero la ausencia del clasificador se demuestra sin ella)`

`Categoría: FLUJO — Flujo / Proceso`

`Equipo: Desarrollo`

`Acción: REPORTAR A DESARROLLO`

Checklist «no implementado» (§161):

| # | Condición | Resultado |
| --- | --- | --- |
| 1 | TEST carece | Sí |
| 2 | DEV carece | Sí |
| 3 | Código/contrato DEV confirma ausencia | Sí: trigger VERDE fijo, alertas por severidad M03, historial por stub, 0 lecturas de niveles RF-17, sin endpoint de clasificación |
| 4 | Datos correctos | Sí: configuración RF-17 activa y completa; valores interiores exactos |
| 5 | Infraestructura operativa | Sí |
| 6 | Mecanismo QA correcto | Sí: lectura de APIs y código; la conclusión no depende de enviar mediciones |
| 7 | Error de prueba descartado | Sí |

**Observación adicional para Desarrollo:** aunque se integrara,
`SemaforoCalculator.calcular` usa un modelo `umbral_min/umbral_max ± 10 %` de
tolerancia que no corresponde a los tres niveles contiguos Normal / Precaución /
Crítico que define RF-17.

---

## CATEGORÍA / EQUIPO / ACCIÓN

| Hallazgo | Categoría | Equipo | Acción |
| --- | --- | --- | --- |
| Clasificación semafórica no usa niveles RF-17 (TC-66/67/68) | FLUJO — Flujo / Proceso | Desarrollo | **REPORTAR A DESARROLLO**: actualizar/reabrir INC-M09-32-G31 |
| Observación: modelo de `SemaforoCalculator` (min/max ± tolerancia) distinto de los tres niveles RF-17 | FLUJO — Flujo / Proceso | Desarrollo | Incluir en la misma actualización |
| Observación: Administrador TEST y DEV sin unidad productiva (0 fincas), así que la UI de monitoreo no se habilita (ya visto en V1) | Precondición de datos | Implementación | Informar; no bloquea esta decisión |

## INCIDENCIAS

### INC-M09-32-G31 (#159) — actualizar / reabrir, sin duplicar

| Campo | Valor |
| --- | --- |
| ID | **INC-M09-32-G31** (issue #159); relacionada con INC-M09-33-G32 (#160) |
| Casos | TC-M09-66, TC-M09-67, TC-M09-68 · RF-17 · Monitoreo (M03) |
| Ambiente | TEST (`ff5f6c9`) y DEV (rc.37), código idéntico |
| Título | La clasificación semafórica de mediciones no utiliza los niveles Normal / Precaución / Crítico configurados en RF-17 |
| Categoría | FLUJO — Flujo / Proceso |
| Severidad | La vigente en el Registro de Errores; no se infiere de «Prioridad Alta» |
| Responsable | Desarrollo |
| Acción | REPORTAR A DESARROLLO |
| Esperado | Una medición en la zona normal, de precaución o crítica de la configuración RF-17 activa se clasifica NORMAL/VERDE, PRECAUCIÓN/AMARILLO o CRÍTICO/ROJO, y así se ve en API y UI |
| Obtenido | La ingesta fija `estado_semaforo='VERDE'` por trigger; AMARILLO y ROJO dependen de alertas M03 por severidad; el historial usa stub (GRIS); ningún componente lee `niveles_alerta_ambientales`; la UI solo refleja `estado_semaforo` |
| Evidencia | `TC-M09-G31-evidencia-TEST.json` (código de ambos repositorios, configuración, valores planificados y aserciones), `TC-M09-G31-evidencia-DEV.json`, `newman/newman-TC-M09-66-67-68-v2-TEST.html` y `-DEV.html` |
| Reproducibilidad | Determinista (código y contrato), igual en TEST y DEV |
| Actualización sugerida | «Reevaluación V2 (RUN_ID `G31-REEVAL-V2-20260913-103722`, 2026-09-13): el bloqueo por precondiciones de V1 esconde una ausencia funcional. No existe clasificación basada en niveles RF-17 (trigger VERDE fijo, alertas M03, stub de historial). TC-66/67/68 pasan de BLOCKED a DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA en TEST y DEV.» |

No se creó ningún ticket (Taiga, issue ni PR).

---

## EVIDENCIAS

En `RF-17/TC-M09-G31/EvaluacionV2/RESULTADOS/G31-REEVAL-V2-20260913-103722/`:

| Archivo | Contenido |
| --- | --- |
| `TC-M09-G31-evidencia-TEST.json` | Preflight, actor, `threshold_config_before`, valores interiores planificados (no enviados), dashboard e historial, correlación, config AFTER igual, por caso (config ID, especie, variable, measurement ID `null`, valor, esperado, API y UI `null`, resultado), evidencia de código de backend y frontend, y aserciones Newman |
| `TC-M09-G31-evidencia-DEV.json` | Lo mismo en DEV (sin bloque de código, que es idéntico) |
| `newman/newman-TC-M09-66-67-68-v2-TEST.html` · `…-DEV.html` | Reportes htmlextra de solo lectura |
| `seguridad-evidencias.json` · `git-final.json` | Escaneo de secretos y estado Git |

Se usa un único HTML Newman por ambiente para los tres originales, en lugar de
`newman-TC-M09-66-v2.html` y siguientes, porque comparten las mismas consultas
(configuración, dashboard e historial) y no hubo mediciones por caso. No existen
evidencias Cypress ni de mediciones, porque no se produjeron.

Automatización: `EvaluacionV2/run-newman.cjs`,
`TC-M09-G31-reevaluacion-v2.postman_collection.json` y `README.md`.

---

## SEGURIDAD

- Contraseñas solo por variables de proceso (`TEST_ADMIN_PASSWORD`,
  `DEV_ADMIN_PASSWORD`); tokens en memoria. Reporter con `omitHeaders`, sin
  entorno y omitiendo `token`; HTML y JSON saneados.
- Sin SQL (el trigger se leyó del esquema versionado), sin mediciones
  fabricadas ni escrituras RF-17.
- Detalle del escaneo en `seguridad-evidencias.json`.

---

## GIT FINAL

Detalle en `git-final.json`.

- Frontend (`qa/juan-esteban-re-evaluacion-M02`, `49966d2`): `git diff --stat`
  vacío. Todos los archivos nuevos están en
  `testing/test_testing/Modulo9/RF-17/TC-M09-G31/EvaluacionV2/`. Los archivos de
  `RESULTADOS/` los ignora la regla `**/resultados/` de `testing/.gitignore`,
  pero existen en disco.
- Cambios preexistentes ajenos a TC-M09-G31 EvaluacionV2 en frontend:
  `RF-17/TC-M09-G22/EvaluacionV2/` y `RF-17/TC-M09-G28/EvaluacionV2/`.
- Backend: solo lectura, `git diff --stat` vacío. Sus carpetas sin seguimiento
  (G24, G29, G30, G32, G77, G78) son preexistentes y ajenas a G31.
- V1 de G31 intacta. Sin commit, push, pull, merge, rebase, reset, clean,
  stash, checkout, cambio de rama, tag ni PR.

**La ejecución se detiene aquí para revisión humana. No se avanza a otro grupo.**
