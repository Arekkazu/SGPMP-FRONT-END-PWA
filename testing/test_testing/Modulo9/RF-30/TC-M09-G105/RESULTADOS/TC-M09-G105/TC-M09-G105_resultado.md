# TC-M09-G105 - Acceso a los flujos de creacion y aplicacion de plantillas desde el listado (RF-30 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-30 |
| Agrupa | TC-M09-201, TC-M09-202 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.77 |
| Fecha ejecucion | 2026-09-05T06:40:09.344Z |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| TC-M09-201: abrir el flujo de creacion desde el boton "Nueva plantilla" | Debe abrirse el dialogo de creacion de plantilla (PlantillaModal) con su titulo correspondiente | Se abrio un dialogo (role="dialog", aria-modal="true") con el titulo "Nueva Plantilla de Configuración" | **OK** |
| TC-M09-201: conservar el contexto del modulo Configuracion al abrir el flujo | La ruta debe seguir siendo /configuracion (el flujo se abre como superposicion, no como navegacion) | La ruta se mantuvo en /configuracion mientras el dialogo de creacion estaba abierto | **OK** |
| TC-M09-202: abrir el flujo de aplicacion desde el boton "Aplicar plantilla" de una tarjeta | Debe abrirse el asistente de aplicacion (AplicarPlantillaWizard) para "Plantilla estándar camarón", iniciando en el paso "Seleccionar especie" | Se abrio un dialogo (role="dialog", aria-modal="true") titulado "Aplicar Plantilla" mostrando "Plantilla estándar camarón" y el paso "Seleccionar especie" activo | **OK** |
| TC-M09-202: conservar el contexto del modulo Configuracion al abrir el flujo | La ruta debe seguir siendo /configuracion (el asistente se abre como superposicion, no como navegacion) | La ruta se mantuvo en /configuracion mientras el asistente de aplicacion estaba abierto | **OK** |
| TC-M09-201/202: un usuario sin permisos sobre plantillas no ve la pestana "Plantillas" | La pestana "Plantillas" no debe aparecer en la barra de navegacion de Configuracion para un rol sin permisos sobre el recurso | La pestana "Plantillas" no esta presente en la barra de navegacion; el usuario no tiene forma de llegar a los flujos de creacion ni de aplicacion | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Evidencias visuales

- [01_modal_creacion_plantilla.png](screenshots/01_modal_creacion_plantilla.png): modal de creacion de plantilla abierto desde el listado.
- [02_wizard_aplicar_plantilla.png](screenshots/02_wizard_aplicar_plantilla.png): wizard de aplicacion de plantilla abierto desde una tarjeta del listado.
- [03_pestana_plantillas_no_visible.png](screenshots/03_pestana_plantillas_no_visible.png): usuario sin permisos, la pestana "Plantillas" no aparece en Configuracion.
