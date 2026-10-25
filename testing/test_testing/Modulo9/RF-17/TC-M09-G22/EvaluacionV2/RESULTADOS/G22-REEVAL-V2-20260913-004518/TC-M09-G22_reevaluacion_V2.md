# TC-M09-G22 — REEVALUACIÓN V2

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
Casos: TC-M09-46 · TC-M09-47 · TC-M09-48 · TC-M09-49
Responsable QA: Juan Esteban · RUN_ID: `G22-REEVAL-V2-20260913-004518` · Fecha local: 2026-09-13 · Entorno decisorio: **TEST**

---

## DECISIÓN GENERAL

### REEVALUACIÓN APROBADA

**TC-M09-46, TC-M09-47, TC-M09-48 y TC-M09-49: APROBADOS.**

El defecto que rechazó V1 **está corregido y verificado por QA**: INC-M09-31-G22
ya no se reproduce. Los cuatro originales crearon su configuración ambiental con
HTTP 201, guardaron valores y niveles, se asociaron a la especie y variable
correctas y conservaron los umbrales previos. Fueron 4 POST, 4 éxitos y 87
aserciones Newman sin fallos. Cada registro creado aparece en la interfaz con su
`#ID`, variable, semaforización, los tres niveles y el estado «Activo».

> **OBSERVACIÓN — fallo de interfaz informado a Desarrollo.** En la tabla
> «Umbrales Ambientales», la columna **Rango general** muestra el rango en texto
> blanco sobre fondo blanco (contraste 1:1), así que no se ve: solo aparece la
> unidad. Ocurre en las cuatro configuraciones y en los umbrales preexistentes.
> No impide la funcionalidad bajo prueba: los datos se crean y guardan bien, y
> el mismo rango se lee en la barra de semaforización y en los niveles. Se
> registra como observación y se **reporta a Desarrollo** (UI_ACCESIBILIDAD).
> Detalle en «INCIDENCIAS».

| Caso | V1 | V2 | Ambiente decisorio | Motivo | Categoría | Equipo | Acción |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-46 | DESAPROBADO (HTTP 500, sin persistencia) | **APROBADO** | TEST | Especie activa + Oxígeno disuelto 8.00–12.00: 201, id 38, guardado y visible en la UI. Observación UI en Rango general | Sin defecto funcional · Observación: UI_ACCESIBILIDAD | Desarrollo (observación) | Actualizar INC-M09-31-G22 como corrección verificada · REPORTAR A DESARROLLO el fallo UI |
| TC-M09-47 | DESAPROBADO (HTTP 500, sin persistencia) | **APROBADO** | TEST | Temperatura del agua 18.00–27.00: 201, id 39, guardado y visible. Observación UI | Ídem | Ídem | Ídem |
| TC-M09-48 | DESAPROBADO (HTTP 500, sin persistencia) | **APROBADO** | TEST | Humedad Relativa 40.00–60.00: 201, id 40, guardado y visible. Observación UI | Ídem | Ídem | Ídem |
| TC-M09-49 | DESAPROBADO (HTTP 500, sin persistencia) | **APROBADO** | TEST | pH del agua 5.60–8.40 (escala 0–14): 201, id 41, guardado y visible. Observación UI | Ídem | Ídem | Ídem |

---

## EVALUACIÓN V1

`Resultado general V1: Rechazado`

Evidencia: `RF-17/TC-M09-G22/RESULTADOS/run-20260906/` (solo lectura, intacta).

