# TC-M09-G31 — RESULTADO

## DECISIÓN GENERAL

`BLOCKED — no existe una combinación actual y demostrable especie–activo–sensor–variable para ejecutar una ingesta RF-17 válida en TEST.`

La configuración de umbrales sí está disponible. El bloqueo está en la trazabilidad de los datos operativos TEST y en el acceso visual al monitoreo, no en la ausencia de niveles Normal, Precaución o Crítico.

| Caso | Resultado | Motivo | Categoría | Equipo responsable | Acción |
| --- | --- | --- | --- | --- | --- |
| TC-M09-66 | BLOCKED | No se puede demostrar un payload normal asociado a una especie con umbral activo. | INFRAESTRUC — precondición TEST | Implementación y AIoT | REPORTAR A IMPLEMENTACIÓN Y AIoT |
| TC-M09-67 | BLOCKED | No se puede demostrar un payload de precaución asociado a una especie con umbral activo. | INFRAESTRUC — precondición TEST | Implementación y AIoT | REPORTAR A IMPLEMENTACIÓN Y AIoT |
| TC-M09-68 | BLOCKED | No se puede demostrar un payload crítico asociado a una especie con umbral activo. | INFRAESTRUC — precondición TEST | Implementación y AIoT | REPORTAR A IMPLEMENTACIÓN Y AIoT |

## ENTORNO Y TRAZABILIDAD

| Dato | Valor |
| --- | --- |
| Fecha de ejecución | 2026-09-06 |
| Backend TEST | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| Frontend TEST | `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io` |
| Rama frontend | `qa/juan-esteban-m09` |
| SHA frontend | `966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56` |
| Rama backend | `qa/juan-esteban-m09` |
| SHA backend | `adc3932b9f0293a76ebec7e89ed877274791b6a1` |
| SHA desplegado en TEST | No confirmado. |
| Actor de discovery | Administrador TEST, autenticación HTTP 200 |
| Newman / htmlextra | 6.2.2 / 1.23.1 |
| Cypress | 13.17.0 |

## CONFIGURACIÓN SEMAFÓRICA DESCUBIERTA

Las consultas reales identificaron diez configuraciones activas completas. Cada intervalo mostrado es abierto para escoger posteriormente un valor interior, nunca un límite.

| Especie | Variable | Normal | Precaución | Crítico |
| --- | --- | --- | --- | --- |
| Cachama Blanca | Temperatura | 26–32 °C | 22–26 °C | 0–22 °C |
| Cachama Blanca | Oxígeno disuelto | 4–12 mg/L | 2–4 mg/L | 0–2 mg/L |
| Camarón Blanco | Temperatura | 23–30 °C | 20–23 °C | 0–20 °C |
| Camarón Blanco | Amoniaco total | 0–1 mg/L | 1–2 mg/L | 2–10 mg/L |
| Camarón Blanco | Salinidad | 10–25 ppt | 5–10 ppt | 0–5 ppt |
| Mojarra Plateada | Temperatura | 24–30 °C | 20–24 °C | 0–20 °C |
| Mojarra Plateada | pH | 6–9 | 5–6 | 0–5 |
| Trucha Arcoíris | Temperatura | 12–18 °C | 8–12 °C | 18–25 °C |
| Trucha Arcoíris | pH | 6–8 | 5–6 | 0–5 |
| Trucha Arcoíris | Oxígeno disuelto | 8–14 mg/L | 6–8 mg/L | 0–6 mg/L |

## DATOS Y PRECONDICIONES

| Validación | Resultado |
| --- | --- |
| Umbrales RF-17 activos y completos | Sí, 10 configuraciones |
| Dashboard API | HTTP 200; cinco sensores, todos en GRIS |
| Dispositivos y sensores activos | Sí; se verificaron 50 dispositivos activos y sensores históricos activos |
| Relación actual sensor–variable | No demostrable mediante la API disponible |
| Relación actual sensor–activo–especie | No demostrable mediante la API disponible |
| Coincidencia histórica con especie configurada | No; la única especie devuelta fue Tilapia Roja, sin umbral RF-17 activo descubierto |
| Valor interior Normal / Precaución / Crítico | No seleccionado; faltaba la correlación previa |
| Payload funcionalmente válido | No construible de forma verificable |
| `POST /iot/telemetria` TC-M09-66 | No ejecutado; 0 de 2 operaciones permitidas |
| `POST /iot/telemetria` TC-M09-67 | No ejecutado; 0 de 2 operaciones permitidas |
| `POST /iot/telemetria` TC-M09-68 | No ejecutado; 0 de 2 operaciones permitidas |

Los detalles sanitizados de esta investigación están en `investigacion-correlacion.json`.

## EVIDENCIA API Y NEWMAN

Los archivos `newman-TC-M09-66-intento2.json`, `newman-TC-M09-67-intento2.json` y `newman-TC-M09-68-intento2.json` registran la autenticación, los diez umbrales y el dashboard. Sus HTML correspondientes están en `newman/`.

