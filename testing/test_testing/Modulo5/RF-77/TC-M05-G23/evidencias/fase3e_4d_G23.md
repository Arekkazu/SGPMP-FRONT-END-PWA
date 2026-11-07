# INFORME DE FASE 3e + 4d — TC-M05-G23 (RF-77)
**Caso de Prueba:** TC-M05-G23 — Reporte de gastos acumulados por activo y su exportación a PDF/CSV  
**Requerimiento Funcional:** RF-77  
**Fecha y Hora (UTC):** 2026-11-07 05:05:00 UTC  
**Ambiente:** TEST (`https://api.inmero.co`, `https://api.inmero.co/api-sgpmp-test`, `/sigab-test`)  
**Ejecutor:** Agente de automatización Cypress 13 + TS (Windows PowerShell)

---

## 1. PARTE A: ACLARACIONES (sin TEST)

### A1. Contradicción sobre el request-id de `diag_logo_query.mjs`
- **EVIDENCIA TÉCNICA LITERAL (transcript.jsonl, línea 1244):**
  ```text
  [DIAG] Iniciando diagnóstico de logo con runId: diag-logo-1794025802310
  [LOGIN] POST /sesiones/ -> HTTP 200, request-id: 0786628d-41cb-40ea-8df1-89bc6b96ce6f, hora: 2026-11-07T04:30:02.314Z
  ```
- **Aclaración:** El request-id correcto es **`0786628d-41cb-40ea-8df1-89bc6b96ce6f`**. El valor `4ee92019-b68d-4cb0-a8dc-917415494c8b` que apareció en la redacción del informe 3d fue un error tipográfico.
- **Listado completo de TODOS los logins de las fases 3c, 3d y 3e:**
  1. **Fase 3c — `diag_logo_query.mjs` (intento 2):** `2026-11-07T04:30:02.314Z` | HTTP 200 | X-Request-ID: `0786628d-41cb-40ea-8df1-89bc6b96ce6f`.
  2. **Fase 3c — Corrida 2 Cypress (`pnpm test` en CP-01):** `2026-11-07T04:31:26Z` aprox | HTTP 200 | X-Request-ID: `NO DETERMINABLE` (sesión UI interna de Cypress).
  3. **Fase 3d — `control_positivo_logo.mjs`:** `2026-11-07T04:41:31.012Z` | HTTP 200 | X-Request-ID: `9fb0db6b-1be8-4fa4-8969-6f0ac4734aa0`.
  4. **Fase 3d — Corrida 3 Cypress (`pnpm test` en CP-01):** `2026-11-07T04:45:41Z` aprox | HTTP 200 | X-Request-ID: `NO DETERMINABLE`.
  5. **Fase 3d — Corrida 3 Cypress (CP-09 reautenticación limpia):** `2026-11-07T04:45:48Z` aprox | HTTP 200 | X-Request-ID: `NO DETERMINABLE`.
  6. **Fase 3e — `sondeo_lectura_fase3e.mjs`:** `2026-11-07T04:58:42.429Z` | HTTP 200 | X-Request-ID: `d80645c9-a719-4c32-aab8-4e21723ff039`.
  7. **Fase 3e — Corrida 4 Cypress (`pnpm test` en CP-01):** `2026-11-07T05:00:01Z` aprox | HTTP 200 | X-Request-ID: `NO DETERMINABLE`.
  8. **Fase 3e — Corrida 4 Cypress (CP-09 reautenticación limpia):** `2026-11-07T05:00:07Z` aprox | HTTP 200 | X-Request-ID: `NO DETERMINABLE`.

