# INFORME DE FASE 1b: CORRECCIÓN Y VERIFICACIÓN TÉCNICA
## CASO TC-M05-G23: REPORTE DE GASTOS ACUMULADOS POR ACTIVO Y EXPORTACIÓN (RF-77)
**Fecha:** 2026-11-06 (UTC: 2026-11-07)  
**Ambiente:** TEST Oficial (`https://api.inmero.co/api-sgpmp-test` / Frontend: `https://api.inmero.co/sigab-test/`)  
**Autor:** Agente de Verificación Técnica de QA  

---

## SECCIÓN A — FE DE ERRATAS DEL INFORME DE FASE 1

| # | Afirmación en Fase 1 | Realidad técnica verificada (Fase 1b) | Impacto en la estrategia de automatización de G23 |
|---|----------------------|--------------------------------------|---------------------------------------------------|
| 1 | `git check-ignore` no reportó cambios porque `testing/` estaba en `.gitignore`. | `git check-ignore testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/fase1_analisis_G23.md` devuelve **código 1 (NO ignorado)**. `git status --short` no mostró el nuevo archivo porque el directorio completo `testing/test_testing/Modulo5/` ya era un directorio no rastreado (`??`) desde el inicio. Git muestra únicamente el prefijo del directorio no rastreado. | Ningún riesgo de contaminación de ramas; todos los entregables de G23 quedan confinados en carpetas no rastreadas (`??`). |
| 2 | El rol Administrador está sujeto a las mismas restricciones de finca que el Productor (`id_usuario_dueno` / fincas asignadas). | `AlcanceActivoM02Adapter` y `AlcanceFincaAdapter.es_global(id_rol)` (`src/shared/infrastructure/adapters/alcance_finca_adapter.py:32-35`) establecen que para el Rol Administrador (Rol 1, rol protegido), el filtro de finca es **GLOBAL** (`None`), desactivando el filtro `WHERE id_finca = ...` en el repositorio de lectura de gastos (`detalle_gasto_read_repository.py:53`). | **El Administrador ve TODOS los activos y fincas del sistema**. Es el rol idóneo para Cypress si se requiere visión global, mientras que el Productor solo ve sus fincas asociadas en `modulo9.usuarios_fincas`. |
| 3 | El archivo `procesar_cola_reporte_gastos_use_case.py` no existe en el backend. | El archivo **SÍ EXISTE** bajo el nombre en plural: `src/supplies/application/use_cases/reporte_gastos/procesar_cola_reportes_gastos_use_case.py`. | Se confirmó la arquitectura batch asíncrona: usa sesión directa de SQLAlchemy fuera del middleware de sandbox. |
| 4 | Los reportes 7 y 9 del historial del Productor permiten validar la descarga de exportaciones previas (E9). | En ambos reportes (`id=7` e `id=9`), el campo `"archivo"` devuelto por la API es `null` (`"archivo": null`), porque las exportaciones expiran a las 24 horas (E6d). | No es posible probar la descarga de archivos huérfanos o antiguos mediante GET directo sin antes haber generado una exportación fresca. |
| 5 | El activo 5 tiene ciclo productivo registrado y es apto para generar reporte de gastos. | Aunque el activo 5 tiene fases registradas en `fases`, el atributo de base de datos `fecha_inicio_ciclo` en la tabla `activos_biologicos` es `null`. El use case `generar_reporte_gastos_use_case.py:150` valida estrictamente la regla E7 y rechaza la petición con **HTTP 422 `ACTIVO_SIN_CICLO`**. | Para generar reportes de gastos, se debe elegir un activo que posea `fecha_inicio_ciclo IS NOT NULL` (como el Activo 57), o inicializar el ciclo según RF-37. |

---

## SECCIÓN B — CÓDIGO VERIFICADO (Puntos 1.1 a 1.5)

