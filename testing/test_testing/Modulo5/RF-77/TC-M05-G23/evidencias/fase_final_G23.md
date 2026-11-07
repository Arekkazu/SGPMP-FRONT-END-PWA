# Informe Técnico Oficial de Automatización E2E: Fase Final (TC-M05-G23 / RF-77)

**Fecha:** 2026-11-07  
**Caso de Prueba:** `TC-M05-G23` (RF-77: Reporte de gastos acumulados por activo y exportación PDF/CSV)  
**Ambiente:** TEST Oficial (`https://api.inmero.co/api-sgpmp-test`, Frontend: `/sigab-test`)  
**Ruta del informe:** `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/fase_final_G23.md`  

---

## 1. Resumen Ejecutivo de la Fase Final

En esta **Fase Final** se ejecutó con éxito el cierre oficial de la suite Cypress para el caso `TC-M05-G23`:
1. **Ajuste arquitectónico de CP-08B (Parte A):** Se desacopló la consulta de diagnóstico del logo para evitar colisiones de red antes del rollback. CP-08B evalúa de inmediato la presencia del logo binario (`leerPdf`); si no tiene imagen, registra `FALLA` con `contexto pendiente`. Posteriormente, tras el rollback y con la SPA detenida (`CP-09`), un bloque dedicado (`CP-08B · contexto de logo (post-rollback)`) ejecuta la consulta autenticada de contexto M09 y actualiza el campo obtenido con los estados HTTP reales (`infra_status=200`, `iv_status=200`, `id_finca=1`, `static_status=500`), preservando honestamente el veredicto `FALLA`.
2. **Formato oficial del JSON (`resultado_TC-M05-G23.json`):** Se adaptó el reporte final para contener exactamente los 10 checkpoints requeridos (`CP-01` a `CP-09`), con identificación concisa del paso (`paso: "CP-01"`), estados estrictos (`OK` o `FALLA`) y condición de guardado que permite archivar el resultado oficial cuando CP-01..CP-07, CP-08A y CP-09 están en OK y CP-08B en FALLA.
3. **Ejecución Oficial Única (Run 7 - Parte B):** La suite se ejecutó en **10 segundos netos** con `CYPRESS_REPORTE_EN_RESULTADOS=1`:
   - 11 pruebas de Cypress superadas exitosamente.
   - El test final de veredicto falló controladamente por aserción honesta (`RECHAZADO: Checkpoints en FALLA real: CP-08B`).
   - El hook `after()` generó y guardó automáticamente el archivo oficial `resultados/resultado_TC-M05-G23.json` (3271 bytes) y el respaldo en `evidencias/run_PARCIAL_20261107-053733.json`.
4. **Verificación y Nota Final (Partes C y D):** Se verificó el JSON oficial mediante PowerShell, se comprobó la ausencia de secretos, se documentó el estado de `qa-dashboard` y se actualizó `NOTA_elementos_no_ejecutables_G23.md` con el estado final de los escenarios E5-E10 y el diagnóstico de ambiente para CP-08B.

---

## 2. PARTE A: Cambios al Spec y Reporte del JSON Oficial

### A1. Ajustes en CP-08B y Nuevo Bloque de Contexto
- **En CP-08B (antes de rollback):** No realiza ningún login ni petición HTTP externa. Si `tieneImagen === true`, registra `OK`. Si `tieneImagen === false`, registra de inmediato `FALLA` con obtenido: `tieneImagen=false; tamanoBytes=...; archivo="..."; contexto pendiente`.
- **En CP-08B · contexto de logo (post-rollback):** Nuevo `it` ubicado entre CP-09 y Veredicto. Con el sandbox cerrado y la SPA reemplazada por `about:blank`, ejecuta `loginAdmin()` (timeout: 20000 ms), consulta `/configuracion/infraestructuras/2` (`infra_status`), `/configuracion/identidad-visual/{id_finca}` (`iv_status`), y la URL estática `/uploads/logos/...` (`static_status`), actualizando el string obtenido en el mapa de resultados sin alterar el estado `FALLA`.

### A2. Estructura del JSON Oficial: Antes vs Ahora
- **Antes:**
  - Archivo: `resultados/resultado_TC-M05-G23.json`
  - Campo paso: `paso: "CP-01 Sandbox + login Administrador"`
  - Guardado: Se intentaba escribir si no había fallas o requería banderas adicionales.
