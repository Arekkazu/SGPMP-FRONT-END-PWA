# Informe de Fase 3c + 4b: TC-M05-G23 (RF-77)

**Fecha:** 2026-11-06  
**Módulo:** Módulo 5 (Costeo de Suministros)  
**Requerimiento:** RF-77 (Reporte de gastos acumulados por activo y exportación PDF/CSV)  
**Caso:** TC-M05-G23  
**Activo biológico:** 57 (INDIVIDUAL, fecha de inicio de ciclo 2026-01-01)  
**Ambiente:** TEST oficial (`https://api.inmero.co` / API: `https://api.inmero.co/api-sgpmp-test`)  

---

## PARTE A: CORRECCIÓN DEL SPEC (SIN TEST)

### A1. Causa de la Falla en Corrida 1
- **OBSERVADO:** En la interfaz de usuario, al hacer clic en el botón de exportación (CSV o PDF), la aplicación ejecuta inmediatamente dos peticiones consecutivas: `POST .../suministros/reportes-gastos/{id}/exportacion` y, tras recibir la respuesta 201, dispara de inmediato el `GET .../suministros/reportes-gastos/exportaciones/{id_archivo}` para entregar el Blob al navegador y descargarlo en disco.
- El spec original esperaba `@getDescargaCsv` y `@getDescargaPdf` en los bloques `it()` posteriores (`CP-05` y `CP-07`). Dado que los alias y oyentes de red de Cypress se reinician entre tests, al comenzar el nuevo bloque `it()` la petición ya había finalizado segundos atrás en el `it()` previo, provocando el error `cy.wait() timed out waiting 15000ms for the 1st request... No request ever occurred`.

