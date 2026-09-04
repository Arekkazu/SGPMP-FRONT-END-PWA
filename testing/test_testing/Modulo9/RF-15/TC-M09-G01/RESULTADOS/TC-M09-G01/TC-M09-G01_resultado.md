# TC-M09-G01 - Registro de Especie Productiva (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catalogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecucion | 2026-09-04T20:57:23.719Z |
| Dato de prueba | Nombre: `Bovino` (limite 3-50), Descripcion: `Especie bovina productiva` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: diligenciamiento de la especie en UI | Ingresar nombre "Bovino" y descripcion "Especie bovina productiva" | Formulario diligenciado con los datos definidos por el caso. | **OK** |
| Precondicion: disponibilidad del dato de prueba | No debe existir una especie llamada "Bovino" antes de crearla | "Bovino" no existe en el catalogo TEST. | **OK** |
| Checkpoint 2: contrato de creacion en API REST | HTTP 201/200 con id_especie, nombre, descripcion, es_activo=true y fecha_creacion | Respuesta no conforme. HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T20:57:23.512972+00:00"} | **FALLA** |

## Veredicto: CON FALLAS

## Registro tecnico de red

- Detalle de la peticion HTTP real: POST /configuracion/especies -> HTTP 500. Body: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-04T20:57:23.512972+00:00"}

## Evidencias visuales

- [01_formulario_especie_ui.png](screenshots/01_formulario_especie_ui.png): formulario diligenciado antes del envio.
- [02_confirmacion_registro_ui.png](screenshots/02_confirmacion_registro_ui.png): registro visible en la tabla despues de la respuesta API.
