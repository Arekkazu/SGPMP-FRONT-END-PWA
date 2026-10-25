# TC-M09-G28 — REEVALUACIÓN V2

## DECISIÓN GENERAL

**REEVALUACIÓN APROBADA en TEST. TC-M09-60 APROBADO y TC-M09-61 APROBADO.** Una configuración creada por API, umbral **#43**, demuestra precisión y persistencia en API + PostgreSQL read-only + frontend Cypress. Responsable QA: Juan Esteban. RF-17, Exactitud / Integración.

| Caso | V1 | V2 | Ambiente decisorio | Motivo | Categoría | Equipo | Acción |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-M09-60 | DESAPROBADO: creación HTTP 500 | APROBADO | TEST HTTPS | POST 201; 35.57/39.23 exactos en POST, GET y BD; UI correcta | FLUJO de V1, no reproducido en escenario válido V2 | QA / Desarrollo | Actualizar incidencia V1 como corrección verificada por QA, revisión humana |
| TC-M09-61 | APROBADO con UI/API, sin SELECT BD | APROBADO | TEST HTTPS | Mismo #43 y valores tras logout, token distinto y nuevo login; BD posterior idéntica | Sin defecto funcional | QA | Conservar evidencia y cierre del caso |

No se reprodujo el síntoma de creación fallida de V1. Esto verifica comportamiento actual con datos válidos nuevos; no identifica el commit correctivo ni demuestra retrospectivamente la causa raíz del 500 histórico.

## RESUMEN V1

Evaluación histórica leída, sin modificaciones: `../../../RESULTADOS/run-20260906/TC-M09-G28_resultado.md` y JSON `TC-M09-60-evidencia-intento2.json`.

TC60: Administrador TEST, especie #10 Tilapia activa, variable #1 Temperatura del agua, límite físico 0.00–45.00, combinación libre. Payload 35.50–39.20 y niveles 35.50–37.00 / 37.00–38.00 / 38.00–39.20. Dos POST válidos devolvieron HTTP 500 ERROR_INTERNO, «Error inesperado en base de datos»; GET posterior sin registro. Sin ID creado ni valores almacenados: V1 demostró fallo de creación, no pérdida numérica.

TC61: registro preexistente #4, especie #2 Trucha Arcoíris, variable #1, rango 0.00–100.00, activo; niveles 12.00–18.00 / 8.00–12.00 / 18.00–25.00. El segundo recorrido Cypress demostró UI/API estables entre login A, logout y login B. El primer recorrido falló por comparar texto antes de cargar el catálogo de variables; error de sincronización QA corregido, no defecto de persistencia.

V1 no consultó PostgreSQL por ausencia de credencial. Su aprobación de TC61 se conserva como resultado histórico, pero no sustituye los SELECT exigidos en V2. Su registro preexistente y sus decimales triviales no se reutilizaron como prueba de precisión.

## MOTIVO DE REEVALUACIÓN

Comprobar creación válida y precisión exacta con dos decimales no triviales; usar el mismo ID para persistencia posterior a nueva sesión. Comparaciones backend con Decimal de valores originales, sin redondear ni cuantizar antes de comparar. `35.50` y `35.5` serían equivalentes; `35.57` y `35.6` no lo son.

El preflight previo `../run-20260913T062844Z/TC-M09-G28_reevaluacion_V2.md` quedó bloqueado por credenciales. Se conserva como evidencia histórica de preparación; este run funcional lo supera tras recibir acceso en memoria.

## ENTORNO

RUN_ID: `run-20260913-functional-v2`. Fecha UTC: 2026-09-13. TEST principal; sin MQTT.

- Frontend: https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io
- Backend: https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test
- PostgreSQL: entorno `sgpmp_test`, sesión comprobada read-only.
- Python 3.13.13, pytest 9.0.3 y psycopg2 2.9.12 del entorno existente `sgpmp-backend/.venv`.
- Cypress 13.17.0; Electron 118.0.5993.159 headless; sin instalaciones.

La URL backend HTTP suministrada dio 404; HTTPS publicó OpenAPI y respondió correctamente al flujo autenticado. El fallo HTTP inicial no es el 500 funcional V1. SHA desplegado no confirmado.

## GIT / SHAs

Rama exacta en ambos repositorios: `qa/juan-esteban-re-evaluacion-M02`.

