# TC-M09-G31 — TERCERA EVALUACIÓN (V3)

## 1. Identificación

| | |
|---|---|
| **Requerimiento** | RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental (CU-03) |
| **Módulo** | M09 · Proyecto SGPMP / SIGAB |
| **Casos** | TC-M09-66, TC-M09-67, TC-M09-68 |
| **Fecha de ejecución** | 2026-09-27 |
| **RUN_ID** | `G31-REEVAL-V3-20260927-051628` |
| **Ambiente decisorio** | TEST |
| **Ambiente de contraste** | DEV |
| **Actor utilizado** | Administrador autorizado |
| **Incidencia en seguimiento** | INC-M09-106-G31 (Issue #297) |

---

## 2. Objetivo de la reevaluación

Verificar que una medición de temperatura se clasifique semafóricamente contra los niveles de alerta
configurados en RF-17:

```
valor en zona NORMAL      → VERDE
valor en zona PRECAUCIÓN  → AMARILLO
valor en zona CRÍTICO     → ROJO
```

La clasificación debe observarse tanto en la API de monitoreo (dashboard e historial) como en la
interfaz.

---

## 3. Antecedentes

| Evaluación | Resultado |
|---|---|
| V1 | Bloqueada por precondiciones del ambiente. |
| V2 | Desaprobada: no existía clasificador que utilizara los niveles RF-17; la ingesta fijaba un semáforo constante. |
| Desarrollo | PR #382 y #383 incorporan la lógica de clasificación por niveles RF-17 y su invocación desde los puntos de vinculación de lecturas. |
| V3 | Verificar esa corrección de extremo a extremo. |

---

## 4. Fixture utilizado

Contexto construido íntegramente con datos existentes de M02 y M09:

| Elemento | Valor |
|---|---|
| Sensor | 1 — «Sensor temperatura estanque-01» |
| Dispositivo IoT | 1 |
| Infraestructura | 1 |
| Activo biológico | 616 (11 activos disponibles de la especie) |
| Especie | 2 — Trucha Arcoíris |
| Umbral RF-17 | #46 · variable 9 «Temperatura Ambiental» · activo · rango general 10.00–40.00 °C |
| Bandas | NORMAL 10–20 · PRECAUCIÓN 20–30 · CRÍTICO 30–40 |
| Valores objetivo | 15.00 · 25.00 · 35.00 |

Los valores originalmente previstos (36/38/40) se parametrizaron porque, frente al umbral disponible,
no representaban las tres clases requeridas. Los valores 15/25/35 sí quedan dentro de NORMAL,
PRECAUCIÓN y CRÍTICO respectivamente, con lo que el fixture conserva la semántica del caso. Las
mediciones se enviaron compensando la calibración vigente del sensor, de modo que el valor evaluado
por el sistema fuera exactamente 15.00, 25.00 y 35.00; así quedó verificado en la respuesta de la API.

**El fixture demuestra que el bloqueo no obedece a falta de datos de M02 ni de configuración de M09:**
existen especie, activo biológico, sensor, dispositivo y un umbral RF-17 activo con sus tres niveles
correctamente definidos y sin solapamiento.

---

## 5. Resultados observados

| Caso | Clase objetivo | Resultado observado durante el diagnóstico | Estado QA |
|---|---|---|---|
| TC-M09-66 | NORMAL → VERDE | dashboard VERDE; historial GRIS, sin umbral asociado | **BLOQUEADO / NO VERIFICABLE** |
| TC-M09-67 | PRECAUCIÓN → AMARILLO | dashboard VERDE; historial GRIS, sin umbral asociado | **BLOQUEADO / NO VERIFICABLE** |
| TC-M09-68 | CRÍTICO → ROJO | dashboard VERDE; historial GRIS, sin umbral asociado | **BLOQUEADO / NO VERIFICABLE** |

Las tres mediciones se ingirieron correctamente (HTTP 201; identificadores de telemetría 52, 53 y 54)
con estado de calidad `LECTURA_VALIDA`, y el valor evaluado por el sistema coincidió en los tres casos
con el valor objetivo del fixture. En las tres, el historial devolvió `id_especie` e
`id_umbral_ambiental` nulos.

El VERDE observado en el dashboard no constituye una clasificación: es el estado constante que se
registra al ingerir cualquier lectura, con independencia de su valor. Lo confirma que las tres
mediciones —incluidas las situadas en PRECAUCIÓN y CRÍTICO— devolvieron el mismo VERDE, y que ninguna
quedó asociada a un umbral RF-17. En consecuencia, la coincidencia del caso TC-M09-66 con su valor
esperado es accidental y no debe leerse como aprobación.

La configuración RF-17 permaneció sin cambios: el umbral #46 es idéntico antes y después de la
ejecución.

**Estos resultados muestran el comportamiento de la implementación parcial actual, pero no deben
interpretarse como rechazo definitivo del caso, porque la cadena funcional requerida depende de M03,
aún no entregado oficialmente.**

---

## 6. Dependencia funcional pendiente de M03

Módulos oficialmente desarrollados y entregados a la fecha: **M01, M02 y M09**. **M03 no se encuentra
todavía desarrollado ni entregado oficialmente de forma completa.** La existencia de endpoints,
clases, tablas o implementaciones parciales asociadas a M03 no equivale a disponibilidad funcional
para validación.

TC-M09-G31 no valida únicamente la configuración del umbral: valida su aplicación sobre una medición
real, lo que exige la cadena completa

```
medición → telemetría → vinculación lectura–activo → activo biológico → especie
        → consulta del umbral RF-17 → clasificación semafórica → dashboard/historial → UI
```

en la que M02 aporta activo y especie, M09 aporta RF-17 y sus niveles, y **M03 debe recibir y
contextualizar la medición, resolver la vinculación y consumir RF-17 para el monitoreo**.

Secuencia requerida y punto de interrupción:

1. La medición se ingiere correctamente. ✔
2. Para aplicar RF-17 debe relacionarse con un activo biológico. **✘ La relación no se completa.**
3. El activo permite obtener la especie. — no alcanzable
4. Con especie y variable se obtiene el umbral RF-17 vigente. — no alcanzable
5. Solo entonces puede ejecutarse la clasificación NORMAL / PRECAUCIÓN / CRÍTICO. — no alcanzable

El paso 2 corresponde al flujo de vinculación RF-61, perteneciente a M03. El alcance actualmente
disponible resuelve esa relación mediante una implementación parcial que no la completa, por lo que la
lectura no obtiene especie: de ahí que `id_especie` e `id_umbral_ambiental` queden nulos y que el
clasificador incorporado por PR #382/#383 —cuya presencia sí quedó confirmada en esta reevaluación—
no llegue a ejecutarse.

**Fue posible enviar mediciones por la API y observar respuestas porque existe implementación parcial
de telemetría. Eso no significa que TC-M09-G31 sea verificable funcionalmente:** el caso no puede
verificarse de extremo a extremo con el alcance actualmente desarrollado.

---

## 7. Análisis TEST / DEV

**TEST.** Se logró construir el fixture completo y ejecutar el diagnóstico parcial descrito en la
sección 5.

**DEV.** Se autenticó correctamente y se realizó un contraste de solo lectura. No existía un umbral
RF-17 utilizable para reejecutar los tres casos, de modo que no se generaron mediciones ni se
ejecutaron los casos funcionalmente en ese ambiente.

DEV no contradice la dependencia identificada, pero no permite una segunda ejecución funcional
completa de G31.

---

## 8. Estado de INC-M09-106-G31 (Issue #297)

**Estado de verificación V3: NO VERIFICABLE — pendiente de dependencia M03.**

Los PR #382/#383 incorporaron componentes de la corrección solicitada, incluida la clasificación por
niveles RF-17. La V3 confirmó la presencia de esa lógica, pero no fue posible certificar su
funcionamiento de extremo a extremo porque la medición no alcanza un contexto completo
activo → especie a través del flujo de M03.

No se crea una incidencia adicional. La verificación de #297 queda pendiente hasta que M03 disponga
del flujo de telemetría/vinculación requerido.

---

## 9. Observaciones técnicas

### 9.1 Vinculación de lecturas (RF-61) — observación pendiente de M03

Durante el diagnóstico se observó que, para las mediciones ingeridas, no queda registrada ninguna
vinculación de la lectura a un activo biológico, ni siquiera en estado `SIN_VINCULAR`. Al no existir
un registro de vinculación, tampoco es aplicable la gestión manual prevista para resolverla o
corregirla, y la lectura no puede obtener especie.

El hallazgo se conserva como **observación diagnóstica de funcionalidad de M03 pendiente**, no como
incidencia formal de M09 ni como defecto del caso. Debe volver a comprobarse cuando M03 entre en
alcance de QA.

### 9.2 Historial de telemetría — observación visual pendiente de M03

Durante la evaluación se observó que la vista de Historial de telemetría no renderiza correctamente
cuando existen datos estadísticos en la respuesta, y genera una excepción al formatearlos. Por ese
motivo no fue posible obtener evidencia visual del semáforo por medición en esa pantalla; la vista de
Monitoreo, en cambio, mostró de forma fiel el estado entregado por la API para el sensor del fixture.

El hallazgo se conserva como observación técnica, pero no se registra como incidencia formal en esta
evaluación debido a que la vista pertenece al alcance de M03, módulo todavía no entregado oficialmente
para QA. Debe verificarse nuevamente cuando M03 entre en alcance. Si el comportamiento persiste,
deberá registrarse entonces como incidencia de Frontend.

---

## 10. Conclusión

**TC-M09-G31: BLOQUEADO / NO VERIFICABLE POR DEPENDENCIA FUNCIONAL PENDIENTE DE M03.**

La reevaluación confirmó que M09 dispone de una configuración RF-17 válida y que M02 dispone de
activos biológicos y especies suficientes para construir el contexto del caso. También se verificó que
las correcciones asociadas a #297 incorporaron la lógica de clasificación por niveles RF-17.

Sin embargo, TC-M09-G31 no valida únicamente la configuración del umbral. Para comprobar
NORMAL→VERDE, PRECAUCIÓN→AMARILLO y CRÍTICO→ROJO sobre una medición real se requiere el flujo de
telemetría y vinculación lectura→activo→especie correspondiente a M03.

M03 todavía no se encuentra oficialmente desarrollado/entregado de forma completa. La implementación
parcial disponible permite ingerir mediciones, pero no completa la vinculación necesaria para obtener
la especie y aplicar el umbral RF-17. Por ello la clasificación no puede verificarse de extremo a
extremo.

Los resultados observados durante la ejecución se conservan como evidencia diagnóstica, pero no se
utilizan para rechazar funcionalmente RF-17 ni para declarar un defecto definitivo de M09.

Los casos TC-M09-66, TC-M09-67 y TC-M09-68 deberán reejecutarse cuando el flujo requerido de M03 se
encuentre implementado, integrado y disponible para QA.

---

La evaluación se realizó sin modificar código productivo ni configuración RF-17. Las evidencias
técnicas de la ejecución se conservan en la carpeta del RUN_ID correspondiente.
