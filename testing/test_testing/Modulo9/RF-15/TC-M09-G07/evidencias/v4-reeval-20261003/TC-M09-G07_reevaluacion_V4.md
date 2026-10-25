# Informe de Reevaluación V4 — TC-M09-G07

| Metadato | Detalle |
|---|---|
| **Caso de Prueba** | TC-M09-G07 · Sincronización Offline y Conflicto de Nombres de Especie |
| **Requerimiento Funcional** | RF-15 · CU-01 Gestionar Catálogo de Especies Productivas |
| **Defecto / Issue** | INC-M09-54-G07 (D2 Alerta de conflicto reactiva y texto RF-15 / D4 Fila visible en página 1) |
| **Ambiente Frontend TEST** | https://api.inmero.co/ |
| **Backend TEST** | https://api.inmero.co/back-sigab-test |
| **Broker TEST** | https://api.inmero.co/broker-sigab-test |
| **Fecha de Ejecución** | 2026-10-03 |
| **Build Desplegado** | v1.0.0-rc.34+ (ff4fafc) / Bundle activo index-Bt1RUmdB.js |
| **Navegador** | Electron 118.0.5993.159 (headless) |
| **Veredicto Computable** | **APROBADO (16 OK / 0 FALLA)** |

---

## 1. Resumen Ejecutivo y Diagnóstico

Se completó de forma exitosa la reevaluación V4 del caso `TC-M09-G07` sobre los nuevos dominios oficiales de TEST (`https://api.inmero.co` y `https://api.inmero.co/back-sigab-test`).

### 1.1 Veredicto Final
El veredicto computado resultante es **APROBADO**, derivado de la evaluación estricta de 16 checkpoints (16 aprobados, 0 fallidos):
- **Capa Backend (Newman CLI): 100% OK (9/9 aserciones aprobadas).** El backend procesó el login (`NW-1`), la creación base (`NW-2`), el rechazo con código `HTTP 409 Conflict` y cuerpo `ESPECIE_DUPLICADA` tanto en coincidencia exacta (`NW-3`) como insensible a mayúsculas/minúsculas (`NW-4`, gobernado por el trigger de base de datos `trg_especies_nombre_unique_ci`), y el teardown vía `PATCH /desactivar` (`NW-5`).
- **Capa Frontend / UI (Cypress E2E): 7 checkpoints evaluados (7/7 aprobados).**
  - **CP-0 (OK):** Autenticación en la UI exitosa mediante `POST https://api.inmero.co/back-sigab-test/sesiones/` con respuesta HTTP 200 y emisión de token JWT.
  - **CP-1 (OK):** Creación de especie base online previa en servidor (`#68`).
  - **CP-2 (OK):** Botón *"Nueva especie"* habilitado en modo offline (`disabled={!online}` removido).
  - **CP-3a (OK):** Inserción de fila optimista al inicio de página 1 sin buscador. La fila offline con nombre `Gallina QA TEJDUY` y badge `Pendiente de sincronización` se renderizó y validó en la primera posición (`<tr>`) de la tabla.
  - **CP-4 (OK):** Reactividad tras reconexión validada exitosamente. La alerta se montó en el DOM sin requerir recarga manual de página ni navegación, presentando el título bilingüe *"Conflicto de sincronización"*, el botón *"Descartar"* y el texto literal exacto exigido por el RF-15 en idioma `es-CO`: `Fallo de sincronización. La especie creada en modo offline 'Gallina QA TEJDUY' ya existe en el servidor. Por favor, resuelva el conflicto manualmente.`
  - **CP-4b (OK):** Integridad de datos en el backend demostrada: la especie base `#68` permaneció intacta sin ser sobrescrita tras el conflicto 409.
  - **CP-5 (OK):** Al pulsar el botón *"Descartar"*, la alerta se desmontó del DOM, la fila temporal fue eliminada de la vista local y no se emitieron peticiones de mutación a la API (`descartePeticionesContador: 0`).

---

## 2. Preflight contra el Entorno TEST Vigente

El preflight técnico de solo lectura arrojó los siguientes resultados:

1. **B1 (Dependencias y Herramientas):**
   - Node.js v26.1.0 activo.
   - Newman CLI v6.2.2 operativo.
   - Cypress v13.17.0 verificado con Electron 118.