### A2. Faltantes del informe 3d tomados de `consola_TC-M05-G23_run3.txt`
- **(c) Tests Passing / Failing con nombres exactos, duración y línea del rollback:**
  - **Línea del rollback en consola:** Línea 45 literal:
    ```text
    45:     √ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (911ms)
    ```
  - **Tests Passing (10):**
    1. `CP-01 · login Administrador dentro del sandbox transaccional (3780ms)`
    2. `CP-02 · navegar a /suministros/gastos y verificar formulario (1979ms)`
    3. `CP-03 · generar reporte de gastos por UI (activo 57, mensual, 2026-01-01 a 2026-07-31) (1366ms)`
    4. `CP-04 · exportar reporte a CSV por UI y verificar respuesta de exportación (353ms)`
    5. `CP-05 · verificar descarga en disco y estructura del CSV (5 columnas y suma montos) (288ms)`
    6. `CP-06 · exportar reporte a PDF por UI y verificar respuesta de exportación (573ms)`
    7. `CP-07 · verificar descarga en disco y validación de binario PDF (%PDF-) (280ms)`
    8. `CP-08A · verificar texto, encabezado, fecha y páginas del PDF (701ms)`
    9. `CP-08B · verificar presencia de logo institucional embebido en el PDF (124ms)`
    10. `CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (911ms)`
  - **Test Failing (1):**
    1. `Veredicto · evaluar resultado final de la corrida`: `TypeError: expect.fail is not a function at Context.eval (tc-m05-g23-reporte-gastos-exportacion.cy.ts:538:0)`.
- **(d) Listado real de `evidencias\descargas` tras Corrida 3:**
  - `Gastos_57_2026-01-01_2026-07-31.csv` — 93 bytes
  - `Reporte_Gastos_57_2026-01-01_2026-07-31.pdf` — 2,295 bytes
- **(e) Listado real de `resultados\` tras Corrida 3:**
  - `.gitkeep` — 0 bytes
- **(h) Clasificación de CP-09, CP-08B y Veredicto (Corrida 3):**
  - **CP-08B:** (4) No ejecutable por datos (precondición reportada no cumplida según `/test-control/query`).
  - **CP-09:** (2) Estado observado del sistema (el GET del PDF respondió HTTP 401 fuera de sandbox, mientras reporte y CSV respondieron 404).
  - **Veredicto:** (1) Error del script (`expect.fail` no existe en el wrapper de Chai provisto por Cypress).
- **`git status --short` del repo backend:**
  ```text
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
- **Líneas L90-L120 literales del spec (`tc-m05-g23-reporte-gastos-exportacion.cy.ts`):**
  ```typescript
  90: }
  91: 
  92: function registrar(id: IdCp, estado: Estado | boolean, obtenido: string): void {
  93:   const est: Estado = typeof estado === 'boolean' ? (estado ? 'OK' : 'FALLA') : estado;
  94:   resultados.set(id, { ...ESPERADOS[id], obtenido, estado: est });
  95:   cy.log(`${id} -> ${est} · ${obtenido}`);
  96: }
  97: 
  98: // Contexto compartido entre tests (testIsolation: false)
  99: const ctx = {
  100:   sandboxOk: false,
  101:   loginOk: false,
  102:   cp02Ok: false,
  103:   idReporte: null as number | null,
  104:   // CSV
  105:   idArchivoCsv: '' as string,
  106:   nombreArchivoCsv: '' as string,
  107:   statusGetCsv: null as number | null,
  108:   cTypeCsv: '' as string,
  109:   cDispCsv: '' as string,
  110:   // PDF
  111:   idArchivoPdf: '' as string,
  112:   nombreArchivoPdf: '' as string,
  113:   statusGetPdf: null as number | null,
  114:   cTypePdf: '' as string,
  115:   cDispPdf: '' as string,
  116:   rollbackHecho: false,
  117: };
  118: 
  119: function zona(): string {
  120:   return String(Cypress.env('ZONA_HORARIA') || 'America/Bogota');
  ```

