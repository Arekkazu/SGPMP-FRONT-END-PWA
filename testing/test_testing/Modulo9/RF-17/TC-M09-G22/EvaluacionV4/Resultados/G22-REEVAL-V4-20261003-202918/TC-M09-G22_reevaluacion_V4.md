# TC-M09-G22 — REEVALUACIÓN V4

**Grupo:** TC-M09-G22 — Configuración de umbrales ambientales válidos
**Casos:** TC-M09-46, TC-M09-47, TC-M09-48, TC-M09-49
**Requerimiento:** RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
**Caso de uso:** CU-03 — Configurar Umbrales y Alertas Ambientales por Especie
**Tipo:** Funcional
**Responsable QA:** Juan Esteban
**RUN_ID:** `G22-REEVAL-V4-20261003-202918`
**Fecha:** 2026-10-03
**Entorno decisorio:** TEST

---

## DECISIÓN GENERAL

### TC-M09-G22: APROBADO

### TC-M09-46: APROBADO
### TC-M09-47: APROBADO
### TC-M09-48: APROBADO
### TC-M09-49: APROBADO

Las cuatro altas válidas respondieron **HTTP 201** y quedaron correctamente persistidas, con la
variable, el rango, los tres niveles y el estado activo exactos, combinación única y sin alterar los
registros previos. El defecto que causó el rechazo de V3 —`500 FALLO_SINCRONIZACION_EDGE` ante un
estado `PENDIENTE`— **no reapareció en ninguno de los cuatro casos**.

La verificación visual se completó para los cuatro casos sobre esos mismos registros: la interfaz
muestra cada configuración con su variable, unidad, rango, tres niveles y estado activo, y la
legibilidad del `Rango general` sigue cumpliendo el contraste exigido, sin regresión de
INC-M09-102-G22.

---

## RESUMEN DEL RESULTADO

| Caso | Variable | Rango | POST | id | Persistencia | UI | Resultado |
|---|---|---|---|---|---|---|---|
| TC-M09-46 | Oxígeno disuelto | 8.00 – 12.00 | **201** | 59 | correcta | correcta | **APROBADO** |
| TC-M09-47 | Temperatura del agua | 18.00 – 27.00 | **201** | 60 | correcta | correcta | **APROBADO** |
| TC-M09-48 | Humedad Relativa | 40.00 – 60.00 | **201** | 61 | correcta | correcta | **APROBADO** |
| TC-M09-49 | pH del agua | 5.60 – 8.40 | **201** | 62 | correcta | correcta | **APROBADO** |

Escrituras de umbral: **4 POST, uno por caso**, sin reintentos. Aserciones automatizadas: **95 en
total, 0 fallidas** (23 + 24 + 24 + 24).

---

## ANTECEDENTES

**V1 — RECHAZADO.** Las altas válidas respondían `500 ERROR_INTERNO` y no había persistencia. Origen
de `INC-M09-31-G22`.

**V2 — APROBADO.** 4/4 POST → 201 con persistencia correcta. `INC-M09-31-G22` quedó corregida. Se
detectó la observación visual `INC-M09-102-G22`.

**V3 — RECHAZADO.** Los cuatro casos respondieron `500 FALLO_SINCRONIZACION_EDGE`, aunque **los cuatro
registros sí quedaron correctamente persistidos**. La causa de V1 no reapareció: el rechazo se debió a
un cambio posterior en el que `EdgeSincronizacionStubAdapter` devolvía `PENDIENTE` y el caso de uso
trataba como error cualquier estado distinto de `APLICADA`. `INC-M09-102-G22` quedó verificada como
corregida.