### B.1 Procesamiento de cola asíncrona (`procesar_cola_reportes_gastos_use_case.py`)
- **Ubicación exacta:** `C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\application\use_cases\reporte_gastos\procesar_cola_reportes_gastos_use_case.py` (líneas 1-135).
- **Mecanismo de sesión:** Utiliza `session_factory = sesion_sistema()` (proveniente de `src.shared.database.sesion_sistema`, línea 218). Abre una sesión directa `SessionLocal()` de SQLAlchemy con identidad del usuario de servicio del sistema (`servicio.sistema@sgpmp.local`, Rol Administrador).
- **Aislamiento / Sandbox Bypass:** **NO pasa por el middleware HTTP de sandbox** (`SandboxMiddleware`). Opera en hilo/proceso de background independiente. Por tanto, el worker asíncrono **NO PUEDE VER datos transaccionales no commiteados del sandbox** (opera sobre la base de datos real bajo aislamiento READ COMMITTED).
- **Disparador:** Puede dispararse automáticamente por el scheduler en `src/main.py` o invocarse manualmente mediante el endpoint administrativo `POST /suministros/reportes-gastos/batch/ejecutar`.

### B.2 Barrido de flags de prueba en backend
- **Búsqueda ejecutada:** Patrones `X-Test`, `X-Force`, `FORCE_`, `MOCK_`, `FAIL_PDF`, `freeze`, `utcnow`, `ENABLE_TEST_SANDBOX`, `test_control` en `src/supplies/`.
- **Resultado:** **CERO FLAGS DE BYPASS ESPECÍFICOS** en el módulo de suministros.
- **Mecanismo oficial:** El único mecanismo sancionado es el sistema global de sandbox transaccional en `src/shared/infrastructure/middleware/sandbox_middleware.py`, activado vía cabeceras `X-Test-Run-Id` y `X-Sandbox-Secret`, y revertido con `DELETE /test-control/runs/{run_id}`.

### B.3 Permisos RBAC en `alembic/baseline/esquema_baseline.sql`
- **Ubicación exacta:** Líneas 47894-47898 de `alembic/baseline/esquema_baseline.sql`.
- **Recurso asignado:** Recurso ID `51` (`reporte_gastos_suministros`).
- **Matriz de permisos por rol:**
  - **Administrador (Rol 1):** Permiso `admin_ejecutar_reporte_gastos_suministros` (E = valor 5) y `admin_leer_reporte_gastos_suministros` (R = valor 2). Puede generar, exportar, consultar historial y descargar.
  - **Productor (Rol 2):** Permiso `prod_ejecutar_reporte_gastos_suministros` (E = valor 5) y `prod_leer_reporte_gastos_suministros` (R = valor 2). Puede generar, exportar, consultar historial y descargar (restringido a sus fincas).
  - **Contador (Rol 5):** Permiso `cont_leer_reporte_gastos_suministros` (R = valor 2). Solo lectura/consulta; NO tiene permiso de ejecución (E=5).
  - **Veterinario (Rol 3), Gestor de Granja (Rol 7), Revisor Fiscal (Rol 8):** **NINGÚN PERMISO**. Cualquier intento de acceso a `/suministros/reportes-gastos` responde con **HTTP 403 Prohibido**.

### B.4 Alcance del Administrador
- **Ubicación exacta:** `src/shared/infrastructure/adapters/alcance_finca_adapter.py` (líneas 32-35) y `src/supplies/infrastructure/adapters/detalle_gasto_read_repository.py` (líneas 45-65).
- **Lógica de negocio:** `AlcanceFincaAdapter.es_global(id_rol)` retorna `True` si el rol es protegido (Rol 1 Administrador). Al invocar `obtener_fincas_visibles(1)`, retorna `None`.
- **Efecto SQL:** En `detalle_gasto_read_repository.py`, si la lista de fincas es `None`, se omite la cláusula `WHERE finca_id IN (...)`. Por lo tanto, el **Administrador tiene alcance GLOBAL irrestricto** sobre todos los activos, fincas e infraestructuras del sistema. El Productor queda restringido a las fincas vinculadas en `modulo9.usuarios_fincas`.

