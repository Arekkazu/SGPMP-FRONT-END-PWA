# TC-M09-G22 — REEVALUACIÓN V3

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental

Casos: TC-M09-46 · TC-M09-47 · TC-M09-48 · TC-M09-49
Responsable QA: Juan Esteban
RUN_ID: `G22-REEVAL-V3-20260925-223414`
Fecha: 2026-09-25
Entorno decisorio: **TEST**

---

## 0. DECISIÓN GENERAL

### V3 RECHAZADA — defecto nuevo de backend · observación de interfaz RESUELTA

Los cuatro originales se ejecutaron con un POST cada uno. **Los cuatro guardaron la
configuración correctamente**, pero **ninguno devolvió el HTTP 201 exigido**: los cuatro
respondieron **HTTP 500 `FALLO_SINCRONIZACION_EDGE`**. El expected oficial de G22 es 201
exacto, así que los cuatro casos quedan **RECHAZADOS**.

El dato sí queda bien: los ids **50, 51, 52 y 53** persistieron con la especie y la
variable correctas, el rango exacto, los tres niveles contiguos y `es_activo = true`,
verificado por GET posterior y en la interfaz.

**No es la reaparición de INC-M09-31-G22.** Aquel defecto era `ERROR_INTERNO` **sin
persistencia**, causado por `insertmanyvalues` sobre un ENUM nativo al insertar los niveles.
Aquí la persistencia y los tres niveles funcionan perfectamente: la corrección de V2 sigue
vigente. Lo que falla es una etapa posterior —la propagación al Nodo Edge— introducida
**después** de V2.

**INC-M09-102-G22 quedó verificada como corregida**: la columna «Rango general» se lee con
un contraste de **14.97:1** en las cuatro filas nuevas, frente al 1:1 de V2.

| Caso | V1 | V2 | V3 | Evolución | Categoría | Equipo | Acción |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | RECHAZADO (500 `ERROR_INTERNO`, sin persistencia) | APROBADO (201, id 38) | **RECHAZADO** — 500 `FALLO_SINCRONIZACION_EDGE`, id 50 persistido | Defecto distinto; la causa de V1 no reaparece | Producto Backend — defecto nuevo | Desarrollo (Backend / IoT) | Ver §25: alinear el flujo alterno Edge con el contrato |
| TC-M09-47 | RECHAZADO (ídem) | APROBADO (201, id 39) | **RECHAZADO** — 500 `FALLO_SINCRONIZACION_EDGE`, id 51 persistido | Ídem | Ídem | Ídem | Ídem |
| TC-M09-48 | RECHAZADO (ídem) | APROBADO (201, id 40) | **RECHAZADO** — 500 `FALLO_SINCRONIZACION_EDGE`, id 52 persistido | Ídem | Ídem | Ídem | Ídem |
| TC-M09-49 | RECHAZADO (ídem) | APROBADO (201, id 41) | **RECHAZADO** — 500 `FALLO_SINCRONIZACION_EDGE`, id 53 persistido | Ídem | Ídem | Ídem | Ídem |

**Estado de las incidencias**

- **INC-M09-31-G22** → **SIN REGRESIÓN**. El defecto original no se reproduce: hay
  persistencia completa y los tres niveles se insertan correctamente en los cuatro casos.
- **INC-M09-102-G22** → **OBSERVACIÓN RESUELTA / corrección verificada por QA en TEST**
  (contraste 14.97:1 en 4/4).
- **Hallazgo nuevo (sin ticket creado)**: todo alta válida de umbral responde 500 pese a
  guardar. Ligado al cambio de **INC-M09-104-G29**. Detalle en §22, §23 y §25.

---

## 1. MOTIVO DE LA TERCERA EVALUACIÓN

- **V1** rechazó el grupo: los cuatro originales recibieron HTTP 500 `ERROR_INTERNO` al
  crear la configuración y no hubo persistencia. Se registró **INC-M09-31-G22**.
- Desarrollo atribuyó la causa a `insertmanyvalues` sobre el ENUM nativo de nivel y corrigió
  con `use_insertmanyvalues=False` (PR #146 histórico).
- **V2** reejecutó los cuatro casos: 4 POST, 4 HTTP 201, ids 38–41 persistidos, 87
  aserciones Newman sin fallos. INC-M09-31-G22 quedó corregida y verificada por QA.
- V2 detectó además un fallo de interfaz: «Rango general» en texto blanco sobre fondo
  blanco, contraste 1:1 → **INC-M09-102-G22** (issue frontend #116). Desarrollo reportó
  después la corrección en el PR #119.
- **V3** persigue dos objetivos independientes:
  **A)** comprobar que la corrección funcional de backend sigue estable, sin regresión;
  **B)** comprobar empíricamente en TEST si la observación de interfaz quedó corregida,
  porque un issue cerrado o un PR mergeado no equivalen a corrección verificada por QA.

El objetivo B se cumplió. El objetivo A detectó un defecto **nuevo y distinto**.

---

## 2. EVALUACIÓN V1

`Resultado general V1: Rechazado`. Evidencia en `RF-17/TC-M09-G22/RESULTADOS/run-20260906/`
— solo lectura, intacta.

| Caso | Especie | Variable | Rango | Esperado | Obtenido | Persistencia |
| --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | 4 Cachama Blanca | 9 Temperatura Ambiental | −5.00 – 55.00 | 201 | **500 `ERROR_INTERNO`** | No |
| TC-M09-47 | 4 Cachama Blanca | 9 Temperatura Ambiental | 35.50 – 39.20 | 201 | **500 `ERROR_INTERNO`** | No |
| TC-M09-48 | 4 Cachama Blanca | 10 Humedad Relativa | 30.00 – 70.00 | 201 | **500 `ERROR_INTERNO`** | No |
| TC-M09-49 | 4 Cachama Blanca | 2 pH del agua | 6.50 – 8.00 | 201 | **500 `ERROR_INTERNO`** | No |

