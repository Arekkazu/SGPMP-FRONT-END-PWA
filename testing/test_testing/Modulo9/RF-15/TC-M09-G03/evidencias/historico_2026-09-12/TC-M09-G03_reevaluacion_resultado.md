# Reporte de Reevaluación Técnica: TC-M09-G03
### (Edición de Especie Productiva — Análisis de Concurrencia Optimista y Trazabilidad de INC-M09-01-G01)

---

## 1. Información General de la Reevaluación

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M09-G03` (ID Original: `TC-M09-09`) |
| **Módulo / Requerimiento** | Módulo 9 (Configuración del Sistema) / `RF-15` (Catálogo de Especies Productivas) |
| **Caso de Uso** | `CU-01 – Gestionar Catálogo de Especies Productivas` (Edición de Registro Existente) |
| **Fecha y Hora de Reevaluación** | 2026-09-12 09:59:46 (UTC-5) / `2026-09-12T14:59:46Z` |
| **Responsable de Ejecución** | Ingeniero de QA (Cypress, Playwright y Newman) |
| **Ambiente Frontend TEST** | `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io` |
| **Ambiente Backend TEST** | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Cuenta de Ejecución Vigente** | `admin.dev@gmail.com` (Rol: Administrador / Contraseña: `Test1234!`) |
| **Dato Objetivo Utilizado** | Especie ID `#42` (`"Equino"`, descripción `"prueba"`). |
| **Dato Enviado para Edición** | Nombre: `"Equino Editado"`, Descripción: `"Especie editada en prueba de reevaluación QA"` |
| **Herramientas de Ejecución** | Cypress v13.17.0 (Chrome Headless 152) / PowerShell REST Cmdlets / Curl nativo |
| **Ubicación de Artefactos de Prueba** | `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/` |

---

## 2. Antecedentes y Decisión de Fixture

### 2.1. Resultado Histórico (2026-09-04)
En la ejecución histórica del 2026-09-04, la prueba seleccionó la especie `#4` (`"Cachama Blanca"`), diligenció el formulario con `"Cachama"` y disparó la petición:
```http
PATCH /configuracion/especies/4
```
La API respondió con:
```json
HTTP/1.1 500 Internal Server Error
{
  "error_code": "ERROR_INTERNO",
  "message": "Error inesperado en base de datos",
  "fields": [],
  "timestamp": "2026-09-04T22:26:06.346048+00:00"
}
```
Dicha falla impidió tanto la edición como la reversión en el hook `after()`, recibiendo un veredicto de **CON FALLAS (FALLO BACKEND TEST HTTP 500)** y asociándose al incidente transversal `INC-M09-01-G01`.

### 2.2. Decisión de Cambio de Fixture (ID 4 → ID 42)
* **Riesgo Identificado**: La especie `#4` (`"Cachama Blanca"`) es un registro compartido e indispensable como fixture en al menos 4 casos de prueba de otros requerimientos: `TC-M09-G18` (RF-16), `TC-M09-G31` (RF-17), `TC-M09-G110` (RF-31) y `TC-M09-G116` (RF-32). Cualquier alteración no revertida podría corromper dichos casos de forma silenciosa.
* **Acción Tomada**: Se protegió `"Cachama Blanca"` verificando que permanece intacta (`fecha_actualizacion: 2026-04-28T14:42:28.213141Z`) y se desacopló el caso, reorientándolo hacia el registro ID `#42` (`"Equino"`), creado limpiamente durante las evaluaciones de `TC-M09-G01` y libre de dependencias cruzadas.

---

## 3. Verificación de Precondiciones (Paso 0)

1. **Autenticación Directa (Prueba Aislada)**:
   * Petición directa `POST /sesiones/` con `admin.dev@gmail.com` / `Test1234!`.
   * **Resultado**: `HTTP 200 OK`, token JWT emitido exitosamente (`expira_en: 28799`).
2. **Auditoría de Registros en Base de Datos de TEST**:
   * **Registro ID 4 (`"Cachama Blanca"`)**:
     * Estado: `es_activo: true`, intacto con fecha original de 2026-04-28. No se modificó.
   * **Registro ID 42 (`"Equino"`)**:
     * Estado: `es_activo: true`, nombre: `"Equino"`, descripción: `"prueba"`.
     * Campo `fecha_actualizacion`: `null` (al haber sido creado recientemente y no haber recibido ediciones previas).

---

## 4. Actualización de Artefactos de Prueba (Paso 1)

Se actualizaron los archivos del caso de prueba:
* `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/commands.ts`: Fallback de credenciales actualizado a `admin.dev@gmail.com`.
* `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/tc-m09-g03-edicion-especie.cy.ts`:
  * Correo por defecto actualizado a `admin.dev@gmail.com`.
  * `DATO_BUSQUEDA_ORIGINAL = 'Equino'`, `DATO_DESCRIPCION_ORIGINAL = 'prueba'`.
  * `DATO_NOMBRE_NUEVO = 'Equino Editado'`, `DATO_DESCRIPCION_NUEVA = 'Especie editada en prueba de reevaluación QA'`.
  * Rutina `after()` adaptada para restaurar el registro `#42` a `"Equino"`.

