# TC-M09-G116 - Aplicacion exitosa de una plantilla a un destino valido (camino feliz) (RF-32 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-32 |
| Agrupa | TC-M09-224 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.77 |
| Fecha ejecucion | 2026-09-05T08:00:21.057Z |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| TC-M09-224: abrir el asistente de aplicacion de plantilla | Debe abrirse el asistente (AplicarPlantillaWizard) para la plantilla elegida | Se abrio el asistente para "Config Bovino 1788592941328" | **OK** |
| TC-M09-224: elegir una especie destino valida y distinta de la especie origen | La especie origen de la plantilla es "ID 4"; se debe poder elegir otra especie activa como destino | Se eligio "Cachama Blanca" como especie destino | **OK** |
| TC-M09-224: previsualizar los parametros antes de aplicar | Debe mostrarse una previsualizacion indicando que se aplicara "Config Bovino 1788592941328" sobre "Cachama Blanca", con aviso de que la accion es irreversible | Se mostro la previsualizacion con el aviso de accion irreversible y la especie destino elegida | **OK** |
| TC-M09-224: registrar la aplicacion de la plantilla sobre el destino | La API debe responder 200 al aplicar "Config Bovino 1788592941328" sobre "Cachama Blanca", registrando la configuracion actualizada | HTTP 500, cuerpo: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-05T08:00:19.899550+00:00"} | **FALLA** |
| TC-M09-224: el asistente informa el error y permite salir de el | Ante un error, el asistente debe mostrar el mensaje de error y ofrecer alguna forma de cerrarlo o volver atras | El asistente muestra el mensaje de error, pero se queda en la pantalla "Aplicando..." sin boton de cerrar ni de volver: el unico paso con footer vacio y sin boton "X" de cierre es justamente este (step===2 en AplicarPlantillaWizard.tsx), dejando al usuario sin forma de salir del dialogo salvo recargando la pagina. | **FALLA** |

## Veredicto: CON FALLAS

## Evidencias visuales

- [01_previsualizacion.png](screenshots/01_previsualizacion.png): paso de previsualizacion del asistente, antes de confirmar la aplicacion.
- [02_resultado.png](screenshots/02_resultado.png): estado final del asistente tras intentar aplicar la plantilla (exito o error, segun corresponda).
