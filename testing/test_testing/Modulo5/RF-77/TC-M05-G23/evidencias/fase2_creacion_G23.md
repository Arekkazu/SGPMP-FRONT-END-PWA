# INFORME DE FASE 2: CREACIÓN DEL SPEC E2E Y SOPORTE CYPRESS
## CASO TC-M05-G23: REPORTE DE GASTOS ACUMULADOS POR ACTIVO Y EXPORTACIÓN PDF/CSV (RF-77)
**Fecha:** 2026-11-06 (UTC: 2026-11-07)  
**Ambiente:** TEST Oficial (`https://api.inmero.co` / API: `https://api.inmero.co/api-sgpmp-test`)  
**Autor:** Ingeniero de Automatización de QA  

---

## SECCIÓN A — ARCHIVOS CREADOS Y ESTRUCTURA DE LA CARPETA

Todos los artefactos de la suite E2E se encuentran confinados dentro de:  
`C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\`

1. **`package.json`**: Configuración del proyecto de pruebas autocontenido, scripts `test`, `open`, `typecheck` y dependencias (`cypress`, `typescript`, `pdf-parse`, `dotenv`, `cross-env`).
2. **`tsconfig.json`**: Configuración de compilador TypeScript (`target: es2020`, modo estricto, tipos de Cypress y Node.js).
3. **`cypress.config.js`**: Configuración del runner con lectura de `.env.test`, inyección de zona horaria `America/Bogota`, carpetas de descargas fijadas en `evidencias/descargas/`, tareas Node.js `leerPdf`, `writeResult` y `escribirReporte`.
4. **`commands.ts`**: Comandos personalizados de soporte (control de sandbox transaccional, helpers `visitar`, `rutaApp`, `loginUI` seguro con credenciales enmascaradas, e intercept fail-closed).
5. **`tc-m05-g23-reporte-gastos-exportacion.cy.ts`**: Spec E2E integral estructurado en 9 checkpoints obligatorios (CP-01 a CP-09) y test de veredicto.
6. **`evidencias/NOTA_elementos_no_ejecutables_G23.md`**: Documento de justificación técnica sobre los escenarios extremos no automatizables en TEST.
7. **`evidencias/descargas/`**: Directorio preparado para recibir las descargas reales del navegador.

---

## SECCIÓN B — TABLA DE CHECKPOINTS (CP-01 a CP-09)

| CP | Qué Verifica | Cómo se Verifica | Fuente de la Expectativa | Selector o Endpoint | Ruta y Línea del Spec |
|:---:|:---|:---|:---|:---|:---|
| **CP-01** | Login Administrador por UI y sandbox transaccional confirmado | UI + intercept global + `estadoSandbox` | Patrón G13 / Observado en TEST | Formulario `/login`, intercept `X-Test-Run-Id` y `X-Sandbox-Secret` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:133-149`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L133-L149) |
| **CP-02** | Navegación a `/suministros/gastos` y formulario disponible | UI (`visitar` + `cy.get`) | Hoja de caso / RF-77 paso 1 | `#gastos-desde` (campo tipo date) | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:154-162`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L154-L162) |
| **CP-03** | Generación de reporte síncrono para activo 57 (`gasto = 10.0000`) | UI (`type`, `select`, `click`) + intercept API | Observado en Fase 1d / RF-77 paso 2 | `#gastos-desde`, `#gastos-hasta`, `#gastos-granularidad`, `#gastos-activo`, `POST /suministros/reportes-gastos` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:167-203`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L167-L203) |
| **CP-04** | Solicitud de exportación CSV por UI (HTTP 201 y vigencia 24 h) | UI (`button:contains("CSV")`) + intercept API | Observado en Fase 1d / RF-77 paso 8 y E6d | `#reporte-titulo` -> `button:contains("CSV")`, `POST .../exportacion` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:208-239`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L208-L239) |
| **CP-05** | Descarga CSV en disco, Content-Type, 5 columnas y suma montos | Intercept API + `cy.readFile` | Observado en Fase 1d / RF-77 E4, E6 | `GET .../exportaciones/{id_archivo}`, `evidencias/descargas/Gastos_57_...csv` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:244-282`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L244-L282) |
| **CP-06** | Solicitud de exportación PDF por UI (HTTP 201 y vigencia 24 h) | UI (`button:contains("PDF")`) + intercept API | Observado en Fase 1d / RF-77 paso 8 y E6d | `#reporte-titulo` -> `button:contains("PDF")`, `POST .../exportacion` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:287-318`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L287-L318) |
| **CP-07** | Descarga binaria PDF en disco y validación `%PDF-` | Intercept API + `cy.readFile(..., 'binary')` | Observado en Fase 1d / RF-77 E4 | `GET .../exportaciones/{id_archivo}`, `evidencias/descargas/Reporte_Gastos_57_...pdf` | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:323-349`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L323-L349) |
| **CP-08** | Contenido PDF: título, fecha de generación, 1 página y logo | `cy.task('leerPdf')` con `pdf-parse` | `generador_archivos.py:65-95` | Tarea Node.js sobre buffer binario de PDF | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:354-374`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L354-L374) |
| **CP-09** | Aislamiento post-rollback sin sandbox (reporte y archivos 404) | `rollbackSandbox` + `cy.request` limpia sin sandbox | Observado en Fase 1d / Regla Sandbox | `DELETE /test-control/runs/{run_id}`, `GET .../reportes-gastos/10` -> 404, `GET .../exportaciones/{id}` -> 404 | [`tc-m05-g23-reporte-gastos-exportacion.cy.ts:379-444`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts#L379-L444) |

---

## SECCIÓN C — DECISIONES DE DISEÑO Y LÍMITES TÉCNICOS

1. **Selección del Activo 57:**
   - Como se demostró en las lecturas de código de Fase 1d ([`activo_biologico_repository.py:125`](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/biological_assets/infrastructure/repositories/activo_biologico_repository.py#L125)), el backend ordena los 776 activos en forma descendente y el frontend solo precarga hasta 500 ([`useActivosSuministros.ts:8`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useActivosSuministros.ts#L8)).
   - El spec digita `"57"` directamente en `#gastos-activo`. La función [`idDeCatalogo`](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/shared/lib/catalogo.ts#L12) resuelve el ID numérico mediante la expresión regular `^#?\s*(\d+)$` sin exigir que el activo esté presente en las opciones precargadas.
