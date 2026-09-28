# TC-M09-G28 — REEVALUACIÓN V2

RF-17 — Configuración de Umbrales de Monitoreo y Niveles de Alerta Ambiental
Casos: TC-M09-60 · TC-M09-61 · Herramientas: Pytest, PostgreSQL read-only
RUN_ID: `G28-REEVAL-V2-20260914-172556` · Fecha: 2026-09-14 · Entorno decisorio: **TEST**

---

## DECISIÓN GENERAL

### REEVALUACIÓN APROBADA — G28 APROBADO

| Caso | V1 | V2 | Motivo | Equipo | Acción |
| --- | --- | --- | --- | --- | --- |
| TC-M09-60 | DESAPROBADO — DEFECTO DEL PRODUCTO (500) | **APROBADO** | POST válido devolvió 201, id 49; valores y niveles idénticos con precisión `Decimal` exacta en POST, GET y PostgreSQL | Desarrollo (cierre) | **ACTUALIZAR INCIDENCIA COMO CORRECCIÓN VERIFICADA POR QA** |
| TC-M09-61 | APROBADO | **APROBADO** | Persistencia confirmada entre dos sesiones reales, con logout real por la interfaz (Cypress) | No aplica | Ninguna |

El defecto que rechazó el grupo en V1 (HTTP 500 `ERROR_INTERNO` al crear un
umbral válido; mismo síntoma que `QA-JE-G22-01`, ya reproducido también en
TC-M09-46..49/G22 y TC-M09-54/G24) **ya no se reproduce: corrección verificada
por QA.**

---

## RESUMEN V1

Evidencia V1: `RF-17/TC-M09-G28/RESULTADOS/run-20260906/` (solo lectura,
intacta). TC-M09-60 DESAPROBADO (HTTP 500, sin persistencia, precisión no
evaluable por falta de registro). TC-M09-61 APROBADO (persistencia entre
sesiones demostrada con UI + API; PostgreSQL no ejecutado por falta de
credencial). Decisión general V1: **DESAPROBADO**, causa exclusiva en
TC-M09-60.

## CAUSA DE REEVALUACIÓN

Verificar si el HTTP 500 al crear un umbral válido (TC-60) sigue presente, y
resolver la discrepancia documental pendiente de V1 sobre la escala real de
`valor_min`/`valor_max` en PostgreSQL (RF-17 declara `numeric(5,2)`; el ORM
mapea `Numeric` sin precisión ni escala declaradas).

## ENTORNOS

| Elemento | Valor |
| --- | --- |
| Backend TEST | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| PostgreSQL TEST | `158.69.200.27:5448`, base `sgpmp_test`, usuario `member_qa` (solo lectura, `default_transaction_read_only=on` verificado antes de leer) |
| Herramienta | Pytest 9.0.3 (venv del backend, con `psycopg2` 2.9.12) |
| Cypress / UI | Ejecutado tras instalar dependencias (`npm install` en el frontend); 1 recorrido, PASS |

**Corrección sobre el preflight standalone (`test_preflight_v2.py`):** el
script usa URLs `http://` a secas para el chequeo de acceso; el proxy de TEST
responde **404** a esas URLs `http`, mientras que `https://` (el que sí usa
`qa_v2.py` en el flujo real) responde correctamente (401 para el endpoint
protegido sin token). Confirmado con `curl` antes de continuar. Es el mismo
artefacto ya documentado en las reevaluaciones de G22 V2 y G24 V2 (URLs
suministradas en HTTP vs. HTTPS real) — no es un defecto de producto y no
bloqueó el resto de la corrida, que usa HTTPS internamente.

## ACTOR

| Elemento | Valor |
| --- | --- |
| Usuario | `admin.dev@gmail.com` |
| Rol | Administrador, cuenta Activo |
| Permisos recurso 20 | crear y consultar confirmados (`actor()` en `qa_v2.py`) |

---

## TC-M09-60 — APROBADO

### Datos dinámicos descubiertos