| Repositorio | SHA local V2 |
| --- | --- |
| SGPMP-FRONT-END-PWA | 49966d244673eb44d0be61e7df25c27d460b2c1c |
| sgpmp-backend | ff5f6c9f6161e46c94d3d6f325a7d07d80d84aa0 |

V1 registró frontend 966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56 y backend adc3932b9f0293a76ebec7e89ed877274791b6a1 en rama qa/juan-esteban-m09. Son referencias históricas, no ramas usadas por V2.

## ACTOR

Administrador TEST `administador.dev@gmail.com`, usuario **104**, `nombre_rol=Administrador`, confirmado por `/usuarios/me`. Permisos recurso 20 crear/consultar comprobados antes del POST. Cypress confirmó nuevamente identidad y rol en ambos logins del recorrido definitivo. Sin fallback a Veterinario ni otros roles.

## DISCOVERY

Evidencias: [preconditions.json](preconditions.json) y [preconditions-creation.json](preconditions-creation.json). Discovery repetido inmediatamente antes de crear, después de login y comprobación DB read-only.

- Especie #41 **Ave Qa Je**, `es_activo=true` por catálogo API.
- Variable predefinida #1 **Temperatura del agua**, °C; límites físicos **0.00–45.00**.
- GET de umbrales por especie devolvió lista vacía; combinación libre.
- Min 35.57 < max 39.23, ambos dentro del límite físico y con dos decimales relevantes.
- Niveles normal 35.57–37.00, precaucion 37.00–38.00, critico 38.00–39.23; cobertura completa, contigua, sin huecos ni solapamientos.

Contrato revisado en router, DTO, schemas, caso de uso y modelo local; OpenAPI TEST publica las rutas. POST `/configuracion/umbrales`, Éxito 201. GET de listado por `id_especie`, filtrando luego exactamente `id_umbral_ambiental=43` y exigiendo una coincidencia. No se inventó GET directo por ID.

Payload enviado con cadenas decimales exactas aceptadas por los campos Decimal del DTO, IDs enteros y los tres niveles. Sin campos de observaciones inexistentes. La UI resuelve variables por catálogo, muestra rango y niveles. La prueba espera el catálogo antes de comparar.

## CONFIGURACIÓN CREADA

**Un POST total**, cero reintentos de creación, HTTP **201**, ID **43**. Registro activo, especie 41, variable 1. Se conserva sin edición, desactivación ni eliminación.

[creation-attempt.json](creation-attempt.json) contiene payload y respuesta. [record.json](record.json) es el artefacto sanitizado de coordinación Pytest/Cypress. El guard del test impide repetir automáticamente el POST si ya existe evidencia de intento.

## TC-M09-60 — PRECISIÓN

**APROBADO.** [tc60-precision.json](tc60-precision.json) registra input, POST, GET, SELECT y metadata.

| Fuente | valor_min | valor_max | Coincide con input |
| --- | ---: | ---: | --- |
| Input | 35.57 | 39.23 | Base |
| API POST / GET | 35.57 | 39.23 | SÍ |
| PostgreSQL | 35.57 | 39.23 | SÍ |
| UI, texto DOM y extremos de semáforo | 35.57 | 39.23 | SÍ |

Pytest compara Decimal exacto de min, max y cada límite; además ID, especie, variable y estado. No hay truncamiento ni redondeo indebido. La representación JSON como string no altera el valor. Cypress comprueba numéricamente el rango y los tres niveles y los compara con el artefacto del mismo ID.

Ejecución Pytest TC60: **1 passed**, 1 deselected (TC61 reservado para después de Cypress). [Log](pytest-TC-M09-G28-v2.log) · [JUnit XML](pytest-TC-M09-G28-v2.xml).

## TC-M09-61 — PERSISTENCIA NUEVA SESIÓN

**APROBADO.** La sesión API de creación se cerró oficialmente por DELETE `/sesiones/` HTTP 200 y descartó token, sin cookies retenidas: [session1-ended.json](session1-ended.json).

Cypress realizó dos logins UI reales, sin mocks ni `cy.session()`: login A → configuración visible → logout oficial HTTP 200 → retorno a /login → limpieza cookies/localStorage/sessionStorage → login B → `/usuarios/me` → misma configuración. Comprobó en memoria que token B es distinto de token A; no guardó tokens ni hashes. Cerró también la sesión UI final.