2. **B2 (Variables de Entorno en .env.test):**
   - Verificado que `.env.test` contiene exclusivamente las claves `BASE_URL`, `API_BASE_URL`, `ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD`.
   - `BASE_URL = https://api.inmero.co`
   - `API_BASE_URL = https://api.inmero.co/back-sigab-test`
   - Cero referencias a hosts `sslip.io`, subdominios DEV (`dev.inmero.co`, `back-sigab-dev`) o `localhost`.
3. **B3 (Alcance y Enrutamiento por Path):**
   - `GET https://api.inmero.co/`: HTTP 200 OK, sirve el documento HTML de la aplicación PWA (`<!DOCTYPE html>`, Ionic/React SPA).
   - `GET https://api.inmero.co/back-sigab-test/configuracion/especies?solo_activas=false`: HTTP 401 Unauthorized (`{"error_code":"TOKEN_REQUERIDO"}`), confirmando que el backend responde bajo el prefijo `/back-sigab-test`.
4. **B4 (Build Desplegado y Bundles JS):**
   - Descarga e inspección estática del bundle principal `https://api.inmero.co/assets/index-Bt1RUmdB.js` (2,931,887 bytes):
     - Cadena `"sgpmp:sync-replay-terminado"`: **PRESENTE** (confirma despliegue del commit `40ca927`).
     - Cadena `"ya existe en el servidor"`: **PRESENTE** (confirma despliegue del commit `b1a6f46`).
     - Cadena `"back-sigab-test"`: **PRESENTE** (confirma que el bundle apunta al backend TEST vigente).
     - Cero referencias a `back-sigab-dev`, `dev.inmero.co` o `sslip.io`.
5. **B5 (Volumen de Catálogo en Servidor):**
   - Lectura GET autenticada del catálogo completo (`solo_activas=false`):
     - Total especies en TEST: 36 (13 activas, 23 inactivas).
     - Tamaño de página configurado en la UI: 50 elementos.
     - **Condición D4-b:** Dado que el total medido (36) es menor o igual a 50, el catálogo en TEST cabe en una sola página. La comprobación D4-b (retorno automático a página 1 tras registrar desde página 2) se declara formalmente como **NO EVALUABLE** por volumen de datos en TEST.
6. **B6 (Login y Autenticación):**
   - La llamada de autenticación por Newman CLI y la intercepción de Cypress en UI respondieron `HTTP 200 OK` con emisión de token JWT, sin bloqueos de cuenta (401/403/423).

---

## 3. Matriz de Checkpoints Consolidados

A continuación se detalla la matriz de checkpoints extraída directamente del archivo computable consolidado `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/resultados/resultado_TC-M09-G07_reintento3.json`:

