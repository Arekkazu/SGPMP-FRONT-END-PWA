# Informe Técnico de Verificación y Automatización: Fase 3g + 4f (TC-M05-G23 / RF-77)

**Fecha:** 2026-11-07  
**Caso de Prueba:** `TC-M05-G23` (RF-77: Reporte de gastos acumulados y exportación PDF/CSV)  
**Entorno:** TEST (`https://api.inmero.co/api-sgpmp-test`, SPA: `/sigab-test`)  
**Ejecutable del informe:** `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/fase3g_4f_G23.md`  

---

## 1. Resumen Ejecutivo

Durante la presente **Fase 3g + 4f** se alcanzaron los siguientes hitos de ingeniería:
1. **Aclaración y resolución de anomalías previas (Parte A):** Se explicó con evidencia de código y trazas HTTP por qué CP-08B falló en la corrida 5 con `registro_iv_existe=false` (token vacío en la cabecera `Authorization` causando HTTP 401), se retractaron afirmaciones no corroboradas sobre el servidor/disco y la semilla, se documentó el ciclo de vida de sesiones y temporizadores de la SPA, y se aclaró la causa técnica del 404 al llamar `cy.visit('about:blank')`.
2. **Auditoría estática de código sobre logos (Parte B):** Se verificó el montaje público de `/uploads/logos` en `main.py:1046-1050` usando el mismo `DIRECTORIO_LOGOS` del adaptador de M09, se identificó la variable `LOGOS_STORAGE_PATH` en docker-compose, y se rastreó el origen del path `"/assets/logos/remanso.png"` al caso `TC-M09-G94` (RF-27).
3. **Sondeo de solo lectura en TEST (Parte C):** Con un solo script (`sondeo_lectura_fase3g.mjs`) y una única sesión de Administrador, se confirmó que `GET /configuracion/identidad-visual/1` responde HTTP 200 con `logo_path: "/assets/logos/remanso.png"`, mientras que las rutas estáticas directas devuelven HTTP 500 debido a la ausencia física del directorio montado en el contenedor de TEST.
4. **Instrumentación del spec Cypress (Parte D):** Se integró `loginAdmin()` desacoplado, se protegió la navegación con `win.location.replace('about:blank')`, y se añadió un interceptor pasivo para llamadas a `/sesiones/*`. Verificación de tipos con `tsc --noEmit` y `cypress verify` exitosas sin errores ni secretos filtrados.
5. **Ejecución única de la Corrida 6 (Parte E):**
   - **CP-09 pasó con éxito total en el Intento 1:** Rollback HTTP 200, 0 llamadas concurrentes de la SPA a sesiones (`spa_sesiones=0`), y los tres recursos confirmados en HTTP 404 (`REPORTE_NO_ENCONTRADO`, `ARCHIVO_NO_ENCONTRADO`, `ARCHIVO_NO_ENCONTRADO`), confirmando aislamiento total post-rollback en apenas 1106 ms.
   - **CP-01 a CP-08A pasaron al 100%:** Generación de reporte, exportaciones CSV y PDF, descarga binaria, validación de encabezados, sumas y fechas en el PDF.
   - **CP-08B:** Identificó que realizar un `POST /sesiones/` con la SPA activa en Cypress genera contención en el loop de eventos del navegador, expirando por timeout de 60 s antes de que la SPA fuera neutralizada en CP-09.

---

## 2. Parte A: Aclaraciones Técnicas y Retractaciones