### A3. Retractaciones formales
1. **Retractación (i):** Se retracta la afirmación de que el fallo de CP-02 en la corrida 2 se debió a un "pico de latencia puntual". Eso es una **HIPÓTESIS** no comprobada (el hook `afterEach` no se activó en la corrida 3). Lo **OBSERVADO** es: 1 fallo por timeout de 15 s en 3 corridas ejecutadas (run1: 1363 ms, run2: timeout 15000 ms, run3: 1979 ms).
2. **Retractación (ii):** Se retracta la conclusión de "aislamiento confirmado" para el PDF en CP-09 del informe 3d: un código HTTP 401 no prueba la ausencia o reversión del archivo.
3. **Retractación (iii):** Se retracta la afirmación general "no existe ninguna identidad visual ni infraestructura en TEST": contradice la propia regla B6 ya que la consulta B1 sobre `activos_biologicos` devolvió 0 filas para un activo que sí existe en el API.

---

## 2. PARTE B: LECTURA DE CÓDIGO (Backend y Spec)

### B1. Funcionamiento de `/test-control/query` (`src/shared/rollback/presentation/test_control_router.py:42-87`)
- **HECHO (sesión y transacción):** Usa `db: Session = Depends(get_db)`. En `src/shared/database.py:308-337`, `get_db` recupera la misma sesión transaccional física del sandbox asociada a `X-Test-Run-Id` (`get_or_create_test_session(run_id)`).
- **HECHO (RLS y reseteo de identidad):** En `src/shared/database.py:320-333`, cada invocación de `get_db` con sandbox limpia explícitamente `session.info` (`test_session.info.pop(_CLAVE_IDENTIDAD, None)`) y resetea las variables de configuración de PostgreSQL:
  ```sql
  SELECT set_config('app.current_user_id', '', true),
         set_config('app.current_role', '', true),
         set_config('app.usuario_id', '', true)
  ```
- **HECHO (falta de contexto de usuario en /query):** A diferencia de los routers de negocio que dependen de `get_current_user`, `/test-control/query` solo tiene `Depends(verify_sandbox_secret)`. Por ende, nunca inyecta `app.current_user_id` ni `app.current_role`. La consulta SQL corre con usuario anónimo.
- **HECHO (causa de 0 filas):** Las tablas `modulo2.activos_biologicos`, `modulo9.infraestructuras` y `modulo9.identidad_visuales` tienen políticas de Row-Level Security (RLS) que exigen un usuario autenticado vinculado a la finca. Al no haber contexto de usuario, PostgreSQL aplica la política y devuelve **0 filas** a pesar de que los datos existen físicamente en la BD.

### B2. Endpoints GET de Módulo 9 en Backend
1. **Detalle de Infraestructura por ID:**
   - **Ruta:** `GET /configuracion/infraestructuras/{id_infraestructura}` (`src/configuration/infrastructure/routers/infraestructura_router.py:132-164`).
   - **Permisos:** `require_permission(10, 2)` (recurso 10: `infraestructuras`, acción 2: Leer). Rol Administrador tiene permiso.
   - **Respuesta:** `InfraestructuraResponse` (`src/configuration/infrastructure/schema/infraestructura_schema.py:14-50`), incluye el campo **`id_finca: int`**.
2. **Identidad Visual de una Finca:**
   - **Ruta:** `GET /configuracion/identidad-visual/{id_finca}` (`src/configuration/infrastructure/routers/identidad_visual_router.py:41-66`).
   - **Permisos:** `require_permission(23, 2)` (recurso 23: `identidad_visual`, acción 2: Leer). Solo rol Administrador.
   - **Respuesta:** `Optional[IdentidadVisualResponse]` (`src/configuration/infrastructure/schema/identidad_visual_schema.py:13-50`), **SÍ incluye `logo_path: Optional[str]`**.