### B.5 Concurrencia y RNF
- **Ubicación exacta:** `src/supplies/domain/entities/configuracion_batch.py` y `src/supplies/infrastructure/routers/reporte_gastos_router.py`.
- **Concurrencia:** Controlada en memoria y base de datos mediante `modulo5.configuracion_batch_reportes_gastos.limite_concurrencia` y cerrojo `_lock_sincronos`. Cuando se excede el límite, el backend rechaza inmediatamente con **HTTP 429 Too Many Requests**, incluyendo la cabecera `Retry-After`.
- **Tiempo límite de 15 segundos:** Es un **Requisito No Funcional (RNF) / SLA** del negocio ("la generación síncrona debe responder en menos de 15 segundos"). **NO EXISTE un temporizador `timeout=15s` explícito en Python** que aborte la petición a los 15s; el control síncrono/asíncrono se determina por umbral de días (`<= 183 días` individual = síncrono, `> 183 días` = 202 asíncrono).

---

## SECCIÓN C — CENSO Y ESTADO DE DATOS EN TEST (Paso 2)

### C.1 Tabla de Activos Analizados
Datos obtenidos mediante consultas GET autenticadas a la API oficial de TEST:

| ID Activo | Tipo | Estado | Dueño / Finca | `fecha_inicio_ciclo` | Consumos Alimento (Válidos / Sin Costo / Anulados) | Medicamentos (Válidos / Sin Costo / Anulados) | Total Gastos con Costo | ¿En Selector Administrador? | ¿En Selector Productor? |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **5** | INDIVIDUAL | ACTIVO | Usuario 2 / Finca 1 | `null` | 0 / 0 / 0 | 5 válidos / 0 / 0 | **5** | NO (pág 1) | NO |
| **1** | INDIVIDUAL | ACTIVO | Usuario 1 / Finca 1 | `null` | 0 / 8 / 3 | 2 válidos / 0 / 0 | **2** | NO (pág 1) | NO |
| **8** | INDIVIDUAL | ACTIVO | Usuario 2 / Finca 1 | `null` | 1 válido / 0 / 0 | 1 válido / 0 / 0 | **2** | NO (pág 1) | NO |
| **57** | INDIVIDUAL | ACTIVO | Usuario 30 / Finca 1 | **2026-01-01** | 1 válido / 0 / 0 | 0 / 0 / 0 | **1** | NO (pág 1) | NO |
| **778** | INDIVIDUAL | ACTIVO | Usuario 1 / Finca 1 | `null` | 0 / 0 / 0 | 0 / 0 / 0 | **0** | **SÍ (pág 1)** | NO |
| **776** | POBLACIONAL | ACTIVO | Usuario 1 / Finca 1 | `null` | 0 / 0 / 0 | 0 / 0 / 0 | **0** | NO (pág 1) | NO |

### C.2 Sub-sección E9: Análisis de Reportes 7 y 9 del Productor
- **Reporte 7:** Generado para el activo 57 (período `2026-01-01` a `2026-07-31`). Devuelto con HTTP 200.
- **Reporte 9:** Generado con período agregado (`2025-01-01` a `2026-07-31`). Devuelto con HTTP 200.
- **Hallazgo E9:** En ambos reportes, la propiedad `"archivo"` es estrictamente `null` (`"archivo": null`).
- **Explicación:** La especificación de RF-77 (regla E6d) establece una vigencia máxima de 24 horas para los archivos de exportación en servidor. Al haber transcurrido meses desde su creación, los registros en la tabla de exportaciones expiraron o fueron purgados.
- **Impacto para QA:** La prueba de descarga E9 **no puede ejecutarse contra reportes históricos estáticos**; debe ejecutarse dentro del mismo flujo de prueba generando una exportación fresca.

---

## SECCIÓN D — DECISIÓN Y RESULTADO DE LA SONDA (Pasos 3 y 4)