| Aspecto | TC-M09-46 | TC-M09-47 | TC-M09-48 | TC-M09-49 |
| --- | --- | --- | --- | --- |
| Resultado V1 | DESAPROBADO — DEFECTO DEL PRODUCTO | Ídem | Ídem | Ídem |
| HTTP esperado / obtenido | 201 / **500 `ERROR_INTERNO`** | 201 / 500 | 201 / 500 | 201 / 500 |
| Intentos | 2 (ambos 500) | 2 | 2 | 2 |
| Especie | 4 Cachama Blanca | 4 Cachama Blanca | 4 Cachama Blanca | 4 Cachama Blanca |
| Variable | 9 Temperatura Ambiental | 9 Temperatura Ambiental | 10 Humedad Relativa | 2 pH del agua |
| Min / max | −5.00 / 55.00 | 35.50 / 39.20 | 30.00 / 70.00 | 6.50 / 8.00 |
| Niveles | 3 contiguos | 3 contiguos | 3 contiguos | 3 contiguos |
| Persistencia | Ninguna | Ninguna | Ninguna | Ninguna |
| UI | Tabla sin el registro (coherente con la falta de persistencia); Cypress sin POST | Ídem | Ídem | Ídem |
| Error | «Error inesperado en base de datos» | Ídem | Ídem | Ídem |
| Categoría V1 | Defecto del producto → Desarrollo | Ídem | Ídem | Ídem |
| Incidencia | V1 la dejó como «ID pendiente». Desarrollo la registró después como **INC-M09-31-G22** (issue #158) | Ídem | Ídem | Ídem |

Los cuatro fallaron por la misma causa. Desarrollo la confirmó en
`sgpmp-backend/anotaciones/modulo_9/inc_m09_umbrales_500_enum_insertmanyvalues.md`:
la columna `nivel` es un ENUM nativo, `insertmanyvalues` casteaba los parámetros
a `::VARCHAR` y eso producía `DatatypeMismatch` y el 500. La corrección fue
`use_insertmanyvalues=False` (PR #146). La rama desplegada entonces en TEST la
había perdido. V1 no tuvo errores de prueba: sus precondiciones eran válidas.

---

## MOTIVO DE REEVALUACIÓN

Verificar la corrección de INC-M09-31-G22. Se **reejecutaron los cuatro
originales** porque comparten el mismo flujo de creación de umbrales y la
corrección y el despliegue pueden afectar a todas las variables. Además, V1 no
aprobó ninguno.

Antes de ejecutar se confirmó en solo lectura que el backend local
(`ff5f6c9`, idéntico a `origin/test`) contiene `use_insertmanyvalues=False` en
`src/shared/database.py`.

---

## ENTORNOS

| Elemento | Valor |
| --- | --- |
| Entorno principal y decisorio | **TEST** (G22 no usa MQTT) |
| Backend usado | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| Frontend usado | `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io` |
| URLs suministradas (HTTP) | Backend `http://…/api-sgpmp-test`: **404 del proxy** en `/health`, sin redirección. Frontend `http://…/login`: **301 → HTTPS**. Se ejecutó sobre HTTPS, el mismo criterio que el responsable QA autorizó en G77; queda registrado en `plan-v2.json` |
| Contrato | `POST /configuracion/umbrales` con **201** como única respuesta 2xx declarada (verificado antes de cada POST) |
| DEV | **No utilizado**: TEST no mostró señales de funcionalidad ausente (ver «COMPARACIÓN TEST VS DEV») |
| Herramientas | Newman 6.2.2 + htmlextra 1.23.1 (globales) · Cypress 13.17.0 + Electron 118 (frontend) · nada instalado |
| PostgreSQL | No utilizado; la persistencia se verificó por API |

---

## GIT / SHAs

| Repositorio | Rama | SHA | Uso |
| --- | --- | --- | --- |
| SGPMP-FRONT-END-PWA | `qa/juan-esteban-re-evaluacion-M02` | `49966d244673eb44d0be61e7df25c27d460b2c1c` (= `origin/test`) | Única zona escribible (`EvaluacionV2`), lectura de componentes UI |
| sgpmp-backend | `qa/juan-esteban-re-evaluacion-M02` | `ff5f6c9f6161e46c94d3d6f325a7d07d80d84aa0` (= `origin/test`) | Solo lectura: DTO, corrección de INC-M09-31-G22, nota de incidencia |

---

## ACTOR

| Elemento | Valor |
| --- | --- |
| Usuario | `administador.dev@gmail.com` |
| Rol (`GET /usuarios/me`) | **Administrador**, cuenta `Activo` |
| Permisos recurso 20 (umbrales) | `[1, 2, 3, 4]` (crear y consultar confirmados) |
| Autorizado por RF-17 | Sí (Administrador / Veterinario) |
| Fallback Veterinario | No necesario |
| Credenciales | Contraseña solo por variable de proceso; token en memoria |

---

## DISCOVERY DE DATOS

Solo GET (`/configuracion/especies`, `/configuracion/variables-ambientales`,
`/configuracion/umbrales?id_especie=`). Ningún POST exploratorio.

- **Especies activas (11):** 41 Ave Qa Je, 39 Bovino, 40 Bovino Qa Je, 4 Cachama
  Blanca, 3 Camarón Blanco, 43 Equina, 42 Equino, 44 Equino Test Qa, 5 Mojarra
  Plateada, 10 Tilapia, 2 Trucha Arcoíris.
- **Variables del catálogo (16), con límites físicos reales:** incluye
  1 Temperatura del agua [0–45], 9 Temperatura Ambiental [−50–100],
  13 Temperatura Corporal [30–50], 10 Humedad Relativa [0–100], 2 pH del agua
  [0–14] y 3 Oxígeno disuelto [0–20].
- **Umbrales existentes:** 11 combinaciones ocupadas y 165 libres. Se consideró
  ocupada cualquier combinación con umbral, activo o inactivo, porque la unicidad
  es por `(especie, variable)`.

No se usaron datos literales de la matriz ni de V1: ni «Bovino» por defecto, ni
35.5–39.2, ni 6.5–8.0, ni la especie 4.

---

## COMBINACIONES LIBRES

Plan global previo al primer POST (`plan-v2.json`). Primero se reservaron
Temperatura, Humedad y pH, y después TC-46 con otra variable. Se buscó
coherencia semántica (variables de agua para especies acuáticas y humedad
relativa para una especie terrestre), preferencia por especies reales frente a
las creadas por QA, y cuatro especies y cuatro variables distintas.
Inmediatamente antes de cada POST se volvió a comprobar por GET que la
combinación seguía libre; ninguno requirió replanificar.

Los rangos son el intervalo interior 40 %–60 % del rango físico, con niveles
contiguos en tercios y aritmética decimal exacta.

| Caso | Especie | Activa | Variable | Libre antes | Min | Max | ID creado | Persistió | UI |
| --- | --- | --- | --- | --- | --: | --: | --- | --- | --- |
| TC46 | 5 Mojarra Plateada | Sí | 3 Oxígeno disuelto | Sí | 8.00 | 12.00 | 38 | Sí | Fila visible; **rango invisible** |
| TC47 | 10 Tilapia | Sí | 1 Temperatura del agua | Sí | 18.00 | 27.00 | 39 | Sí | Fila visible; **rango invisible** |
| TC48 | 39 Bovino | Sí | 10 Humedad Relativa | Sí | 40.00 | 60.00 | 40 | Sí | Fila visible; **rango invisible** |
| TC49 | 3 Camarón Blanco | Sí | 2 pH del agua | Sí | 5.60 | 8.40 | 41 | Sí | Fila visible; **rango invisible** |

Durante la preparación se descartaron dos borradores del plan, conservados
como evidencia y **sin POST**:

- `plan-v2-borrador1-sin-preferencia-semantica.json`: combinaciones válidas pero
  poco coherentes (por ejemplo, pH del agua para «Bovino Qa Je»).
- `plan-v2-borrador2-regex-invalida.json`: error de automatización; al parchear,
  el patrón de pH perdió los `\b` y TC-49 quedó sin combinación. Se corrigió
  antes de ejecutar nada.

---

## TC-M09-46

Configuración base válida para especie activa.

| Checklist | Resultado |
| --- | --- |
| Especie activa | Sí — 5 Mojarra Plateada |
| Combinación libre | Sí — umbrales previos de la especie: #12 (Temperatura del agua), #13 (pH del agua) |
| Variable / límite físico | 3 Oxígeno disuelto, 0–20 mg/L; no reserva ninguna variable de TC-47/48/49 |
| min < max | 8.00 < 12.00 |
| Niveles | normal 8.00–9.33 · precaución 9.33–10.66 · crítico 10.66–12.00 |
| API | **201**, `id_umbral_ambiental` 38, especie/variable/valores/niveles correctos, `es_activo` true |
| GET | Presente una sola vez, valores y niveles idénticos, previos #12 y #13 conservados |
| Newman | 21 aserciones, 0 fallidas |
| UI (Cypress) | Registro #38 visible con variable, niveles y estado. Recorrido 2: control de legibilidad detecta el rango general invisible (observación) |
| Resultado | **APROBADO** — con observación UI |

Justificación del recorrido 2: el recorrido 1 pasó, pero su captura mostraba la
celda «Rango general» sin números. Para aplicar a TC-46 el mismo control
objetivo de legibilidad añadido para TC-47 a TC-49, se ejecutó un único
recorrido adicional. No crea datos: 0 POST de umbral.

## TC-M09-47

| Checklist | Resultado |
| --- | --- |
| Variable Temperatura real | 1 Temperatura del agua (0–45 °C), especie acuática 10 Tilapia |
| Combinación libre | Sí — la especie no tenía umbrales |
| Rango físico | 18.00–27.00 dentro de 0–45 |
| Niveles | 18.00–21.00 · 21.00–24.00 · 24.00–27.00 |
| API | **201**, id 39, persistido y correcto |
| Newman | 22 aserciones, 0 fallidas |
| UI | Registro #39 visible con variable, niveles y estado. Observación: rango `18.00 – 27.00` invisible (blanco sobre blanco) |
| Resultado | **APROBADO** — con observación UI |

## TC-M09-48

| Checklist | Resultado |
| --- | --- |
| Variable Humedad real | 10 Humedad Relativa (0–100 %), especie terrestre 39 Bovino |
| Combinación libre | Sí — umbrales previos #36 y #37 conservados |
| Valores físicos | 40.00–60.00, dentro de 0–100 (lejos del 120 % inválido que menciona RF-17) |
| Niveles | 40.00–46.66 · 46.66–53.32 · 53.32–60.00 |
| API | **201**, id 40, persistido y correcto |
| Newman | 22 aserciones, 0 fallidas |
| UI | Registro #40 visible con variable, niveles y estado. Observación: rango `40.00 – 60.00` invisible |
| Resultado | **APROBADO** — con observación UI |

## TC-M09-49

| Checklist | Resultado |
| --- | --- |
| Variable pH real | 2 pH del agua, especie acuática 3 Camarón Blanco |
| Escala 0–14 | 5.60–8.40, claramente interior |
| Combinación libre | Sí — umbrales previos #7, #8 y #9 conservados |
| Niveles | 5.60–6.53 · 6.53–7.46 · 7.46–8.40 |
| API | **201**, id 41, persistido y correcto |
| Newman | 22 aserciones, 0 fallidas |
| UI | Registro #41 visible con variable, niveles y estado. Observación: rango `5.60 – 8.40` invisible |
| Resultado | **APROBADO** — con observación UI |

**Presupuesto de escritura: 4 POST en total, 1 por original.** No hubo segundo
intento de ningún POST, ni cleanup, ni edición o desactivación de umbrales.

---

## PERSISTENCIA

Verificación final de solo lectura (`verificacion-final-readonly.json`),
posterior a todos los recorridos:

| Caso | ID | Presente | Activo | Valores | Niveles | Registros de la combinación | Previos conservados |
| --- | --- | --- | --- | --- | --- | --: | --- |
| TC-46 | 38 | Sí | Sí | Coinciden | Coinciden | 1 | Sí |
| TC-47 | 39 | Sí | Sí | Coinciden | Coinciden | 1 | Sí |
| TC-48 | 40 | Sí | Sí | Coinciden | Coinciden | 1 | Sí |
| TC-49 | 41 | Sí | Sí | Coinciden | Coinciden | 1 | Sí |

Los cuatro umbrales se conservan en TEST como evidencia.

---

## EVIDENCIA UI

Cypress 13.17.0 con Electron 118 headless: login real, menú Configuración → Por
especie → selección exacta de la especie → Umbrales Ambientales. Los
`cy.intercept` solo observan. Sin `cy.wait` numéricos ni `force: true`, y **0
POST de umbral emitidos** en los cinco recorridos.

En los recorridos con control de legibilidad, Cypress figura como «FAIL» porque
la última aserción mide el contraste del rango general. Todas las verificaciones
funcionales de la UI anteriores a ella pasaron: registro, variable, niveles y
estado. Ese FAIL documenta la observación; no es un fallo de la funcionalidad.

| Caso | Recorrido | Cypress | Fila `#ID` | Variable | Niveles (DOM) | Estado «Activo» | Rango general legible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-46 | recorrido1 | PASS | Sí | Sí | Sí | Sí | No se controlaba; la captura ya lo muestra invisible |
| TC-46 | recorrido2 | FAIL | Sí | Sí | Sí | Sí | **No** — contraste 1:1 |
| TC-47 | recorrido1 | FAIL | Sí | Sí | Sí | Sí | **No** — contraste 1:1 |
| TC-48 | recorrido1 | FAIL | Sí | Sí | Sí | Sí | **No** — contraste 1:1 |
| TC-49 | recorrido1 | FAIL | Sí | Sí | Sí | Sí | **No** — contraste 1:1 |

La celda contiene exactamente el texto persistido, pero sus estilos computados
son `color: rgb(255, 255, 255)` y `-webkit-text-fill-color: rgb(255, 255, 255)`,
con opacidad 1 y `visibility: visible`, sobre un fondo efectivo
`rgb(255, 255, 255)`. El contraste es 1:1 y el mínimo WCAG AA es 4.5:1. Las
capturas `*-celda-rango-general.png` muestran solo la unidad (°C, %, pH, mg/L),
y la vista general confirma lo mismo en los umbrales preexistentes (#12, #13).

En la captura de fila, el nivel crítico y el estado quedan fuera del área
visible del contenedor con scroll horizontal; se verificaron por aserción de
DOM.

---

## COMPARACIÓN V1 VS V2

| Aspecto | V1 | V2 |
| --- | --- | --- |
| Ambiente | TEST | TEST |
| Especie | 4 Cachama Blanca (los cuatro) | 5 Mojarra Plateada · 10 Tilapia · 39 Bovino · 3 Camarón Blanco |
| Variable | 9 Temp. Ambiental ×2, 10 Humedad, 2 pH | 3 Oxígeno disuelto · 1 Temp. del agua · 10 Humedad Relativa · 2 pH del agua |
| HTTP | 500 `ERROR_INTERNO` (8/8) | **201** (4/4) |
| Persistencia | Ninguna | **Sí**, ids 38–41, verificados por GET y en el cierre |
| UI | Sin registro (coherente con la falta de persistencia) | Registros visibles; **rango general invisible** |
| POST usados | 8 (2 por original) | 4 (1 por original) |
| Resultado | Rechazado — defecto de producto (500) | **APROBADO** (defecto 500 corregido) · observación UI reportada a Desarrollo |

---

## COMPARACIÓN TEST VS DEV

DEV no se utilizó. La checklist de fallback (§146) no se cumplió: TEST sí tiene
la funcionalidad, el endpoint responde 201, la UI existe y muestra los
registros. No hay indicio de despliegue incompleto.

Para descartar un desfase de despliegue en el defecto visual se comparó el
código en solo lectura. En el frontend, `origin/test` y HEAD son el mismo commit
(`49966d2`), y `origin/dev` (`0512165`) no tiene diferencias en
`src/configuration/components/UmbralesSection.tsx` ni en
`src/shared/design-system`. La celda del rango general hereda el color sin
fijarlo, igual en ambas ramas. El defecto está en el código de DEV y de TEST; no
es un desfase.

---

## ORIGEN DE FALLOS

| Hallazgo | Producto | Prueba / automatización | Entorno | Bloqueo |
| --- | --- | --- | --- | --- |
| HTTP 500 al crear umbrales (V1) | Sí, **corregido** | No | No | No |
| Rango general invisible en la tabla (V2, observación) | **Sí** (frontend, no bloquea la funcionalidad) | No: se midió con estilos computados, no por localización | No | No |
| Borrador 2 del plan (regex sin `\b`) | No | **Sí**, corregido antes de cualquier POST | No | No |

---

## CATEGORÍAS / RESPONSABLES / ACCIONES

| Hallazgo | Categoría | Equipo responsable | Acción |
| --- | --- | --- | --- |
| INC-M09-31-G22 (500 al crear umbral) | FLUJO (V1) | Desarrollo | **ACTUALIZAR INCIDENCIA COMO CORRECCIÓN VERIFICADA POR QA** (RUN_ID V2, ids 38–41). No eliminarla |
| Observación: Rango general invisible | UI_ACCESIBILIDAD — Interfaz / Accesibilidad | Desarrollo | **REPORTAR A DESARROLLO** — incidencia nueva; no afecta el resultado APROBADO |

---

## INCIDENCIAS

### INC-M09-31-G22 — actualizar como corregida/verificada

- **ID reutilizado:** INC-M09-31-G22 (issue #158). Relacionadas por la misma
  causa: INC-M09-27-G24 e INC-M09-26-G28.
- **Severidad:** la vigente en el Registro de Errores; QA no la reevalúa.
- **Texto sugerido:** «Reevaluación V2 de TC-M09-G22 (RUN_ID
  `G22-REEVAL-V2-20260913-004518`, TEST, 2026-09-13): `POST
  /configuracion/umbrales` con configuraciones válidas devuelve 201 en 4/4
  originales (ids 38, 39, 40, 41), con valores y niveles persistidos y
  verificados por GET. El HTTP 500 `ERROR_INTERNO` ya no se reproduce.
  Corrección verificada por QA.»

### OBSERVACIÓN — FALLO UI A REPORTAR A DESARROLLO (incidencia nueva)

| Campo | Valor |
| --- | --- |
| ID | ID pendiente de asignación según Registro de Errores vigente |
| Casos | TC-M09-46, TC-M09-47, TC-M09-48, TC-M09-49 (G22) · RF-17 |
| Ambiente | TEST (código idéntico en `origin/dev`) |
| Título | La columna «Rango general» de la tabla de Umbrales Ambientales es invisible: texto blanco sobre fondo blanco |
| Categoría | UI_ACCESIBILIDAD — Interfaz / Accesibilidad |
| Severidad | Pendiente de validar contra Registro de Errores vigente |
| Responsable | Desarrollo |
| Acción | REPORTAR A DESARROLLO |
| Pantalla | Configuración → Por especie → {especie} → Umbrales Ambientales (`UmbralesSection.tsx`, celda de `valor_min – valor_max`) |
| Pasos | Iniciar sesión como Administrador → abrir la pantalla con una especie que tenga umbrales → observar la columna «Rango general» |
| Esperado | Rango visible y legible (contraste ≥ 4.5:1) junto a la unidad |
| Obtenido | Solo se ve la unidad. El texto existe en el DOM pero su color computado es `rgb(255,255,255)` sobre fondo `rgb(255,255,255)`, contraste 1:1 |
| Datos | Umbrales 38, 39, 40 y 41 (creados en V2) y preexistentes 12 y 13 |
| Reproducibilidad | 4/4 recorridos con control de legibilidad (estilos computados); confirmado visualmente en las capturas revisadas de TC-46 y TC-47; independiente de especie, variable y valores |
| API | Correcta: el valor llega bien a la UI (`valor_min`/`valor_max` en el GET interceptado) |
| Pista técnica (no causa raíz confirmada) | La celda no declara `color` y hereda uno blanco; las celdas vecinas que sí declaran color (variable, unidad, badges) se ven |
| Evidencias | `cypress/TC-M09-4x/recorrido*/screenshots/*celda-rango-general.png`, `*configuracion-visible.png`, `ui-TC-M09-4x.json` (`rangoGeneralCelda`), `cypress-TC-M09-4x.json` |
| Relación con INC-M09-26-G23 | No se puede correlacionar: la única referencia local lo sitúa en el modal «Nuevo umbral ambiental», una pantalla distinta, y no hay más evidencia disponible. Si el Registro de Errores mostrara que es la misma causa, se debe asociar a esa incidencia en lugar de crear otra |

No se creó ningún ticket (Taiga, issue ni PR).

---

## SEGURIDAD

- La contraseña se usó solo como variable de proceso (`TEST_ADMIN_PASSWORD`);
  tokens en memoria. Reporter htmlextra con `omitHeaders`, sin datos de entorno
  y omitiendo la variable `token`; HTML y JSON saneados al escribirse.
- Capturas Cypress con blackout de los campos de correo y contraseña.
- Escaneo final sobre HTML, JSON, capturas, Markdown y scripts de
  `EvaluacionV2/`: detalle en `seguridad-evidencias.json`.
- Sin SQL, sin PostgreSQL y sin modificación de datos fuera de los cuatro
  umbrales creados por el flujo bajo prueba.

---

## GIT FINAL

Detalle en `git-final.json`.

- **Frontend** (`qa/juan-esteban-re-evaluacion-M02`, `49966d2`): todos los
  archivos nuevos están en `testing/test_testing/Modulo9/RF-17/TC-M09-G22/EvaluacionV2/`
  y `git diff --stat` está vacío. La carpeta `EvaluacionV2` ya existía vacía al
  empezar. `git ls-files --others --exclude-standard` lista los 9 archivos de
  automatización; los **48 archivos de `RESULTADOS/`** existen en disco pero
  Git los ignora por la regla `**/resultados/` de `testing/.gitignore` (línea
  9). La evidencia de V1 sí está versionada (45 archivos), así que para
  conservar V2 en el repositorio hará falta añadirla de forma explícita. QA no
  lo hizo, porque Git es de solo lectura en esta tarea.
- **Backend** (`qa/juan-esteban-re-evaluacion-M02`, `ff5f6c9`): solo lectura,
  sin diferencias en archivos rastreados. Cambios preexistentes ajenos a
  TC-M09-G22 EvaluacionV2: `RF-24/TC-M09-G77/EvaluacionV2/` y
  `RF-24/TC-M09-G78/EvaluacionV1/`, carpetas sin seguimiento de evaluaciones
  anteriores.
- V1 de G22 intacta. Sin commit, push, pull, merge, rebase, reset, clean, stash,
  checkout, cambio de rama, tag ni PR. Sin cambios en código funcional,
  infraestructura ni dependencias.

**Resultado final: REEVALUACIÓN APROBADA (TC-M09-46/47/48/49 APROBADOS), con observación UI reportada a Desarrollo. La ejecución se detiene aquí para revisión humana. No se avanza a otro grupo.**
