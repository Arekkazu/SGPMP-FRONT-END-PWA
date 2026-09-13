# TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15 - Módulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI, PWA & API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.83 |
| Fecha ejecución | 2026-09-13T02:46:16.177Z |
| Dato de prueba | Nombre: `Especie Conflicto QA VONTSB`, Descripción: `Especie temporal para prueba de unicidad y arquitectura` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-5: Modelo Arquitectónico y Redefinición de Alcance | Declaración formal sobre la aplicabilidad del conflicto offline | ESCENARIO ORIGINAL NO APLICABLE POR DISEÑO: El catálogo de especies implementa un modelo de escritura estrictamente ONLINE (disabled={!online}) con caché Dexie config_especies de sólo lectura. No existe creación offline diferida en el cliente, por lo que el conflicto de sincronización entre cliente offline y servidor es estructuralmente imposible. Se confirman funcionales la protección offline (bloqueo de UI) y la unicidad de nombres del backend (HTTP 409). | **OK** |
| CP-1: Precondición de datos en catálogo TEST | No debe existir una especie previamente llamada "Especie Conflicto QA VONTSB" | Confirmado: "Especie Conflicto QA VONTSB" no existe en el catálogo TEST. | **OK** |
| CP-2: Protección UI de creación en modo Offline | El botón "Nueva especie" debe estar inhabilitado (disabled) al estar offline | Botón "Nueva especie" inhabilitado correctamente en UI (disabled=true) al detectar estado offline. | **OK** |
| CP-3: Registro base de especie en servidor (online) | HTTP 201/200 OK con ID asignado y objeto de especie creada | HTTP 201 OK - ID asignado: #45 | **OK** |
| CP-4: Rechazo de duplicado de nombre en servidor (HTTP 409 / Unicidad) | HTTP 409 Conflict (o 400 Bad Request) impidiendo la creación de duplicados y la sobrescritura | HTTP 409 OK - Registro duplicado rechazado correctamente: {"error_code":"ESPECIE_DUPLICADA","message":"La especie 'Especie Conflicto QA VONTSB' ya se encuentra registrada en el catálogo.","fields":[{"field":"nombre","message":"La especie 'Especie Conflicto QA VONTSB' ya se encuentra registrada en el catálogo."}],"timestamp":"2026-09-13T02:46:16.341821+00:00"} | **OK** |

## Veredicto: APROBADO CON ALCANCE REDEFINIDO

## Registro técnico & Hallazgos

- **Detalle técnico de red / ejecución**: POST /configuracion/especies (creación base "Especie Conflicto QA VONTSB") -> HTTP 201. Body: {"id_especie":45,"nombre":"Especie Conflicto Qa Vontsb","descripcion":"Especie temporal para prueba de unicidad y arquitectura","es_activo":true,"fecha_creacion":"2026-09-13T02:46:16.199121Z","fecha_actualizacion":null} | POST duplicado -> HTTP 409. Body: {"error_code":"ESPECIE_DUPLICADA","message":"La especie 'Especie Conflicto QA VONTSB' ya se encuentra registrada en el catálogo.","fields":[{"field":"nombre","message":"La especie 'Especie Conflicto QA VONTSB' ya se encuentra registrada en el catálogo."}],"timestamp":"2026-09-13T02:46:16.341821+00:00"}
- **Resolución de Incidente Backend**: El incidente histórico HTTP 500 (INC-M09-01-G01) en `POST /configuracion/especies` fue confirmado como resuelto, permitiendo la ejecución exitosa de la creación base y la verificación de unicidad de nombres.
- **Protección Offline en UI**: Se confirma que el botón 'Nueva especie' permanece inhabilitado (`disabled={!online}`) cuando el dispositivo no tiene conexión, impidiendo escrituras no sincronizadas.
- **Protección de Unicidad de Nombre**: El servidor rechaza con HTTP 409 la creación de especies con nombres duplicados, garantizando la integridad de datos sin sobrescribir registros preexistentes.
- **Redefinición de Alcance Arquitectónico**: El escenario original de conflicto de sincronización diferida (offline vs. online simultáneo) es estructuralmente no aplicable en la arquitectura actual, ya que el catálogo de especies opera bajo el modelo *online-only write* con caché de sólo lectura (`config_especies` en IndexedDB).

## Evidencias visuales

- [01_ui_offline_proteccion.png](screenshots/01_ui_offline_proteccion.png): Alerta de sin conexión y botón 'Nueva especie' inhabilitado en UI.
- [02_intento_registro_especie.png](screenshots/02_intento_registro_especie.png): Captura del estado del catálogo o formulario durante la prueba.
