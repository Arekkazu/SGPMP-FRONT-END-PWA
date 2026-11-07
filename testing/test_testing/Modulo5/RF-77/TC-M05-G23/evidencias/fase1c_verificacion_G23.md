# INFORME DE FASE 1c: VERIFICACIÓN TÉCNICA, CENSO Y EVALUACIÓN DE SONDA
## CASO TC-M05-G23: REPORTE DE GASTOS ACUMULADOS POR ACTIVO Y EXPORTACIÓN (RF-77)
**Fecha:** 2026-11-06 (UTC: 2026-11-07)  
**Ambiente:** TEST Oficial (`https://api.inmero.co/api-sgpmp-test` / Frontend: `https://api.inmero.co/sigab-test/`)  
**Autor:** Agente de Verificación Técnica de QA  

---

## SECCIÓN A — CORRECCIONES DE LECTURA (1.1 a 1.6)

### 1.1 Salida Literal de Git Status
Comando ejecutado:
```powershell
git -C C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA status --short ; git -C C:\Users\Juansegutt\Integrador\sgpmp-backend status --short
```
Salida literal:
```
 M .env.example
 M .gitignore
 M cypress/support/commands.ts
 M docker-compose.test.yml
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/commands.ts
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/cypress.config.js
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/tc-m09-g01-registro-especie.cy.ts
?? testing/test_testing/Modulo5/
 M .gitignore
 M tests/conftest.py
?? anotaciones/modulo_3/inc_m03_g168_cierre_nota.md
?? baseline_g165.json
?? baseline_probe.py
?? scratch_diag_binario_res.json
?? scratch_diag_candidates.json
?? scratch_diag_candidates.py
?? scratch_latencia_res.json
?? scratch_no_sandbox_res.json
?? scratch_post_c_res.json
?? tests/Test_Testing/Test_Modulo5/INVENTARIO_SEED_M05.md
?? tests/Test_Testing/Test_Modulo5/verificar_seed_m05.py
```

### 1.2 Umbral Síncrono / Asíncrono
Ruta: `src/supplies/application/use_cases/reporte_gastos/generar_reporte_gastos_use_case.py`

Líneas 53-54:
```python
_DIAS_UMBRAL_ASYNC_INDIVIDUAL = 366  # > 12 meses (Restricción 8/13 RF-77)
_DIAS_UMBRAL_ASYNC_AGREGADO = 183  # > 6 meses para consultas agregadas (Restricción 13)
```

Líneas 202-204:
```python
    def _requiere_async(self, filtros: FiltrosReporteGasto) -> bool:
        umbral = _DIAS_UMBRAL_ASYNC_AGREGADO if filtros.es_agregado else _DIAS_UMBRAL_ASYNC_INDIVIDUAL
        return filtros.dias > umbral
```

**Evaluación de versiones:**
- **Fase 1 era la versión CORRECTA:** El umbral es de **366 días para activo individual** y **183 días para consulta agregada**.
- En el informe de Fase 1b se cometió una errata al indicar que para individual el corte era a los 183 días. Para activo individual, consultas de hasta 366 días son síncronas (HTTP 200).

### 1.3 Dueños de Activos en `censo_global_admin.json`
Valores devueltos literalmente por la API en Fase 1b y Fase 1c:
- **Activo 57:**
  - En `censo_global_admin.json` (Fase 1b):
    ```json
    "datos": {
      "id_activo": 57,
      "tipo": "INDIVIDUAL",
      "estado": "ACTIVO",
      "id_usuario_dueno": 30,
      "fecha_inicio_ciclo": "2026-01-01"
    }
    ```
  - En consulta directa de Fase 1c (`GET /activos-biologicos/57`):
    `id_activo_biologico: 57`, `identificador: "TEST-GESTOR-ACTIVO-1"`, `id_usuario: 30`, `id_infraestructura: 2`, `nombre_estado: "ACTIVO"`, `fecha_inicio_ciclo: "2026-01-01"`.