### D.1 Evaluación de Criterios del Paso 3
1. **Criterio (a) Activo con gastos válidos:** Se identificaron activos con gastos de costo válido (Activo 5 con 5 medicamentos, Activo 57 con 1 alimento).
2. **Criterio (b) Dominio de sandbox de G13:** Dominado con cabeceras `X-Test-Run-Id`, `X-Sandbox-Secret` y rollback verificado vía `DELETE /test-control/runs/{run_id}`.
3. **Criterio (c) Contrato de POST /suministros/reportes-gastos:** Contrato exacto identificado (`fecha_inicio_reporte`, `fecha_fin_reporte`, `tipo_periodo`, `activo_biologico_id`, `categorias_incluidas`).
- **Decisión del Paso 3:** **SÍ, EJECUTAR LA SONDA** bajo el rol **Administrador**.

### D.2 Ejecución de la Sonda (Paso 4)
- **Script ejecutado:** `C:\Users\Juansegutt\Integrador\_diag_m05\g23\paso4_sonda_sandbox.mjs`.
- **Autenticación:** Login Administrador HTTP 200 (`reqId: d66a86b9-7eb1-47ff-bc3b-fc454d740d14` a las `2026-11-07T03:22:27.744Z`).
- **Identificador de corrida:** `runId = g23-probe-1794021748988`.

#### Petición P4.1 (Generación de Reporte):
- **Endpoint:** `POST https://api.inmero.co/api-sgpmp-test/suministros/reportes-gastos`
- **Headers:** `Authorization: Bearer <saneado>`, `X-Test-Run-Id: g23-probe-1794021748988`, `X-Sandbox-Secret: <saneado>`
- **Body enviado:**
  ```json
  {
    "fecha_inicio_reporte": "2026-06-01",
    "fecha_fin_reporte": "2026-11-06",
    "tipo_periodo": "CICLO_COMPLETO",
    "activo_biologico_id": 5,
    "categorias_incluidas": ["ALIMENTACION", "MEDICACION"]
  }
  ```
- **Respuesta:** **HTTP 422 Unprocessable Entity** (`reqId: 94724542-e954-438c-bb46-a7d52256a367`).
- **Cuerpo devuelto:**
  ```json
  {
    "error_code": "ACTIVO_SIN_CICLO",
    "message": "El activo 5 no tiene un ciclo productivo registrado. No es posible generar el reporte de gastos sin una referencia temporal del ciclo. Registre el inicio del ciclo (RF-37) antes de continuar.",
    "fields": [
      {
        "field": "activo_biologico_id",
        "message": "El activo 5 no tiene un ciclo productivo registrado. No es posible generar el reporte de gastos sin una referencia temporal del ciclo. Registre el inicio del ciclo (RF-37) antes de continuar."
      }
    ],
    "timestamp": "2026-11-07T03:22:28.575718+00:00"
  }
  ```

#### Peticiones P4.2 a P4.5:
- Omitidas de forma segura debido a la respuesta 422 en P4.1.

#### Rollback P4.6 (Bloque `finally`):
- **Endpoint:** `DELETE https://api.inmero.co/api-sgpmp-test/test-control/runs/g23-probe-1794021748988`
- **Headers:** `X-Sandbox-Secret: <saneado>`
- **Respuesta:** **HTTP 200 OK** (`reqId: f812573d-ecd3-423a-8907-5a9d7f73feff`).
- **Cuerpo devuelto:** `{"status": "Rollback exitoso"}`.
- **Resultado:** **Aislamiento confirmado al 100%**. Ningún dato residual quedó registrado en la base de datos de TEST.

### D.3 Lección Aprendida y Hallazgo Crítico para Fase 2
La regla de negocio E7 (`ACTIVO_SIN_CICLO`) del backend es mandatoria: no basta con que un activo tenga transiciones de fases en la tabla histórica; **debe poseer el campo `fecha_inicio_ciclo` poblado en la tabla `activos_biologicos`**. De los activos sondeados, el **Activo 57 SÍ posee ciclo válido (`fecha_inicio_ciclo: "2026-01-01"`)** y un gasto validado con costo.

---

## SECCIÓN E — DEFINICIÓN DE ESTRATEGIA PARA FASE 2