### B3. Ruta GET `/suministros/reportes-gastos/exportaciones/{id_archivo}`
- **Ruta:** `src/supplies/infrastructure/routers/reporte_gastos_router.py:142-160`.
- **Caminos que pueden devolver HTTP 401:**
  - El router declara: `dependencies=[Depends(require_permission(_RECURSO, 2))]` y `usuario_actual: UsuarioActual = Depends(get_current_user)`.
  - La **ÚNICA fuente de HTTP 401** es la capa de autenticación FastAPI (`get_current_user` / dependencias de seguridad):
    1. Cabecera `Authorization` ausente o no comienza con `Bearer `.
    2. Token JWT malformado o con firma inválida.
    3. Token JWT expirado.
    4. Token revocado en el sistema de revocación de sesiones (`TOKEN_REVOCADO`).
  - La lógica interna del caso de uso (`descargar`) y la entidad `ArchivoExportacion` **nunca devuelven 401**: devuelven 404 (`ARCHIVO_NO_ENCONTRADO`), 403 (`ARCHIVO_DE_OTRO_USUARIO`) o 410 (`ARCHIVO_EXPIRADO`).
- **Diferencia entre PDF y CSV:** Ninguna. Ambos formatos se descargan por el mismo endpoint y ejecutan exactamente el mismo flujo de autenticación y caso de uso.

### B4. Código de CP-09 en el spec (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:608-649`)
```typescript
        const headersLimpios = {
          Authorization: `Bearer ${tokenLimpio}`,
          'X-Zona-Horaria': zona(),
        };

        // 1. GET reporte -> esperado 404
        cy.request({
          method: 'GET',
          url: `${apiBase()}/suministros/reportes-gastos/${ctx.idReporte}`,
          headers: headersLimpios,
          failOnStatusCode: false,
          log: false,
        }).then((resRep) => {
          // ...
          // 2. GET archivo CSV -> esperado 404
          cy.request({
            method: 'GET',
            url: `${apiBase()}/suministros/reportes-gastos/exportaciones/${ctx.idArchivoCsv}`,
            headers: headersLimpios,
            failOnStatusCode: false,
            log: false,
          }).then((resCsv) => {
            // ...
            // 3. GET archivo PDF -> esperado 404
            cy.request({
              method: 'GET',
              url: `${apiBase()}/suministros/reportes-gastos/exportaciones/${ctx.idArchivoPdf}`,
              headers: headersLimpios,
              failOnStatusCode: false,
              log: false,
            }).then((resPdf) => {
              // ...
```
- **OBSERVADO:** Las tres peticiones usan el mismo helper `cy.request`, el mismo objeto `headersLimpios` y el mismo token `tokenLimpio`.

---

## 3. PARTE C: SONDEO DE SOLO LECTURA EN TEST

Se ejecutó el script `C:\Users\Juansegutt\Integrador\_diag_m05\g23\sondeo_lectura_fase3e.mjs` sin sandbox:
- **Login Administrador:**
  - `POST https://api.inmero.co/api-sgpmp-test/sesiones/` -> HTTP **200 OK**
  - X-Request-ID: `d80645c9-a719-4c32-aab8-4e21723ff039` | Hora: `2026-11-07T04:58:42.429Z`

### Registro de llamadas GET:
| Paso | Método | Ruta | HTTP Status | Error Code | X-Request-ID | Hora (UTC) | Detalle / Cuerpo (max 300) |
|---|---|---|---|---|---|---|---|
| **C1** | GET | `/suministros/reportes-gastos/12` | **404 Not Found** | `REPORTE_NO_ENCONTRADO` | `6496d758-2a64-4764-ba94-67f5388e1b27` | `2026-11-07T04:58:42.854Z` | `{"error_code":"REPORTE_NO_ENCONTRADO","message":"El reporte de gastos 12 no existe."...}` |
| **C2** | GET | `/suministros/reportes-gastos/exportaciones/d712b967-1940-4d1f-9f15-9418902d94c8` | **404 Not Found** | `ARCHIVO_NO_ENCONTRADO` | `ec2b13a6-8875-43ea-8ebe-fcec8261a9fd` | `2026-11-07T04:58:42.987Z` | `{"error_code":"ARCHIVO_NO_ENCONTRADO","message":"El archivo d712b967... no existe."...}` |
| **C3** | GET | `/suministros/reportes-gastos/exportaciones/2eba73d4-2281-4c9a-86f9-51a279b26645` | **404 Not Found** | `ARCHIVO_NO_ENCONTRADO` | `91517025-95c2-4b52-b93c-431e5ddbaec8` | `2026-11-07T04:58:43.115Z` | `{"error_code":"ARCHIVO_NO_ENCONTRADO","message":"El archivo 2eba73d4... no existe."...}` |
| **C4_infra** | GET | `/configuracion/infraestructuras/2` | **200 OK** | - | `94c936bb-e716-4cdc-895d-740c75a7ad28` | `2026-11-07T04:58:43.245Z` | Devuelve `id_finca: 1` |
| **C4_identidad** | GET | `/configuracion/identidad-visual/1` | **200 OK** | - | `3bd04241-1e04-431d-8fc1-7be9aaea87ef` | `2026-11-07T04:58:43.375Z` | Registro de identidad visual activo |

