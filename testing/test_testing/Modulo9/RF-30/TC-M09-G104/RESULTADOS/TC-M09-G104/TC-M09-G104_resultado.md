# TC-M09-G104 - Consulta del listado de plantillas (RF-30 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-30 |
| Agrupa | TC-M09-198, TC-M09-199, TC-M09-200 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.77 |
| Fecha ejecucion | 2026-09-05T05:50:28.960Z |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| TC-M09-198: consultar el listado de plantillas disponibles | La API responde HTTP 200 con la lista de plantillas | HTTP 200, 76 plantilla(s) devuelta(s) | **OK** |
| TC-M09-198: cantidad de plantillas mostradas en pantalla | El listado debe mostrar 76 tarjeta(s), una por cada plantilla de la API | Se muestran 76 tarjeta(s) en pantalla | **OK** |
| TC-M09-199: campos visibles de la plantilla #1 ("Plantilla estándar camarón") | Debe mostrar nombre "Plantilla estándar camarón", especie "Camarón Blanco" y version "v1" | Se confirmaron los 3 campos visibles en la tarjeta correspondiente | **OK** |
| TC-M09-199: campos visibles de la plantilla #2 ("Plantilla estándar tilapia") | Debe mostrar nombre "Plantilla estándar tilapia", especie "Tilapia Roja" y version "v1" | Se confirmaron los 3 campos visibles en la tarjeta correspondiente | **OK** |
| TC-M09-199: campos visibles de la plantilla #3 ("Plantilla estándar trucha") | Debe mostrar nombre "Plantilla estándar trucha", especie "Trucha Arcoíris" y version "v1" | Se confirmaron los 3 campos visibles en la tarjeta correspondiente | **OK** |
| TC-M09-200: mensaje de catalogo vacio | Debe mostrarse un mensaje claro de catalogo vacio ("Sin plantillas creadas") | Se muestra el mensaje "Sin plantillas creadas" junto con el texto de ayuda para crear la primera plantilla | **OK** |
| TC-M09-200: comportamiento de la interfaz ante 0 registros | No debe presentarse ningun error tecnico en pantalla | No aparece ninguna alerta de error; la interfaz se comporta como un estado vacio normal | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Evidencias visuales

- [01_listado_con_datos.png](screenshots/01_listado_con_datos.png): listado de plantillas con registros existentes.
- [02_catalogo_vacio.png](screenshots/02_catalogo_vacio.png): listado simulando un catalogo sin plantillas (respuesta de API interceptada/forzada a vacio).