- **Ahora (Oficial implementado):**
  - Archivo y ruta: `resultados\resultado_TC-M05-G23.json`
  - Estructura:
    ```json
    {
      "tc": "TC-M05-G23",
      "checkpoints": [
        {
          "paso": "CP-01",
          "esperado": "...",
          "obtenido": "...",
          "estado": "OK"
        },
        ...
      ]
    }
    ```
  - Exactamente 10 checkpoints en orden (`CP-01` a `CP-09`).
  - Estados exclusivamente `OK` o `FALLA`.
  - Condición de escritura: Se guarda en `resultados/` si `CP-01..CP-07, CP-08A, CP-09` están en `OK` y `CP-08B` está en `OK` o `FALLA`. En caso contrario, se imprime `NO SE ESCRIBIÓ resultado oficial: <motivo>`.
  - Cero tokens o credenciales.

### A3. Verificaciones Estáticas Previas
- `pnpm exec tsc --noEmit`: Código de salida `0` (sin errores de compilación).
- `pnpm exec cypress verify`: Código de salida `0` (`Verified Cypress! C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress`).
- Búsqueda de secretos e IDs literales: 0 coincidencias.

---

## 3. PARTE B: Ejecución Oficial (Run 7)

### B1. Preparación de la Puerta
- Se archivó `evidencias/descargas` hacia `evidencias/descargas_run6`.
- Se creó `evidencias/descargas` vacía.
- Se verificó que `resultados/` contuviera únicamente `.gitkeep`.

### B2. Ejecución de la Corrida Oficial
- **Comando:**
  ```powershell
  cd "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23"
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  $env:CYPRESS_BASE_URL = "https://api.inmero.co"
  $env:CYPRESS_APP_BASE_PATH = "/sigab-test"
  $env:CYPRESS_API_BASE_URL = "https://api.inmero.co/api-sgpmp-test"
  $env:CYPRESS_REPORTE_EN_RESULTADOS = "1"
  pnpm test 2>&1 | Out-File -Encoding utf8 -FilePath .\evidencias\consola_TC-M05-G23_run7.txt
  ```
- **Resultado:** Duración neta de 10 segundos.
  - 11 tests pasando.
  - 1 test fallando (Veredicto por aserción de `CP-08B` en `FALLA`).
  - Escritura exitosa de `resultados/resultado_TC-M05-G23.json` y `evidencias/run_PARCIAL_20261107-053733.json`.
- **Excepción B3:** No fue requerida repetición (Run 8) dado que se escribió el JSON oficial y los checkpoints requeridos cumplieron su expectativa.

---

## 4. PARTE C: Verificación del JSON Oficial y Evidencias

### C1. Validación de `resultado_TC-M05-G23.json`
- **Listado de directorio:**
  - Archivo: `resultado_TC-M05-G23.json`
  - Tamaño: `3271 bytes`
  - Fecha de modificación: `2026-11-07 05:37`
- **Validación con PowerShell (`ConvertFrom-Json`):**
  - Total checkpoints: `10`
  - Lista de estados: `CP-01: OK, CP-02: OK, CP-03: OK, CP-04: OK, CP-05: OK, CP-06: OK, CP-07: OK, CP-08A: OK, CP-08B: FALLA, CP-09: OK`