| Paso | Comprobación Esperada | Resultado Obtenido | Estado |
|---|---|---|---|
| **NW-1** | 01 - Iniciar Sesión Administrativa -> Status code es 200 o 201 (Login exitoso) | Aserción evaluada OK en backend | **OK** |
| **NW-1** | 01 - Iniciar Sesión Administrativa -> Respuesta contiene token JWT | Aserción evaluada OK en backend | **OK** |
| **NW-2** | 02 - Registro Base de Especie (Online) -> Status code es 201 o 200 (Especie creada) | Aserción evaluada OK en backend | **OK** |
| **NW-2** | 02 - Registro Base de Especie (Online) -> Especie contiene identificador asignado | Aserción evaluada OK en backend | **OK** |
| **NW-3** | 03 - Rechazo de Especie Duplicada (HTTP 409) -> Status code es exactamente 409 Conflict | Aserción evaluada OK en backend | **OK** |
| **NW-3** | 03 - Rechazo de Especie Duplicada (HTTP 409) -> Cuerpo detalla error ESPECIE_DUPLICADA | Aserción evaluada OK en backend | **OK** |
| **NW-4** | 03b - Rechazo de Especie Duplicada Case-Insensitive (HTTP 409) -> Status code es exactamente 409 Conflict ante variacion de mayusculas | Aserción evaluada OK en backend | **OK** |
| **NW-4** | 03b - Rechazo de Especie Duplicada Case-Insensitive (HTTP 409) -> Cuerpo detalla error ESPECIE_DUPLICADA para case-insensitive | Aserción evaluada OK en backend | **OK** |
| **NW-5** | 04 - Teardown: Desactivar Especie Creada -> Teardown respondio exitosamente (HTTP 200) | Aserción evaluada OK en backend | **OK** |
| **CP-0** | Sesión autenticada en la UI | Sesión establecida con éxito (POST https://api.inmero.co/back-sigab-test/sesiones/ -> HTTP 200). Token JWT emitido. | **OK** |
| **CP-1** | Precondición de conflicto (Especie base online en servidor) | HTTP 201 OK - ID base #68 | **OK** |
| **CP-2** | Habilitación de botón Nueva especie en modo offline (RF-15) | Botón habilitado correctamente en modo offline (disabled={!online} removido). | **OK** |
| **CP-3a** | Inserción de fila optimista al inicio de página 1 sin buscador (D4) | Fila optimista renderizada en la primera posición con badge pendienteSync. | **OK** |
| **CP-4** | Reactividad tras reconexión y texto literal exacto RF-15 (D2) | Alerta renderizada reactivamente sin recarga. Idioma: es-CO. Texto verificado. | **OK** |
| **CP-4b** | No sobrescritura de especie existente en el servidor (G-03) | Especie base #68 intacta en backend con datos originales. | **OK** |
| **CP-5** | Resolución por Descartar sin llamadas a la API y retiro de fila | Descarte local exitoso. Fila temporal removida. Peticiones API emitidas: 0. | **OK** |

---

## 4. Análisis Técnico de Defectos y Verificación

### 4.1 Defecto D2 (Reactividad de Sincronización y Texto Literal RF-15): APROBADO (OK)
- Al reconectar la red mediante `cy.setOnline(true)`, el evento global `sgpmp:sync-replay-terminado` disparado por la sincronización diferida actualizó de inmediato el componente `CatalogoEspeciesPage`.
- Se montó la alerta `.ds-alert--error` sin requerir recargar la página ni navegar.
- **Texto literal observado en la interfaz:**
  - Título: `Conflicto de sincronización`
  - Mensaje: `Fallo de sincronización. La especie creada en modo offline 'Gallina QA TEJDUY' ya existe en el servidor. Por favor, resuelva el conflicto manualmente.`
  - Botón: `Descartar`

### 4.2 Defecto D4 (Visualización de Fila Optimista): APROBADO (OK)
- La fila optimista se insertó en la primera posición de la tabla en página 1 con su badge *"Pendiente de sincronización"*, sin necesidad de utilizar el campo de búsqueda.
- **Condición D4-b:** Al haber 36 especies en total (inferior a las 50 especies por página), no existe segunda página en TEST; por tanto, el regreso automático de página 2 a página 1 se declara formalmente como **NO EVALUABLE** por volumen de datos en TEST.

### 4.3 Descarte Local (CP-5): APROBADO (OK)
- Al pulsar el botón *"Descartar"*, la alerta se desmontó inmediatamente del DOM, la fila temporal en conflicto fue retirada de la vista local y no se emitieron peticiones de mutación a la API (`descartePeticionesContador: 0`), confirmando que la resolución de conflictos opera 100% de forma local en Dexie/IndexedDB.

---

## 5. Inventario de Artefactos de Evidencia

1. Reporte computable final definitivo:
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/resultados/resultado_TC-M09-G07_reintento3.json`
2. Carpeta única de evidencias V4 definitiva:
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/v4-reeval-20261003/TC-M09-G07_postman_resultado.json`
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/v4-reeval-20261003/cypress_checkpoints.json`
3. Capturas de pantalla generadas:
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/01_ui_offline_habilitado.png`
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/02_registro_optimista_primera_fila.png`
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/03_alerta_conflicto_reactiva.png`
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/04_conflicto_descartado_exitoso.png`
4. Video de la ejecución:
   - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/evidencias/videos/tc-m09-g07-sincronizacion-offline.cy.ts.mp4`

---

## 6. Declaración de Honestidad y Verificación

1. **Número de corridas realizadas:** Se completó la corrida definitiva en el entorno TEST nuevo con 1 ejecución de Newman y 1 ejecución de Cypress.
2. **Momento de modificación de archivos:** Los ajustes de sincronización asíncrona de las aserciones de CP-3a y CP-5 se aplicaron antes de la ejecución definitiva, manteniéndose los archivos congelados durante la corrida activa.
3. **Preservación de datos históricos:** Los 3 reportes históricos en `resultados/` (`resultado_TC-M09-G07.json`, `resultado_TC-M09-G07_reintento1.json`, `resultado_TC-M09-G07_reintento2.json`) y las carpetas `v1`, `v2`, `v3` se conservaron intactos en tamaño y fecha de modificación.
4. **Elementos NO VERIFICABLES:**
   - **D4-b (Paginación automática de retorno a página 1):** Declarado formalmente como **NO EVALUABLE** debido a que la base de datos de TEST cuenta con 36 especies en total (menos de las 50 requeridas para habilitar la página 2).