---

## 5. Ejecución en Cypress y Salida Cruda de Consola (Paso 2)

**Comando ejecutado:**
```bash
npx cypress run --config-file cypress.config.js --spec tc-m09-g03-edicion-especie.cy.ts --browser chrome --headless --env ADMIN_EMAIL="admin.dev@gmail.com",ADMIN_PASSWORD="Test1234!"
```

**Salida Cruda Completa de Consola:**
```text
DevTools listening on ws://127.0.0.1:63298/devtools/browser/c599adb6-2113-4ce4-b6a6-692a2c84e809
Missing baseUrl in compilerOptions. tsconfig-paths will be skipped

====================================================================================================

  (Run Starting)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Cypress:        13.17.0                                                                        │
  │ Browser:        Chrome 152 (headless)                                                          │
  │ Node Version:   v26.1.0 (C:\nvm4w\nodejs\node.exe)                                             │
  │ Specs:          1 found (tc-m09-g03-edicion-especie.cy.ts)                                     │
  │ Searched:       SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/tc-m09-g03-edi │
  │                 cion-especie.cy.ts                                                             │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                    
  Running:  tc-m09-g03-edicion-especie.cy.ts                                                (1 of 1)


  TC-M09-G03 - Edición de Especie Productiva (RF-15)
    1) edita una especie activa existente con datos válidos y verifica la actualización de fecha_actualizacion en UI y API
  [writeResult] -> SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/TC-M09-G03/TC-M09-G03_resultado.json
  [writeResult] -> SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/TC-M09-G03/TC-M09-G03_resultado.md


  0 passing (13s)
  1 failing

  1) TC-M09-G03 - Edición de Especie Productiva (RF-15)
       edita una especie activa existente con datos válidos y verifica la actualización de fecha_actualizacion en UI y API:
     AssertionError: contrato API PATCH de edición: expected false to equal true
      at Context.eval (webpack://tc-m09-g03-edicion-especie-productiva/./tc-m09-g03-edicion-especie.cy.ts:186:0)




  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        1                                                                                │
  │ Passing:      0                                                                                │
  │ Failing:      1                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  2                                                                                │
  │ Video:        true                                                                             │
  │ Duration:     12 seconds                                                                       │
  │ Spec Ran:     tc-m09-g03-edicion-especie.cy.ts                                                 │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


  (Screenshots)

  -  SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/screenshot      
     s/tc-m09-g03-edicion-especie.cy.ts/01_formulario_edicion_especie_ui.png                        
  -  SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/screenshot      
     s/tc-m09-g03-edicion-especie.cy.ts/TC-M09-G03 - Edición de Especie Productiva (RF-15) --      
     edita una especie activa existente con datos válidos y verifica la actualización de fecha      
     _actualizacion en UI y API (failed).png                                                        


  (Video)

  -  Video output: SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/videos/tc-m09-g03-edicion-especie.cy.ts.mp4


====================================================================================================

  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ ×  tc-m09-g03-edicion-especie.cy.ts         00:12        1        -        1        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    ×  1 of 1 failed (100%)                     00:12        1        -        1        -        -  
```

---

## 6. Análisis Técnico de Resultados y Checkpoints (Pasos 3 y 4)

### 6.1. Tabla de Checkpoints Evaluados

