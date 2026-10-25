# TC-M09-G28 — REEVALUACIÓN V2

## DECISIÓN GENERAL

**BLOCKED POR PRECONDICIÓN. Reevaluación funcional incompleta.** No se ha confirmado corrección ni persistencia del defecto V1. Cero POST de configuración, cero autenticaciones, cero consultas SQL. Falta acceso a las credenciales QA del actor TEST y PostgreSQL mediante memoria/variables de proceso; se solicitó al usuario. No se instalaron dependencias.

| Caso | V1 | V2 | Ambiente decisorio | Motivo | Categoría | Equipo | Acción |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-60 | DESAPROBADO: HTTP 500 al crear | BLOCKED | TEST previsto, sin decisión funcional | Sin actor autenticado ni BD read-only comprobada | Precondición QA; sin defecto nuevo confirmado | QA | Habilitar acceso y ejecutar |
| TC-M09-61 | APROBADO según V1 | BLOCKED | TEST previsto, sin decisión funcional | Sin configuración correlacionada ni nueva sesión | Precondición QA | QA | Completar TC60 y verificar mismo ID |

## RESUMEN V1

Fuente: `../../../RESULTADOS/run-20260906/TC-M09-G28_resultado.md` desde este reporte (evaluación histórica fuera de EvaluacionV2, solo lectura). Se contrastó también `TC-M09-60-evidencia-intento2.json`.

Administrador TEST. TC60: Tilapia #10 activa, Temperatura del agua #1, límites 0.00–45.00; combinación libre; envío 35.50–39.20 con niveles contiguos 35.50–37.00 / 37.00–38.00 / 38.00–39.20. Dos POST devolvieron 500 ERROR_INTERNO; GET posterior sin registro. No existen valores creados cuya precisión pudiera comprobarse. No demuestra pérdida decimal: demuestra fallo de creación.

TC61: registro preexistente #4, especie #2 Trucha Arcoíris, variable #1, rango 0.00–100.00, activo, niveles 12.00–18.00 / 8.00–12.00 / 18.00–25.00. Cypress verificó login A, logout UI y login B con UI/API estables. Primer recorrido falló por carrera al cargar el nombre del catálogo; el segundo pasó tras sincronizar peticiones y comparar valores funcionales. Es un error de automatización documentado, no pérdida de persistencia.

V1 no consultó PostgreSQL por falta de credencial. Su aprobación de TC61 no satisface automáticamente el criterio más estricto de V2. El registro histórico tampoco demuestra dos decimales no triviales ni validez para una nueva creación. No se reutilizó como sustituto de TC60.

## MOTIVO DE REEVALUACIÓN

Volver a verificar creación válida, igualdad numérica exacta input/API/BD con Decimal y persistencia del mismo ID después de una autenticación nueva, incluida UI Cypress. Preferir dos decimales relevantes (por ejemplo 35.57 y 39.23 Únicamente si el discovery demuestra validez). Comparar valores originales sin cuantización que pueda ocultar alteraciones.

## ENTORNO

RUN_ID: `run-20260913T062844Z`. Fecha UTC: 2026-09-13. TEST principal, sin MQTT. Frontend HTTP /login responde 200. Backend HTTP suministrado responde 404; HTTPS responde 401 sin autenticación y OpenAPI 200 publica `/configuracion/umbrales`. Usar HTTPS al continuar. SHA desplegado no confirmado.

## GIT / SHAs

Ambos repositorios en `qa/juan-esteban-re-evaluacion-M02`.

- Frontend: `49966d244673eb44d0be61e7df25c27d460b2c1c`.
- Backend: `ff5f6c9f6161e46c94d3d6f325a7d07d80d84aa0`.

Cambios preexistentes ajenos a TC-M09-G28 EvaluacionV2: frontend G22/EvaluacionV2; backend G24/EvaluacionV2, G77/EvaluacionV2 y G78/EvaluacionV1. No se alteraron.

## ACTOR

Administrador previsto `administador.dev@gmail.com`; identidad y rol aún no confirmados por /me. Sin intentos de login. Sin fundamento para cambiar a Veterinario.

## DISCOVERY

Pendiente autenticación: especies activas, variables, límites físicos y combinación libre. El GET anónimo con id_especie=0 solo comprobó acceso HTTP; no representa una especie seleccionada ni discovery funcional.

Contrato local revisado: router `umbral_router.py`, DTO `registrar_umbral_dto.py` y `nivel_dto.py`, schema `umbral_schema.py`, caso de uso de registro, ORM y `UmbralesSection.tsx`. POST `/configuracion/umbrales` espera 201 y campos id_especie, id_variable_ambiental, valor_min, valor_max, niveles. Tres niveles normal/precaucion/critico, contiguos y cubriendo el rango, dentro de límites físicos. No agregar observaciones: no pertenece al DTO aunque el ORM tenga descripción.

El GET funcional disponible es por especie; al continuar se debe seleccionar y exigir exactamente el ID creado dentro de items. No inventar un GET directo por ID. Campos de correlación: id_umbral_ambiental y es_activo. Decimal en entrada/salida; confirmar representación efectiva con respuestas autenticadas.

## CONFIGURACIÓN CREADA

Ninguna. Checklist previo al POST incompleto: actor, discovery, tipo real BD y sesión read-only pendientes. No se ejecutó POST exploratorio.

## TC-M09-60 — PRECISIÓN