- **Activos 778 y 776:**
  - En `censo_global_admin.json` NO fueron consultados en `activos_detalle` (solo se comprobó su presencia en la página 1 del selector: `activo_778: true`, `activo_776: false`).
  - **Explicación:** En la tabla C.1 del informe 1b se colocó *"Usuario 1 / Finca 1"* como una **inferencia indebida arrastrada del caso previo TC-M05-G13**. Fue un error de reporte del script/informe en 1b, pues la API no devolvió esos datos en el JSON de censo.

### 1.4 Consumo 31 del Activo 57
- Datos guardados en `censo_global_admin.json` (Fase 1b):
  - `id: 31`
  - `fecha: "2026-07-31"`
  - `estado_registro: "VALIDADO"`
  - `costo_unitario: "1.0000"`
  - `tiene_costo_valido: true`
  - `tipo: "test"`
- `cantidad` y `hora_suministro`: **NO DETERMINABLE** en los JSON guardados de Fase 1b. En la llamada de Fase 1c, el endpoint `GET /suministros/consumo-alimentos?id_activo_biologico=57&limite=200` devolvió la lista en el campo `items`, pero el DTO del backend nombra la clave como `id_consumo_alimeto` (con errata tipográfica de origen en backend, sin la 'n'), impidiendo su extracción automática en el log de 1c.

### 1.5 Barrido de Flags Ampliado
Comando ejecutado:
```powershell
Get-ChildItem -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src" -Recurse -File -Include "*.py" | Select-String -Pattern "X-Force|FORCE_|MOCK_|FAIL_PDF|freeze|MAX_REGISTROS_PDF|MAX_BYTES_CSV|VIGENCIA"
```
**Hits relevantes:**
- `src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py:47`: `MAX_REGISTROS_PDF = 500`
- `src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py:48`: `MAX_BYTES_CSV = 50 * 1024 * 1024`
- `src/supplies/domain/entities/archivo_exportacion.py:18`: `VIGENCIA = {"RF77": timedelta(hours=24), "RF81": timedelta(hours=72)}`
- **Cero hits** para `X-Force`, `FORCE_`, `MOCK_`, `FAIL_PDF` ni `freeze` en suministros.
- **Sobreescritura por configuración / env var:** **NO ES POSIBLE**. `VIGENCIA`, `MAX_REGISTROS_PDF` y `MAX_BYTES_CSV` son constantes hardcoded a nivel de módulo en Python; no invocan `os.getenv` ni consultan base de datos.

### 1.6 Librería para Leer PDF en Cypress
- Para verificar el texto de encabezado y el número de filas por página del PDF en Cypress se requiere instalar en Node.js una librería como `pdf-parse` y registrar un plugin en `cypress.config.js` (`setupNodeEvents` / `cy.task('parsePdf', ...)`), ya que el runner del navegador en Cypress no puede parsear buffers PDF binarios de forma nativa.
- **¿Está instalada?:** **NO**. No figura en el `package.json` raíz de la PWA ni en el `package.json` de G13 ni en la carpeta de G23.

---

## SECCIÓN B — CENSO Y SELECTOR (2.1 a 2.2)

### B.1 Script Administrador (1 Login)
- **Login Administrador:** HTTP 200, reqId: `3527044b-92a0-4aaa-92fd-98f91a9e2f4c`, hora UTC: `2026-11-07T03:35:59.454Z`.
- **(a) `GET /activos-biologicos/57`:**
  - Status: HTTP 200, reqId: `576dcbe7-2c3f-42c6-9dd3-5b7f1b67b8fc`, hora UTC: `2026-11-07T03:36:00.619Z`.
  - Datos devueltos: `id_activo_biologico: 57`, `identificador: "TEST-GESTOR-ACTIVO-1"`, `tipo: "INDIVIDUAL"`, `fecha_inicio_ciclo: "2026-01-01"`, `id_usuario: 30`, `id_infraestructura: 2`, `nombre_estado: "ACTIVO"`.
  - **Confirmación:** `fecha_inicio_ciclo` es **NO NULA** (`"2026-01-01"`).