- **Contenido Íntegro del Archivo:**
```json
{
  "tc": "TC-M05-G23",
  "checkpoints": [
    {
      "paso": "CP-01",
      "esperado": "Sandbox aceptado por el backend antes del login y ruta distinta de /login",
      "obtenido": "ruta /sigab-test/dashboard; sandbox confirmado: sí; token capturado: sí; peticiones con sandbox: 4",
      "estado": "OK"
    },
    {
      "paso": "CP-02",
      "esperado": "Formulario de reporte visible con campo #gastos-desde interactivo",
      "obtenido": "Formulario visible con campo #gastos-desde",
      "estado": "OK"
    },
    {
      "paso": "CP-03",
      "esperado": "POST /suministros/reportes-gastos -> 200, gasto_total_acumulado = \"10.0000\", panel de detalle visible",
      "obtenido": "HTTP 200; id_reporte=16; gasto_total_acumulado=10.0000; panelVisible=true",
      "estado": "OK"
    },
    {
      "paso": "CP-04",
      "esperado": "POST /exportacion -> 201, nombre_archivo = Gastos_57_2026-01-01_2026-07-31.csv, vigencia 24 h exactas",
      "obtenido": "HTTP 201; nombre_archivo=Gastos_57_2026-01-01_2026-07-31.csv; vigencia=24.00 h; id_archivo=49ecde3f-3aa7-44b6-a783-c9e58cf3f2e9; GET descarga capturado HTTP 200",
      "estado": "OK"
    },
    {
      "paso": "CP-05",
      "esperado": "GET -> 200 text/csv; archivo descargado con 5 columnas exactas y suma de montos = 10.0000",
      "obtenido": "HTTP 200; Content-Type=text/csv; charset=utf-8; encabezadoOk=true; filas=1; sumaMonto=10.0000 (esperado 10.0000)",
      "estado": "OK"
    },
    {
      "paso": "CP-06",
      "esperado": "POST /exportacion -> 201, nombre_archivo = Reporte_Gastos_57_2026-01-01_2026-07-31.pdf, vigencia 24 h exactas",
      "obtenido": "HTTP 201; nombre_archivo=Reporte_Gastos_57_2026-01-01_2026-07-31.pdf; vigencia=24.00 h; id_archivo=eb494879-c202-417d-b05b-820e660ecf6e; GET descarga capturado HTTP 200",
      "estado": "OK"
    },
    {
      "paso": "CP-07",
      "esperado": "GET -> 200 application/pdf, tamaño > 0, primeros 5 bytes \"%PDF-\"",
      "obtenido": "HTTP 200; Content-Type=application/pdf; tamaño=2295 bytes; magic=%PDF-",
      "estado": "OK"
    },
    {
      "paso": "CP-08A",
      "esperado": "1 página, título \"Reporte de Gastos Acumulados\", fecha de generación presente en el texto",
      "obtenido": "encabezado=\"Reporte de Gastos Acumulados\"; fecha=\"2026-11-07T10:37:30+00:00\"; paginas=1; tamanoBytes=2295",
      "estado": "OK"
    },
    {
      "paso": "CP-08B",
      "esperado": "Imagen embebida detectada en el PDF (/Subtype /Image)",
      "obtenido": "tieneImagen=false; infra_status=200; iv_status=200; id_finca=1; registro_iv_existe=true; logo_path_no_nulo=true; extension=.png; static_status=500; archivo=\"Reporte_Gastos_57_2026-01-01_2026-07-31.pdf\"; causa no determinada",
      "estado": "FALLA"
    },
    {
      "paso": "CP-09",
      "esperado": "Rollback 2xx; consulta sin sandbox del reporte y ambos archivos -> 404 (REPORTE/ARCHIVO_NO_ENCONTRADO)",
      "obtenido": "rollback HTTP 200; spa_sesiones=0; intento 1: [rep 404 REPORTE_NO_ENCONTRADO reqId:1b3451c7-252e-4cdb-ab60-7d32a34f954c, csv 404 ARCHIVO_NO_ENCONTRADO reqId:fb737cee-5b75-4be7-ad19-c351d562081d, pdf 404 ARCHIVO_NO_ENCONTRADO reqId:9f14634a-b818-4b96-ac53-bf1787cafa0f] (aislamiento confirmado)",
      "estado": "OK"
    }
  ]
}
```

### C2. Comprobación de `qa-dashboard` (`scanner.py`)
- **Comando ejecutado:**
  ```powershell
  python -c "import scanner as s; print([c for c in s.scan()['casos'] if c['tc_id']=='TC-M05-G023'])"
  ```
- **Salida literal:**
  ```text
  Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.
  ```
- **Causa:** No existe la carpeta `qa-dashboard` en el workspace ni el alias global `python` está vinculado al entorno virtual de Windows en esta sesión.

### C3. Métricas y Artefactos de la Ejecución

