# TC-M09-G03 - Edición de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-04T22:26:07.338Z |
| Registro editado | ID #4 — de `Cachama Blanca` a `Cachama` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a /configuracion | Sesión autenticada como admin@pecuaria.co y catálogo cargado por GET /configuracion/especies. | **OK** |
| CP-3: Diligenciamiento de Edición UI | Ingresar nombre "Cachama" y descripción "Especie de uso pecuario general." | Campos de nombre y descripción actualizados con datos de prueba válidos. | **OK** |
| CP-2: Localización de registro "Cachama Blanca" | Ubicar en la tabla la especie activa "Cachama Blanca" y capturar su ID | Registro activo localizado exitosamente en UI. Especie ID #4 ("Cachama Blanca"). | **OK** |
| CP-4: Contrato API PATCH de Edición | Respuesta HTTP 200/201 con objeto actualizado (nombre="Cachama") | Respuesta no conforme. HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T22:26:06.346048+00:00"} | **FALLA** |
| CP-6: Restauración Teardown (Reversión a "Cachama Blanca") | Registro de especie restaurado exitosamente a "Cachama Blanca" con su descripción original | Fallo en restauración. HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T22:26:07.327808+00:00"} | **FALLA** |

## Veredicto: CON FALLAS

## Registro técnico de red

- Detalle de la petición HTTP real de edición: PATCH /configuracion/especies/4 -> HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T22:26:06.346048+00:00"}
- Detalle de la restauración (Teardown): PATCH /configuracion/especies/4 -> HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T22:26:07.327808+00:00"}

## Evidencias visuales

- [01_formulario_edicion_especie_ui.png](screenshots/01_formulario_edicion_especie_ui.png): Formulario de edición diligenciado con los nuevos datos.
- [02_confirmacion_edicion_ui.png](screenshots/02_confirmacion_edicion_ui.png): Registro actualizado visible en el catálogo UI.