**Corrección posterior a V3.** El flujo pasó a tratar `PENDIENTE` como estado sin fallo, reservando el
500 para una propagación realmente intentada y fallida. El issue backend asociado (#459) figura
cerrado. V4 debía comprobar si eso devuelve el 201 a las altas válidas.

---

## ENTORNO

| Elemento | Valor |
|---|---|
| Entorno decisorio | TEST |
| `/health` | 200 |
| `/openapi.json` | 200, con `201` declarado como éxito de `POST /configuracion/umbrales` |
| Interfaz de TEST | `https://api.inmero.co`, publicada bajo el mismo dominio registrable que su API |
| Rama (frontend y backend) | `qa/juan-esteban-cuarta-evaluacion-M09-y-M02` |
| Índice de Git | intacto; sin cambios en código productivo |

El contrato declara también un `500` para fallo real de propagación, lo que no altera el expected de
una configuración válida.

---

## ACTOR / IDENTIDAD TÉCNICA

Mismo actor de V2 y V3: **Administrador**, cuenta activa, con permisos de creación y consulta sobre el
recurso de umbrales ambientales. Verificado antes del RUN; no se sustituyó en ningún momento.

---

## CONFIGURACIÓN UTILIZADA / FIXTURE

Por unicidad `(especie, variable)`, las combinaciones empleadas en V2 y V3 quedaron ocupadas. Conforme
a la regla de equivalencia se conservó **la misma variable, el mismo rango y los mismos tres niveles**
de cada caso, y se cambió únicamente la especie.

| Caso | Especie utilizada | Variable | Rango | Niveles (normal / precaución / crítico) |
|---|---|---|---|---|
| TC-M09-46 | 69 — Trucha Acuatica Prueba Cuarta (acuática) | Oxígeno disuelto | 8.00 – 12.00 | 8.00–9.33 / 9.33–10.66 / 10.66–12.00 |
| TC-M09-47 | 69 — Trucha Acuatica Prueba Cuarta (acuática) | Temperatura del agua | 18.00 – 27.00 | 18.00–21.00 / 21.00–24.00 / 24.00–27.00 |
| TC-M09-48 | 40 — Bovino Qa Je (terrestre) | Humedad Relativa | 40.00 – 60.00 | 40.00–46.66 / 46.66–53.32 / 53.32–60.00 |
| TC-M09-49 | 61 — Especie Acuatica Prueba (acuática) | pH del agua | 5.60 – 8.40 | 5.60–6.53 / 6.53–7.46 / 7.46–8.40 |

Los cuatro rangos siguen dentro de los límites físicos vigentes del catálogo (Oxígeno disuelto 0–20,
Temperatura del agua 0–45, Humedad Relativa 0–100, pH del agua 0–14), por lo que no hubo deriva de
requisito ni fue necesario recalcular ningún valor.

---

## PREPARACIÓN DE PRECONDICIONES

El discovery de solo lectura encontró que **ninguna especie acuática activa tenía libres las
combinaciones de TC-M09-46 ni de TC-M09-47**: las trece especies activas del catálogo ya tenían
ocupadas Oxígeno disuelto y Temperatura del agua en todas las acuáticas, incluido el fixture que usó
V3. Las únicas especies libres para esas dos variables eran terrestres, y emplearlas habría cambiado
la naturaleza semántica del caso.

La automatización se detuvo antes de cualquier escritura y el bloqueo se escaló. Con autorización del
responsable QA se provisionó **una única especie acuática de QA** mediante el flujo oficial
(`POST /configuracion/especies` → HTTP 201), que quedó activa y sin umbrales asociados. Con ella, las
dos combinaciones de TC-M09-46 y TC-M09-47 pasaron a estar libres.

No se borró, desactivó ni modificó ninguna especie ni ninguna configuración existente para liberar
combinaciones. TC-M09-48 y TC-M09-49 no requirieron preparación alguna.

Tras la provisión, el checklist del plan quedó completo en sus **30 condiciones**, incluidas: misma
variable que V2, mismo rango que V2, rango dentro de los límites físicos actuales, solo especie
modificada, tipo de especie coherente con V2, ausencia de escrituras previas en las combinaciones
elegidas y conservación de los datos históricos.

---

## TC-M09-46

**Resultado: APROBADO.**

| Verificación | Resultado |
|---|---|
| HTTP del POST | **201** |
| `id_umbral_ambiental` presente | 59 |
| Especie correcta | Trucha Acuatica Prueba Cuarta |
| Variable correcta | Oxígeno disuelto |
| `valor_min` / `valor_max` exactos | 8.00 / 12.00 |
| Tres niveles exactos | sí |
| `es_activo` | true |
| Registro consultable por GET | sí |
| Combinación única | 1 registro |
| Registros previos conservados | sí |
| Fila visible en la interfaz con variable, unidad, rango, tres niveles y estado activo | sí |
| Aserciones | 23, 0 fallidas |

`estado_sincronizacion = PENDIENTE`, que conforme al alcance de G22 no convierte el caso en fallo:
el alta válida respondió 201 y el contrato funcional se cumple íntegramente.

---

## TC-M09-47

**Resultado: APROBADO.**

| Verificación | Resultado |
|---|---|
| HTTP del POST | **201** |
| `id_umbral_ambiental` presente | 60 |
| Especie correcta | Trucha Acuatica Prueba Cuarta |
| Variable correcta | Temperatura del agua |
| `valor_min` / `valor_max` exactos | 18.00 / 27.00 |
| Tres niveles exactos | sí |
| `es_activo` | true |
| Registro consultable por GET | sí |
| Combinación única | 1 registro |
| Registros previos conservados | sí |
| Fila visible en la interfaz con variable, unidad, rango, tres niveles y estado activo | sí |
| Aserciones | 24, 0 fallidas |

---

## TC-M09-48

**Resultado: APROBADO.**

| Verificación | Resultado |
|---|---|
| HTTP del POST | **201** |
| `id_umbral_ambiental` presente | 61 |
| Especie correcta | Bovino Qa Je (terrestre, como exige el caso) |
| Variable correcta | Humedad Relativa |
| `valor_min` / `valor_max` exactos | 40.00 / 60.00 |
| Tres niveles exactos | sí |
| `es_activo` | true |
| Registro consultable por GET | sí |
| Combinación única | 1 registro |
| Registros previos conservados | sí |
| Fila visible en la interfaz con variable, unidad, rango, tres niveles y estado activo | sí |
| Aserciones | 24, 0 fallidas |

---

## TC-M09-49

**Resultado: APROBADO.**

| Verificación | Resultado |
|---|---|
| HTTP del POST | **201** |
| `id_umbral_ambiental` presente | 62 |
| Especie correcta | Especie Acuatica Prueba (acuática, como exige el caso) |
| Variable correcta | pH del agua |
| `valor_min` / `valor_max` exactos | 5.60 / 8.40 |
| Tres niveles exactos | sí |
| `es_activo` | true |
| Registro consultable por GET | sí |
| Combinación única | 1 registro |
| Registros previos conservados | sí |
| Fila visible en la interfaz con variable, unidad, rango, tres niveles y estado activo | sí |
| Aserciones | 24, 0 fallidas |

---

## RESULTADO DEL ORÁCULO

| Verificación | Resultado |
|---|---|
| Contrato declara 201 como éxito del alta | CUMPLE |
| Actor correcto, activo y con permisos | CUMPLE |
| Cuatro combinaciones libres confirmadas antes de escribir | CUMPLE |
| Equivalencia con V2: misma variable, rango y niveles | CUMPLE |
| Un único POST por caso, sin reintentos | CUMPLE |
| HTTP 201 en los cuatro casos | CUMPLE |
| Persistencia verificada por GET en los cuatro casos | CUMPLE |
| Valores y niveles exactos | CUMPLE |
| Unicidad de cada combinación | CUMPLE |
| Registros previos y datos históricos conservados | CUMPLE |
| `500 FALLO_SINCRONIZACION_EDGE` ausente | CUMPLE |
| Verificación visual en la interfaz, en los cuatro casos | CUMPLE |
| Contraste del `Rango general` (regresión de INC-M09-102-G22) | CUMPLE |
| Umbrales creados por la prueba de interfaz | 0 — Cypress solo observa |

**Automatización: 95 aserciones, 0 fallidas.**

---

## COMPARACIÓN V1 VS V2 VS V3 VS V4

| Aspecto | V1 | V2 | V3 | V4 |
|---|---|---|---|---|
| TC-M09-G22 | RECHAZADO | APROBADO | RECHAZADO | **APROBADO** |
| TC-M09-46 | RECHAZADO | APROBADO | RECHAZADO | **APROBADO** |
| TC-M09-47 | RECHAZADO | APROBADO | RECHAZADO | **APROBADO** |
| TC-M09-48 | RECHAZADO | APROBADO | RECHAZADO | **APROBADO** |
| TC-M09-49 | RECHAZADO | APROBADO | RECHAZADO | **APROBADO** |
| HTTP de las altas válidas | 500 `ERROR_INTERNO` | 201 | 500 `FALLO_SINCRONIZACION_EDGE` | **201** |
| Persistencia | no | sí | sí, pese al 500 | **sí** |
| Variable por caso | — | Oxígeno, Temp. agua, Humedad, pH | las mismas | **las mismas** |
| Rango por caso | — | 8–12, 18–27, 40–60, 5.60–8.40 | los mismos | **los mismos** |
| Niveles por caso | — | tres por caso | los mismos | **los mismos** |
| Fixture (especie) | — | Mojarra, Tilapia, Bovino, Camarón | fixture QA 61 y equivalentes | **especie QA nueva (46/47), Bovino Qa Je (48), fixture 61 (49)** |
| Estado de sincronización | — | — | `PENDIENTE` → provocaba 500 | **`PENDIENTE` sin provocar 500** |
| INC-M09-31-G22 | abierta | corregida | sin regresión | **sin regresión** |
| INC-M09-102-G22 | — | detectada | corregida y verificada | **sin regresión: contraste AA cumplido** |

### Evolución

G22 recupera el resultado de V2. El rechazo de V3 fue de causa acotada y ajena al objeto del grupo —el
tratamiento del estado de sincronización—, y esa causa está corregida: con el mismo stub devolviendo
`PENDIENTE`, las cuatro altas válidas responden ahora 201. Lo único que cambió respecto de V3 en el
plano de la prueba es la especie de cada caso, forzada por la unicidad `(especie, variable)`; la
variable, el rango, los niveles, el actor, el endpoint y el expected son idénticos.

---

## COMPARACIÓN TEST VS DEV

**No fue necesario usar DEV como contraste.** TEST permitió verificar la corrección directamente: las
cuatro altas válidas respondieron 201 con persistencia correcta, de modo que no se dio el escenario
que habría obligado a comprobar un posible desfase de despliegue (TEST reproduciendo el
comportamiento viejo con `500 FALLO_SINCRONIZACION_EDGE`).

---

## ORIGEN / INTERPRETACIÓN DEL RESULTADO

El resultado confirma que la corrección posterior a V3 funciona en el sistema desplegado. El flujo de
alta de umbrales guarda la configuración, registra su estado de sincronización como `PENDIENTE` —
porque la propagación al Nodo Edge sigue cubierta por un stub— y **ya no convierte ese estado en un
error 500**. El 500 queda reservado a una propagación realmente intentada y fallida, que es alcance de
otro grupo y no de G22.

Conviene subrayar el límite del veredicto: G22 aprueba la configuración funcional válida de umbrales,
no la propagación al Edge. Un `estado_sincronizacion = PENDIENTE` es compatible con la aprobación de
este grupo y no debe leerse como verificación de integración con el Nodo Edge.

Sobre el fixture: la necesidad de provisionar una especie acuática nueva no es un defecto del
producto, sino una consecuencia de la unicidad `(especie, variable)` combinada con cuatro
evaluaciones sucesivas que han ido consumiendo las combinaciones disponibles. Conviene anticipar que
futuras reevaluaciones de este grupo necesitarán especies adicionales, o bien una política de datos de
prueba que las contemple.

---

## INCIDENCIA

### INC-M09-31-G22 — sin regresión

La causa original de V1 no reapareció: las cuatro altas persistieron correctamente, con sus tres
niveles insertados y valores exactos. No procede reabrirla.

### INC-M09-102-G22 — sin regresión

Quedó corregida y verificada en V3. La comprobación de regresión visual se realizó en los cuatro
casos: la celda de `Rango general` es visible, legible y cumple el contraste mínimo exigido. No se
crea incidencia nueva.

### Issue backend #459 / defecto de V3 — CORREGIDO Y VERIFICADO POR QA

Condición exigida por V4: alta válida con el stub devolviendo `PENDIENTE` debe responder **201**. Se
cumple en los cuatro casos. El defecto que causó el rechazo de V3 queda verificado como corregido.

### Interfaz de TEST — sin defecto; la causa fue la URL usada por la automatización

Una primera ejecución automatizada de la verificación visual no logró iniciar sesión y quedó en
`/login`. El diagnóstico descartó que se tratara de un defecto del producto:

- las credenciales empleadas eran las correctas y llegaban íntegras al formulario;
- el `POST` de sesión respondía **200**, sin ninguna respuesta HTTP igual o superior a 400 en todo
  el flujo y sin errores de consola;
- el navegador, sin embargo, no almacenaba **ninguna cookie** ni token.

La causa es que esa ejecución apuntaba a la dirección anterior de la interfaz, alojada en un dominio
registrable distinto del de la API que ahora consume. La sesión se sostiene en una cookie de refresco
marcada `SameSite=lax`, que el navegador descarta en esa combinación entre sitios, de modo que el
inicio de sesión no llega a completarse. El propio código del backend advierte de este riesgo cuando
el front vive en otro dominio registrable.

Repetida la verificación contra la dirección vigente de la interfaz —publicada bajo el mismo dominio
registrable que su API—, el inicio de sesión funciona y los cuatro casos superan la comprobación
visual. Coincide con la comprobación manual del responsable QA.

**No hay defecto de frontend que registrar.** Queda únicamente la nota operativa de que la dirección
antigua de la interfaz ya no es utilizable contra el backend actual, y de que la automatización de
este grupo se actualizó para apuntar a la vigente.

## CONCLUSIÓN

**TC-M09-G22 queda APROBADO**, y con él sus cuatro casos: **TC-M09-46**, **TC-M09-47**, **TC-M09-48**
y **TC-M09-49**.

La cuarta evaluación reprodujo exactamente la prueba de V3 —mismo actor, mismo endpoint, mismas
variables, mismos rangos, mismos niveles y mismo expected— cambiando únicamente la especie de cada
caso, que la unicidad `(especie, variable)` obligaba a renovar. Las cuatro altas válidas respondieron
201 y quedaron correctamente persistidas, con valores y niveles exactos, combinación única y sin
tocar los registros históricos.

El defecto que provocó el rechazo de V3 está corregido y verificado: con el estado de sincronización
en `PENDIENTE`, el alta válida vuelve a responder 201. G22 recupera así el resultado que tuvo en V2.

La verificación visual se completó para los cuatro casos sobre los registros creados, sin que la
prueba de interfaz emitiera ninguna escritura, y la legibilidad del `Rango general` sigue cumpliendo
el contraste exigido: INC-M09-102-G22 continúa sin regresión.

---

La evaluación se realizó con exactamente un POST por caso y sin reintentos, sin SQL de escritura, sin
modificar ni desactivar configuraciones existentes y sin tocar código productivo. La única escritura
adicional fue la provisión autorizada de una especie acuática de QA por el flujo oficial. V1, V2 y V3
permanecen intactas, el índice de Git no se modificó y el escaneo de seguridad no encontró secretos
persistidos (37 archivos revisados, 0 comprometidos).