### A2. Corrección Aplicada en el Spec
- **`CP-04` (CSV) y `CP-06` (PDF)** (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:227-261, 313-347`):
  - Ahora capturan tanto el `POST` de exportación como el `GET` de descarga dentro del mismo `it()` donde ocurre el clic del usuario.
  - Almacenan en el contexto compartido (`ctx`): `id_archivo`, `nombre_archivo`, `statusGet`, `cType` y `cDisp`.
- **`CP-05` y `CP-07`** (`tc-m05-g23-reporte-gastos-exportacion.cy.ts:265-309, 351-383`):
  - Se eliminaron los `cy.wait` extemporáneos.
  - Utilizan `cy.task('esperarArchivo')` (`cypress.config.js:143-162`) para confirmar la presencia del archivo en disco con timeout explícito y luego ejecutan `cy.readFile` para verificar la estructura y datos (CSV: 5 columnas exactas, suma de montos = 10.0000 COP; PDF: cabecera `application/pdf`, magic bytes `%PDF-`, tamaño > 0).

### A3. Manejo de Contexto y Archivos Faltantes
- Si `ctx.idArchivo` o `ctx.statusGet` faltan (porque `CP-04`/`CP-06` no se ejecutaron o fallaron), `CP-05` y `CP-07` registran en `obtenido`:
  `"No evaluado: falta <dato> de CP-04/CP-06"`.
- Si el GET de descarga se capturó pero el archivo no aparece en disco tras el timeout, registran:
  `"GET HTTP <status>; Content-Type=<tipo>; el archivo <nombre> no apareció en disco tras 15 s"`.

### A4. Preservación de Evidencias de la Corrida 1
- Se apartaron los archivos de la corrida 1 sin borrarlos:
  ```powershell
  Move-Item evidencias\descargas evidencias\descargas_run1
  New-Item -ItemType Directory -Path evidencias\descargas
  ```
- Se confirmó que `consola_TC-M05-G23_run1.txt` y `run_PARCIAL_20261106-231744.json` continúan intactos en `evidencias\`.

### A5. Aclaración de la Dependencia `pdf-parse`
- **CORRECCIÓN:** La biblioteca `pdf-parse` (`^1.1.4`) **no es un requisito del monorepo**. Fue agregada e instalada por el equipo de QA en la subcarpeta del caso de prueba durante la Fase 2 con el propósito específico de parsear el texto, número de páginas e inspeccionar objetos embebidos del PDF descargado dentro de las tareas de Cypress (`cypress.config.js`).

### A6. Verificación Estática y Greps
1. **Compilación TypeScript (`pnpm exec tsc --noEmit`):** Salida código 0 (sin errores).
2. **Cypress Verify (`pnpm exec cypress verify`):**
   ```text
   [SUCCESS]  Verified Cypress!       C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress
   ```
3. **Grep de IDs literales:**
   ```powershell
   Select-String -Path "$tc\*.ts","$tc\*.js" -Pattern "reportes-gastos/\d|exportaciones/[0-9a-f]{8}|/10\b"
   # Salida: sin hits
   ```
4. **Grep de Secretos:**
   ```powershell
   Get-ChildItem -Path $tc -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules" } | Select-String -Pattern "password\s*[:=]\s*['""][^'""]+['""]|secret\s*[:=]\s*['""][^'""]+['""]|TEST_SANDBOX_SECRET\s*=\s*['""][^'""]+['""]|ey[A-Za-z0-9-_=]{20,}"
   # Salida: sin hits
   ```

---

## PARTE B: DIAGNÓSTICO DEL LOGO (SOLO LECTURA)

### B1. Consulta SQL de `LogoFincaM09Adapter`
- **Archivo y líneas:** `sgpmp-backend/src/supplies/infrastructure/adapters/logo_finca_m09_adapter.py:21-32`.
- **SQL exacto:**
  ```sql
  SELECT iv.logo_path
  FROM modulo9.identidad_visuales iv
  JOIN modulo9.infraestructuras i ON i.id_finca = iv.id_finca
  LEFT JOIN modulo2.activos_biologicos ab ON ab.id_infraestructura = i.id_infraestructura
  WHERE iv.logo_path IS NOT NULL
    AND (ab.id_activo_biologico = :id_activo OR (CAST(:id_activo AS integer) IS NULL AND i.id_infraestructura = :id_infra))
  ORDER BY iv.version DESC
  LIMIT 1
  ```
- **Tablas y uniones:**
  - `modulo9.identidad_visuales iv`
  - `JOIN modulo9.infraestructuras i ON i.id_finca = iv.id_finca`
  - `LEFT JOIN modulo2.activos_biologicos ab ON ab.id_infraestructura = i.id_infraestructura`
- **Resolución de finca:** El activo (`ab.id_activo_biologico = :id_activo`) apunta a `ab.id_infraestructura`, la cual se relaciona con `i.id_infraestructura` en `modulo9.infraestructuras`, tabla que contiene la columna foránea `id_finca` asociada a `modulo9.identidad_visuales`.

### B2. Análisis del Endpoint `/test-control/query`
- **Archivo y líneas:** `sgpmp-backend/src/shared/rollback/presentation/test_control_router.py:42-87`.
- **Cabeceras y autenticación:**
  - `X-Sandbox-Secret`: Obligatoria (validada contra `TEST_SANDBOX_SECRET` en línea 11-17).
  - `X-Test-Run-Id`: Obligatoria (cabecera `alias="X-Test-Run-Id"` en línea 45).
- **Restricción de solo lectura:**
  - Valida estrictamente `cleaned_query.upper().startswith("SELECT")` (línea 56) y prohíbe `;` (línea 62).
  - Envuelve en `SELECT * FROM (...) AS query_sandbox LIMIT 100` (línea 68).
  - Ejecuta bajo `SAVEPOINT sandbox_query` con `SET LOCAL transaction_read_only = on` y `statement_timeout = '2s'` (líneas 71-76), revirtiendo al savepoint en el bloque `finally` (línea 80).
- **Retorno:** Devuelve filas completas mapeadas como diccionarios: `{"data": rows}` (líneas 76, 82).
- **Puerta B2 -> B3:** **CUMPLIDA** (endpoint de solo lectura autenticado mediante `X-Sandbox-Secret` y `X-Test-Run-Id`).

### B3. Ejecución del Diagnóstico en TEST
Se ejecutó el script `C:\Users\Juansegutt\Integrador\_diag_m05\g23\diag_logo_query.mjs` bajo un sandbox aislado (`diag-logo-1794025802310`) que terminó con rollback exitoso:
1. `POST /sesiones/` -> HTTP 200, request-id: `0786628d-41cb-40ea-8df1-89bc6b96ce6f`, hora UTC: `2026-11-07T04:30:02.314Z`.
2. `POST /test-control/query` (Infraestructura de activo 57) -> HTTP 200, request-id: `e9bddf3e-d6a7-4ef6-93a0-589e033b99ed`, hora UTC: `2026-11-07T04:30:03.282Z`.
   - **Resultado:** `[]` (0 filas; el activo 57 no tiene asignada infraestructura en `modulo9.infraestructuras`).
3. `POST /test-control/query` (Consulta exacta del adaptador `LogoFincaM09Adapter` para activo 57) -> HTTP 200, request-id: `759b988c-5338-4c57-9424-543b9989c358`, hora UTC: `2026-11-07T04:30:03.404Z`.
   - **Resultado:** `Total filas: 0` (0 columnas devueltas).
4. `POST /test-control/query` (Consulta de tabla `modulo9.identidad_visuales`) -> HTTP 200.
   - **Resultado:** `[]` (0 filas en toda la tabla).
5. `DELETE /test-control/runs/diag-logo-1794025802310` -> HTTP 200, request-id: `1193cddb-8502-4c93-9a99-a05530bf4565`, hora UTC: `2026-11-07T04:30:03.633Z`.

### B4. Conclusión del Diagnóstico de Logo
- **OBSERVADO:** La tabla `modulo9.identidad_visuales` en la base de datos de TEST se encuentra totalmente vacía (0 filas).
- Al no existir ninguna fila de identidad visual, la consulta del adaptador `LogoFincaM09Adapter` devuelve 0 filas (`None`).
- El caso de uso `ExportarReporteGastosUseCase` recibe `ruta_logo = None`.
- Por consiguiente, `generador_archivos.py:89` omite el elemento `Image` y ReportLab produce un documento de 2295 bytes sin objetos de imagen (`/Subtype /Image`).
- La existencia física del archivo de imagen en el servidor queda catalogada como: **"NO DETERMINABLE: requiere verificación en el servidor por Backend"**, pues en la base de datos ni siquiera existe la referencia en `logo_path`.

---

## PARTE C: RESULTADOS DE LA SEGUNDA CORRIDA

### C1. Condiciones Previas
- `evidencias\descargas`: vacía (0 elementos).
- `resultados\`: contenía únicamente `.gitkeep`.

### C2. Ejecución
```powershell
cd "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:CYPRESS_BASE_URL = "https://api.inmero.co"
$env:CYPRESS_APP_BASE_PATH = "/sigab-test"
$env:CYPRESS_API_BASE_URL = "https://api.inmero.co/api-sgpmp-test"
pnpm test 2>&1 | Out-File -Encoding utf8 -FilePath .\evidencias\consola_TC-M05-G23_run2.txt
```

### C3. Análisis Posterior a la Corrida

#### (a) Archivo JSON Generado:
[`evidencias/run_PARCIAL_20261106-233147.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/run_PARCIAL_20261106-233147.json).

#### (b) Tabla de los 10 Checkpoints (Literal del JSON):

| Checkpoint | Estado | Esperado | Obtenido |
|---|:---:|---|---|
| **CP-01** | **OK** | Sandbox aceptado por el backend antes del login y ruta distinta de /login | `ruta /sigab-test/dashboard; sandbox confirmado: sí; token capturado: sí; peticiones con sandbox: 4` |
| **CP-02** | **FALLA** | Formulario de reporte visible con campo #gastos-desde interactivo | `No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).` |
| **CP-03** | **FALLA** | POST /suministros/reportes-gastos -> 200, gasto_total_acumulado = "10.0000", panel de detalle visible | `No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).` |
| **CP-04** | **FALLA** | POST /exportacion -> 201, nombre_archivo = Gastos_57_2026-01-01_2026-07-31.csv, vigencia 24 h exactas | `Omitido: no se obtuvo id_reporte en CP-03` |
| **CP-05** | **FALLA** | GET -> 200 text/csv; archivo descargado con 5 columnas exactas y suma de montos = 10.0000 | `No evaluado: falta id_archivo de CP-04` |
| **CP-06** | **FALLA** | POST /exportacion -> 201, nombre_archivo = Reporte_Gastos_57_2026-01-01_2026-07-31.pdf, vigencia 24 h exactas | `Omitido: no se obtuvo id_reporte en CP-03` |
| **CP-07** | **FALLA** | GET -> 200 application/pdf, tamaño > 0, primeros 5 bytes "%PDF-" | `No evaluado: falta id_archivo de CP-06` |
| **CP-08A** | **FALLA** | 1 página, título "Reporte de Gastos Acumulados", fecha de generación presente en el texto | `No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).` |
| **CP-08B** | **FALLA** | Imagen embebida detectada en el PDF (/Subtype /Image) | `No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).` |
| **CP-09** | **FALLA** | Rollback 2xx; consulta sin sandbox del reporte y ambos archivos -> 404 (REPORTE/ARCHIVO_NO_ENCONTRADO) | `Rollback HTTP 200 pero faltaron identificadores capturados para validar 404: idReporte, idArchivoCsv, idArchivoPdf` |

#### (c) Resumen de Consola:
- **Totales (`consola_TC-M05-G23_run2.txt#L50-L51`):** `6 passing`, `5 failing`, `0 pending`.
- **Duración (`consola_TC-M05-G23_run2.txt#L157`):** `35 seconds`.
- **Línea de Rollback (`consola_TC-M05-G23_run2.txt#L45`):**
  ```text
  √ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (151ms)
  ```

#### (d) Archivos Descargados:
- **`evidencias\descargas\`:** 0 archivos descargados en la corrida 2.
- **Comparación con `descargas_run1\`:** En la corrida 1 se descargaron `Gastos_57_2026-01-01_2026-07-31.csv` (93 bytes) y `Reporte_Gastos_57_2026-01-01_2026-07-31.pdf` (2295 bytes); en la corrida 2 no hubo descargas debido a que el formulario no cargó en CP-02.

#### (e) Estado de `resultados\`:
- Sigue conteniendo exclusivamente el archivo marcador `.gitkeep`.

#### (f) Escaneo de Secretos sobre Consola y JSON:
```powershell
$files = @("testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\consola_TC-M05-G23_run2.txt", "testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\run_PARCIAL_20261106-233147.json")
Select-String -Path $files -Pattern "password\s*[:=]\s*['""][^'""]+['""]|secret\s*[:=]\s*['""][^'""]+['""]|TEST_SANDBOX_SECRET\s*=\s*['""][^'""]+['""]|ey[A-Za-z0-9-_=]{20,}"
```
**Salida:** `sin hits` (0 coincidencias).

#### (g) Clasificación Rigurosa de Fallas de la Corrida 2:
1. **CP-02:**
   - *Obtenido:* `"No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress)."`
   - *Línea de consola:* `L55: AssertionError: Timed out retrying after 15000ms: Expected to find element: #gastos-desde, but never found it.`
   - *Clasificación:* **(2) Respuesta/estado observado del sistema**.
   - *Evidencia:* Al navegar a `/suministros/gastos`, el formulario `#gastos-desde` no estuvo interactivo en el DOM antes del timeout de 15 segundos en este intento (posible demora de carga o hidratación de la SPA en el ambiente TEST).
2. **CP-03 a CP-07:**
   - *Clasificación:* **(1) Error del script o de la herramienta** (consecuencia en cascada de no haber obtenido formulario ni reporte en CP-02/CP-03). Los mensajes reflejaron exactamente el diseño preventivo: `"Omitido: no se obtuvo id_reporte en CP-03"` y `"No evaluado: falta id_archivo..."`.
3. **CP-08A y CP-08B:**
   - *Línea de consola:* `L67: Error: [leerPdf] El archivo PDF no existe en la ruta...`
   - *Clasificación:* **(1) Error del script o de la herramienta** (consecuencia de no haberse generado archivo al fallar los pasos previos).
4. **CP-09:**
   - *Obtenido:* `"Rollback HTTP 200 pero faltaron identificadores capturados para validar 404: idReporte, idArchivoCsv, idArchivoPdf"`
   - *Clasificación:* **(1) Error del script o de la herramienta** (el rollback fue exitoso con HTTP 200, pero se registró honestamente la falta de IDs para comprobar el 404).

---

## FINAL: ESTADO GIT DE AMBOS REPOSITORIOS

### Repositorio Frontend (`SGPMP-FRONT-END-PWA`):
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

### Repositorio Backend (`sgpmp-backend`):
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

### Lista de Archivos Creados o Editados:
1. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\cypress.config.js`: Añadida tarea `esperarArchivo` y uso de `statSync`.
2. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\tc-m05-g23-reporte-gastos-exportacion.cy.ts`: Unificación de captura de `POST` y `GET` de descarga en CP-04/CP-06 y consumo seguro con `esperarArchivo` en CP-05/CP-07.
3. `C:\Users\Juansegutt\Integrador\_diag_m05\g23\diag_logo_query.mjs`: Script desechable de solo lectura para ejecutar diagnóstico de la base de datos de TEST sobre `modulo9.identidad_visuales`.
4. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase3c_4b_G23.md`: Documento de informe técnico de Fase 3c y corrida 2.
5. Carpeta `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\descargas_run1`: Respaldo preservado de las descargas de la corrida 1.

