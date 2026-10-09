# TC-M09-G03 — Informe de Reevaluación QA

| Metadato | Detalle |
| :--- | :--- |
| **Identificador del Caso** | `TC-M09-G03` |
| **Requisito Funcional** | `RF-15` (Catálogo de especies productivas) — `CU-01` |
| **Ambiente Frontend** | `https://api.inmero.co` |
| **Ambiente Backend (API)** | `https://api.inmero.co/back-sigab-test` |
| **Fecha de Ejecución** | 2026-10-09T14:51:33.926Z |
| **Usuario Ejecutor** | `administador.dev@gmail.com` |
| **Navegador** | Electron 118 (Headless) |
| **Especie Objetivo Evaluada** | ID `#42` — `"Equino"` |
| **Veredicto Técnico** | **SIN FALLAS BLOQUEANTES (APROBADO — 6 OK / 0 FALLAS)** |

---

## 1. Resultado Consolidado

- **Total Checkpoints Evaluados**: 6
- **Checkpoints Cumplidos (OK)**: 6 (100%)
- **Checkpoints Fallidos (FALLA)**: 0
- **Tasa de Éxito**: 100%
- **Duración Total de Suite**: 13 segundos

---

## 2. Tabla de Checkpoints y Resultados

| ID | Herramienta | Paso / Esperado | Obtenido Literal | Estado |
| :---: | :---: | :--- | :--- | :---: |
| **CP-1** | Cypress | Inicio de sesión exitoso como Admin y navegación a `/configuracion` | `Sesión autenticada como administador.dev@gmail.com y catálogo cargado por GET /configuracion/especies.` | **OK** |
| **CP-2** | Cypress | Ubicar en la tabla la especie activa `"Equino"` y capturar su ID | `Registro activo localizado exitosamente en UI. Especie ID #42 ("Equino").` | **OK** |
| **CP-3** | Cypress | Ingresar nombre `"Equino Editado"` y descripción `"Especie editada en prueba de reevaluación QA"` | `Campos de nombre y descripción actualizados con datos de prueba válidos.` | **OK** |
| **CP-4** | Cypress | Respuesta HTTP 200/201 con objeto actualizado (nombre=`"Equino Editado"`) | `HTTP 200 OK - ID: 42, Nombre: "Equino Editado", Descripcion: "Especie editada en prueba de reevaluación QA"` | **OK** |
| **CP-5** | Cypress | La propiedad `fecha_actualizacion` debe actualizarse a un timestamp posterior/distinto | `Fecha de actualización modificada correctamente: de "2026-10-09T14:48:57.988832Z" a "2026-10-09T14:51:36.234173Z".` | **OK** |
| **CP-6** | Cypress | Registro de especie restaurado exitosamente a `"Equino"` con su descripción original | `Restauración exitosa (HTTP 200). Registro #42 restaurado a "Equino".` | **OK** |

---

## 3. Análisis de Hallazgos y Validación del Diagnóstico

Esta reevaluación valida empíricamente la resolución completa de los dos problemas documentados en el informe [DIAGNOSTICO_CONCURRENCIA_Y_ESTADO_UI_2026-10-04.md](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/evidencias/DIAGNOSTICO_CONCURRENCIA_Y_ESTADO_UI_2026-10-04.md):

1. **Resolución de Asimetría en Concurrencia Optimista (`DEF-M09-01`)**:
   - **Comportamiento previo**: Las especies nacidas con `fecha_actualizacion: null` eran bloqueadas con `HTTP 412 (CONFLICTO_CONCURRENCIA)` debido a que el cliente inventaba un timestamp local que no coincidía con el `NULL` del backend.
   - **Corrección verificada**: Con el commit `f46bafd` (#231), [EspeciesModal.tsx](SGPMP-FRONT-END-PWA/src/configuration/components/EspeciesModal.tsx) envía fielmente el valor recibido (`null` incluido). El backend procesa la solicitud retornando **HTTP 200 OK** y genera el primer timestamp real (`2026-10-09T14:51:36.234173Z`).
2. **Eliminación de la Fuga de Estado en UI (`INC-UI-STATE`)**:
   - **Comportamiento previo**: Al producirse un error al guardar, el modal retenía el `saveError` y lo mostraba erróneamente en cualquier otra especie seleccionada con posterioridad.
   - **Corrección verificada**: [ConfigurationPage.tsx](SGPMP-FRONT-END-PWA/src/configuration/pages/ConfigurationPage.tsx) invoca `limpiarSaveError()` al cerrar el modal, garantizando aislamiento estricto de estado.

---

## 4. Estado del Teardown y Restauración de Datos

- **Registro Objetivo**: ID `#42` (`Equino`).
- **Estado Previo**: `nombre: "Equino"`, `descripcion: "prueba"`.
- **Estado Durante Prueba**: `nombre: "Equino Editado"`, `descripcion: "Especie editada en prueba de reevaluación QA"`.
- **Restauración en `after()`**:
  - `PATCH /configuracion/especies/42` ejecutado con token de API administrativo.
  - Respuesta del servidor: **HTTP 200 OK**.
  - Registro devuelto a su nombre original `"Equino"` y descripción `"prueba"`.
- **Integridad de Fixtures Protegidas**: El registro ID `#4` (`Cachama Blanca`) permaneció completamente intacto durante todo el ciclo.

---

## 5. Registro Técnico de Red y Evidencias Visuales

- **Petición PATCH de Edición**:
  ```http
  PATCH /configuracion/especies/42 -> HTTP 200 OK
  {
    "id_especie": 42,
    "nombre": "Equino Editado",
    "descripcion": "Especie editada en prueba de reevaluación QA",
    "densidad_maxima_por_especie": null,
    "tipo_modelo": null,
    "es_activo": true,
    "fecha_creacion": "2026-09-12T14:21:32.432281Z",
    "fecha_actualizacion": "2026-10-09T14:51:36.234173Z"
  }
  ```
- **Petición PATCH de Restauración (Teardown)**:
  ```http
  PATCH /configuracion/especies/42 -> HTTP 200 OK
  {
    "id_especie": 42,
    "nombre": "Equino",
    "descripcion": "prueba",
    "densidad_maxima_por_especie": null,
    "tipo_modelo": null,
    "es_activo": true,
    "fecha_creacion": "2026-09-12T14:21:32.432281Z",
    "fecha_actualizacion": "2026-10-09T14:51:37.816187Z"
  }
  ```
- **Evidencias Visuales**:
  - `evidencias/screenshots/01_formulario_edicion_especie_ui.png`: Formulario modal diligenciado sin alertas falsas.
  - `evidencias/screenshots/02_confirmacion_edicion_ui.png`: Fila actualizada en la tabla de catálogo.

---

## 6. Sincronización con QA Dashboard (`scanner.py`)

Conforme a las normativas de la Sección 5.5 de `INFORME_PROYECTO_Y_PRUEBAS.md`:
- Reporte computable disponible en: `resultados/resultado_TC-M09-G03.json`.
- Reporte de reintento computable en: `resultados/resultado_TC-M09-G03_reintento1.json`.
- Formato de checkpoints: 100% clasificados bajo claves exactas `"OK"`.