Hallazgo: **INC-M09-31-G22**. Ocho POST en total (dos intentos por original).

---

## 3. REEVALUACIÓN V2

`Resultado general V2: Aprobado`. Evidencia en
`EvaluacionV2/RESULTADOS/G22-REEVAL-V2-20260913-004518/` — solo lectura, intacta.

| Caso | Especie | Variable | Rango | Niveles (normal / precaución / crítico) | HTTP | ID |
| --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | 5 Mojarra Plateada | 3 Oxígeno disuelto | 8.00 – 12.00 | 8.00–9.33 / 9.33–10.66 / 10.66–12.00 | **201** | **38** |
| TC-M09-47 | 10 Tilapia | 1 Temperatura del agua | 18.00 – 27.00 | 18.00–21.00 / 21.00–24.00 / 24.00–27.00 | **201** | **39** |
| TC-M09-48 | 39 Bovino | 10 Humedad Relativa | 40.00 – 60.00 | 40.00–46.66 / 46.66–53.32 / 53.32–60.00 | **201** | **40** |
| TC-M09-49 | 3 Camarón Blanco | 2 pH del agua | 5.60 – 8.40 | 5.60–6.53 / 6.53–7.46 / 7.46–8.40 | **201** | **41** |

4 POST · 4 HTTP 201 · **87 aserciones Newman** · 0 fallos · persistencia verificada por GET.
Observación de interfaz: «Rango general» invisible con contraste 1:1, en las cuatro filas y
también en umbrales preexistentes.

---

## 4. MOTIVO DE CAMBIO DE FIXTURES

Los cuatro registros de V2 **siguen persistidos** en TEST (ids 38–41). Como la unicidad es
por `(especie, variable)`, esas combinaciones **no pueden volver a crearse**. No se borran,
no se desactivan y no se modifican: son evidencia histórica de V2. Por eso V3 conserva
variable, rango, niveles, actor, endpoint y expected, y **solo sustituye la especie**.

El discovery confirmó además que las cinco especies acuáticas reales activas —Trucha
Arcoíris, Camarón Blanco, Cachama Blanca, Mojarra Plateada y Tilapia— ya tienen umbral
activo para «Oxígeno disuelto» y para «Temperatura del agua», así que TC-M09-46 y
TC-M09-47 no podían instanciarse con el catálogo existente.

Para TC-M09-46 y TC-M09-47 fue necesario sustituir únicamente el fixture de especie porque
las combinaciones utilizadas en V2 permanecen ocupadas por los umbrales persistidos durante
aquella ejecución.

Previamente a V3 se provisionó mediante el flujo oficial de RF-15 la especie acuática de QA
«Especie Acuatica Prueba» (`id_especie = 61`).

La provisión se realizó mediante `POST /configuracion/especies` y obtuvo **HTTP 201**. No se
realizó SQL directo.

Esta operación fue externa a G22 V3 y no forma parte de sus cuatro POST oficiales de
creación de umbrales.

No se modificaron variable, rango, niveles, actor, endpoint, expected ni criterios de
aceptación.

Se trata de un **fixture de QA / dato de prueba provisionado previamente**, no de una
semilla del producto.

---

## 5. CAMBIOS REPORTADOS ENTRE V2 Y V3

### Backend — INC-M09-31-G22

