# TC-M09-G22 — REEVALUACIÓN V2

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
Casos: TC-M09-46 · TC-M09-47 · TC-M09-48 · TC-M09-49 · Herramienta: Newman
RUN_ID: `G22-REEVAL-V2-20260914-171827` · Fecha: 2026-09-14 · Entorno decisorio: **TEST**

---

## DECISIÓN GENERAL

### REEVALUACIÓN APROBADA — G22 APROBADO

Los cuatro originales cumplen RF-17 en TEST con un único POST cada uno:

| Caso | V1 | V2 | Especie + Variable | HTTP | ID creado | Persistencia | Resultado |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| TC-M09-46 | DESAPROBADO (500) | **APROBADO** | Tilapia + Oxígeno disuelto, 8.00–12.00 | 201 | 45 | Sí | 21/21 assertions |
| TC-M09-47 | DESAPROBADO (500) | **APROBADO** | Trucha Arcoíris + Temperatura Ambiental, 10.00–40.00 | 201 | 46 | Sí | 22/22 assertions |
| TC-M09-48 | DESAPROBADO (500) | **APROBADO** | Equino + Humedad Relativa, 40.00–60.00 | 201 | 47 | Sí | 22/22 assertions |
| TC-M09-49 | DESAPROBADO (500) | **APROBADO** | Cachama Blanca + pH del agua, 5.60–8.40 | 201 | 48 | Sí | 22/22 assertions |

El defecto que rechazó el grupo en V1 (HTTP 500 `ERROR_INTERNO` al crear
cualquier umbral válido, mismo síntoma reportado también en G24/G28 como
`QA-JE-G22-01`) **ya no se reproduce: corrección verificada por QA.**

---

## RESUMEN V1

Evidencia V1: `RF-17/TC-M09-G22/RESULTADOS/run-20260906/` (solo lectura,
intacta). Ejecución del 2026-09-06 en TEST, actor Administrador. Los ocho POST
(2 por original) devolvieron HTTP 500 `ERROR_INTERNO` sin persistir nada.
Decisión general V1: **DESAPROBADO**, con los cuatro originales atribuidos a
defecto de producto.

## CAUSA DE REEVALUACIÓN

Verificar si el HTTP 500 al crear un umbral ambiental válido (reportado en V1
para los cuatro originales de G22, y reproducido también en TC-M09-54/G24 y
TC-M09-60/G28) sigue presente en el despliegue actual de TEST.

## ENTORNOS

| Elemento | Valor |
| --- | --- |
| Backend TEST | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| Preflight | `/login` 200 · `/health` 200 · `/openapi.json` 200, contiene `POST /configuracion/umbrales` |
| Herramienta | Newman 6.2.2 + htmlextra 1.23.1 |
| Cypress / UI | No ejecutado en esta corrida (queda pendiente si se requiere evidencia visual) |
| PostgreSQL | No utilizado; persistencia verificada por API (`verificar-cierre.cjs`) |

## ACTOR

| Elemento | Valor |
| --- | --- |
| Usuario | `admin.dev@gmail.com` |
| Rol | Administrador, cuenta Activo |
| Permisos recurso 20 | `[1,2,3,4]` (crear y consultar confirmados en el preflight) |

## DISCOVERY

Solo GET antes de cada POST, sin datos asumidos (`plan.cjs`):

- 11 especies activas descubiertas, 16 variables ambientales del catálogo.
- 18 combinaciones especie-variable ocupadas, 158 libres.
- Se seleccionaron 4 combinaciones libres y distintas, sin reutilizar datos de
  V1 (que usó únicamente Cachama Blanca + Temperatura/Humedad/pH).
- Rango físico y niveles (`normal`/`precaucion`/`critico`) calculados como
  fracciones exactas del rango físico real de cada variable, contiguos y sin
  solapamiento.

## RESULTADO OBTENIDO POR CASO

### TC-M09-46 — APROBADO

- Payload: `id_especie=10` (Tilapia), `id_variable_ambiental=3` (Oxígeno
  disuelto), `valor_min=8.00`, `valor_max=12.00`, niveles `8.00–9.33 /
  9.33–10.66 / 10.66–12.00`.
- HTTP **201**. `id_umbral_ambiental=45`.
- GET posterior: presente, activo, valores y niveles idénticos a los
  enviados; el umbral preexistente de la especie se conservó
  (`totalEspecie=2`).
- **21/21 assertions.**

### TC-M09-47 — APROBADO

- Payload: `id_especie=2` (Trucha Arcoíris), `id_variable_ambiental=9`
  (Temperatura Ambiental), `valor_min=10.00`, `valor_max=40.00`, niveles
  `10.00–20.00 / 20.00–30.00 / 30.00–40.00`.
- HTTP **201**. `id_umbral_ambiental=46`.
- GET posterior: presente, activo, coincidencia exacta; previos conservados
  (`totalEspecie=4`).
- **22/22 assertions.**

### TC-M09-48 — APROBADO