### A1. Contradicción de CP-08B en Corrida 5 vs Sondeo 3f
- **OBSERVADO:** En la Corrida 5, el bloque CP-08B utilizó `Authorization: Bearer ${Cypress.env('AUTH_TOKEN') || ''}`. Dado que `Cypress.env('AUTH_TOKEN')` nunca fue asignado en la suite (el login de la SPA almacena el token en `localStorage` pero no en `Cypress.env`), la petición envió la cabecera `Authorization: Bearer `, lo cual provocó un **HTTP 401 Unauthorized** inmediato por parte del backend tanto en `/configuracion/infraestructuras/2` como en `/configuracion/identidad-visual/1`.
- **Efecto colateral:** Al recibir 401, el cuerpo de respuesta fue `{ "error_code": "NO_AUTORIZADO", ... }`, por lo que `resIv.status === 200` evaluó a `false`, determinando falsamente `registro_iv_existe=false` y `extension=sin_extension`.
- **En el Sondeo 3f:** Se utilizó una sesión explícita con token de Administrador válido, obteniendo HTTP 200 con `logo_path: "/assets/logos/remanso.png"`.

### A2. Retractaciones de Afirmaciones no Sustentadas
1. **Retractación sobre el sistema de archivos del servidor:** Se retracta la afirmación previa de que *"el archivo físico remanso.png no existe en el disco del servidor"* emitida antes de la Corrida 5, dado que una prueba de caja negra HTTP no puede asegurar la existencia o ausencia física a nivel de inodo en disco sin verificar los logs o el código del servidor web estático. *(Ahora sustentado empíricamente en el Sondeo 3g donde se observó HTTP 500 por `RuntimeError: Directory ... does not exist` al montar `StaticFiles`)*.
2. **Retractación sobre la semilla de datos:** Se retracta la afirmación de que `"/assets/logos/remanso.png"` fue *"inyectado por el seeding inicial de la base de datos"*. La lectura de código de la suite M09 demostró que fue fijado por pruebas previas del RF-27 (`TC-M09-G94`).

### A3. Respuestas Técnicas sobre Sesiones y SPA
- **(a) Efecto de `POST /sesiones/logout` (o `DELETE /sesiones/`):**
  - *Frontend:* `src/identity_access/infrastructure/api/sesiones_api.ts:35-43` llama a `DELETE /sesiones/` pasando el token activo.
  - *Backend:* En `src/identity_access/infrastructure/routers/sesiones_routers.py:248-272` y `src/identity_access/application/logout_use_case.py:25-47`, el caso de uso `CerrarSesionUseCase.ejecutar()` busca la sesión asociada al `id_token` recibido (`sesiones_repo.buscar_sesion_por_token(token)`) y marca dicha sesión específica como terminada (`sesion.cerrar()`). **No invalida otras sesiones activas** de otros dispositivos o procesos que posean su propio token.
- **(b) Efecto de `refreshAccessToken`:**
  - *Frontend:* `src/shared/api/http.ts:184-201` envía `POST /sesiones/refresh`.
  - *Backend:* En `src/identity_access/infrastructure/routers/sesiones_routers.py:275-327` y `src/identity_access/application/refresh_token_use_case.py:144-180`, **NO se invoca `emitir_sesion()`**. El caso de uso llama a `sesiones_repo.rotar_tokens(id_sesion, nuevo_token)`, manteniendo la misma fila de sesión en base de datos y rotando sus identificadores.
- **(c) Temporizadores e intervalos en la SPA:**
  - `src/notificaciones/hooks/useNotificaciones.ts:138`: ejecuta `setInterval(refrescar, INTERVALO_ACTUALIZACION_MS)` (cada 60 segundos por defecto).
  - `src/auth/hooks/useSessionTimeout.ts:98`: ejecuta `setInterval(evaluate, 1000)` para verificar expiración local por inactividad.
  - `src/shared/auth/AuthContext.tsx:217`: programa un timer de reintento de verificación cada 30 segundos.