### Análisis del Logo (C4):
- **Tiene registro:** `true` (existe registro en TEST para finca 1).
- **logo_path no nulo:** `true`.
- **Extensión:** `.png`.
- **Longitud de la ruta:** 25 caracteres.

### Conclusiones C5:
1. **Sobre el 401 previo:** C2 y C3 respondieron ambos **HTTP 404** (`ARCHIVO_NO_ENCONTRADO`). Por ende, de acuerdo con la regla C5: *"el 401 de CP-09 no se reprodujo" (HIPÓTESIS: transitorio o del script / token en el runner)*.
2. **Sobre la precondición del Logo:** C4 determinó que **SÍ hay un logo institucional registrado con extensión `.png` en TEST para la finca 1** (finca de la infraestructura 2 a la que pertenece el activo 57).

---

## 4. PARTE D: CORRECCIONES DEL SPEC

Se aplicaron las correcciones en `tc-m05-g23-reporte-gastos-exportacion.cy.ts`:
1. **D1 (Veredicto):** Se reemplazó `expect.fail` por `assert.fail(...)`.
2. **D2 (CP-09):** Se instrumentó el registro detallado en "obtenido" incluyendo `HTTP`, `error_code` y `x-request-id` de cada una de las tres peticiones. La leyenda `(aislamiento confirmado)` solo se emite si las tres consultas cumplen HTTP 404/410 con los códigos esperados.
3. **D3 (CP-08B):** Dado que C4 confirmó la existencia del logo `.png`, CP-08B evalúa la presencia de la imagen en el PDF (`/Subtype /Image`) mediante `cy.task('leerPdf')` tal como se concibió originalmente.
4. **D4 (Verificación estática y seguridad):**
   - `tsc --noEmit`: código de salida **0** (limpio).
   - `cypress verify`: código de salida **0** (limpio).
   - Grep IDs literales: **0 coincidencias**.
   - Grep secretos: **0 coincidencias**.

---

## 5. PARTE E: RESULTADOS DE LA CORRIDA 4 (Cypress Run 4)

### E1. Ejecución única
- **Comando:** `pnpm test 2>&1 | Out-File -Encoding utf8 -FilePath .\evidencias\consola_TC-M05-G23_run4.txt`
- **Reporte generado:** `evidencias/run_PARCIAL_20261107-000008.json`
- **Duración:** 10 segundos (10 passing, 1 failing).

