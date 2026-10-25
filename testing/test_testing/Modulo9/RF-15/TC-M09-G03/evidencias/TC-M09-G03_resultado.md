# TC-M09-G03 - Edición de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://api.inmero.co |
| Backend | https://api.inmero.co/back-sigab-test |
| Navegador | electron 118.0.5993.159 |
| Fecha ejecución | 2026-10-09T15:14:24.232Z |
| Registro editado | ID #42 — de `Equino` a `Equino Editado` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a /configuracion | Sesión autenticada como administador.dev@gmail.com y catálogo cargado por GET /configuracion/especies. | **OK** |
| CP-3: Diligenciamiento de Edición UI | Ingresar nombre "Equino Editado" y descripción "Especie editada en prueba de reevaluación QA" | Campos de nombre y descripción actualizados con datos de prueba válidos. | **OK** |
| CP-2: Localización de registro "Equino" | Ubicar en la tabla la especie activa "Equino" y capturar su ID | Registro activo localizado exitosamente en UI. Especie ID #42 ("Equino"). | **OK** |
| CP-4: Contrato API PATCH de Edición | Respuesta HTTP 200/201 con objeto actualizado (nombre="Equino Editado") | HTTP 200 OK - ID: 42, Nombre: "Equino Editado", Descripcion: "Especie editada en prueba de reevaluación QA" | **OK** |
| CP-5: Verificación de fecha_actualizacion | La propiedad fecha_actualizacion debe actualizarse a un timestamp posterior/distinto | Fecha de actualización modificada correctamente: de "2026-10-09T14:51:37.816187Z" a "2026-10-09T15:14:26.582206Z". | **OK** |
| CP-6: Restauración Teardown (Reversión a "Equino") | Registro de especie restaurado exitosamente a "Equino" con su descripción original | Restauración exitosa (HTTP 200). Registro #42 restaurado a "Equino". | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Registro técnico de red

- Detalle de la petición HTTP real de edición: PATCH /configuracion/especies/42 -> HTTP 200. Body: {"id_especie":42,"nombre":"Equino Editado","descripcion":"Especie editada en prueba de reevaluación QA","densidad_maxima_por_especie":null,"tipo_modelo":null,"es_activo":true,"fecha_creacion":"2026-09-12T14:21:32.432281Z","fecha_actualizacion":"2026-10-09T15:14:26.582206Z"}
- Detalle de la restauración (Teardown): PATCH /configuracion/especies/42 -> HTTP 200. Body: {"id_especie":42,"nombre":"Equino","descripcion":"prueba","densidad_maxima_por_especie":null,"tipo_modelo":null,"es_activo":true,"fecha_creacion":"2026-09-12T14:21:32.432281Z","fecha_actualizacion":"2026-10-09T15:14:28.069680Z"}

## Evidencias visuales

- [01_formulario_edicion_especie_ui.png](screenshots/01_formulario_edicion_especie_ui.png): Formulario de edición diligenciado con los nuevos datos.
- [02_confirmacion_edicion_ui.png](screenshots/02_confirmacion_edicion_ui.png): Registro actualizado visible en el catálogo UI.