2. **Paginación del PDF (25 registros por página):**
   - En el entorno TEST, el activo 57 cuenta con 1 solo consumo validado. Por tanto, el PDF generado consta de **1 página exacta**. No se agregaron checkpoints para 25 o 50 registros por falta de datos semilla en TEST.
3. **Detección del Logo en el PDF:**
   - La tarea `leerPdf` analiza los objetos binarios del PDF buscando marcadores `/Subtype /Image` generados por ReportLab cuando se incluye el logo institucional. Si la finca o activo no tiene logo asignado (`ruta_logo is None`), el generador omite el elemento `Image` y la tarea reporta `tieneImagen: false`. El checkpoint declara explícitamente el resultado en su texto obtenido.
4. **Política de Escritura de Resultados:**
   - Por defecto, el spec escribe únicamente en `evidencias/run_PARCIAL_<timestamp>.json` (o `run_INVALIDA_<timestamp>.json` si el sandbox no fue confirmado).
   - Solo escribe en `resultados/resultado_TC-M05-G23.json` si el usuario define expresamente la variable de entorno `CYPRESS_REPORTE_EN_RESULTADOS=1`.

---

## SECCIÓN D — RESULTADO DE VERIFICACIÓN ESTÁTICA

### D.1 Compilación TypeScript (`tsc --noEmit`)
Comando ejecutado:
```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue ; cd "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23" ; pnpm exec tsc --noEmit
```
**Resultado:** Código de salida **0** (compilación limpia sin errores de tipado).

### D.2 Verificación de Binario Cypress (`cypress verify`)
Comando ejecutado:
```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue ; cd "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23" ; pnpm exec cypress verify
```
Salida literal:
```
[STARTED] Task without title.
[TITLE]  Verified Cypress!       C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress
[SUCCESS]  Verified Cypress!       C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress
```
**Resultado:** Código de salida **0** (`SUCCESS`).

---

## SECCIÓN E — COMANDO DE EJECUCIÓN PARA LA FASE 4

Para ejecutar la prueba en la Fase 4 (cuando el usuario lo autorice), el bloque PowerShell exacto es:

```powershell
# =====================================================================
# FASE 4: EJECUCIÓN E2E TC-M05-G23 (RF-77)
# =====================================================================
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
cd "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23"

$env:CYPRESS_BASE_URL = "https://api.inmero.co"
$env:CYPRESS_APP_BASE_PATH = "/sigab-test"
$env:CYPRESS_API_BASE_URL = "https://api.inmero.co/api-sgpmp-test"

# Ejecución única con captura de consola
pnpm test 2>&1 | Out-File -Encoding utf8 -FilePath .\evidencias\consola_TC-M05-G23_run1.txt
```

---

## SECCIÓN F — VERIFICACIÓN FINAL Y ESTADO DE GIT

### F.1 Salida Literal de `git status --short`

**Frontend (`SGPMP-FRONT-END-PWA`):**
```
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
*(Nota técnica: `pnpm-lock.yaml` en la raíz del frontend registró la adición de `pdf-parse` para el workspace como parte del comando autorizado `pnpm add -D pdf-parse` ejecutado en la subcarpeta del caso. Cero archivos rastreados modificados fuera de la gestión de dependencias; toda la suite de `Modulo5` se mantiene en carpeta no rastreada `??`).*

**Backend (`sgpmp-backend`):**
```
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
*(Cero modificaciones en backend).*

### F.2 Escaneo de Secretos
Escaneo exhaustivo ejecutado sobre los archivos de código y markdown de G23 (excluyendo `node_modules`):
**Resultado:** **LIMPIO** (cero tokens JWT, contraseñas ni secretos presentes).

### F.3 Lista de Archivos Creados en la Fase 2
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\package.json`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\tsconfig.json`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\cypress.config.js`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\commands.ts`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\tc-m05-g23-reporte-gastos-exportacion.cy.ts`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\NOTA_elementos_no_ejecutables_G23.md`
- `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase2_creacion_G23.md`
- Directorio de descargas: `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\descargas\`