#### Tabla de los 10 Checkpoints
| Checkpoint | Estado | Esperado | Obtenido Literal |
|---|:---:|---|---|
| **CP-01** | **OK** | Sandbox aceptado por el backend antes del login y ruta distinta de /login | `ruta /sigab-test/dashboard; sandbox confirmado: sí; token capturado: sí; peticiones con sandbox: 4` |
| **CP-02** | **OK** | Formulario de reporte visible con campo #gastos-desde interactivo | `Formulario visible con campo #gastos-desde` |
| **CP-03** | **OK** | POST /suministros/reportes-gastos -> 200, gasto_total_acumulado = "10.0000", panel de detalle visible | `HTTP 200; id_reporte=16; gasto_total_acumulado=10.0000; panelVisible=true` |
| **CP-04** | **OK** | POST /exportacion -> 201, nombre_archivo = Gastos_57_2026-01-01_2026-07-31.csv, vigencia 24 h exactas | `HTTP 201; nombre_archivo=Gastos_57_2026-01-01_2026-07-31.csv; vigencia=24.00 h; id_archivo=49ecde3f-3aa7-44b6-a783-c9e58cf3f2e9; GET descarga capturado HTTP 200` |
| **CP-05** | **OK** | GET -> 200 text/csv; archivo descargado con 5 columnas exactas y suma de montos = 10.0000 | `HTTP 200; Content-Type=text/csv; charset=utf-8; encabezadoOk=true; filas=1; sumaMonto=10.0000 (esperado 10.0000)` |
| **CP-06** | **OK** | POST /exportacion -> 201, nombre_archivo = Reporte_Gastos_57_2026-01-01_2026-07-31.pdf, vigencia 24 h exactas | `HTTP 201; nombre_archivo=Reporte_Gastos_57_2026-01-01_2026-07-31.pdf; vigencia=24.00 h; id_archivo=eb494879-c202-417d-b05b-820e660ecf6e; GET descarga capturado HTTP 200` |
| **CP-07** | **OK** | GET -> 200 application/pdf, tamaño > 0, primeros 5 bytes "%PDF-" | `HTTP 200; Content-Type=application/pdf; tamaño=2295 bytes; magic=%PDF-` |
| **CP-08A** | **OK** | 1 página, título "Reporte de Gastos Acumulados", fecha de generación presente en el texto | `encabezado="Reporte de Gastos Acumulados"; fecha="2026-11-07T10:37:30+00:00"; paginas=1; tamanoBytes=2295` |
| **CP-08B** | **FALLA** | Imagen embebida detectada en el PDF (/Subtype /Image) | `tieneImagen=false; infra_status=200; iv_status=200; id_finca=1; registro_iv_existe=true; logo_path_no_nulo=true; extension=.png; static_status=500; archivo="Reporte_Gastos_57_2026-01-01_2026-07-31.pdf"; causa no determinada` |
| **CP-09** | **OK** | Rollback 2xx; consulta sin sandbox del reporte y ambos archivos -> 404 (REPORTE/ARCHIVO_NO_ENCONTRADO) | `rollback HTTP 200; spa_sesiones=0; intento 1: [rep 404 REPORTE_NO_ENCONTRADO reqId:1b3451c7-252e-4cdb-ab60-7d32a34f954c, csv 404 ARCHIVO_NO_ENCONTRADO reqId:fb737cee-5b75-4be7-ad19-c351d562081d, pdf 404 ARCHIVO_NO_ENCONTRADO reqId:9f14634a-b818-4b96-ac53-bf1787cafa0f] (aislamiento confirmado)` |

#### Passing / Failing con Nombres y Duración
Copiado de `consola_TC-M05-G23_run7.txt`:
- **Passing (11 tests):**
  - Línea 36: `√ CP-01 · login Administrador dentro del sandbox transaccional (3832ms)`
  - Línea 37: `√ CP-02 · navegar a /suministros/gastos y verificar formulario (1482ms)`
  - Línea 38: `√ CP-03 · generar reporte de gastos por UI (activo 57, mensual, 2026-01-01 a 2026-07-31) (1364ms)`
  - Línea 39: `√ CP-04 · exportar reporte a CSV por UI y verificar respuesta de exportación (398ms)`
  - Línea 40: `√ CP-05 · verificar descarga en disco y estructura del CSV (5 columnas y suma montos) (271ms)`
  - Línea 41: `√ CP-06 · exportar reporte a PDF por UI y verificar respuesta de exportación (619ms)`
  - Línea 42: `√ CP-07 · verificar descarga en disco y validación de binario PDF (%PDF-) (275ms)`
  - Línea 43: `√ CP-08A · verificar texto, encabezado, fecha y páginas del PDF (182ms)`
  - Línea 44: `√ CP-08B · verificar presencia de logo institucional embebido en el PDF (28ms)`
  - Línea 45: `√ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (926ms)`
  - Línea 46: `√ CP-08B · contexto de logo (post-rollback) (870ms)`
- **Failing (1 test):**
  - Línea 47: `1) Veredicto · evaluar resultado final de la corrida`
- **Duración total:** 10 segundos (Línea 73).
- **Línea del rollback en consola:** Línea 45 (`√ CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404) (926ms)`).

#### Archivos en `evidencias/descargas/`
- `Gastos_57_2026-01-01_2026-07-31.csv`: `93 bytes`
- `Reporte_Gastos_57_2026-01-01_2026-07-31.pdf`: `2295 bytes`

#### Escaneo de Secretos (Comando y Salida)
- **Comando:**
  ```powershell
  Select-String -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\consola_TC-M05-G23_run7.txt", "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\resultados\resultado_TC-M05-G23.json" -Pattern "eyJ", "Bearer [a-zA-Z0-9_\-\.]{10,}", "password", "TEST_SANDBOX_SECRET"
  ```
