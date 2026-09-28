# TC-M09-G03 - Edición de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.83 |
| Fecha ejecución | 2026-09-12T14:59:46.295Z |
| Registro editado | ID #42 — de `Equino` a `Equino Editado` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a /configuracion | Sesión autenticada como admin.dev@gmail.com y catálogo cargado por GET /configuracion/especies. | **OK** |
| CP-3: Diligenciamiento de Edición UI | Ingresar nombre "Equino Editado" y descripción "Especie editada en prueba de reevaluación QA" | Campos de nombre y descripción actualizados con datos de prueba válidos. | **OK** |
| CP-2: Localización de registro "Equino" | Ubicar en la tabla la especie activa "Equino" y capturar su ID | Registro activo localizado exitosamente en UI. Especie ID #42 ("Equino"). | **OK** |
| CP-4: Contrato API PATCH de Edición | Respuesta HTTP 200/201 con objeto actualizado (nombre="Equino Editado") | Respuesta no conforme. HTTP 412. Body: {"error_code":"CONFLICTO_CONCURRENCIA","message":"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo.","fields":[],"timestamp":"2026-09-12T14:59:46.322217+00:00"} | **FALLA** |
| CP-6: Restauración Teardown (Reversión a "Equino") | Registro de especie restaurado exitosamente a "Equino" con su descripción original | Fallo en restauración. HTTP 412. Body: {"error_code":"CONFLICTO_CONCURRENCIA","message":"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo.","fields":[],"timestamp":"2026-09-12T14:59:47.322271+00:00"} | **FALLA** |

## Veredicto: CON FALLAS

## Registro técnico de red

- Detalle de la petición HTTP real de edición: PATCH /configuracion/especies/42 -> HTTP 412. Body: {"error_code":"CONFLICTO_CONCURRENCIA","message":"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo.","fields":[],"timestamp":"2026-09-12T14:59:46.322217+00:00"}
- Detalle de la restauración (Teardown): PATCH /configuracion/especies/42 -> HTTP 412. Body: {"error_code":"CONFLICTO_CONCURRENCIA","message":"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo.","fields":[],"timestamp":"2026-09-12T14:59:47.322271+00:00"}

## Evidencias visuales

- [01_formulario_edicion_especie_ui.png](screenshots/01_formulario_edicion_especie_ui.png): Formulario de edición diligenciado con los nuevos datos.
- [02_confirmacion_edicion_ui.png](screenshots/02_confirmacion_edicion_ui.png): Registro actualizado visible en el catálogo UI.