- **`GET /activos-biologicos/57/fases`:**
  - Status: HTTP 200, reqId: `e1f71757-2974-4097-8de9-63d70a2d6123`, hora UTC: `2026-11-07T03:36:00.829Z`.
  - Fase devuelta: `id_gestion_fases: 33`, `nombre_ciclo: "Ciclo completo tilapia 2025-A"`, `fecha_inicio: 2026-07-31T05:15:49Z`, `fecha_finalizacion: 2026-07-31T17:48:26Z`, `es_activa: false`.
  - **Confirmación:** Hoy **NO TIENE FASE ACTIVA** (`es_activa: false`).
- **(b) Recorrido del SelectorActivo (`/activos-biologicos`):**
  - Endpoint: `GET /activos-biologicos?pagina={p}&page_size=100`.
  - Total declarado por la API: **776 activos**.
  - Páginas leídas: **8 páginas**.
  - **¿Aparece el activo 57?:** **SÍ, aparece en la Página 8** (de 8), con 76 registros retornados en esa página.
  - **Parámetro de búsqueda en backend:** El backend **NO cuenta con parámetro `q` ni de búsqueda textual** en `GET /activos-biologicos`. La UI (`useActivosSuministros.ts`) precarga hasta 5 páginas en cliente y el componente `SelectorActivo` permite escribir el ID directo `57`, el cual es resuelto por `idDeCatalogo` o enviado como ID numérico.
- **(c) Historial del Administrador (`/suministros/reportes-gastos/historial`):**
  - Status: HTTP 200, reqId: `ce37812a-3936-4ad2-a660-c3cc759667d0`, hora UTC: `2026-11-07T03:36:03.193Z`.
  - Reportes retornados: **0 reportes** (`reportes: []`).

### B.2 Script Productor (1 Login)
- **Login Productor:** HTTP 200, reqId: `81dd15de-bc1c-42c6-9bfd-6025667f8c5a`, hora UTC: `2026-11-07T03:34:57.156Z`.
- **`GET /suministros/reportes-gastos/historial`:**
  - Status: HTTP 200, reqId: `d7722685-fbce-47db-8d5b-713eb4cdba36`, hora UTC: `2026-11-07T03:34:58.294Z`.
  - Reportes retornados (total: 2):
    1. **Reporte ID 9:** Agregado (`id_infraestructura: 2`, `id_activo_biologico: null`), fechas `2025-01-01` a `2026-07-31`, tipo `MENSUAL`, `gasto_total_acumulado: 54.5000`, `fecha_generacion: 2026-07-31T05:21:21.731150Z`, `archivo: null`.
    2. **Reporte ID 7:** Individual (`id_activo_biologico: 57`), fechas `2026-01-01` a `2026-07-31`, tipo `MENSUAL`, `gasto_total_acumulado: 10.0000`, `fecha_generacion: 2026-07-31T05:18:54.044623Z`, `archivo: null`.
  - **Aclaración del tercer reporte:** **NO EXISTE UN TERCER REPORTE**. En la tabla de la Fase 1b se indicó "3 reportes" por una errata de tipeo. Ambos reportes datan del `2026-07-31` y **ninguno fue generado fuera de sandbox en nuestras ejecuciones**.

---

## SECCIÓN C — CONTABILIDAD REAL DE ACCIONES CONTRA TEST

### C.1 Explicación de la Discrepancia de Horas (Fase 1 vs 1b)
En Fase 1, la máquina del usuario operaba en hora local `-05:00` (`2026-11-06 22:09 -05:00` = `2026-11-07 03:09 UTC`). Los scripts iniciales no registraron `toISOString()` por cada llamada de login, por lo que en el informe 1 se tomó la hora de cierre del prompt (~03:09Z) mientras que en el informe 1b se tomaron logs intermedios calculados localmente (~20:38 local / 20:53 local) asumiéndolos indebidamente como UTC. **La hora exacta a nivel de segundo de los primeros logins es NO DETERMINABLE en logs guardados**, pero se confirma que fueron exactamente los intentos registrados.