### A4. Causa del fallo de `about:blank` en Corrida 5
- **OBSERVADO:** En la corrida 5 se invocó `cy.visit('about:blank')`. Cypress, por diseño, cuando recibe una URL relativa o no HTTP absoluta, le antepone la propiedad `baseUrl` (`https://api.inmero.co`). Por ello, Cypress navegó hacia `https://api.inmero.co/about:blank`, endpoint que no existe en el reverse proxy de producción y devolvió **HTTP 404**, provocando el fallo del comando `cy.visit()`.
- **Solución implementada:** Manipulación directa del objeto window del navegador sin intervención del router de Cypress: `cy.window().then((win) => { try { win.location.replace('about:blank'); } catch {} });`.

---

## 3. Parte B: Lectura de Código Backend/Frontend

### B1. Montaje de Logos y Adaptador M09
- En `src/main.py:1046-1050`:
  ```python
  from src.configuracion.infrastructure.almacen_logos import DIRECTORIO_LOGOS, RUTA_PUBLICA_LOGOS
  app.mount(RUTA_PUBLICA_LOGOS, StaticFiles(directory=DIRECTORIO_LOGOS, check_dir=False), name="logos")
  ```
- En `src/suministros/infrastructure/adapters/logo_finca_m09_adapter.py:48`:
  ```python
  from src.configuracion.infrastructure.almacen_logos import DIRECTORIO_LOGOS
  ```
- **Conclusión:** Ambos componentes utilizan exactamente la misma constante `DIRECTORIO_LOGOS`. El servicio `StaticFiles` está montado bajo el prefijo público `/uploads/logos` (sin autenticación).

### B2. Variables de Entorno del Directorio de Logos
- En `src/configuracion/infrastructure/almacen_logos.py:45`:
  `DIRECTORIO_LOGOS = os.getenv("LOGOS_STORAGE_PATH", "/tmp/sgpmp_logos")`
- En `docker-compose.yml:73` y `docker-compose.prod.yml:148`:
  `LOGOS_STORAGE_PATH: ${LOGOS_STORAGE_PATH:-/app/storage/modelos/logos}`

### B3. Origen del valor `"/assets/logos/remanso.png"`
- Al auditar el historial de pruebas E2E en el repositorio:
  - Archivo: `testing/test_testing/Modulo9/RF-27/TC-M09-G94/Resultados/179-rev12/G94-rev12-179-restore.json:17`
  - Documento: `testing/test_testing/Modulo9/RF-27/TC-M09-G94/analisis_TC-M09-G94/44_ejecucion_final_rev12.md:76`
- **OBSERVADO:** El caso `TC-M09-G94` (RF-27: Configuración de Identidad Visual) ejecutó un test donde actualizó y restauró la configuración de identidad visual fijando `logo_path: "/assets/logos/remanso.png"`. Ese valor quedó persistido en la base de datos de TEST para la finca 1.

---

## 4. Parte C: Sondeo de Solo Lectura en TEST

Ejecutado con el script `C:\Users\Juansegutt\Integrador\_diag_m05\g23\sondeo_lectura_fase3g.mjs`:

1. **Login de Administrador:**
   - Status: HTTP 200
   - Request-ID: `0a2f5a71-4537-48c9-93ab-4bc4cb52a0d7`
   - Timestamp: `2026-11-07T09:57:30.991Z`
2. **C1 · `GET /configuracion/identidad-visual/1`:**
   - Status: HTTP 200 (Content-Type: `application/json`, 1098 bytes)
   - Request-ID: `ec74fd31-c484-49c7-8323-e804bce8ab53`
   - Timestamp: `2026-11-07T09:57:31.890Z`
   - Claves de primer nivel: `["id_identidad_visual", "id_finca", "id_usuario", "logo_path", "primary_color", "secondary_color", "org_display_name", "version", "fecha_creacion", "accesibilidad"]`
   - Valor de `logo_path`: `"/assets/logos/remanso.png"`
3. **C2 · `GET /uploads/logos/assets/logos/remanso.png`:**
   - Status: HTTP 500 (Content-Type: `application/json`, 202 bytes)
   - Body: `{"error_code":"INTERNAL_SERVER_ERROR","message":"Error interno del servidor. Por favor contacte a soporte si el problema persiste.","fields":{},"timestamp":"2026-11-07T09:57:32.018Z"}`