`discover()` buscó una variable de Temperatura cuyo rango físico contenga
`35.57–39.23` (valores no triviales, dos decimales, distintos a los de V1) y
una especie activa sin umbral existente para esa variable.

| Dato | Valor |
| --- | --- |
| Especie ID / nombre | **40** / Bovino Qa Je |
| Variable ID | **1** (Temperatura) |
| Unidad | °C |
| valor_min enviado | **35.57** |
| valor_max enviado | **39.23** |
| Niveles enviados | `35.57–37.00`, `37.00–38.00`, `38.00–39.23` |
| ID creado | **49** |

### Resultado

- **1 POST**, guardado por el propio script contra reintento accidental
  (`creation-attempt.json` existente detiene la prueba).
- HTTP **201**. `id_umbral_ambiental=49`.
- GET inmediato: presente, único, valores y niveles idénticos.
- **PostgreSQL** (`member_qa`, solo lectura): registro `#49` confirmado con
  los mismos valores y niveles.
- **Comparación `Decimal` exacta** entre input, respuesta POST, respuesta GET
  y fila de PostgreSQL: **coinciden los cuatro.**

### PRECISIÓN NUMÉRICA — resuelta

| Campo | Enviado | API POST | API GET | PostgreSQL | Coincide |
| --- | ---: | ---: | ---: | ---: | --- |
| valor_min | 35.57 | 35.57 | 35.57 | 35.57 | **Sí** |
| valor_max | 39.23 | 39.23 | 39.23 | 39.23 | **Sí** |

**Metadata real de esquema** (`information_schema.columns`,
`modulo9.umbrales_ambientales`):

| Columna | Tipo | Precisión | Escala |
| --- | --- | ---: | ---: |
| valor_min | numeric | 8 | 2 |
| valor_max | numeric | 8 | 2 |

**Discrepancia documental de V1, ahora resuelta:** RF-17 declara
`numeric(5,2)`; la escala real en TEST es **`numeric(8,2)`** — la precisión
(dígitos totales) difiere del requisito documentado, pero la **escala**
(decimales) sí coincide en 2, que es lo que TC-60 evalúa. No se observó
pérdida de precisión decimal en ningún valor probado. **Recomendación para
revisión humana:** alinear la documentación de RF-17 (`numeric(5,2)` →
`numeric(8,2)`) con el esquema desplegado; no es un defecto funcional.

### Causa raíz del defecto V1