| Aspecto | Estado |
| --- | --- |
| Reportado | Corregido con `use_insertmanyvalues=False` (PR #146) |
| Presente en el código de la rama V3 | **Sí** — `src/shared/database.py:48`, commit `d0c1286a` (2026-09-05) |
| Comprobado en TEST | **Sí** — los cuatro POST persistieron con sus tres niveles: el fallo original no se reproduce |

### Backend — cambio no anunciado en el alcance de V3 (origen del rechazo)

| Aspecto | Estado |
| --- | --- |
| Cambio | `40978d43` (2026-09-17) añadió el estado de sincronización hacia el Nodo Edge y `7d93323f` (2026-09-19) hizo que el alta responda **HTTP 500** si la propagación no queda `APLICADA`. Ambos citan **INC-M09-104-G29** |
| Adaptador vigente | `src/configuration/infrastructure/adapters/edge_sincronizacion_stub_adapter.py:33` devuelve **siempre** `PENDIENTE`: el contrato de publicación con IoT está pendiente de definición |
| Consecuencia | Toda alta válida de umbral guarda el registro y responde 500. Es determinista e independiente de la especie y de la variable |
| Comprobado en TEST | **Sí** — 4/4 casos, 4 especies y 4 variables distintas |

### Frontend — INC-M09-102-G22 / issue #116

| Aspecto | Estado |
| --- | --- |
| Reportado | Corregido en PR #119 |
| Presente en el código de la rama V3 | **Sí** — commit `bb2c5a0` (2026-09-14): la celda declara `color: 'var(--text-primary)'` en `src/configuration/components/UmbralesSection.tsx:567`, más el test unitario «UmbralesSection — contraste de la columna Rango general (#116, INC-M09-102-G22)» |
| Desplegado en TEST | **Sí** |
| Verificado por QA en TEST | **Sí** — 14.97:1 en 4/4 filas (§17 y §19) |

Cambio adicional observado en el frontend desplegado, no reportado: el ítem de navegación
«Configuración» pasó de `<button>` a `<a class="ds-sidebar__item">` dentro de
`nav.ds-sidebar`. Afecta a los selectores de automatización, no a la funcionalidad (§23).

---

## 6. GIT / SHAs

| Repositorio | Rama | SHA | `HEAD...origin/test` | Uso |
| --- | --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-tercera-evaluacion-M09` | `ad2b1e59bb872491bae368ae812993a3ded08d63` | `0  0` | Automatización y evidencia V3; lectura del fix de UI |
| sgpmp-backend | `qa/juan-esteban-tercera-evaluacion-M09` | `91f7738667a934a4eaf3db5519a57d7cf4803b0e` | `0  0` | Solo lectura: fix `use_insertmanyvalues` y flujo de sincronización Edge |

Ambas ramas ya existían; no se crearon, reseteron ni eliminaron. Antes de empezar, el árbol
estaba limpio en los dos repositorios: sin archivos preexistentes sin seguimiento.

---

## 7. ENTORNOS

| Servicio | URL | Estado |
| --- | --- | --- |
| Backend TEST | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` | `/health` 200 · `/openapi.json` 200 |
| Frontend TEST | `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io` | `/login` 200 |

Todo por **HTTPS**. Las URL HTTP suministradas se comprobaron y se documentan: el backend
por HTTP devuelve 404 del proxy y el frontend por HTTP redirige 301 a HTTPS. Entorno
decisorio: **TEST**; no se usó DEV. **No se utilizó MQTT** en ninguna forma: G22 / RF-17 no
lo requiere. Sin acceso directo a base de datos.

### Gate OpenAPI (previo al primer POST)

`POST /configuracion/umbrales` existe. Respuestas declaradas: **`201, 401, 403, 404, 409, 422`**.
Único 2xx declarado: **201** → expected mantenido sin cambios.
DTO `RegistrarUmbralDTO`, requeridos: `id_especie`, `id_variable_ambiental`, `valor_min`,
`valor_max`, `niveles`; `NivelDTO` requiere `nivel`, `limite_inferior`, `limite_superior`.
Respuesta de éxito: `UmbralAmbientalResponse`.

> **Nota contractual relevante.** El contrato **no declara ningún 500**. El 500
> `FALLO_SINCRONIZACION_EDGE` observado en los cuatro casos no está en la especificación
> publicada, por lo que además de incumplir el expected del caso, incumple el propio OpenAPI.

---

## 8. ACTOR

Actor: **Administrador**, `administador.dev@gmail.com` (la cuenta está escrita así en el
sistema y no se corrige). Credencial suministrada al proceso mediante la variable
**`TEST_ADMIN_PASSWORD`**; no se imprime ni se guarda en ningún archivo, colección, reporte
o captura. No se utilizó Veterinario ni ningún otro rol.

| Campo | V2 | V3 | ¿Igual? |
| --- | --- | --- | --- |
| Correo | `administador.dev@gmail.com` | `administador.dev@gmail.com` | Sí |
| id_usuario | 104 | 104 | Sí |
| Rol | Administrador | Administrador | Sí |
| Estado de cuenta | Activo | Activo | Sí |
| Permisos recurso 20 (umbrales) | `[1, 2, 3, 4]` | `[1, 2, 3, 4]` | Sí |

Los permisos `[1, 2, 3, 4]` corresponden a crear, consultar, editar y desactivar. La
autenticación y la autorización funcionaron en todas las llamadas.

---

## 9. DISCOVERY DE DATOS

Solo GET: `/configuracion/especies`, `/configuracion/variables-ambientales` y
`/configuracion/umbrales?id_especie=<id>` por cada especie activa.

- **Especies:** 30 en total, **12 activas** (incluido el fixture 61).
- **Variables ambientales:** 16.
- **Combinaciones ocupadas:** 23 · **libres:** 169.
- **Umbrales visibles antes de V3:** 24.

Variables de los cuatro casos, localizadas **por nombre** en el catálogo vigente y
contrastadas con el id histórico:

| Variable | ID actual | ID histórico | Unidad | Límite físico actual | Límite en V2 | Rango V2 dentro del límite |
| --- | --- | --- | --- | --- | --- | --- |
| Oxígeno disuelto | 3 | 3 | mg/L | 0 – 20 | 0 – 20 | Sí (8.00 – 12.00) |
| Temperatura del agua | 1 | 1 | °C | 0 – 45 | 0 – 45 | Sí (18.00 – 27.00) |
| Humedad Relativa | 10 | 10 | % | 0 – 100 | 0 – 100 | Sí (40.00 – 60.00) |
| pH del agua | 2 | 2 | pH | 0 – 14 | 0 – 14 | Sí (5.60 – 8.40) |

Ningún id ni límite físico cambió respecto de V2, así que los cuatro rangos de V2 se
reprodujeron exactamente, sin recalcular nada.

### Escenarios equivalentes preexistentes y deriva del ambiente

Antes de escribir se detectaron en TEST tres umbrales posteriores a V2 con el payload
canónico de G22 y otra especie: **#45** (Tilapia + Oxígeno disuelto 8.00–12.00), **#47**
(Equino + Humedad Relativa 40.00–60.00) y **#48** (Cachama Blanca + pH 5.60–8.40). El
responsable QA autorizó continuar: no ocupan ninguna de las combinaciones de V3 y la
repetición semántica del mismo caso con otro fixture es válida en una reevaluación.

También se registró que el umbral histórico **id 40** (Bovino + Humedad Relativa, de V2)
figura hoy con `es_activo = false`. El cambio es **ajeno a esta ejecución** —no se emitió
ningún PATCH, DELETE ni SQL— y se documenta como deriva posterior del ambiente compartido.
V2 conserva como verdad histórica que estaba activo durante aquella evaluación. No se
reactivó ni se modificó.

---

## 10. FIXTURE PREPROVISIONADO

| Campo | Valor revalidado por GET antes del plan |
| --- | --- |
| `id_especie` | **61** |
| `nombre` | `Especie Acuatica Prueba` (coincidencia exacta) |
| `es_activo` | `true` |
| `densidad_maxima_por_especie` | `null` |
| Umbrales asociados | **0** |
| Combinación con Oxígeno disuelto | **LIBRE** |
| Combinación con Temperatura del agua | **LIBRE** |

Creado antes de V3 con `POST /configuracion/especies` → HTTP 201, un único POST, sin SQL.
Durante V3 **solo se consultó**: no se recreó, no se editó, no se desactivó y no se borró.
Tras la ejecución quedó con 2 umbrales (los de TC-M09-46 y TC-M09-47), que es el estado
esperado.

---

## 11. PLAN GLOBAL V3

`plan-v3.json`, generado antes del primer POST, con checklist completo (33 verificaciones en
verde). El borrador previo a la autorización se conserva como
`plan-v3-borrador1-preautorizacion.json`.

| Caso | Especie | Activa | Tipo | Variable | Libre | Min | Max | Niveles | Dato modificado vs V2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | 61 Especie Acuatica Prueba | Sí | Acuática | 3 Oxígeno disuelto (mg/L, 0–20) | Sí | 8.00 | 12.00 | 8.00–9.33 / 9.33–10.66 / 10.66–12.00 | Solo especie |
| TC-M09-47 | 61 Especie Acuatica Prueba | Sí | Acuática | 1 Temperatura del agua (°C, 0–45) | Sí | 18.00 | 27.00 | 18.00–21.00 / 21.00–24.00 / 24.00–27.00 | Solo especie |
| TC-M09-48 | 43 Equina | Sí | Terrestre | 10 Humedad Relativa (%, 0–100) | Sí | 40.00 | 60.00 | 40.00–46.66 / 46.66–53.32 / 53.32–60.00 | Solo especie |
| TC-M09-49 | 10 Tilapia | Sí | Acuática | 2 pH del agua (0–14) | Sí | 5.60 | 8.40 | 5.60–6.53 / 6.53–7.46 / 7.46–8.40 | Solo especie |

Sobre los candidatos sugeridos: **Equino** (TC-48) y **Cachama Blanca** (TC-49) se
revalidaron y estaban **ocupados** por los umbrales #47 y #48, así que el planificador
seleccionó los equivalentes libres del mismo tipo semántico: **Equina** (terrestre) y
**Tilapia** (acuática). Variable, rango y niveles se mantuvieron intactos.

---

## 12. TC-M09-46

| Verificación | Resultado |
| --- | --- |
| Especie | 61 Especie Acuatica Prueba, activa, acuática |
| Variable | 3 Oxígeno disuelto, mg/L, límite físico 0–20 confirmado en runtime |
| Combinación libre antes del POST | Sí (la especie tenía 0 umbrales) |
| Rango y niveles | 8.00–12.00 · 8.00–9.33 / 9.33–10.66 / 10.66–12.00 — idénticos a V2 |
| `valor_min < valor_max` y rango dentro del límite físico | Sí |
| POST `/configuracion/umbrales` | **HTTP 500 `FALLO_SINCRONIZACION_EDGE`** (expected 201) |
| Cuerpo de la respuesta | Sin `id_umbral_ambiental`; mensaje: «Configuración guardada en la base de datos, pero falló la actualización de los nodos Edge…» |
| ¿Persistió? | **Sí — id 50**, localizado por GET posterior |
| GET de verificación | Especie 61, variable 3, 8.00–12.00, `es_activo = true`, 3 niveles exactos, `estado_sincronizacion = PENDIENTE` |
| Registros de la combinación | 1 (sin duplicados) |
| Umbrales previos conservados | Sí |
| Registros V2 (38–41) | Presentes y no modificados |
| Newman | 23 aserciones, 10 pasadas, 13 fallidas |
| UI | Fila `#50` visible con variable, rango, unidad, tres niveles y «Activo» |
| Contraste «Rango general» | **14.97:1** (≥ 4.5) |
| Cypress | PASS · 0 POST de umbral emitidos |
| **Resultado** | **RECHAZADO** — el expected 201 no se cumple, pese a que el dato se guardó bien |

Nota de automatización: 1 de las 13 aserciones fallidas fue un defecto propio de QA (la
aserción añadida de equivalencia comparaba `8` con `"8.00"` sin conversión numérica). Se
corrigió inmediatamente y no se repitió en los otros tres casos. Las 12 restantes derivan
del 500.

---

## 13. TC-M09-47

| Verificación | Resultado |
| --- | --- |
| Especie | 61 Especie Acuatica Prueba, activa, acuática |
| Variable | 1 Temperatura del agua, °C, límite físico 0–45 confirmado en runtime |
| Combinación libre antes del POST | Sí (la especie ya tenía el umbral de TC-46; Temperatura del agua seguía libre) |
| Rango y niveles | 18.00–27.00 · 18.00–21.00 / 21.00–24.00 / 24.00–27.00 — idénticos a V2 |
| POST `/configuracion/umbrales` | **HTTP 500 `FALLO_SINCRONIZACION_EDGE`** (expected 201) |
| ¿Persistió? | **Sí — id 51** |
| GET de verificación | Especie 61, variable 1, 18.00–27.00, `es_activo = true`, 3 niveles exactos |
| Registros de la combinación | 1 |
| Umbrales previos conservados | Sí (el id 50 de TC-46 sigue presente) |
| Registros V2 (38–41) | Presentes y no modificados |
| Newman | 24 aserciones, 12 pasadas, 12 fallidas |
| UI | Fila `#51` visible y correcta |
| Contraste «Rango general» | **14.97:1** |
| Cypress | PASS · 0 POST de umbral |
| **Resultado** | **RECHAZADO** — expected 201 incumplido |

---

## 14. TC-M09-48

| Verificación | Resultado |
| --- | --- |
| Especie | 43 Equina, activa, terrestre (Equino quedó descartado por estar ocupado con el umbral #47) |
| Variable | 10 Humedad Relativa, %, límite físico 0–100 confirmado en runtime |
| Combinación libre antes del POST | Sí (la especie tenía 0 umbrales) |
| Rango y niveles | 40.00–60.00 · 40.00–46.66 / 46.66–53.32 / 53.32–60.00 — idénticos a V2 |
| POST `/configuracion/umbrales` | **HTTP 500 `FALLO_SINCRONIZACION_EDGE`** (expected 201) |
| ¿Persistió? | **Sí — id 52** |
| GET de verificación | Especie 43, variable 10, 40.00–60.00, `es_activo = true`, 3 niveles exactos |
| Registros de la combinación | 1 |
| Umbrales previos conservados | Sí (no había previos) |
| Registros V2 (38–41) | Presentes y no modificados |
| Newman | 24 aserciones, 12 pasadas, 12 fallidas |
| UI | Fila `#52` visible y correcta |
| Contraste «Rango general» | **14.97:1** |
| Cypress | PASS · 0 POST de umbral |
| **Resultado** | **RECHAZADO** — expected 201 incumplido |

---

## 15. TC-M09-49

| Verificación | Resultado |
| --- | --- |
| Especie | 10 Tilapia, activa, acuática (Cachama Blanca quedó descartada por estar ocupada con el umbral #48) |
| Variable | 2 pH del agua, escala física 0–14 confirmada en runtime |
| Combinación libre antes del POST | Sí (la especie tenía 2 umbrales previos: #39 y #45) |
| Rango y niveles | 5.60–8.40 · 5.60–6.53 / 6.53–7.46 / 7.46–8.40 — idénticos a V2 |
| POST `/configuracion/umbrales` | **HTTP 500 `FALLO_SINCRONIZACION_EDGE`** (expected 201) |
| ¿Persistió? | **Sí — id 53** |
| GET de verificación | Especie 10, variable 2, 5.60–8.40, `es_activo = true`, 3 niveles exactos |
| Registros de la combinación | 1 |
| Umbrales previos conservados | Sí (#39 y #45 siguen presentes) |
| Registros V2 (38–41) | Presentes y no modificados; el #39 pertenece a esta misma especie y no se alteró |
| Newman | 24 aserciones, 12 pasadas, 12 fallidas |
| UI | Fila `#53` visible y correcta |
| Contraste «Rango general» | **14.97:1** |
| Cypress | PASS · 0 POST de umbral |
| **Resultado** | **RECHAZADO** — expected 201 incumplido |

---

## 16. PERSISTENCIA

Verificación final de solo lectura (`verificacion-final-readonly.json`):

| Caso | ID V3 | Presente | Activo | Valores | Niveles | Combinación única | Previos conservados | `estado_sincronizacion` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | **50** | Sí | Sí | Correctos | Correctos | Sí (1) | Sí | PENDIENTE |
| TC-M09-47 | **51** | Sí | Sí | Correctos | Correctos | Sí (1) | Sí | PENDIENTE |
| TC-M09-48 | **52** | Sí | Sí | Correctos | Correctos | Sí (1) | Sí | PENDIENTE |
| TC-M09-49 | **53** | Sí | Sí | Correctos | Correctos | Sí (1) | Sí | PENDIENTE |

**Registros históricos de V2**

| ID | Especie | Variable | Presente al PRE | Presente al POST | Modificado por V3 |
| --- | --- | --- | --- | --- | --- |
| 38 | Mojarra Plateada | Oxígeno disuelto | Sí | **Sí** | No |
| 39 | Tilapia | Temperatura del agua | Sí | **Sí** | No |
| 40 | Bovino | Humedad Relativa | Sí (`es_activo=false`, deriva ajena previa) | **Sí** | No |
| 41 | Camarón Blanco | pH del agua | Sí | **Sí** | No |

Ningún registro previo se borró, desactivó ni editó durante V3. El fixture 61 pasó de 0 a 2
umbrales, que es exactamente lo previsto.

---

## 17. EVIDENCIA UI

Cypress 13.17.0 con Electron 118 headless: login real, navegación real, `cy.intercept` solo
observacional, sin mocks, sin `force: true` y sin sleeps como prueba principal.
**0 POST `/configuracion/umbrales` emitidos desde Cypress** en los cuatro recorridos.

| Caso | Fila | Variable | Rango en DOM | Visible | Contraste | Niveles | Estado | Cypress |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | `#50` | Oxígeno disuelto | `8.00 – 12.00 mg/L` | Sí | **14.97:1** | 3 correctos | Activo | PASS |
| TC-M09-47 | `#51` | Temperatura del agua | `18.00 – 27.00 °C` | Sí | **14.97:1** | 3 correctos | Activo | PASS |
| TC-M09-48 | `#52` | Humedad Relativa | `40.00 – 60.00 %` | Sí | **14.97:1** | 3 correctos | Activo | PASS |
| TC-M09-49 | `#53` | pH del agua | `5.60 – 8.40 pH` | Sí | **14.97:1** | 3 correctos | Activo | PASS |

Estilos computados de la celda «Rango general», idénticos en las cuatro filas:
`color: rgb(37, 40, 32)` · `-webkit-text-fill-color: rgb(37, 40, 32)` · `opacity: 1` ·
`visibility: visible` · `display: table-cell` · fondo efectivo `rgb(255, 255, 255)`.
Contraste WCAG 2.1 calculado: **14.97:1**, frente al mínimo AA de 4.5:1.

Capturas por caso en `Resultados/<RUN_ID>/cypress/<caso>/recorrido1/screenshots/`:
configuración visible, fila del umbral, fila con niveles y estado, y celda «Rango general».
Blackout de correo y contraseña en el login. Ninguna captura contiene credenciales.

Cypress localiza la fila por su `#ID` creado, no por texto genérico.

---

## 18. REEVALUACIÓN INC-M09-31-G22

**V1:** defecto presente. 8 POST, HTTP 500 `ERROR_INTERNO`, **sin persistencia**. Causa
atribuida por Desarrollo: `insertmanyvalues` de SQLAlchemy 2.0 agrupando los INSERT de los
tres niveles sobre un ENUM nativo de PostgreSQL (`DatatypeMismatch`).

**V2:** corregido y verificado por QA. 4 POST, 4 HTTP 201, ids 38–41 con sus tres niveles.

**V3:** el defecto **no se reproduce**. En los cuatro casos:

- la fila de umbral se creó,
- **los tres niveles se insertaron correctamente** —justo la operación que fallaba—,
- los valores se guardaron sin alteración,
- el registro quedó activo y único para su combinación.

El 500 observado en V3 es de **otra naturaleza y otra etapa**: ocurre después de guardar,
al no poder confirmar la propagación al Nodo Edge, y su `error_code` es distinto
(`FALLO_SINCRONIZACION_EDGE`, no `ERROR_INTERNO`). El fix `use_insertmanyvalues=False` sigue
presente en la rama.

**Evolución: SIN REGRESIÓN.**

---

## 19. REEVALUACIÓN INC-M09-102-G22

**V2:** observación presente. La celda contenía el texto correcto pero con
`color: rgb(255, 255, 255)` y `-webkit-text-fill-color: rgb(255, 255, 255)` sobre fondo
`rgb(255, 255, 255)`: **contraste 1:1**, por debajo del mínimo 4.5:1. Se reproducía en las
cuatro filas y en umbrales preexistentes.

**Fix reportado por Desarrollo:** issue frontend #116, PR #119.

**Presente en el código:** sí — commit `bb2c5a0`, la celda declara `color: var(--text-primary)`,
y el mismo commit añadió un test unitario que fija esa regla.

**V3 en TEST (medición en tiempo de ejecución):** texto `rgb(37, 40, 32)` sobre fondo
`rgb(255, 255, 255)`, opacidad 1, visible, renderizado. **Contraste 14.97:1** en las cuatro
filas nuevas. El rango completo y su unidad se leen sin dificultad.

El fix reportado por Desarrollo **fue verificado en TEST**. La conclusión se apoya en la
medición en runtime, no en el estado administrativo del issue ni en la lectura del código.

**Evolución: OBSERVACIÓN RESUELTA / CORRECCIÓN VERIFICADA POR QA.**

---

## 20. COMPARACIÓN V1 ↔ V2 ↔ V3

| Aspecto | V1 | V2 | V3 | Evolución |
| --- | --- | --- | --- | --- |
| Ambiente | TEST | TEST | TEST | Sin cambio |
| Rama | — | `qa/juan-esteban-re-evaluacion-M02` | `qa/juan-esteban-tercera-evaluacion-M09` | Rama propia |
| SHA frontend | — | `49966d24` | `ad2b1e59` | Incluye el fix de UI `bb2c5a0` |
| SHA backend | — | `ff5f6c9f` | `91f77386` | Mantiene `use_insertmanyvalues=False`; añade el flujo Edge |
| Actor | Administrador | Administrador `administador.dev@gmail.com` (104) | **El mismo** (104, permisos `[1,2,3,4]`) | Sin cambio |
| Casos ejecutados | 4 | 4 | 4 | Sin cambio |
| Especie | 4 Cachama Blanca (las cuatro) | 5 · 10 · 39 · 3 | **61 · 61 · 43 · 10** | Solo fixture |
| Variable | 9, 9, 10, 2 | 3, 1, 10, 2 | **3, 1, 10, 2 — idénticas a V2** | Sin cambio |
| Rango | −5–55 · 35.5–39.2 · 30–70 · 6.5–8 | 8–12 · 18–27 · 40–60 · 5.6–8.4 | **Idénticos a V2** | Sin cambio |
| Niveles | Variados | Tres contiguos por caso | **Idénticos a V2** | Sin cambio |
| HTTP | 500 `ERROR_INTERNO` (8/8) | **201** (4/4) | **500 `FALLO_SINCRONIZACION_EDGE`** (4/4) | Defecto nuevo, distinto |
| Persistencia | Ninguna | Sí, ids 38–41 | **Sí, ids 50–53** (pese al 500) | Mejor que V1; equivalente a V2 |
| IDs creados | — | 38, 39, 40, 41 | **50, 51, 52, 53** | — |
| Newman | 8 POST, 2 intentos por caso | 87 aserciones, 0 fallos | 95 aserciones, 46 pasadas, **49 fallidas** | Fallos derivados del 500 |
| UI | Sin registros | Registros visibles | Registros visibles y correctos | Sin cambio |
| Rango general | No aplica | **Invisible** | **Legible** | **Corregido** |
| Contraste | No aplica | 1:1 | **14.97:1** | Cumple WCAG AA |
| INC-M09-31-G22 | Defecto presente | Corregido y verificado | **SIN REGRESIÓN** | Estable |
| INC-M09-102-G22 | No detectado | Observación presente | **RESUELTA** | Cerrada por QA |
| Resultado TC-46 | Rechazado | Aprobado | **Rechazado** | Nuevo defecto |
| Resultado TC-47 | Rechazado | Aprobado | **Rechazado** | Nuevo defecto |
| Resultado TC-48 | Rechazado | Aprobado | **Rechazado** | Nuevo defecto |
| Resultado TC-49 | Rechazado | Aprobado | **Rechazado** | Nuevo defecto |
| Resultado global | **RECHAZADO** | **APROBADO** | **RECHAZADO** | Retroceso por causa distinta |

---

## 21. COMPARACIÓN DE DATOS

| Caso | V1 | V2 | V3 | Cambio V2→V3 | ¿Cambió la prueba? |
| --- | --- | --- | --- | --- | --- |
| TC-M09-46 | Cachama Blanca + Temp. Ambiental −5.00–55.00 | Mojarra Plateada + Oxígeno disuelto 8.00–12.00 | **Especie Acuatica Prueba (61)** + Oxígeno disuelto 8.00–12.00 | Solo especie | **NO** |
| TC-M09-47 | Cachama Blanca + Temp. Ambiental 35.50–39.20 | Tilapia + Temp. del agua 18.00–27.00 | **Especie Acuatica Prueba (61)** + Temp. del agua 18.00–27.00 | Solo especie | **NO** |
| TC-M09-48 | Cachama Blanca + Humedad 30.00–70.00 | Bovino + Humedad Relativa 40.00–60.00 | **Equina (43)** + Humedad Relativa 40.00–60.00 | Solo especie | **NO** |
| TC-M09-49 | Cachama Blanca + pH 6.50–8.00 | Camarón Blanco + pH 5.60–8.40 | **Tilapia (10)** + pH del agua 5.60–8.40 | Solo especie | **NO** |

Ninguna variable, ningún rango y ningún nivel cambiaron. Tampoco el actor, el endpoint, el
expected ni las validaciones. Las sustituciones de especie son obligadas por la unicidad
`(especie, variable)` y, en TC-48 y TC-49, por la ocupación de los candidatos sugeridos.

---

## 22. REGRESIONES

**Backend.** No hay regresión de INC-M09-31-G22: la creación persiste y los tres niveles se
insertan bien. Sí hay un **defecto nuevo** en el mismo endpoint:

- **Hecho observado.** Las cuatro altas válidas respondieron HTTP 500 con
  `error_code = FALLO_SINCRONIZACION_EDGE`, guardando el registro. El contrato OpenAPI no
  declara ningún 500 para esta operación y el caso exige 201.
- **Causa confirmada (por lectura de código, solo lectura).**
  `edge_sincronizacion_stub_adapter.py:33` devuelve siempre `PENDIENTE` porque el contrato
  de publicación con IoT está pendiente de definición; `registrar_umbral_use_case.py:224`
  lanza `InfrastructureError` con ese código cuando el resultado no es `APLICADA`. Los
  commits son `40978d43` (2026-09-17) y `7d93323f` (2026-09-19), ambos referidos a
  **INC-M09-104-G29**, es decir, posteriores a V2 (2026-09-13).
- **Alcance.** Determinista y universal mientras el adaptador sea un stub: 4 especies y 4
  variables distintas dieron el mismo resultado. No depende del fixture 61.
- **Hipótesis (no confirmada).** El flujo alterno «Error de sincronización con el Nodo Edge»
  de RF-17 probablemente esté pensado para un fallo real de conectividad, no para una
  funcionalidad aún no implementada; mientras el adaptador sea un stub, ninguna alta podrá
  devolver 201. Corresponde a Desarrollo/IoT decidir el comportamiento correcto.

**Frontend.** Ninguna regresión funcional; la observación de V2 está corregida. Se registra
un cambio de marcado en la navegación que invalidó un selector heredado de V2 (§23).

---

## 23. ORIGEN DE FALLOS

| Hallazgo | Producto Backend | Producto Frontend | Automatización QA | Fixture/datos | Ambiente | Autenticación | Contrato | Diagnóstico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP 500 `FALLO_SINCRONIZACION_EDGE` en 4/4 altas | **Sí** | No | No | No | No | No | **Sí** (500 no declarado en OpenAPI) | Causa confirmada en código: stub Edge siempre `PENDIENTE` + exigencia de `APLICADA`. Cambio posterior a V2 (INC-M09-104-G29) |
| 12 aserciones fallidas por caso | No (consecuencia) | No | No | No | No | No | No | Todas derivan del 500: sin cuerpo con `id_umbral_ambiental`, las comprobaciones de la respuesta y del GET por id no pueden resolverse. El dato sí es correcto |
| 1 aserción fallida extra en TC-M09-46 | No | No | **Sí** | No | No | No | No | Defecto propio: la aserción añadida de equivalencia comparaba `8` con `"8.00"`. Corregido antes de TC-47 |
| Selector de navegación de V2 sin coincidencias | No | No (cambio legítimo) | **Sí** | No | No | No | No | La UI desplegada sirve «Configuración» como `<a class="ds-sidebar__item">`. Solo se actualizó el selector de navegación; ninguna aserción se relajó |
| Umbral histórico 40 con `es_activo=false` | No | No | No | **Sí** | **Sí** | No | No | Deriva de un ambiente compartido, ajena a V3. Documentada, no corregida |
| Umbrales 45, 47, 48 con payload equivalente | No | No | No | **Sí** | **Sí** | No | No | Escenarios previos de otras ejecuciones. Autorizados por el responsable QA; no ocupan las combinaciones de V3 |

---

## 24. CATEGORÍAS / RESPONSABLES / ACCIONES

| Ítem | Categoría | Responsable | Acción sugerida |
| --- | --- | --- | --- |
| 500 en toda alta válida de umbral | Defecto de producto (Backend) + desalineación de contrato | Desarrollo Backend / IoT | Definir si el alta debe responder 201 con `estado_sincronizacion = PENDIENTE` (y reservar el 500 para fallos reales de conectividad) o declarar el 500 en OpenAPI y ajustar el criterio del caso |
| INC-M09-31-G22 | Corregido, verificado en dos evaluaciones | Desarrollo / QA | Mantener como corregido; V3 confirma estabilidad |
| INC-M09-102-G22 | Corregido y verificado en TEST | Desarrollo / QA | Sugerir cierre como corrección verificada por QA |
| Selector `nav.ds-sidebar button` | Mantenimiento de automatización | QA | Revisar otros grupos que usen el selector antiguo |
| Deriva de datos en TEST (id 40 desactivado; umbrales equivalentes) | Gestión de datos de prueba | QA / Desarrollo | Valorar especies dedicadas por grupo y un criterio de no alteración de evidencia histórica |

---

## 25. INCIDENCIAS

**No se creó ninguna incidencia ni ningún issue.** G22 ya tiene trazabilidad y no procede
duplicar.

- **INC-M09-31-G22** → se sugiere **mantener como corregida y verificada**, añadiendo que
  V3 confirma la ausencia de regresión (persistencia y tres niveles correctos en 4/4).
- **INC-M09-102-G22 / issue #116** → se sugiere **actualizar a corrección verificada por
  QA**, con referencia a este RUN_ID y a la medición de 14.97:1 en las filas 50–53.
- **Defecto nuevo — 500 en toda alta válida de umbral.** Se documenta aquí y **no se crea
  ticket sin autorización expresa**. Está relacionado con el cambio de **INC-M09-104-G29**,
  por lo que conviene decidir si se registra como incidencia propia de G22, como defecto de
  G29 o como ajuste de contrato. Evidencia disponible:
  `Resultados/<RUN_ID>/TC-M09-4*-v3-intento1.json` y los reportes Newman.

---

## 26. SEGURIDAD

- Contraseña únicamente como variable de proceso **`TEST_ADMIN_PASSWORD`**; no aparece en
  scripts, colección, reportes, capturas, logs ni en este Markdown, y nunca se imprimió.
- Token solo en memoria. Reporter con `omitHeaders`, `showEnvironmentData: false`,
  `showGlobalData: false` y `skipEnvironmentVars: ['token']`.
- Saneador aplicado a toda la evidencia: redacta contraseña, JWT, `Bearer` con valor y
  `refresh_token`.
- Capturas generadas con blackout de correo y contraseña.

**Escaneo final de `EvaluacionV3/`** (`seguridad-evidencias.json`): **57 archivos revisados,
0 con secreto real**. Sin contraseñas literales, sin JWT y sin `Bearer` con valor, incluida
la revisión binaria de los PNG. Las coincidencias de palabras clave son nombres de variable,
el marcador `{{token}}` o texto descriptivo.

---

## 27. GIT FINAL

| Repositorio | Rama | SHA | `HEAD...origin/test` | `git status --short` | `git diff --stat` |
| --- | --- | --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-tercera-evaluacion-M09` | `ad2b1e59bb872491bae368ae812993a3ded08d63` | `0  0` | `?? testing/test_testing/Modulo9/RF-17/TC-M09-G22/EvaluacionV3/` | (vacío) |
| sgpmp-backend | `qa/juan-esteban-tercera-evaluacion-M09` | `91f7738667a934a4eaf3db5519a57d7cf4803b0e` | `0  0` | (vacío) | (vacío) |

- **V1 intacta · V2 intacta · código productivo intacto** en ambos repositorios.
- La única zona escrita es `TC-M09-G22/EvaluacionV3/`.
- **`Resultados/` está ignorada por Git**: la regla `**/resultados/` de `testing/.gitignore:9`
  la excluye, igual que ya ocurría con `RESULTADOS/` de V2 (de V2 solo hay 9 archivos de
  automatización versionados). **No se usó `git add -f`**; la evidencia queda en disco.
- Sin commit, push, merge, rebase, tag, PR ni deploy. Sin SQL de escritura. Sin MQTT.

---

## 28. VEREDICTO FINAL

**TC-M09-G22 V3: RECHAZADA.**

Los cuatro originales se ejecutaron con un POST cada uno, respetando íntegramente la prueba
de V2: mismo actor, mismo endpoint, mismas variables, mismos rangos, mismos niveles y mismas
validaciones; lo único sustituido fue el fixture de especie, obligado por la unicidad
`(especie, variable)`.

Los cuatro **guardaron correctamente** su configuración —ids 50, 51, 52 y 53, con valores,
niveles, unicidad y estado activo verificados por GET y en la interfaz— pero **ninguno
devolvió el HTTP 201 exigido**: los cuatro respondieron **500 `FALLO_SINCRONIZACION_EDGE`**,
un código que el propio contrato OpenAPI no declara. El criterio funcional del caso no se
cumple, de modo que los cuatro quedan rechazados.

El rechazo **no** obedece a la reaparición de INC-M09-31-G22, que queda **SIN REGRESIÓN**:
la inserción de los tres niveles —justo lo que fallaba en V1— funciona sin problemas. La
causa es un cambio posterior a V2, introducido el 2026-09-19 en el flujo de sincronización
con el Nodo Edge (INC-M09-104-G29), cuyo adaptador es todavía un stub que siempre responde
`PENDIENTE`.

En paralelo, **INC-M09-102-G22 queda resuelta y verificada por QA**: la columna «Rango
general» se lee con un contraste de 14.97:1 en las cuatro filas nuevas.

Queda a decisión del equipo si el alta debe responder 201 con `estado_sincronizacion =
PENDIENTE` —reservando el 500 para fallos reales de conectividad— o si el contrato debe
declarar explícitamente ese 500 y revisarse el criterio de aceptación de G22.