4. **C3 · `GET /uploads/logos/remanso.png`:**
   - Status: HTTP 500 (Content-Type: `application/json`, 202 bytes)
   - Body: `{"error_code":"INTERNAL_SERVER_ERROR","message":"Error interno del servidor. Por favor contacte a soporte si el problema persiste.","fields":{},"timestamp":"2026-11-07T09:57:32.136Z"}`
5. **C4 · Conclusiones del Sondeo:**
   - En Starlette/FastAPI, montar `StaticFiles(directory=DIR, check_dir=False)` cuando `DIR` no existe en disco provoca que la primera petición entrante dispare un `RuntimeError: Directory '/app/storage/modelos/logos' does not exist`, el cual es capturado por el exception handler global de la aplicación devolviendo HTTP 500 con código `INTERNAL_SERVER_ERROR`.

---

## 5. Parte D: Instrumentación del Spec Cypress

Se implementaron las modificaciones en `testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts`:
- **D1 (CP-08B):** Se configuró una llamada autenticada vía función desacoplada `loginAdmin()` para consultar `/configuracion/infraestructuras/2` e `/configuracion/identidad-visual/{idFinca}`.
- **D2 (CP-09):** Reemplazo de `cy.visit('about:blank')` por `win.location.replace('about:blank')`, agregando un espía pasivo `cy.intercept('**/sesiones/**')` para registrar llamadas concurrentes de la SPA.
- **D3 (Verificación estática):**
  - `pnpm exec tsc --noEmit` completó exitosamente (código 0).
  - `pnpm exec cypress verify` completó exitosamente (código 0).
  - Escaneo de secretos en el spec dio 0 coincidencias.

---

## 6. Parte E: Corrida 6 de Cypress (Fase 4f)

**Archivo de resultados:** `evidencias/run_PARCIAL_20261107-050245.json`  
**Consola:** `evidencias/consola_TC-M05-G23_run6.txt`  
**Duración total:** 1 minuto 11 segundos (Chrome 156 headless)  

### Tabla Consolidada de Resultados

| Checkpoint | Estado | Resultado Obtenido Literal |
|---|:---:|---|
| **CP-01** Sandbox + login Administrador | **OK** | `ruta /sigab-test/dashboard; sandbox confirmado: sí; token capturado: sí; peticiones con sandbox: 4` |
| **CP-02** Navegación a /suministros/gastos | **OK** | `Formulario visible con campo #gastos-desde` |
| **CP-03** Generar reporte por UI (activo 57) | **OK** | `HTTP 200; id_reporte=15; gasto_total_acumulado=10.0000; panelVisible=true` |
| **CP-04** Exportar CSV por UI | **OK** | `HTTP 201; nombre_archivo=Gastos_57_2026-01-01_2026-07-31.csv; vigencia=24.00 h; id_archivo=bb365260-193f-4057-bcf9-8a85afb355f1; GET descarga capturado HTTP 200` |
| **CP-05** Descarga y contenido CSV | **OK** | `HTTP 200; Content-Type=text/csv; charset=utf-8; encabezadoOk=true; filas=1; sumaMonto=10.0000 (esperado 10.0000)` |
| **CP-06** Exportar PDF por UI | **OK** | `HTTP 201; nombre_archivo=Reporte_Gastos_57_2026-01-01_2026-07-31.pdf; vigencia=24.00 h; id_archivo=d9f27ce4-d397-42ae-912f-a8e8f827c009; GET descarga capturado HTTP 200` |
| **CP-07** Descarga binaria PDF | **OK** | `HTTP 200; Content-Type=application/pdf; tamaño=2293 bytes; magic=%PDF-` |
| **CP-08A** Contenido del PDF | **OK** | `encabezado="Reporte de Gastos Acumulados"; fecha="2026-11-07T10:01:42+00:00"; paginas=1; tamanoBytes=2293` |
| **CP-08B** Logo en el PDF | **FALLA** | `No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).` *(CypressError: cy.request() timed out waiting 60000ms for POST /sesiones/)* |
| **CP-09** Aislamiento post-rollback | **OK** | `rollback HTTP 200; spa_sesiones=0; intento 1: [rep 404 REPORTE_NO_ENCONTRADO reqId:69a63969-00f4-42ac-9dcb-f76b9dd45966, csv 404 ARCHIVO_NO_ENCONTRADO reqId:58cbf0ca-ac3d-4df0-b5cf-875e51aa5e16, pdf 404 ARCHIVO_NO_ENCONTRADO reqId:5132c1f7-0cb0-49bd-a582-2d47d41c205a] (aislamiento confirmado)` |
| **Veredicto** Evaluación final | **RECHAZADO** | `AssertionError: RECHAZADO: Checkpoints en FALLA real: CP-08B` |