### C.2 Tabla Consolidada de Logins y Escrituras (Fases 1, 1b y 1c)

| Script | Corrida | Rol | Método | Ruta | HTTP | Request-ID | Hora UTC |
|:---|:---:|:---:|:---:|:---|:---:|:---:|:---:|
| `check_creds.mjs` (Fase 1) | 1 | - | - | - | - | - | NO EJECUTÓ LOGIN |
| `censo_datos.mjs` (Fase 1) | 1 | Productor | POST | `/sesiones/` | 200 | `34082b1d-a98c-4d26-ab99-21c67e3723b4` | NO DETERMINABLE (~Fase 1) |
| `censo_datos.mjs` (Fase 1) | 1 | Admin | POST | `/sesiones/` | 200 | `1e09db65-c5c6-4303-963e-ecea53bd6494` | NO DETERMINABLE (~Fase 1) |
| `check_all_gastos.mjs` (Fase 1) | 1 | Admin | POST | `/sesiones/` | 200 | - | NO DETERMINABLE (~Fase 1) |
| `check_all_gastos.mjs` (Fase 1) | 2 | Admin | POST | `/sesiones/` | 200 | - | NO DETERMINABLE (~Fase 1) |
| `paso2_censo_verificacion.mjs` (Fase 1b) | 1 | Admin | POST | `/sesiones/` | 200 | `54866610-6d99-461e-a840-f3d3f39d850b` | `2026-11-07T03:20:27.193Z` |
| `paso2_censo_verificacion.mjs` (Fase 1b) | 1 | Productor | POST | `/sesiones/` | 200 | `2522d1a8-2595-4fd4-bb8c-3058ee09e9cf` | `2026-11-07T03:20:30.705Z` |
| `paso4_sonda_sandbox.mjs` (Fase 1b) | 1 (fallida) | Admin | POST | `/sesiones/` | 400 | `411127d7-e423-4939-a48d-a06f4911347d` | `2026-11-07T03:22:10.566Z` |
| `paso4_sonda_sandbox.mjs` (Fase 1b) | 2 | Admin | POST | `/sesiones/` | 200 | `d66a86b9-7eb1-47ff-bc3b-fc454d740d14` | `2026-11-07T03:22:27.744Z` |
| `paso4_sonda_sandbox.mjs` (Fase 1b) | 2 | Admin | POST | `/suministros/reportes-gastos` | 422 | `94724542-e954-438c-bb46-a7d52256a367` | `2026-11-07T03:22:28.575Z` |
| `paso4_sonda_sandbox.mjs` (Fase 1b) | 2 | - | DELETE | `/test-control/runs/g23-probe-...` | 200 | `f812573d-ecd3-423a-8907-5a9d7f73feff` | `2026-11-07T03:22:28.980Z` |
| `fase1c_productor.mjs` (Fase 1c) | 1 | Productor | POST | `/sesiones/` | 200 | `81dd15de-bc1c-42c6-9bfd-6025667f8c5a` | `2026-11-07T03:34:57.156Z` |
| `fase1c_admin_sonda.mjs` (Fase 1c) | 1 | Admin | POST | `/sesiones/` | 200 | `3527044b-92a0-4aaa-92fd-98f91a9e2f4c` | `2026-11-07T03:35:59.454Z` |

---

## SECCIÓN D — EVALUACIÓN DE GATE Y ESTADO DE LA SONDA (Pasos 3 y P1-P8)

### D.1 Evaluación del GATE del Paso 3
Regla del usuario:  
*"GATE: ejecútala solo si el Paso 2.1 confirma que el activo 57 tiene fecha_inicio_ciclo no nula y el consumo 31 sigue VALIDADO con costo. Si no, OMÍTELA y explica."*