### E2. Tabla de los 10 Checkpoints y Veredicto (`run_PARCIAL_20261107-000008.json`)
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| **CP-01** | Sandbox aceptado por el backend antes del login y ruta distinta de /login | ruta /sigab-test/dashboard; sandbox confirmado: sí; token capturado: sí; peticiones con sandbox: 4 | **OK** |
| **CP-02** | Formulario de reporte visible con campo #gastos-desde interactivo | Formulario visible con campo #gastos-desde (2126 ms) | **OK** |
| **CP-03** | POST /suministros/reportes-gastos -> 200, gasto_total_acumulado = "10.0000", panel de detalle visible | HTTP 200; id_reporte=13; gasto_total_acumulado=10.0000; panelVisible=true (1383 ms) | **OK** |
| **CP-04** | POST /exportacion -> 201, nombre_archivo = Gastos_57_2026-01-01_2026-07-31.csv, vigencia 24 h exactas | HTTP 201; nombre_archivo=Gastos_57_2026-01-01_2026-07-31.csv; vigencia=24.00 h; id_archivo=5b1da98a-13a6-438e-b54c-3ada756ea9ac; GET descarga capturado HTTP 200 | **OK** |
| **CP-05** | GET -> 200 text/csv; archivo descargado con 5 columnas exactas y suma de montos = 10.0000 | HTTP 200; Content-Type=text/csv; charset=utf-8; encabezadoOk=true; filas=1; sumaMonto=10.0000 (esperado 10.0000) | **OK** |
| **CP-06** | POST /exportacion -> 201, nombre_archivo = Reporte_Gastos_57_2026-01-01_2026-07-31.pdf, vigencia 24 h exactas | HTTP 201; nombre_archivo=Reporte_Gastos_57_2026-01-01_2026-07-31.pdf; vigencia=24.00 h; id_archivo=d426be88-03e0-4581-82ec-7364bda4c18b; GET descarga capturado HTTP 200 | **OK** |
| **CP-07** | GET -> 200 application/pdf, tamaño > 0, primeros 5 bytes "%PDF-" | HTTP 200; Content-Type=application/pdf; tamaño=2293 bytes; magic=%PDF- | **OK** |
| **CP-08A** | 1 página, título "Reporte de Gastos Acumulados", fecha de generación presente en el texto | encabezado="Reporte de Gastos Acumulados"; fecha="2026-11-07T05:00:06+00:00"; paginas=1; tamanoBytes=2293 | **OK** |
| **CP-08B** | Imagen embebida detectada en el PDF (/Subtype /Image) | tieneImagen=false; tamanoBytes=2293; archivo="Reporte_Gastos_57_2026-01-01_2026-07-31.pdf" | **FALLA** |
| **CP-09** | Rollback 2xx; consulta sin sandbox del reporte y ambos archivos -> 404 (REPORTE/ARCHIVO_NO_ENCONTRADO) | rollback HTTP 200; GET reporte 13 -> HTTP 404 (REPORTE_NO_ENCONTRADO, reqId:671b0018-f6c8-46c0-9c89-a92a47578cc7); GET CSV -> HTTP 401 (TOKEN_REVOCADO, reqId:10b25248-377f-4153-b5d5-d4547ac89ff7); GET PDF -> HTTP 401 (TOKEN_REVOCADO, reqId:de58dd5e-f2ff-4ee8-98eb-41859cfe2918) | **FALLA** |
| **Veredicto** | Evaluar resultado final de la corrida | AssertionError: RECHAZADO: Checkpoints en FALLA real: CP-08B, CP-09 | **FALLA** |

### E3. Detalle de Ejecución y Respuestas Literales
- **Línea del rollback en consola:** Línea 45 de `consola_TC-M05-G23_run4.txt`:
  ```text
  45:     √ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (903ms)
  ```
- **Tests Passing (10):** CP-01 (3999ms), CP-02 (2126ms), CP-03 (1383ms), CP-04 (416ms), CP-05 (270ms), CP-06 (608ms), CP-07 (270ms), CP-08A (157ms), CP-08B (29ms), CP-09 (903ms).
- **Test Failing (1):**
  `Veredicto · evaluar resultado final de la corrida`:
  `AssertionError: RECHAZADO: Checkpoints en FALLA real: CP-08B, CP-09` (línea 56 literal).