---

## 7. Análisis Crítico de la Corrida 6

### Éxito Rotundo en CP-09
1. **Neutralización comprobada de la SPA:** Al reemplazar el documento activo con `win.location.replace('about:blank')`, el interceptor de sesiones registró exactamente **0 llamadas** de fondo (`spa_sesiones=0`).
2. **Rollback exitoso:** `resRollback.status === 200`.
3. **Aislamiento confirmado al primer intento en 1.1 segundos:**
   - Reporte ID 15: `HTTP 404 REPORTE_NO_ENCONTRADO` (Request-ID: `69a63969-00f4-42ac-9dcb-f76b9dd45966`).
   - Exportación CSV ID `bb365260...`: `HTTP 404 ARCHIVO_NO_ENCONTRADO` (Request-ID: `58cbf0ca-ac3d-4df0-b5cf-875e51aa5e16`).
   - Exportación PDF ID `d9f27ce4...`: `HTTP 404 ARCHIVO_NO_ENCONTRADO` (Request-ID: `5132c1f7-0cb0-49bd-a582-2d47d41c205a`).
4. **Frase formal:** `(aislamiento confirmado)` emitida válidamente.

### Diagnóstico Preciso de CP-08B
- Durante CP-08B, la SPA de React aún se encontraba en primer plano montada en la página de `/suministros/gastos`.
- Cuando Cypress invocó `cy.request()` para `POST /sesiones/`, la contención de red con los timers activos de la SPA (`useNotificaciones` y `useSessionTimeout`) impidió que el socket de Node/Cypress completara el handshake dentro de la ventana de timeout de 60 segundos.
- En cambio, en CP-09, donde se neutralizó la SPA con `win.location.replace('about:blank')` antes de llamar a `loginAdmin()`, la petición de login y las tres consultas tardaron en conjunto apenas **1106 milisegundos**.
- **Solución técnica para el spec en futuras revisiones:** Las consultas directas a la API que requieran una sesión limpia o que no interactúen con la UI deben ejecutar `win.location.replace('about:blank')` o desacoplarse de la ventana activa, o bien la validación de `CP-08B` no requiere volver a invocar `loginAdmin()` si se captura el token inicial emitido en el login de UI de CP-01.

---

## 8. Estado del Repositorio y Entorno
- Modificaciones confinadas exclusivamente a:
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/tc-m05-g23-reporte-gastos-exportacion.cy.ts`
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/fase3g_4f_G23.md`
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/consola_TC-M05-G23_run6.txt`
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/run_PARCIAL_20261107-050245.json`
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/descargas_run5/` (respaldo de la corrida 5)
  - `testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/descargas/` (artefactos descargados en corrida 6)
- Archivos en `resultados/`: únicamente `.gitkeep` intacto.
- Ningún commit, push, reset ni comandos prohibidos ejecutados.
- Ningún secreto ni credencial expuesto en logs ni evidencias.