| Dato | Antes de logout | Después de nueva sesión | Coincide |
| --- | --- | --- | --- |
| ID | 43 | 43 | SÍ |
| Especie | 41, Ave Qa Je | 41, Ave Qa Je | SÍ |
| Variable | 1, Temperatura del agua | 1, Temperatura del agua | SÍ |
| Min | 35.57 | 35.57 | SÍ |
| Max | 39.23 | 39.23 | SÍ |
| Niveles | 35.57–37.00 / 37.00–38.00 / 38.00–39.23 | Idénticos | SÍ |
| Activo | true | true | SÍ |

Session 1 actor: Administrador #104 (login A UI). Session 1 authentication successful: SÍ. Logout/token descartado: SÍ. Session 2 authentication successful: SÍ. Token nuevo comprobado: SÍ. La sesión de creación API es anterior y también terminó oficialmente.

[UI y API de ambas sesiones](cypress/recorrido2/ui-evidence.json). SELECT posterior comparó nuevamente el registro completo con BD inicial, input y API de sesión B usando Decimal: **1 passed**, 1 deselected. [DB posterior](tc61-db-after-session.json) · [Log](pytest-TC-M09-61-db-v2.log) · [JUnit XML](pytest-TC-M09-61-db-v2.xml).

## POSTGRESQL READ ONLY

**Tipo BD observado: numeric(8,2)** en valor_min y valor_max. RF-17 declara numeric(5,2); ORM local Numeric sin escala explícita. Discrepancia de capacidad documentada: escala real 2, comportamiento de precisión requerido cumplido para los valores ensayados. No se probaron límites de capacidad fuera del alcance.

Conexiones con `default_transaction_read_only=on` y timeout; SELECT verifica `transaction_read_only=on` y `current_database()=sgpmp_test`. SQL explícito del harness exclusivamente SELECT:

1. Estado de sesión y base.
2. information_schema.columns, precisión y escala de ambas columnas.
3. modulo9.umbrales_ambientales por ID parametrizado.
4. modulo9.niveles_alerta_ambientales por mismo ID.

Lecturas después de creación y después del recorrido de sesiones. Ninguna escritura SQL ni función mutante; la Única creación funcional se realizó por API.

## EVIDENCIA FRONTEND

Cypress: dos recorridos, máximo utilizado. Recorrido 1 falló en automatización; recorrido 2 **1 passing, 0 failing**. [Resultado definitivo](cypress/recorrido2/result.json), [log](cypress/recorrido2/cypress.log).

- [Configuración antes de logout](cypress/recorrido2/screenshots/persistencia-v2.cy.js/TC-M09-60-configuracion-visible.png).
- [Configuración después de nueva sesión](cypress/recorrido2/screenshots/persistencia-v2.cy.js/TC-M09-61-despues-nueva-sesion.png).

Capturas inspeccionadas: especie, ID #43, variable y extremos 35.57/39.23 del semáforo visibles, sin secretos. Limitación visual del viewport de captura: la tabla se extiende a la derecha; no muestra todas sus columnas simultáneamente. Rango general, tres niveles y estado se verificaron además mediante assertions sobre texto DOM y respuestas reales. No se infiere un número distinto por esa limitación de captura.

Intercepts solo observan; sin stubs, esperas fijas, force:true ni reutilización de sesión. No se ejecutó un tercer recorrido para ampliar capturas.

## COMPARACIÓN V1 VS V2

| Aspecto | V1 | V2 |
| --- | --- | --- |
| Ambiente | TEST HTTPS | TEST HTTPS |
| Actor | Administrador | Administrador #104 confirmado /me |
| Variable | Temperatura del agua #1 | Temperatura del agua #1 |
| Especie TC60 | Tilapia #10 | Ave Qa Je #41, activa y libre |
| Min/Max TC60 | 35.50 / 39.20 | 35.57 / 39.23 |
| Creación | Dos HTTP 500, sin ID | Un HTTP 201, ID #43 |
| API precisión | No evaluable TC60 | Exacta |
| DB precisión | Sin credencial / sin consulta | Exacta; numeric(8,2) observado |
| Nueva sesión | UI login/logout/login | UI login/logout/login y tokens distintos |
| Persistencia | Registro preexistente #4 | Mismo registro creado #43 |
| UI | Segundo recorrido PASS | Segundo recorrido PASS |
| Resultado | TC60 rechazado, TC61 aprobado | Ambos aprobados |

