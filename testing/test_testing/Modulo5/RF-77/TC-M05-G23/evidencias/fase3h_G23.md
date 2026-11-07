# Informe Técnico de QA: Fase 3h (TC-M05-G23 / RF-77)

**Fecha:** 2026-11-07  
**Caso de Prueba:** `TC-M05-G23` (RF-77: Reporte de gastos acumulados y exportación PDF/CSV)  
**Modo:** SOLO LECTURA Y REPORTE  
**Ruta del archivo:** `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/fase3h_G23.md`  

---

## 1. PARTE A: Aclaraciones Técnicas y Retractaciones (A1-A4)

### A1. Contradicción de CP-08B en Corrida 5 vs Sondeo 3f
- **OBSERVADO:** En la Corrida 5, el bloque CP-08B envió `Authorization: Bearer ${Cypress.env('AUTH_TOKEN') || ''}` (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:542, 553`). Debido a que `Cypress.env('AUTH_TOKEN')` nunca fue fijado en la suite (el login de la SPA persiste el token en `localStorage`, no en las variables de Cypress), la cabecera enviada fue `Authorization: Bearer ` (vacía).
- **Consecuencia:** El backend rechazó de inmediato ambas peticiones con **HTTP 401 Unauthorized** tanto en `/configuracion/infraestructuras/2` como en `/configuracion/identidad-visual/1`.
- **Efecto en las variables evaluadas:** Al recibir 401, `resIv.status === 200` evaluó a `false`, por lo que el script asignó falsamente `registro_iv_existe=false`, `logo_path_no_nulo=false` y `extension=sin_extension`.
- **Contraste con Sondeo 3f:** En el sondeo independiente se autenticó explícitamente con un token de Administrador válido, obteniendo HTTP 200 y `logo_path: "/assets/logos/remanso.png"`.

### A2. Retractaciones de Afirmaciones Previas
1. **Retractación sobre el sistema de archivos:** Se retracta la afirmación previa de que *"el archivo físico remanso.png no existe en el disco del servidor"* emitida antes de la Corrida 5, dado que una prueba de caja negra HTTP no puede dictaminar la existencia física a nivel de inodo en disco sin verificar los logs o el código del servidor web estático. *(En el Sondeo 3g se confirmó que devuelve HTTP 500 por `RuntimeError: Directory ... does not exist` al montar `StaticFiles`)*.
2. **Retractación sobre la semilla de datos:** Se retracta la afirmación de que `"/assets/logos/remanso.png"` fue *"inyectado por el seeding inicial de la base de datos"*. La auditoría de código demostró que fue fijado por pruebas previas del RF-27 (`TC-M09-G94`).

### A3. Respuestas Técnicas sobre Sesiones y SPA (Ruta:Línea)
- **(a) Efecto de `POST /sesiones/logout` (o `DELETE /sesiones/`):**
  - *Frontend:* `src/identity_access/infrastructure/api/sesiones_api.ts:35-43` ejecuta `DELETE /sesiones/` con el token en la cabecera `Authorization`.
  - *Backend:* En `src/identity_access/infrastructure/routers/sesiones_routers.py:248-272` y `src/identity_access/application/logout_use_case.py:25-47`, `CerrarSesionUseCase.ejecutar()` localiza la sesión asociada al token (`sesiones_repo.buscar_sesion_por_token(token)`) y marca esa sesión individual como cerrada (`sesion.cerrar()`). **No invalida otras sesiones activas** de otros clientes o tokens.
- **(b) Efecto de `refreshAccessToken`:**
  - *Frontend:* `src/shared/api/http.ts:184-201` envía `POST /sesiones/refresh`.
  - *Backend:* En `src/identity_access/infrastructure/routers/sesiones_routers.py:275-327` y `src/identity_access/application/refresh_token_use_case.py:144-180`, **NO se invoca `emitir_sesion()`**. Se ejecuta `sesiones_repo.rotar_tokens(id_sesion, nuevo_token)`, manteniendo la misma fila de sesión en base de datos.
- **(c) Temporizadores e intervalos en la SPA:**
  - `src/notificaciones/hooks/useNotificaciones.ts:138`: `setInterval(refrescar, INTERVALO_ACTUALIZACION_MS)` (cada 60 s).
  - `src/auth/hooks/useSessionTimeout.ts:98`: `setInterval(evaluate, 1000)` para evaluar inactividad local.
  - `src/shared/auth/AuthContext.tsx:217`: temporizador de reintento de verificación cada 30 s.

### A4. Causa del Fallo de `about:blank` en Corrida 5
- **OBSERVADO:** En la corrida 5 se ejecutó `cy.visit('about:blank')`. Cypress concatena automáticamente la propiedad `baseUrl` (`https://api.inmero.co`), solicitando `https://api.inmero.co/about:blank`, lo que devolvió **HTTP 404** en el reverse proxy y abortó el comando.
- **Solución:** Reemplazo directo en el DOM mediante `cy.window().then((win) => { try { win.location.replace('about:blank'); } catch {} });`.

---

## 2. PARTE B: Montaje de Logos, Variables y Origen (B1-B3)

### B1. Montaje del Endpoint `/uploads/logos`
- En `src/main.py:1046-1050`:
  ```python
  from src.configuracion.infrastructure.almacen_logos import DIRECTORIO_LOGOS, RUTA_PUBLICA_LOGOS
  app.mount(RUTA_PUBLICA_LOGOS, StaticFiles(directory=DIRECTORIO_LOGOS, check_dir=False), name="logos")
  ```
- En `src/suministros/infrastructure/adapters/logo_finca_m09_adapter.py:48`:
  ```python
  from src.configuracion.infrastructure.almacen_logos import DIRECTORIO_LOGOS
  ```
- **OBSERVADO:** Ambos módulos comparten la misma constante `DIRECTORIO_LOGOS`. El servicio `StaticFiles` está montado bajo el prefijo público `/uploads/logos` (sin autenticación).

### B2. Nombre de Variable y Dónde se Define
- **Nombre de variable:** `LOGOS_STORAGE_PATH`
- **Definición en backend:** `src/configuracion/infrastructure/almacen_logos.py:45` (`DIRECTORIO_LOGOS = os.getenv("LOGOS_STORAGE_PATH", "/tmp/sgpmp_logos")`).
- **Definición en Docker Compose:** `docker-compose.yml:73` y `docker-compose.prod.yml:148` (`LOGOS_STORAGE_PATH: ${LOGOS_STORAGE_PATH:-/app/storage/modelos/logos}`).

### B3. Origen del Valor `"/assets/logos/remanso.png"`
- **OBSERVADO:** En el repositorio de pruebas de Módulo 9:
  - Archivo: `testing/test_testing/Modulo9/RF-27/TC-M09-G94/Resultados/179-rev12/G94-rev12-179-restore.json:17`
  - Documento: `testing/test_testing/Modulo9/RF-27/TC-M09-G94/analisis_TC-M09-G94/44_ejecucion_final_rev12.md:76`
- Fue establecido por la ejecución de pruebas E2E de `TC-M09-G94` (RF-27: Configuración de Identidad Visual), quedando persistido en la base de datos de TEST para la finca 1.

---

## 3. PARTE C: Sondeo de Solo Lectura en TEST (C1-C4)

Copiado literalmente de `_diag_m05/g23/sondeo_fase3g_resultados.json`:

### Login Administrador
- **Método:** `POST`
- **Ruta:** `/sesiones/`
- **HTTP:** `200`
- **Content-Type:** `application/json`
- **Request-ID:** `0a2f5a71-4537-48c9-93ab-4bc4cb52a0d7`
- **Hora UTC:** `2026-11-07T09:57:30.991Z`

### C1 · Consultar Identidad Visual Finca 1
- **Método:** `GET`
- **Ruta:** `/configuracion/identidad-visual/1`
- **HTTP:** `200`
- **Content-Type:** `application/json`
- **Tamaño:** `1098` bytes
- **Request-ID:** `ec74fd31-c484-49c7-8323-e804bce8ab53`
- **Hora UTC:** `2026-11-07T09:57:31.890Z`
- **Claves JSON:** `["id_identidad_visual", "id_finca", "id_usuario", "logo_path", "primary_color", "secondary_color", "org_display_name", "version", "fecha_creacion", "accesibilidad"]`
- **`logo_path`:** `"/assets/logos/remanso.png"`

### C2 · Consultar Ruta que Resuelve el Adaptador
- **Método:** `GET`
- **Ruta:** `/uploads/logos/assets/logos/remanso.png`
- **HTTP:** `500`
- **Content-Type:** `application/json`
- **Tamaño:** `202` bytes
- **Request-ID:** `-`
- **Hora UTC:** `2026-11-07T09:57:32.018Z`
- **Claves JSON:** `["error_code", "message", "fields", "timestamp"]`

### C3 · Consultar Ruta Directa `/uploads/logos/remanso.png`
- **Método:** `GET`
- **Ruta:** `/uploads/logos/remanso.png`
- **HTTP:** `500`
- **Content-Type:** `application/json`
- **Tamaño:** `202` bytes
- **Request-ID:** `-`
- **Hora UTC:** `2026-11-07T09:57:32.136Z`
- **Claves JSON:** `["error_code", "message", "fields", "timestamp"]`

### C4 · Explicación del Comando "Inspect sondeo JSON" y Lectura en PowerShell
- **Comando fallido (código 1):**
  - Comando ejecutado: `node -e '\n  const fs = require("fs");\n  const data = JSON.parse(fs.readFileSync("C:/Users/Juansegutt/Integrador/_diag_m05/g23/sondeo_fase3g_resultados.json", "utf8"));\n  console.log("C1 logo_path:", data.llamadas.C1.logo_path);\n'\n`
  - Salida literal:
    ```text
    [eval]:3
      const data = JSON.parse(fs.readFileSync(C:/Users/Juansegutt/Integrador/_diag_m05/g23/sondeo_fase3g_resultados.json, utf8));
                                              ^
    Expected ',', got ':'
    SyntaxError: missing ) after argument list
    ```
  - Causa técnica: Al pasar el comando a PowerShell con comillas simples externas y dobles internas, PowerShell retiró las comillas internas al invocar Node, pasando la ruta como identificador sin entrecomillar.
- **Comando exitoso por PowerShell (código 0):**
  - Comando ejecutado:
    ```powershell
    $json = Get-Content "C:\Users\Juansegutt\Integrador\_diag_m05\g23\sondeo_fase3g_resultados.json" | ConvertFrom-Json
    $json.llamadas.C1.logo_path
    ```
  - Salida literal:
    ```text
    /assets/logos/remanso.png
    ```

---

## 4. Complemento de la Parte E (Corrida 6 / Fase 4f)

### Passing y Failing con Nombres y Duración
Copiado de `consola_TC-M05-G23_run6.txt:36-46, 50, 89-101`:
- **Passing (9 tests):**
  - `CP-01 · login Administrador dentro del sandbox transaccional (4544ms)` (Línea 36)
  - `CP-02 · navegar a /suministros/gastos y verificar formulario (1641ms)` (Línea 37)
  - `CP-03 · generar reporte de gastos por UI (activo 57, mensual, 2026-01-01 a 2026-07-31) (1384ms)` (Línea 38)
  - `CP-04 · exportar reporte a CSV por UI y verificar respuesta de exportación (385ms)` (Línea 39)
  - `CP-05 · verificar descarga en disco y estructura del CSV (5 columnas y suma montos) (293ms)` (Línea 40)
  - `CP-06 · exportar reporte a PDF por UI y verificar respuesta de exportación (656ms)` (Línea 41)
  - `CP-07 · verificar descarga en disco y validación de binario PDF (%PDF-) (294ms)` (Línea 42)
  - `CP-08A · verificar texto, encabezado, fecha y páginas del PDF (680ms)` (Línea 43)
  - `CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (1106ms)` (Línea 45)
- **Failing (2 tests):**
  - `1) CP-08B · verificar presencia de logo institucional embebido en el PDF` (Línea 44)
  - `2) Veredicto · evaluar resultado final de la corrida` (Línea 46)
- **Duración total:** 1 minuto, 11 segundos (`consola_TC-M05-G23_run6.txt:99`).

### Línea Exacta del Rollback en `consola_TC-M05-G23_run6.txt`
- **Línea 45:**
  ```text
  45:     √ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (1106ms)
  ```

### Clasificación de CP-08B
- **(1) Script:** El fallo puntual en la ejecución de la Corrida 6 se debió al script de prueba, que invocó un `loginAdmin()` síncrono por `cy.request()` sin neutralizar previamente la SPA montada, incurriendo en un timeout de red de 60 s.
- **(2) Sistema:** El resultado funcional subyacente (`tieneImagen === false` detectado por `leerPdf`) constituye una limitación o defecto funcional del sistema (el PDF generado no incluye el logo institucional).

### Escaneo de Secretos (Comando y Salida)
- **Comando:**
  ```powershell
  Select-String -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\consola_TC-M05-G23_run6.txt", "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\run_PARCIAL_20261107-050245.json" -Pattern "eyJ", "Bearer [a-zA-Z0-9_\-\.]{10,}", "password", "TEST_SANDBOX_SECRET"
  ```
- **Salida:** Código de salida `0`, sin coincidencias (0 líneas).

### Listado Real de `evidencias\` y `resultados\`
- **`evidencias\`:**
  - `descargas\` (directorio activo)
  - `descargas_run1\` (directorio)
  - `descargas_run3\` (directorio)
  - `descargas_run4\` (directorio)
  - `descargas_run5\` (directorio)
  - `diag_g23\` (directorio)
  - `consola_TC-M05-G23_run1.txt` (10910 bytes)
  - `consola_TC-M05-G23_run2.txt` (15798 bytes)
  - `consola_TC-M05-G23_run3.txt` (6944 bytes)
  - `consola_TC-M05-G23_run4.txt` (6970 bytes)
  - `consola_TC-M05-G23_run5.txt` (8754 bytes)
  - `consola_TC-M05-G23_run6.txt` (8775 bytes)
  - `fase1_analisis_G23.md` (24947 bytes)
  - `fase1b_verificacion_G23.md` (23143 bytes)
  - `fase1c_admin_sonda.json` (4939 bytes)
  - `fase1c_productor_historial.json` (1952 bytes)
  - `fase1c_verificacion_G23.md` (18699 bytes)
  - `fase1d_admin_sonda.json` (7116 bytes)
  - `fase1d_verificacion_G23.md` (16562 bytes)
  - `fase2_creacion_G23.md` (12519 bytes)
  - `fase3_revision_G23.md` (11461 bytes)
  - `fase3b_4_G23.md` (29528 bytes)
  - `fase3c_4b_G23.md` (16133 bytes)
  - `fase3d_4c_G23.md` (19284 bytes)
  - `fase3e_4d_G23.md` (23560 bytes)
  - `fase3f_4e_G23.md` (19040 bytes)
  - `fase3g_4f_G23.md` (16415 bytes)
  - `fase3h_G23.md` (archivo actual)
  - `NOTA_elementos_no_ejecutables_G23.md` (3425 bytes)
  - `run_PARCIAL_20261106-231744.json` (3121 bytes)
  - `run_PARCIAL_20261106-233147.json` (2902 bytes)
  - `run_PARCIAL_20261106-234549.json` (3221 bytes)
  - `run_PARCIAL_20261107-000008.json` (3381 bytes)
  - `run_PARCIAL_20261107-001347.json` (3253 bytes)
  - `run_PARCIAL_20261107-050245.json` (3385 bytes)
- **`resultados\`:**
  - `.gitkeep` (1 byte)

### Git Status (`git status --short`) de AMBOS Repositorios
- **Frontend (`SGPMP-FRONT-END-PWA`):**
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
- **Backend (`sgpmp-backend`):**
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

---

## 5. Respuestas a Preguntas Específicas (Q1 - Q4)

### Q1. Token en CP-08B corrida 5 vs corrida 6
- **En la Corrida 5:** Se utilizó `Authorization: Bearer ${Cypress.env('AUTH_TOKEN') || ''}` (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:542, 553`). `Cypress.env('AUTH_TOKEN')` no existía, por lo que envió `"Bearer "` (vacío), devolviendo **HTTP 401 Unauthorized**. No usaba el token capturado en CP-01 ni uno nuevo.
- **En la Corrida 6:** Se agregó `loginAdmin()` dentro de CP-08B para obtener un token de Administrador autenticado con el que consultar `/configuracion/infraestructuras/2` e `/configuracion/identidad-visual/{idFinca}`.
- **Bloque actual de CP-08B (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:532-588`):**
  *(Cabeceras listadas únicamente por su nombre)*
  ```typescript
  it('CP-08B · verificar presencia de logo institucional embebido en el PDF', () => {
    exigirSandbox();
    if (!ctx.idArchivoPdf || ctx.statusGetPdf === null) {
      registrar('CP-08B', 'NO_EVALUADO', 'No evaluado: depende de CP-06 (exportación PDF)');
      return;
    }

    const rutaPdf = `evidencias/descargas/${NOMBRE_PDF_ESPERADO}`;
    cy.task('leerPdf', rutaPdf).then((datos: any) => {
      const tieneImagen = Boolean(datos?.tieneImagen);
      const tamanoBytes = Number(datos?.tamanoBytes || 0);

      if (tieneImagen) {
        registrar(
          'CP-08B',
          'OK',
          `tieneImagen=true; tamanoBytes=${tamanoBytes}; archivo="${NOMBRE_PDF_ESPERADO}"`,
        );
        return;
      }

      // Consulta de contexto M09 autenticada con token limpio de Administrador
      loginAdmin().then((tokenAdmin) => {
        const headersAuth = {
          Authorization: `Bearer ${tokenAdmin}`,
          'X-Zona-Horaria': zona(),
        };

        cy.request({
          method: 'GET',
          url: `${apiBase()}/configuracion/infraestructuras/2`,
          headers: headersAuth,
          failOnStatusCode: false,
          log: false,
        }).then((resInfra) => {
          const idFinca = resInfra.body?.id_finca ?? 1;
          cy.request({
            method: 'GET',
            url: `${apiBase()}/configuracion/identidad-visual/${idFinca}`,
            headers: headersAuth,
            failOnStatusCode: false,
            log: false,
          }).then((resIv) => {
            const ivData = resIv.body;
            const existeIv = Boolean(ivData && resIv.status === 200);
            const logoPath = ivData?.logo_path;
            const noNulo = Boolean(logoPath);
            const extMatch = logoPath ? String(logoPath).match(/\.([a-zA-Z0-9]+)$/) : null;
            const ext = extMatch ? `.${extMatch[1]}` : 'sin_extension';

            registrar(
              'CP-08B',
              'FALLA',
              `tieneImagen=false; infra_status=${resInfra.status}; iv_status=${resIv.status}; id_finca=${idFinca}; registro_iv_existe=${existeIv}; logo_path_no_nulo=${noNulo}; extension=${ext}; archivo="${NOMBRE_PDF_ESPERADO}"; causa no determinada`,
            );
          });
        });
      });
    });
  });
  ```

### Q2. Timeout de 60 s: ¿Observado o Hipótesis?
- **Clasificación:** Es una **HIPÓTESIS**.
- **Lo OBSERVADO:** En `consola_TC-M05-G23_run6.txt:55-64` únicamente consta:
  ```text
  55:      CypressError: `cy.request()` timed out waiting `60000ms` for a response from your server.
  56: 
  57: The request we sent was:
  58: 
  59: Method: POST
  60: URL: https://api.inmero.co/api-sgpmp-test/sesiones/
  61: 
  62: No response was received within the timeout.
  63: 
  64: https://on.cypress.io/request
  ```
- No hay ninguna traza en la consola que pruebe que el timeout fue originado por contención de los timers de la SPA. La atribución a contención de los timers fue una hipótesis formulada al observar que en CP-09 (donde la página fue vaciada con `about:blank`) el login tomó menos de 1 segundo.

### Q3. Restricción Única de Sesión Activa y Transacciones en `get_db`
1. **Restricción de unicidad de sesión activa:**
   - En `src/identity_access/infrastructure/models/sesiones_model.py:35`:
     ```python
     Index('uix_sesiones_activa_por_cuenta', 'id_cuenta_usuario', postgresql_where='(es_activa = true)', unique=True),
     ```
   - En `src/identity_access/infrastructure/models/sesiones_model.py:36`:
     ```python
     Index('uix_sesiones_token_refresco', 'id_token_refresco', postgresql_where='(id_token_refresco IS NOT NULL)', unique=True),
     ```
   - **OBSERVADO:** Existe un índice parcial único (`uix_sesiones_activa_por_cuenta`) que impide que una cuenta de usuario tenga más de una sesión marcada con `es_activa = true` simultáneamente.
2. **Comportamiento transaccional de `get_db` en `src/shared/database.py:274-358`:**
   - **Con `X-Test-Run-Id` (líneas 308-337):**
     `run_id = test_run_id_context.get()`. Si existe, `test_session = get_or_create_test_session(run_id)`. Todas las peticiones con el mismo encabezado `X-Test-Run-Id` comparten la **misma sesión y la misma transacción** activa del sandbox.
   - **Sin `X-Test-Run-Id` (líneas 349-357):**
     `db = SessionLocal()`, ejecuta la petición y en el bloque `finally` ejecuta `db.close()`. Cada petición corre en una **transacción separada** del pool que se confirma/cierra individualmente por request.

### Q4. Estado de CP-08B y Veredicto RECHAZADO
1. **Estado que le corresponde:**
   - En la Corrida 6, la prueba se abortó por una excepción no capturada de Cypress (`CypressError: cy.request() timed out waiting 60000ms...`) antes de llamar a `registrar()`. Al no ejecutarse el registro dinámico, permaneció el valor inicial de la matriz de checkpoints (`estado: 'FALLA'` con texto `"No alcanzado: un paso previo del mismo bloque se detuvo..."`).
   - Según las reglas de diseño:
     - Respecto a la ejecución de la prueba técnica en esa corrida: le corresponde **`NO_EJECUTABLE`** (bloqueada por fallo de infraestructura/timeout en la llamada auxiliar de red).
     - Respecto a la aserción de negocio del PDF: el paso previo `leerPdf` ya había determinado empíricamente `tieneImagen === false` (que es una **`FALLA`** funcional de la expectativa de negocio).
2. **Por qué el Veredicto dijo RECHAZADO:**
   - En `tc-m05-g23-reporte-gastos-exportacion.cy.ts:613` (evaluado en la línea 83 de la consola):
     ```typescript
     const fallasReales = ORDEN.filter((id) => resultados.get(id)?.estado === 'FALLA');
     if (fallasReales.length > 0) {
       assert.fail(`RECHAZADO: Checkpoints en FALLA real: ${fallasReales.join(', ')}`);
     }
     ```
   - Dado que `CP-08B` tenía asignado `estado: 'FALLA'` en el mapa de resultados, `fallasReales` contuvo `['CP-08B']`, lo que disparó la aserción `assert.fail("RECHAZADO: Checkpoints en FALLA real: CP-08B")`.