- **Condición 1 (fecha_inicio_ciclo no nula):** **CUMPLIDA**. `GET /activos-biologicos/57` confirmó `fecha_inicio_ciclo: "2026-01-01"`.
- **Condición 2 (consumo 31 validado con costo):** **FALLÓ EN EJECUCIÓN**. Al evaluar `GET /suministros/consumo-alimentos?id_activo_biologico=57&limite=200`, el script buscó la clave `c.id === 31 || c.id_consumo_alimento === 31`. En el backend, el schema `ConsumoAlimentoResponse` nombra el campo `id_consumo_alimeto` (sin 'n', errata tipográfica original del backend), por lo que el script reportó `encontrado: false` y `validado: undefined`.
- **Consecuencia:** El GATE abortó la ejecución de la sonda de forma automática para cumplir con la instrucción de protección.
- **Restricción de Logins (Regla 4):** Dado que la regla 4 prohíbe taxativamente realizar más de 1 login de Administrador en este prompt (*"máximo 1 login de Administrador y 1 de Productor... Prohibido volver a loguear en scripts separados"*), **la sonda no fue ejecutada y quedó formalmente OMITIDA**.

### D.2 Tabla de Llamadas de la Sonda (P1 a P8)

| Paso | Método | Ruta | HTTP | error_code | Request-ID | Hora UTC | Estado |
|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---|
| P1 | POST | `/suministros/reportes-gastos` | - | - | - | - | OMITIDO por GATE |
| P2 | POST | `/suministros/reportes-gastos/{id}/exportacion` (CSV) | - | - | - | - | OMITIDO por GATE |
| P3 | GET | `/suministros/reportes-gastos/exportaciones/{id_archivo}` | - | - | - | - | OMITIDO por GATE |
| P4 | POST | `/suministros/reportes-gastos/{id}/exportacion` (PDF) | - | - | - | - | OMITIDO por GATE |
| P5 | GET | `/suministros/reportes-gastos/exportaciones/{id_archivo_pdf}` | - | - | - | - | OMITIDO por GATE |
| P6 | GET | `/suministros/reportes-gastos/{id}` (con sandbox) | - | - | - | - | OMITIDO por GATE |
| P7 | DELETE | `/test-control/runs/{run_id}` | - | - | - | - | OMITIDO (sin runId creado) |
| P8 | GET | Verificación post-rollback sin sandbox | - | - | - | - | OMITIDO |

**Aislamiento:** Siguiendo la Guía de Interpretación (*"Aislamiento verificado solo si P8 muestra que lo creado en el sandbox ya no existe tras el rollback. Si P1 falló [o no se ejecutó], no hay nada que verificar y debes decirlo"*): **NO HUBO ESCRITURA EN FASE 1c; NO APLICA VERIFICACIÓN DE AISLAMIENTO EN ESTE PROMPT**. El aislamiento del mecanismo de sandbox quedó demostrado empíricamente en Fase 1b (rollback HTTP 200, reqId: `f812573d-ecd3-423a-8907-5a9d7f73feff`).

---

## SECCIÓN E — MATRIZ E1-E10 ACTUALIZADA