La intención funcional se conserva con combinación libre actual; no se fuerzan IDs ni datos literales históricos. No hay fundamento para reclasificar el 500 de V1 como error QA. SÍ se distinguen los errores de sincronización de automatización en ambas evaluaciones.

## COMPARACIÓN TEST VS DEV

Solo diagnóstico anónimo previo: HTTP TEST 404 motivó consulta HTTPS; TEST y DEV HTTPS devolvieron 401 sin credencial y OpenAPI 200 con rutas de umbrales. No se verificó precisión ni persistencia funcional en DEV, ni hubo login o creación allí. TEST HTTPS cumple ambos casos; no se necesita fallback ni se declara desfase funcional TEST/DEV.

## ORIGEN DEL FALLO

No hay fallo funcional confirmado en V2. Incidentes QA resueltos:

- Primer discovery intentó leer id_rol en /usuarios/me; el contrato expone nombre_rol. KeyError antes de cualquier creación; sesión cerrada HTTP 200. Se corrigió solo el harness y se confirmó Administrador antes del POST.
- Cypress recorrido 1 omitía esperar `aria-disabled=false` del menú después de nueva autenticación; no apareció Por especie. Recorrido 2 espera permiso y ruta /configuracion, y pasa. Diagnóstico de sincronización respaldado por el código del menú y el resultado al añadir la espera, sin cambios de producto.
- La primera captura de fila era parcial; recorrido 2 captura página completa, con la limitación horizontal documentada.
- El wrapper PowerShell señaló NativeCommandError por stderr de arranque DevTools y reportó exit 1 incluso en el recorrido verde. El resultado estructurado de Cypress y su test son PASS; no se interpretó el código del wrapper como fallo del producto ni se repitió la prueba.

## CATEGORÍA / EQUIPO / ACCIÓN

Defecto histórico: **FLUJO → Desarrollo** (fallo de creación/persistencia). Acción preparada: **ACTUALIZAR INCIDENCIA V1 COMO CORRECCIÓN VERIFICADA POR QA** para el escenario válido reevaluado. Sin nueva incidencia duplicada. Errores de harness: QA, corregidos y evidenciados. Discrepancia de metadata queda como observación sin rechazo automático ni severidad inventada.

## INCIDENCIAS

Referencia V1: **ID pendiente de asignación según Registro de Errores vigente**. No se encontró ID asignado en el reporte histórico. Severidad: **Pendiente de validar contra Registro de Errores vigente**; no se deduce de prioridad alta.

Contenido para actualización humana: «RF-17/TC-M09-60 reevaluado en TEST: una creación válida devuelve 201, ID #43; input/API/BD conservan 35.57–39.23 y niveles. TC61 confirma mismo ID después de nuevo login con token distinto, UI y BD posterior estables. Corrección funcional verificada por QA; causa raíz y commit desplegado no confirmados.»

No se crearon ni modificaron tickets, PRs o mensajes externos.

## SEGURIDAD

Credenciales solo en variables de procesos/memoria; no se persistieron valores en código, JSON, Markdown o logs. No tokens, cookies ni cadenas de conexión en evidencias. Capturas solo de configuración y blackout de inputs sensibles; video desactivado. Ver [seguridad-evidencias.json](seguridad-evidencias.json) para escaneo de valores y patrones. Tres PNG revisados, ninguna captura de login.

V1 solo lectura; todo archivo nuevo/modificado por esta reevaluación queda en EvaluacionV2. Sin SQL de escritura, cleanup de datos, cambios de código funcional/infraestructura, instalaciones, commit, push, pull, cambio de rama ni otra operación Git mutante.

## GIT FINAL

[git-final.json](git-final.json) incluye rama, SHA, status --short, diff --stat y ls-files --others --exclude-standard para ambos repositorios. Diff versionado vacío. Cambios preexistentes ajenos a TC-M09-G28 EvaluacionV2: frontend G22/EvaluacionV2; backend G24/EvaluacionV2, G77/EvaluacionV2 y G78/EvaluacionV1. Conservados sin intervención. En el status final apareció además backend RF-17/TC-M09-G29/EvaluacionV2, ausente al inicio de esta reanudación: cambio concurrente ajeno a G28, no creado ni modificado por esta ejecución. No se inspeccionó su contenido ni se avanzó a G29.

Se conserva #43 como evidencia. Reevaluación completada; detener para revisión humana. No avanzar a otro grupo.