Confirmada por Desarrollo en
`anotaciones/modulo_9/inc_m09_umbrales_500_enum_insertmanyvalues.md`: ENUM
`nivel` con `insertmanyvalues`. Corregida con `use_insertmanyvalues=False`
(PR #146) en `src/shared/database.py`. La no reproducción del 500 en cuatro
combinaciones distintas (esta corrida, más las de G22 V2 y G24 V2) es
evidencia consistente con esa corrección.

---

## TC-M09-61 — APROBADO

### Registro utilizado

El mismo creado por TC-60: `#49`, especie 40 (Bovino Qa Je), variable 1
(Temperatura del agua), `35.57–39.23`.

### Ciclo de sesiones (Cypress, logout real por la interfaz)

1. **Sesión A**: login real contra TEST, navegación hasta Configuración →
   Por especie → Bovino Qa Je → Umbrales Ambientales, localización de la fila
   `#49`. Captura:
   [TC-M09-60-configuracion-visible.png](cypress/recorrido2/screenshots/persistencia-v2.cy.js/TC-M09-60-configuracion-visible.png).
2. **Fin de la sesión A**: botón real "Cerrar sesión" de la barra lateral
   (no manipulación de tokens). `logout_confirmed: true`.
3. **Sesión B**: segundo login real, `new_token_confirmed: true` (token
   distinto al de la sesión A), nueva navegación hasta el mismo registro.
   Captura:
   [TC-M09-61-despues-nueva-sesion.png](cypress/recorrido2/screenshots/persistencia-v2.cy.js/TC-M09-61-despues-nueva-sesion.png).

### Comparación (API + UI, ambas sesiones)

| Dato | Sesión A | Sesión B | Coincide |
| --- | --- | --- | --- |
| ID | `#49` | `#49` | **Sí** |
| Variable (UI) | Temperatura del agua °C | Temperatura del agua °C | **Sí** |
| Rango (UI) | `35.57 – 39.23 °C` | `35.57 – 39.23 °C` | **Sí** |
| Niveles (UI) | `35.57–37.00 / 37.00–38.00 / 38.00–39.23` | idénticos | **Sí** |
| Estado | Activo | Activo | **Sí** |
| valor_min (API) | 35.57 | 35.57 | **Sí** |
| valor_max (API) | 39.23 | 39.23 | **Sí** |

Evidencia estructurada completa: [ui-evidence.json](cypress/recorrido2/ui-evidence.json).
Resultado de la corrida: [result.json](cypress/recorrido2/result.json) — 1
prueba, 1 passing, 0 failing.

**1 recorrido, sin reintento.** `screenshotOnRunFailure: false`,
`video: false`, `retries: 0`. Los `cy.intercept` solo observaron tráfico;
ninguna respuesta fue sustituida.

---

## ORIGEN DE LOS FALLOS

Ninguno. Ambos originales quedaron APROBADOS.

- **Producto:** No — creó y persistió el umbral correctamente, con precisión
  exacta verificada contra PostgreSQL.
- **Automatización/prueba:** No.
- **Entorno:** No — el único artefacto fue la URL `http://` del preflight
  standalone, ajeno al flujo funcional real.
- **Bloqueo:** No.
- **Acción:** `NO REPORTAR A DESARROLLO` — el defecto V1 ya no se reproduce.

## DEFECTO DE V1 — ACTUALIZAR COMO CORRECCIÓN VERIFICADA POR QA

El defecto TC-M09-60 de V1 (HTTP 500 al crear un umbral ambiental válido) **no
se reproduce en esta corrida**, con precisión numérica confirmada de extremo a
extremo (input → API → PostgreSQL). Consistente con la corrección ya
verificada en G22 V2 y G24 V2 (PR #146, `use_insertmanyvalues=False`). Se
recomienda a revisión humana cerrar/actualizar `QA-JE-G22-01` como corrección
verificada, con esta corrida como evidencia adicional.

## Seguridad

- Login real; credenciales (`TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`,
  `G28_DB_PASSWORD`) solo en variables de entorno del proceso, nunca escritas
  en archivo ni en el `.md`.
- Conexión PostgreSQL forzada a **solo lectura**
  (`default_transaction_read_only=on`), verificado antes de cualquier
  `SELECT`; todas las consultas empiezan por `SELECT` (`assert` en
  `qa_v2.select()`). Sin escritura de BD.
- No se modificó código funcional, infraestructura ni dependencias.
- **Sin cleanup**: el umbral creado (`#49`) se conserva en TEST como
  evidencia, igual que el criterio de V1 y de G22/G24 V2.
- Ambas sesiones cerradas explícitamente (`DELETE /sesiones/`).

## Git final

No se realizó ninguna operación de git durante esta corrida. El único
contenido nuevo es esta carpeta de evidencia bajo
`EvaluacionV2/RESULTADOS/G28-REEVAL-V2-20260914-172556/`.

---

## Estado de cierre

G28 queda ejecutado y detenido para revisión humana. TC-M09-60 **APROBADO**
(corrección verificada, precisión exacta confirmada contra PostgreSQL).
TC-M09-61 **APROBADO** (persistencia entre sesiones confirmada con logout
real por la interfaz, evidencia Cypress + API). Decisión general
**APROBADO**.

Pendientes para revisión humana, ninguno bloqueante:

1. Cerrar/actualizar `QA-JE-G22-01` como corrección verificada (evidencia
   conjunta de G22 V2, G24 V2 y este grupo).
2. Alinear la documentación de RF-17 (`numeric(5,2)`) con el esquema real
   desplegado (`numeric(8,2)`).