No ejecutado; BLOCKED. El preflight no evalúa precisión.

| Fuente | valor_min | valor_max | Coincide con input |
| --- | --- | --- | --- |
| Input | Sin elegir | Sin elegir | No aplica |
| API POST/GET | No evaluado | No evaluado | No evaluado |
| PostgreSQL | No evaluado | No evaluado | No evaluado |
| UI | No evaluado | No evaluado | No evaluado |

## TC-M09-61 — PERSISTENCIA NUEVA SESIÓN

No ejecutado; BLOCKED. Cypress no se lanzó sin credenciales y registro correlacionado.

| Dato | Antes de logout | Después de nueva sesión | Coincide |
| --- | --- | --- | --- |
| ID | No disponible | No ejecutado | No evaluado |
| Especie | No disponible | No ejecutado | No evaluado |
| Variable | No disponible | No ejecutado | No evaluado |
| Min | No disponible | No ejecutado | No evaluado |
| Max | No disponible | No ejecutado | No evaluado |
| Niveles | No disponible | No ejecutado | No evaluado |
| Activo | No disponible | No ejecutado | No evaluado |

Session 1 actor: no autenticado. Session 1 authentication successful: No. Logout/token descartado: no aplica. Session 2 authentication successful: No. Token nuevo comprobado: No.

## POSTGRESQL READ ONLY

Tipo BD observado: **no verificado**. RF-17 exige numeric(5,2); ORM local usa Numeric sin precisión/escala. No implica automáticamente defecto. No hubo conexión ni SQL.

Al continuar, conectar con `default_transaction_read_only=on`; verificar con SELECT current_setting('transaction_read_only'), current_database(); consultar information_schema.columns para modulo9.umbrales_ambientales y después valores por ID mediante SELECT parametrizado. Comparar Decimal exacto antes/después de nueva sesión. No inferir metadata ni igualdad en BD desde API.

## EVIDENCIA FRONTEND

Solo acceso HTTP 200; no evidencia visual funcional ni capturas. Cypress npm 13.17.0 y caché 13.17.0 presentes; runtime no ejecutado. Python global 3.14 carece de pytest, pero el entorno ya instalado `sgpmp-backend/.venv` proporciona Python 3.13.13, pytest 9.0.3 y psycopg2 2.9.12. No DEPENDENCY_MISSING definitivo.

Pytest preflight real: **1 passed, 1 failed** (404 en URL HTTP de API). Log y XML adjuntos conservan el fallo sin sobrescribirlo. Son comprobaciones de conectividad; no son resultados de TC60/TC61. Diagnóstico adicional `test-dev-acceso.json`: TEST HTTPS 401 y OpenAPI 200; fallo inicial explicado por esquema HTTP. No se repitieron escrituras.

## COMPARACIÓN V1 VS V2

| Aspecto | V1 | V2 |
| --- | --- | --- |
| Ambiente | TEST HTTPS | TEST HTTP comprobado; HTTPS disponible |
| Actor | Administrador | Previsto, sin autenticar |
| Variable | Temperatura del agua | Discovery pendiente |
| Min/Max | TC60 35.50/39.20; TC61 0/100 | Pendiente |
| API precisión | TC60 no evaluable por 500 | Sin evaluar |
| DB precisión | Sin consulta | Sin consulta |
| Nueva sesión | Cypress demostró dos logins | Pendiente |
| Persistencia | TC61 estable UI/API | Pendiente |
| UI | Segundo recorrido PASS | Sin recorrido |
| Resultado | TC60 rechazado, TC61 aprobado | Ambos BLOCKED |

## COMPARACIÓN TEST VS DEV

Consulta diagnóstica anónima DEV ante 404 HTTP TEST: HTTPS endpoint 401 y OpenAPI 200, igual que TEST HTTPS. No creación ni autenticación DEV. No se demuestra ausencia de feature ni desfase TEST/DEV; continuar funcionalmente en TEST.

## ORIGEN DEL FALLO

Bloqueo actual por credenciales QA no disponibles en proceso. No se atribuye a producto ni a caída de PostgreSQL. El 404 HTTP inicial no reproduce el 500 autenticado V1. Corrección o persistencia del defecto histórico: indeterminadas.

## CATEGORÍA / EQUIPO / ACCIÓN

Actual: precondición QA, proporcionar acceso a credenciales y reanudar. Defecto histórico de creación: FLUJO / Desarrollo como clasificación propuesta; no cambiar estado de incidencia sin reevaluación funcional. Ningún aviso externo enviado.

## INCIDENCIAS

V1: ID pendiente de asignación según Registro de Errores vigente. Severidad pendiente de validar contra ese registro. Conservar referencia; no duplicar, cerrar ni reabrir todavía. Sin nuevos defectos confirmados. No tickets automáticos.

## SEGURIDAD

Secretos no persistidos; no se leyeron archivos .env. Evidencias generadas sin cuerpos autenticados, headers ni credenciales. V1 permaneció read-only. Única escritura dentro de EvaluacionV2; bytecode y cache pytest deshabilitados. Cero SQL, cero POST de configuración, cero cleanup, sin cambios funcionales, dependencias, infraestructura ni operaciones Git mutantes.

## GIT FINAL

Ver `git-final.json`: status, diff --stat y untracked en ambos repositorios. Ver `seguridad-evidencias.json` para escaneo de artefactos. Pendiente completar la reevaluación cuando QA facilite acceso; no avanzar a otro grupo.