- Payload: `id_especie=42` (Equino), `id_variable_ambiental=10` (Humedad
  Relativa), `valor_min=40.00`, `valor_max=60.00`, niveles `40.00–46.66 /
  46.66–53.32 / 53.32–60.00`.
- HTTP **201**. `id_umbral_ambiental=47`.
- GET posterior: presente, activo, coincidencia exacta; sin registros previos
  de la especie (`totalEspecie=1`, este mismo).
- **22/22 assertions.**

### TC-M09-49 — APROBADO

- Payload: `id_especie=4` (Cachama Blanca), `id_variable_ambiental=2` (pH del
  agua), `valor_min=5.60`, `valor_max=8.40`, niveles `5.60–6.53 / 6.53–7.46 /
  7.46–8.40`.
- HTTP **201**. `id_umbral_ambiental=48`.
- GET posterior: presente, activo, coincidencia exacta; previos conservados
  (`totalEspecie=3`).
- **22/22 assertions.**

## VERIFICACIÓN DE CIERRE

`verificar-cierre.cjs` (solo lectura, posterior a los cuatro POST) confirmó
para los cuatro casos: `presente=true`, `es_activo=true`,
`valoresCoinciden=true`, `nivelesCoinciden=true`,
`registrosDeLaCombinacion=1` (sin duplicados), `previosConservados=true`
(ningún registro preexistente de cada especie fue alterado o eliminado).
Detalle completo en [verificacion-final-readonly.json](verificacion-final-readonly.json).

## Newman

| Caso | POST | Status | Assertions | Fallidas | HTML | JSON |
|---|---|---:|---:|---:|---|---|
| TC-M09-46 | `POST /configuracion/umbrales` | 201 | 21 | 0 | `newman/newman-TC-M09-46-v2-intento1.html` | `TC-M09-46-v2-intento1.json` |
| TC-M09-47 | idem | 201 | 22 | 0 | `newman/newman-TC-M09-47-v2-intento1.html` | `TC-M09-47-v2-intento1.json` |
| TC-M09-48 | idem | 201 | 22 | 0 | `newman/newman-TC-M09-48-v2-intento1.html` | `TC-M09-48-v2-intento1.json` |
| TC-M09-49 | idem | 201 | 22 | 0 | `newman/newman-TC-M09-49-v2-intento1.html` | `TC-M09-49-v2-intento1.json` |

**4 POST en total, uno por original, sin reintentos.** Ninguno necesitó un
segundo intento porque el primero fue exitoso.

## ORIGEN DE LOS FALLOS

Ninguno. Los cuatro originales quedaron APROBADOS en el primer intento.

- **Producto:** No — creó y persistió los cuatro umbrales correctamente.
- **Automatización/prueba:** No.
- **Entorno:** No — TEST accesible en todo momento.
- **Bloqueo:** No.
- **Acción:** `NO REPORTAR A DESARROLLO` — el defecto V1 ya no se reproduce.

## DEFECTO DE V1 — ACTUALIZAR COMO CORRECCIÓN VERIFICADA POR QA

El defecto que rechazó G22 en V1 (HTTP 500 `ERROR_INTERNO` en la creación de
cualquier umbral ambiental válido) **no se reproduce en esta corrida**, en
cuatro combinaciones distintas de especie y variable, incluidos valores
positivos y negativos de rango. Coincide con la corrección ya verificada en la
reevaluación de `TC-M09-G24` (PR #146, `use_insertmanyvalues=False` en
`src/shared/database.py`, backend `ff5f6c9` = `origin/test`). Se recomienda a
revisión humana cerrar/actualizar la incidencia asociada a este síntoma
(`QA-JE-G22-01`) como corrección verificada.

## Seguridad

- Login real, credenciales solo en variables de entorno del proceso
  (`TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`), nunca escritas en archivo.
- Reporter Newman con `omitHeaders`, sin datos de entorno ni globales en el
  HTML/JSON.
- No se usó PostgreSQL. No se modificó código funcional, infraestructura ni
  dependencias.
- **Sin cleanup**: los cuatro umbrales creados (`#45, #46, #47, #48`) se
  conservan en TEST como evidencia, igual que el criterio usado en V1 y en las
  reevaluaciones de G24.

## Git final

No se realizó ninguna operación de git durante esta corrida (`git commit`,
`push`, `pull`, `merge`, `reset`, `clean`, `checkout`, creación/borrado de
rama). El único contenido nuevo es esta carpeta de evidencia bajo
`EvaluacionV2/RESULTADOS/G22-REEVAL-V2-20260914-171827/`.

---

## Estado de cierre

G22 queda ejecutado por completo y detenido para revisión humana. Los cuatro
originales quedaron **APROBADOS**. Decisión general **APROBADO**. Sin defectos
que reportar. Pendiente de decisión documental para revisión humana: cerrar la
incidencia `QA-JE-G22-01` como corrección verificada, apoyándose también en la
evidencia de G24 V2.

Pendiente, no bloqueante: no se ejecutó evidencia visual Cypress en esta
corrida (el escenario base de creación ya quedó demostrado por API).