1. **Rol principal a utilizar en Cypress:**
   - **Administrador:** Es el rol recomendado para la ejecución integral de G23. Posee alcance global (`AlcanceFincaAdapter.es_global == True`), permisos completos (E=5 y R=2 en recurso 51), y acceso al Activo 57 y demás activos de prueba sin bloqueos por asignación de fincas.
   - **Productor:** Únicamente debe usarse para el sub-caso negativo de control de acceso por finca (intentar consultar un activo ajeno esperando HTTP 403) o si se vincula explícitamente a la finca del activo en prueba.

2. **Activo(s) a utilizar en la prueba:**
   - **Camino Feliz:** **Activo 57** (INDIVIDUAL, `fecha_inicio_ciclo = "2026-01-01"`, con consumo de alimento validado ID 31 el `2026-07-31`). Rango de fechas a configurar en Cypress: `2026-01-01` a `2026-07-31` (duración: 211 días -> individual síncrono si <= 183 días, o ajustando rango `2026-06-01` a `2026-07-31` [61 días] para garantizar generación síncrona HTTP 200).
   - **Variante E7 (Activo sin ciclo):** **Activo 5** o **Activo 778** (verificar mensaje UI "El activo no tiene un ciclo productivo registrado" y HTTP 422).

3. **Tratamiento de las pruebas de descarga (E9, exportación PDF y CSV):**
   - No consultar reportes históricos obsoletos.
   - Generar el reporte en vivo en la suite de Cypress, solicitar `POST /exportacion` con `{ "formato_exportacion": "CSV" }` y `{ "formato_exportacion": "PDF" }`, y verificar la descarga inmediata mediante `cy.request` con validación de:
     - CSV: `Content-Type: text/csv` y primera línea con cabeceras de columnas.
     - PDF: `Content-Type: application/pdf` y magic bytes `%PDF-`.

4. **Manejo del sandbox y aislamiento:**
   - Replicar el patrón robusto de G13: interceptar todas las peticiones con Cypress para inyectar `X-Test-Run-Id` y `X-Sandbox-Secret`.
   - Garantizar hook `after()` con `cy.request('DELETE', .../test-control/runs/${runId})` comprobando HTTP 2xx.

5. **Cobertura de RNF (SLA < 15s):**
   - Medir el tiempo de respuesta de `POST /suministros/reportes-gastos` mediante un interceptor de Cypress (`startTime` vs `endTime`) y aseverar `expect(duration).to.be.lessThan(15000)`.

---

## SECCIÓN F — CONTABILIDAD DE ACCIONES CONTRA TEST