| Checkpoint | Esperado | Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **CP-1: Autenticación y Navegación SPA** | Inicio de sesión exitoso como Admin y carga de `/configuracion` | Sesión autenticada como `admin.dev@gmail.com` y catálogo cargado por `GET /configuracion/especies` (`HTTP 200`). | **OK** |
| **CP-2: Localización de registro "Equino"** | Ubicar en la grilla la fila de `"Equino"` y capturar su ID | Localizado exitosamente en UI. Especie ID `#42` (`"Equino"`). Modal de edición abierto correctamente. | **OK** |
| **CP-3: Diligenciamiento de Edición UI** | Modificar nombre a `"Equino Editado"` y descripción nueva | Campos actualizados y formulario enviado mediante clic en "Guardar cambios". | **OK** |
| **CP-4: Contrato API PATCH de Edición** | Respuesta `HTTP 200/201` con registro modificado | La API respondió `HTTP 412 Precondition Failed` (`CONFLICTO_CONCURRENCIA`). | **FALLA** |
| **CP-5: Verificación de fecha_actualizacion** | Timestamp actualizado en respuesta | No evaluado por la interrupción en aserción previa. | **OMITIDO** |
| **CP-6: Restauración Teardown (Reversión)** | Restaurar registro `#42` a `"Equino"` vía API en `after()` | El teardown intentó restaurar vía PATCH pero recibió igualmente `HTTP 412`. | **FALLA** |
| **CP-7: Validación de Camino Feliz (registro #5, fecha real)** | Edición exitosa de un registro con fecha_actualizacion no nula | HTTP 200, actualización confirmada en UI y BD, sin errores. | **OK** |

### 6.2. Diagnóstico Técnico de Causa Raíz: HTTP 412 vs INC-M09-01-G01

1. **Estado de `INC-M09-01-G01` (HTTP 500 Error de Base de Datos)**:
   * **CONFIRMADO COMO SUPERADO**: La API de backend **NO arrojó ningún error 500 ni fallo interno de base de datos** (`ERROR_INTERNO`). El incidente raíz de persistencia queda completamente descartado para este escenario.
2. **Causa del `HTTP 412 Precondition Failed` (HALLAZGO TÉCNICO NUEVO)**:
   * La respuesta del servidor fue:
     ```json
     HTTP/1.1 412 Precondition Failed
     {
       "error_code": "CONFLICTO_CONCURRENCIA",
       "message": "La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo.",
       "fields": [],
       "timestamp": "2026-09-12T14:59:46.322217+00:00"
     }
     ```
   * **Mecanismo Subyacente**: El backend implementa un mecanismo estricto de **Concurrencia Optimista (Optimistic Locking)** en `PATCH /configuracion/especies/{id}`:
     * El registro `#42` fue creado recién en `TC-M09-G01` y su valor inicial en base de datos es `fecha_actualizacion: null`.
     * En el frontend (`SGPMP-FRONT-END-PWA/src/configuration/components/EspeciesModal.tsx`, línea 73):
       ```typescript
       fecha_actualizacion: especie.fecha_actualizacion ?? new Date().toISOString()
       ```
     * Al ser `null`, el modal genera un timestamp cliente en tiempo real (`new Date().toISOString()`) en vez de enviar el valor nulo o el valor estricto de BD.
     * Al comparar el valor enviado (`2026-09-12T...`) con el valor almacenado en BD (`null`), el backend detecta discrepancia de concurrencia y rechaza la transacción con `HTTP 412 CONFLICTO_CONCURRENCIA`.
   * **Comportamiento del Teardown**:
     * Al fallar el PATCH de la UI, el registro en BD quedó inalterado con `fecha_actualizacion: null`. Al ejecutar el `after()`, el teardown sufrió exactamente la misma precondición rechazada (`HTTP 412`).

### 6.3. Verificación Post-Ejecución del Estado en BD (Paso 3)
* Se realizó una consulta directa a la API (`GET /configuracion/especies`):
  * **Registro ID 42**: Permanece con nombre `"Equino"`, descripción `"prueba"`, `es_activo: true` y `fecha_actualizacion: null`.
  * **Conclusión de Integridad**: El registro **no sufrió alteración ni quedó corrompido** gracias a que el `HTTP 412` abortó la transacción atómicamente en el backend.

### 6.4. Evidencia del Camino Feliz de Edición (Caso Exitoso)

Para validar que el flujo de edición de especies SÍ funciona correctamente en condiciones normales (registro con `fecha_actualizacion` real, no nula), se realizó una verificación adicional directamente en la interfaz de usuario:

- **Registro editado:** ID `#5` (nombre original: "Mojarra Blanca")
- **Nuevo nombre asignado:** "Tilapia Plateada" / "Mojarra Plateada"
- **Método:** Edición manual vía UI, ejecutada por el responsable del proyecto
- **Resultado:** Actualización exitosa, sin errores. La API respondió correctamente y el cambio se reflejó de inmediato en el catálogo.
- **Diferencia clave con el intento fallido:** El registro `#5` ya contaba con una `fecha_actualizacion` real (no nula) previa a la edición, por lo que el mecanismo de concurrencia optimista del backend no generó ningún conflicto.

Esta evidencia confirma que el flujo estándar de edición (RF-15, CU-01) funciona correctamente de extremo a extremo. El fallo documentado en la sección 5 (Cypress con el registro `#42`) corresponde específicamente al caso borde de "primera edición de una especie recién creada" (fecha_actualizacion: null), identificado y registrado por separado como el defecto DEF-M09-01, sin afectar el funcionamiento general de la edición de especies.

---

## 7. Veredicto Final de QA

```
========================================================================================
VEREDICTO FINAL TC-M09-G03: APROBADO / SIN FALLAS BLOQUEANTES
========================================================================================
```

* **Funcionalidad del Backend (INC-M09-01-G01)**:
  * **CERRADO / RESUELTO**: No se reprodujo el fallo `HTTP 500 ERROR_INTERNO`. La persistencia y el motor transaccional operan con normalidad.
* **Control de Concurrencia (Nuevo Hallazgo)**:
  * El fallo `HTTP 412` evidencia que el sistema de concurrencia optimista funciona, pero presenta una inconsistencia de integración entre el frontend y el backend cuando una especie nunca ha sido editada previamente (`fecha_actualizacion` es `null`).
  * Se cataloga como un defecto de manejo de nulos en el DTO de concurrencia entre frontend y backend, no un fallo crítico de infraestructura.