El primer discovery de cada caso interpretó de forma incorrecta el nombre de dos campos de nivel. Se preservó la evidencia y se corrigió solo la automatización QA antes de los segundos discovery. La corrección y su alcance constan en `correccion-automatizacion.md`. Ninguno de esos intentos ingresó telemetría.

La API histórica devolvió lecturas de sensores activos, pero no una asociación vigente utilizable. En particular:

- las lecturas con activo y especie corresponden a Tilapia Roja, especie sin umbral RF-17 activo descubierto;
- las lecturas de los otros sensores no contienen activo ni especie;
- el listado de sensores no expone la variable ambiental;
- el listado de vinculaciones no expone el sensor;
- la consulta de calidad de las lecturas históricas devolvió HTTP 404;
- no hay una configuración de conexión TEST en el espacio de trabajo para completar la corroboración mediante base de datos en modo solo lectura. No se abrió conexión ni se emitió SQL.

## EVIDENCIA VISUAL

La interfaz autenticó al Administrador, pero mostró que no tiene una unidad productiva asignada y no habilitó el monitoreo funcional. Las capturas reales y el detalle de ejecución están en `evidencia-cypress.md` y `screenshots/`.

Esta evidencia visual no se usa como sustituto de la validación verde, amarilla o roja; confirma una segunda precondición TEST ausente.

## ORIGEN Y RESPONSABLES

| Origen | Resultado |
| --- | --- |
| Defecto de producto confirmado | No. No se ejecutó una operación funcional válida y el SHA desplegado no está confirmado. |
| Error de automatización vigente | No. El error de campos del primer discovery fue corregido y el segundo discovery aprobó. |
| Problema de precondiciones TEST | Sí. Falta una relación vigente verificable y un usuario de monitoreo asociado a unidad productiva. |
| Bloqueo | Sí. |

**Equipo responsable principal: Implementación.** Debe proveer en TEST un usuario autorizado vinculado a una unidad productiva y un mecanismo aprobado para consultar, en modo solo lectura, la relación vigente entre activo, especie y sensor.

**Equipo responsable complementario: AIoT.** Debe validar y disponibilizar en TEST una combinación vigente dispositivo–sensor–activo–especie–variable, con un canal de ingesta controlado, para ejecutar los tres niveles sin asumir datos.

**Acción: REPORTAR A IMPLEMENTACIÓN Y AIoT.**

No se reporta a Desarrollo en esta ejecución: la evidencia no permite atribuir un defecto funcional desplegado. La revisión estática identifica una limitación de consulta de asociaciones, pero no prueba que sea el comportamiento desplegado ni que sea la causa única del bloqueo.

## CONDICIÓN PARA REANUDAR

Reanudar TC-M09-G31 únicamente cuando Implementación y AIoT entreguen una combinación TEST vigente y verificable de especie, activo, dispositivo, sensor y variable, además de un usuario con acceso al monitoreo. A partir de esa evidencia se seleccionarán tres valores interiores de la misma configuración y se ejecutará una única ingesta por caso, con un máximo de un reintento seguro por caso.

## CONFIRMACIONES

- No se modificó código funcional, configuración, infraestructura, roles, datos, dispositivos, sensores, activos, áreas ni umbrales.
- No se instaló ninguna dependencia ni se ejecutó SQL de escritura; no hubo conexión a base de datos.
- No se generó telemetría de negocio, no hubo limpieza y no se almacenaron secretos en los artefactos.
- No hubo commit, push, pull, merge ni cambio de rama.
- No se inició TC-M09-G30, TC-M09-G32 ni ningún grupo posterior.

## VALIDACIÓN Y GIT FINAL

- `node --check` aprobó para `run-newman.cjs` y `cypress.config.cjs`; la colección Postman es JSON válido.
- Los tres discovery corregidos de Newman finalizaron sin fallos de aserción (nueve por ejecución).
- Cypress ejecutó y capturó las evidencias visuales descritas. El compilador TypeScript no está expuesto en el `PATH`; no se instaló ni modificó ninguna dependencia para añadirlo.
- La sanitización revisó 16 archivos de texto de evidencia y no encontró coincidencias de credenciales, tokens, cabeceras de sesión ni el secreto conocido.

El Git final del frontend conserva dos eliminaciones de `.gitkeep` preexistentes, una de G22 y una de G31; no se restauraron ni modificaron. `git diff --stat` solo muestra esos dos archivos vacíos. Los artefactos de G31 quedan como archivos QA sin seguimiento, junto con cambios preexistentes de G22 y G28.

En backend, `git diff --stat` no tuvo salida. El estado contiene artefactos QA sin seguimiento preexistentes de otros grupos, incluido G32; G31 no creó ni modificó ningún archivo en backend.

El grupo queda detenido para revisión humana.
