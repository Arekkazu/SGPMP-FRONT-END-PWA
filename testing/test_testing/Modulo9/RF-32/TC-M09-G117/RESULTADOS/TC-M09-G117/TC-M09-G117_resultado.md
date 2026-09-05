# TC-M09-G117 - Confirmacion previa al reemplazo de la configuracion existente (RF-32 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-32 |
| Agrupa | TC-M09-225, TC-M09-226 |
| Tipo / Equipo | Usabilidad / Funcional - Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.77 |
| Fecha ejecucion | 2026-09-05T08:31:03.100Z |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| TC-M09-225: mostrar dialogo de confirmacion antes de reemplazar | Antes de reemplazar la configuracion de "Camarón Blanco" (que ya tiene configuracion existente), el asistente debe mostrar un paso de previsualizacion con un aviso explicito de confirmacion | Se mostro el paso "Previsualizar" con el aviso "Esta acción es irreversible" y el detalle de que se reemplazara la especie destino elegida | **OK** |
| TC-M09-225: no reemplazar la configuracion sin confirmacion explicita | La configuracion de "Camarón Blanco" debe permanecer intacta mientras el usuario no confirme explicitamente (boton "Aplicar plantilla") | La configuracion de ciclos biologicos de la especie destino es identica antes y despues de llegar al paso de previsualizacion: no hubo ningun cambio sin confirmacion | **OK** |
| TC-M09-226: cancelar la aplicacion cuando el usuario rechaza el reemplazo | Al rechazar el reemplazo desde el paso de previsualizacion (cerrar en vez de confirmar), el asistente debe cerrarse sin aplicar ningun cambio | El asistente se cerro correctamente al rechazar; no quedo ningun dialogo abierto ni mensaje de error en pantalla | **OK** |
| TC-M09-226: la configuracion destino permanece sin cambios tras cancelar | La configuracion de "Camarón Blanco" no debe modificarse en absoluto al cancelar antes de confirmar | La configuracion de ciclos biologicos de la especie destino es identica antes y despues de cancelar | **OK** |
| TC-M09-226: no debe crearse un snapshot de aplicacion efectiva | El historial de aplicaciones de plantillas no debe registrar ninguna aplicacion nueva cuando el usuario cancela antes de confirmar | El historial de aplicaciones es identico antes y despues de cancelar: no se registro ninguna aplicacion nueva | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

## Evidencias visuales

- [01_confirmacion_previa.png](screenshots/01_confirmacion_previa.png): TC-M09-225 - paso de previsualizacion con el aviso de confirmacion, antes de decidir.
- [02_antes_de_cancelar.png](screenshots/02_antes_de_cancelar.png): TC-M09-226 - mismo paso de previsualizacion, justo antes de rechazar el reemplazo.
- [03_despues_de_cancelar.png](screenshots/03_despues_de_cancelar.png): TC-M09-226 - estado de la pantalla tras cancelar (el asistente se cierra sin aplicar nada).