- **Salida:** Código `0`, 0 coincidencias.

#### Listado Real de Directorios
- **`evidencias\`:**
  - Carpetas: `descargas\`, `descargas_run1\`, `descargas_run3\`, `descargas_run4\`, `descargas_run5\`, `descargas_run6\`, `diag_g23\`
  - Logs de corrida: `consola_TC-M05-G23_run1.txt` a `run7.txt`
  - Informes: `fase1_analisis_G23.md`, `fase1b_verificacion_G23.md`, `fase1c_verificacion_G23.md`, `fase1d_verificacion_G23.md`, `fase2_creacion_G23.md`, `fase3_revision_G23.md`, `fase3b_4_G23.md`, `fase3c_4b_G23.md`, `fase3d_4c_G23.md`, `fase3e_4d_G23.md`, `fase3f_4e_G23.md`, `fase3g_4f_G23.md`, `fase3h_G23.md`, `fase_final_G23.md`
  - Nota de no ejecutables: `NOTA_elementos_no_ejecutables_G23.md`
  - JSONs parciales: `run_PARCIAL_20261106-231744.json`, `run_PARCIAL_20261106-233147.json`, `run_PARCIAL_20261106-234549.json`, `run_PARCIAL_20261107-000008.json`, `run_PARCIAL_20261107-001347.json`, `run_PARCIAL_20261107-050245.json`, `run_PARCIAL_20261107-053733.json`
- **`resultados\`:**
  - `.gitkeep` (1 byte)
  - `resultado_TC-M05-G23.json` (3271 bytes)

---

## 5. PARTE D: Nota Final (Sección Añadida a `NOTA_elementos_no_ejecutables_G23.md`)

Texto íntegro agregado al final del documento:

```markdown
---

## Estado final G23

### 1. Elementos NO ejecutados (E5-E10) y su motivo
- **E5 (30 registros, 25 por página), E6 (500 registros PDF) y E7 (501 registros, 422 PDF_EXCEDE_LIMITE):** No ejecutables porque faltan datos semilla en TEST (en TEST el activo 57 solo posee 1 consumo validado y no existen activos con volumen de 30 o 500+ consumos).
- **E8 (CSV > 50 MB, 413) y E10 (fallo de generación del PDF, 500 con alternativa CSV):** No ejecutables debido a constantes fijas en el backend sin flags ni mecanismos para provocarlos desde el cliente.
- **E9 (archivo vencido 24 h + 1 min, 410):** No ejecutable porque depende de datos de archivos vencidos (sección G del DBA) y no existe mecanismo de manipulación temporal (`freeze_time`) en el servidor TEST.

### 2. CP-08B: PDF sin imagen
- **Observado:** La finca 1 tiene configurado `logo_path: "/assets/logos/remanso.png"` (`GET /configuracion/identidad-visual/1` -> HTTP 200). Sin embargo, las consultas directas `GET /uploads/logos/assets/logos/remanso.png` y `GET /uploads/logos/remanso.png` respondieron HTTP 500 (sondeo 2026-11-07T09:57:32Z).
- **Causa de ambiente PROBABLE (HIPÓTESIS):** Ausencia física del directorio `LOGOS_STORAGE_PATH` en el contenedor del backend de TEST, provocando que Starlette `StaticFiles` falle con 500 y el adaptador de M05 omita la imagen al no superar `os.path.isfile()`. Pendiente de confirmación del equipo de Backend / Infraestructura.
```

---

## 6. FINAL: Estado de Git y Archivos Modificados

### Git Status (`git status --short`)

#### Frontend (`SGPMP-FRONT-END-PWA`):
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

#### Backend (`sgpmp-backend`):
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

### Relación de Archivos Creados / Editados en la Fase Final
1. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\tc-m05-g23-reporte-gastos-exportacion.cy.ts`: Se desacopló CP-08B sin login antes del rollback, se añadió el `it` de contexto post-rollback, y se adaptó `after()` para escribir el JSON oficial según las condiciones de A2.
2. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\resultados\resultado_TC-M05-G23.json`: Archivo oficial de resultados escrito automáticamente por el spec (10 checkpoints, formato oficial).
3. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\consola_TC-M05-G23_run7.txt`: Salida completa de la corrida oficial (run 7).
4. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\run_PARCIAL_20261107-053733.json`: Reporte de respaldo con timestamp.
5. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\NOTA_elementos_no_ejecutables_G23.md`: Se añadió al final la sección "Estado final G23".
6. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase_final_G23.md`: Informe técnico consolidado de la fase final.