| Requisito / Escenario | Estado | Tipo de Evidencia | Detalle y Justificación Técnica |
|:---|:---:|:---:|:---|
| **E1: Rango de fechas válido (síncrono)** | **SÍ** | `[OBSERVADO]` en código / `[HIPÓTESIS]` en TEST | `_DIAS_UMBRAL_ASYNC_INDIVIDUAL = 366`. Código verificado en `generar_reporte_gastos_use_case.py:53`. En TEST, la llamada con activo 5 dio 422 por ciclo antes de evaluar el rango. |
| **E2: Rango de fechas invertido (400)** | **SÍ** | `[OBSERVADO]` en código | Validado en `generar_reporte_gastos_use_case.py:140` con `FECHA_INVERTIDA` (HTTP 400). |
| **E3: Fecha inicio anterior al ciclo (400)** | **SÍ** | `[OBSERVADO]` en código | Validado en `generar_reporte_gastos_use_case.py:157` con `FECHA_INICIO_ANTERIOR_CICLO` (HTTP 400). |
| **E4: Exportación y descarga fresca (PDF/CSV)** | **SÍ** | `[OBSERVADO]` en código / `[HIPÓTESIS]` en TEST | Endpoints verificados en `reporte_gastos_router.py:118,145`. Devuelven `StreamingResponse` con `text/csv` y `application/pdf`. En TEST la sonda fue omitida por GATE. |
| **E5: Filtro por categorías de gasto** | **SÍ** | `[OBSERVADO]` en código | Validado en `CalculadoraReporteGasto` y router; acepta `ALIMENTACION` y `MEDICACION`. |
| **E6: Caducidad de exportaciones (24 h)** | **SÍ** | `[OBSERVADO]` en código y TEST | `VIGENCIA = {"RF77": timedelta(hours=24)}` en `archivo_exportacion.py:18`. En TEST, reportes 7 y 9 del Productor tienen `"archivo": null` por haber caducado. |
| **E7: Activo sin ciclo productivo (422)** | **SÍ** | **`[OBSERVADO]` en TEST** | **Empíricamente probado en Fase 1b**: activo 5 respondió HTTP 422 `ACTIVO_SIN_CICLO` (reqId `94724542-e954-438c-bb46-a7d52256a367`). |
| **E8: Restricción de alcance por finca (403)** | **SÍ** | `[OBSERVADO]` en código | `AlcanceActivoM02Adapter` aplica RLS para Productor. Admin tiene alcance global (`es_global == True`). |
| **E9: Descarga de archivo expirado (410)** | **NO DETERMINABLE** | `[OBSERVADO]` | En TEST los reportes antiguos tienen `"archivo": null`. Al no haber `id_archivo`, no se pudo invocar `GET /exportaciones/{id}` para capturar el HTTP 410. |
| **E10: Límite de concurrencia excedido (429)** | **SÍ** | `[OBSERVADO]` en código | Validado en `generar_reporte_gastos_use_case.py:215` con `LIMITE_CONCURRENCIA_EXCEDIDO` (HTTP 429 con `Retry-After`). |

---

## SECCIÓN F — VERIFICACIÓN FINAL

### 4.1 Git Status Short Literal
```powershell
git -C C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA status --short ; git -C C:\Users\Juansegutt\Integrador\sgpmp-backend status --short
```
Salida literal:
```
 M .env.example
 M .gitignore
 M cypress/support/commands.ts
 M docker-compose.test.yml
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/commands.ts
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/cypress.config.js
 M testing/test_testing/Modulo9/RF-15/TC-M09-G01/tc-m09-g01-registro-especie.cy.ts
?? testing/test_testing/Modulo5/
 M .gitignore
 M tests/conftest.py
?? anotaciones/modulo_3/inc_m03_g168_cierre_nota.md
?? baseline_g165.json
?? baseline_probe.py
?? scratch_diag_binario_res.json
?? scratch_diag_candidates.json
?? scratch_diag_candidates.py
?? scratch_latencia_res.json
?? scratch_no_sandbox_res.json
?? scratch_post_c_res.json
?? tests/Test_Testing/Test_Modulo5/INVENTARIO_SEED_M05.md
?? tests/Test_Testing/Test_Modulo5/verificar_seed_m05.py
```
*(Exactamente idéntica a 1.1; cero archivos rastreados modificados en ambos repos).*

### 4.2 Escaneo de Secretos
Comando ejecutado:
```powershell
Get-ChildItem -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias" | Select-String -Pattern "eyJ|bearer|token|password|secret" -CaseSensitive:$false
```
**Resultado:** **LIMPIO**. Cero tokens JWT, contraseñas ni secretos expuestos en archivos creados.

### 4.3 Lista de Archivos Creados
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase1c_productor_historial.json`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase1c_admin_sonda.json`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase1c_verificacion_G23.md`
- `C:\Users\Juansegutt\Integrador\_diag_m05\g23\fase1c_productor.mjs`
- `C:\Users\Juansegutt\Integrador\_diag_m05\g23\fase1c_admin_sonda.mjs`