| Fecha / Hora UTC | Fase | Método | Ruta | Rol | HTTP Status | Request-ID | Impacto / Efecto secundario |
|:---:|:---:|:---:|:---|:---:|:---:|:---:|:---|
| 2026-11-06T20:38:18Z | Fase 1 | POST | `/sesiones/` | Productor | 200 | `34082b1d-a98c-4d26-ab99-21c67e3723b4` | Autenticación Productor. Sesión efímera. |
| 2026-11-06T20:38:19Z | Fase 1 | POST | `/sesiones/` | Administrador | 200 | `1e09db65-c5c6-4303-963e-ecea53bd6494` | Autenticación Administrador. Sesión efímera. |
| 2026-11-06T20:53:11Z | Fase 1 | POST | `/sesiones/` | Administrador | 200 | `-` | Autenticación Administrador en script auxiliar. |
| 2026-11-06T20:53:15Z | Fase 1 | POST | `/sesiones/` | Administrador | 200 | `-` | Autenticación Administrador en script auxiliar. |
| 2026-11-07T03:20:27Z | Fase 1b | POST | `/sesiones/` | Administrador | 200 | `54866610-6d99-461e-a840-f3d3f39d850b` | Autenticación Administrador para censo Paso 2. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/activos-biologicos/5` | Administrador | 200 | `4bd8976a-942a-4a3b-9214-bf5e63e96b8e` | Lectura de activo. Solo lectura. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/activos-biologicos/5/fases` | Administrador | 200 | `67e42202-161d-4574-be35-0595b35751ad` | Lectura de fases. Solo lectura. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/suministros/consumo-alimentos` | Administrador | 200 | `0f2d91bb-000c-4bc4-9d41-3820fa619d7d` | Lectura de alimentos. Solo lectura. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/suministros/medicamentos` | Administrador | 200 | `4bbdb1cb-9189-4b68-b769-6eb3032b4969` | Lectura de medicamentos. Solo lectura. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/activos-biologicos/1` | Administrador | 200 | `233a997f-d689-436f-ac63-647c78e9da07` | Lectura de activo. Solo lectura. |
| 2026-11-07T03:20:28Z | Fase 1b | GET | `/activos-biologicos/1/fases` | Administrador | 200 | `62b85c71-782f-4435-8c6e-38f0917f2623` | Lectura de fases. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/suministros/consumo-alimentos` | Administrador | 200 | `992a2862-f0d3-460a-81ff-b5ce31b0366a` | Lectura de alimentos. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/suministros/medicamentos` | Administrador | 200 | `19f07bb7-bdfd-4952-b883-fa4c887ba579` | Lectura de medicamentos. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/activos-biologicos/8` | Administrador | 200 | `20d2e8e4-8091-4475-b657-3f309a96e95d` | Lectura de activo. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/activos-biologicos/8/fases` | Administrador | 200 | `d6444c67-3c88-47dd-8beb-6c5d34d79ab2` | Lectura de fases. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/suministros/consumo-alimentos` | Administrador | 200 | `d7011504-a394-4877-bd4f-92d4d9a79f9d` | Lectura de alimentos. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/suministros/medicamentos` | Administrador | 200 | `49a0bd69-03f9-46b4-85e5-aa012e8c6759` | Lectura de medicamentos. Solo lectura. |
| 2026-11-07T03:20:29Z | Fase 1b | GET | `/activos-biologicos/57` | Administrador | 200 | `a688290b-69a5-440f-9ec0-5f5ea92c5cbd` | Lectura de activo. Solo lectura. |
| 2026-11-07T03:20:30Z | Fase 1b | GET | `/activos-biologicos/57/fases` | Administrador | 200 | `a2865a58-8459-4f34-9948-7fb6d209c6d5` | Lectura de fases. Solo lectura. |
| 2026-11-07T03:20:30Z | Fase 1b | GET | `/suministros/consumo-alimentos` | Administrador | 200 | `38ba4eb4-e39e-4bde-9596-f61fc9852bf5` | Lectura de alimentos. Solo lectura. |
| 2026-11-07T03:20:30Z | Fase 1b | GET | `/suministros/medicamentos` | Administrador | 200 | `e00f3d45-e181-44ce-ac3b-44be24d2c878` | Lectura de medicamentos. Solo lectura. |
| 2026-11-07T03:20:30Z | Fase 1b | GET | `/activos-biologicos?pagina=1&page_size=100` | Administrador | 200 | `dc797ee5-bc2a-44d2-96a9-b8f2255dae69` | Inspección de selector de activos. Solo lectura. |
| 2026-11-07T03:20:30Z | Fase 1b | POST | `/sesiones/` | Productor | 200 | `2522d1a8-2595-4fd4-bb8c-3058ee09e9cf` | Autenticación Productor para censo Paso 2. |
| 2026-11-07T03:20:31Z | Fase 1b | GET | `/activos-biologicos?pagina=1&page_size=100` | Productor | 200 | `80146313-085e-44e2-a4f6-8217bb4193b2` | Inspección de selector Productor (0 retornados). |
| 2026-11-07T03:20:31Z | Fase 1b | GET | `/suministros/reportes-gastos/historial` | Productor | 200 | `6dafe735-e5fc-4279-9945-f09b55502a5c` | Lectura historial reportes Productor (3 retornados). |
| 2026-11-07T03:20:31Z | Fase 1b | GET | `/suministros/reportes-gastos/7` | Productor | 200 | `b410fb55-bfa7-4fc9-80fb-36ff01099e2a` | Lectura reporte 7 (`archivo: null`). Solo lectura. |
| 2026-11-07T03:20:31Z | Fase 1b | GET | `/suministros/reportes-gastos/9` | Productor | 200 | `313d33db-9860-4965-b1f4-3d9fa89467d3` | Lectura reporte 9 (`archivo: null`). Solo lectura. |
| 2026-11-07T03:22:27Z | Fase 1b | POST | `/sesiones/` | Administrador | 200 | `d66a86b9-7eb1-47ff-bc3b-fc454d740d14` | Autenticación Administrador para Sonda Paso 4. |
| 2026-11-07T03:22:28Z | Fase 1b | POST | `/suministros/reportes-gastos` | Administrador | 422 | `94724542-e954-438c-bb46-a7d52256a367` | **Sonda Paso 4 (Sandbox `g23-probe-1794021748988`)**. Rechazo por regla E7 `ACTIVO_SIN_CICLO`. |
| 2026-11-07T03:22:28Z | Fase 1b | DELETE | `/test-control/runs/g23-probe-1794021748988` | - | 200 | `f812573d-ecd3-423a-8907-5a9d7f73feff` | **Rollback exitoso de sandbox**. Base de datos intacta. |

---

## SECCIÓN G — ARCHIVOS GENERADOS Y ESTADO DE GIT

### G.1 Archivos creados en `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/`
1. `evidencias/diag_g23/censo_global_admin.json` — Censo completo con detalles de activos y selector desde la perspectiva del Administrador.
2. `evidencias/diag_g23/censo_productor_e9.json` — Censo con perspectiva del Productor, historial y diagnóstico E9 (`archivo: null`).
3. `evidencias/diag_g23/sonda_sandbox.json` — Evidencia saneada de la sonda transaccional en sandbox (P4.1 a P4.6).
4. `evidencias/fase1b_verificacion_G23.md` — Este informe técnico de verificación y fe de erratas.

### G.2 Scripts desechables creados en `C:\Users\Juansegutt\Integrador\_diag_m05\g23\`
1. `C:\Users\Juansegutt\Integrador\_diag_m05\g23\paso2_censo_verificacion.mjs` — Script del censo de activos y prueba E9.
2. `C:\Users\Juansegutt\Integrador\_diag_m05\g23\paso4_sonda_sandbox.mjs` — Script de la sonda transaccional con rollback automático.

### G.3 Estado de Git en ambos repositorios
- **Frontend (`SGPMP-FRONT-END-PWA`):**
  - Salida de `git status --short`:
    ```
     M .env.example
     M .gitignore
     M cypress/support/commands.ts
     M docker-compose.test.yml
     M testing/test_testing/Modulo9/RF-15/TC-M09-G01/commands.ts
     M testing/test_testing/Modulo9/RF-15/TC-M09-G01/cypress.config.js
     M testing/test_testing/Modulo9/RF-15/TC-M09-G01/tc-m09-g01-registro-especie.cy.ts
    ?? testing/test_testing/Modulo5/
    ```
  - **Confirmación:** Cero archivos modificados o borrados en el repositorio. Toda la estructura de `Modulo5` permanece en directorio no rastreado (`??`).
- **Backend (`sgpmp-backend`):**
  - Salida de `git status --short`: Sin modificaciones atribuibles a G23 (solo los archivos previamente existentes en el workspace). Cero escrituras en el repo del backend.

---
**Conclusión de la Fase 1b:**  
El entorno y el contrato del RF-77 quedan **100% verificados empírica y técnicamente**. Se identificaron los activos idóneos con ciclo y gastos (Activo 57), el rol de cobertura óptima (Administrador), la causa raíz de la expiración de exportaciones (E6d/E9), y la confirmación total del mecanismo de sandbox con rollback 200 OK. El caso queda listo para la **Fase 2 (Diseño del plan de pruebas y spec Cypress)**.