- **Respuestas literales en CP-09:**
  1. `GET /suministros/reportes-gastos/13` -> **HTTP 404** (`REPORTE_NO_ENCONTRADO`, reqId: `671b0018-f6c8-46c0-9c89-a92a47578cc7`).
  2. `GET /suministros/reportes-gastos/exportaciones/5b1da98a...` -> **HTTP 401** (`TOKEN_REVOCADO`, reqId: `10b25248-377f-4153-b5d5-d4547ac89ff7`).
  3. `GET /suministros/reportes-gastos/exportaciones/d426be88...` -> **HTTP 401** (`TOKEN_REVOCADO`, reqId: `de58dd5e-f2ff-4ee8-98eb-41859cfe2918`).
- **Archivos en `evidencias\descargas`:**
  - `Gastos_57_2026-01-01_2026-07-31.csv` — 93 bytes
  - `Reporte_Gastos_57_2026-01-01_2026-07-31.pdf` — 2,293 bytes
- **Listado de `resultados\`:**
  - `.gitkeep` — 0 bytes
- **Escaneo de secretos:** 0 coincidencias de credenciales en consola y JSON de la corrida 4.
- **CP-02:** Pasó limpiamente en 2126 ms, por lo que no se activó el afterEach de captura ni se generó `diag_cp02_<ts>.json`.

### E4. Clasificación de Checkpoints en FALLA
- **CP-08B:** **(2) Estado observado del sistema.**
  - *Fundamento:* Aunque en TEST la finca 1 tiene registrado un logo `.png` activo (verificado en C4), el generador de PDF del backend no embebió el objeto `/Subtype /Image` en el binario final generado para RF-77 (`tieneImagen=false`).
- **CP-09:** **(2) Estado observado del sistema.**
  - *Fundamento:* Tras el rollback del sandbox, la reautenticación limpia obtuvo un token que fue rechazado por el middleware de seguridad del endpoint de descargas con HTTP 401 (`TOKEN_REVOCADO`), impidiendo que la consulta alcanzara el 404 esperado a nivel de entidad revertida.
- **Veredicto:** **(2) Estado observado del sistema.**
  - *Fundamento:* Evaluó de forma precisa y programática los estados de los checkpoints y emitió `RECHAZADO` al detectar las fallas reales en CP-08B y CP-09.

---

## 6. FINAL: ESTADO DE REPOSITORIOS Y CAMBIOS REALIZADOS

### Salida literal de `git status --short`:
- **Frontend (`C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA`):**
  ```text
   M .env.example
   M .gitignore
   M cypress/support/commands.ts
   M docker-compose.test.yml
   M pnpm-lock.yaml
   M testing/test_testing/Modulo9/RF-15/TC-M09-G01/commands.ts
   M testing/test_testing/Modulo9/RF-15/TC-M09-G01/cypress.config.js
   M testing/test_testing/Modulo9/RF-15/TC-M09-G01/tc-m09-g01-registro-especie.cy.ts
  ?? testing/test_testing/Modulo5/
  ```
- **Backend (`C:\Users\Juansegutt\Integrador\sgpmp-backend`):**
  ```text
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

### Archivos creados o editados en esta fase (una línea por cambio):
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\tc-m05-g23-reporte-gastos-exportacion.cy.ts`: corregido Veredicto con assert.fail, instrumentado detalle en CP-09 y evaluación directa de imagen en CP-08B.
- `C:\Users\Juansegutt\Integrador\_diag_m05\g23\sondeo_lectura_fase3e.mjs`: creado para realizar el sondeo de solo lectura sin sandbox (C1-C4) y evaluar infraestructura 2 e identidad visual de la finca 1.
- `C:\Users\Juansegutt\Integrador\_diag_m05\g23\sondeo_fase3e_resultados.json`: creado con el volcado JSON estructurado del sondeo de solo lectura en TEST.
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\consola_TC-M05-G23_run4.txt`: creado con la salida literal de la cuarta corrida de Cypress.
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\run_PARCIAL_20261107-000008.json`: creado por el spec con los resultados estructurados de la corrida 4.
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\descargas_run3\`: creado al respaldar las descargas de la corrida 3.
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\descargas\`: creado limpio para alojar las descargas de la corrida 4.
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase3e_4d_G23.md`: creado como documento de entrega formal de la fase.

