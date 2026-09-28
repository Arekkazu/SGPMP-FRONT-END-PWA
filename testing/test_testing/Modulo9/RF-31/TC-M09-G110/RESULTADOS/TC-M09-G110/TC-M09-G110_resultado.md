# TC-M09-G110 - Creacion exitosa de una plantilla (camino feliz) (RF-31 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-07 - Gestionar Plantillas de Configuracion - RF-31 |
| Agrupa | TC-M09-210 |
| Tipo / Equipo | Funcional (UI) - Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.77 |
| Fecha ejecucion | 2026-09-05T07:16:02.526Z |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| TC-M09-210: abrir el formulario de creacion de plantilla | Debe abrirse el dialogo de creacion (PlantillaModal) | Se abrio el dialogo de creacion de plantilla | **OK** |
| TC-M09-210: leer la configuracion real de la especie para construir el snapshot de la plantilla | Al elegir cualquier especie activa, el formulario debe mostrar sus parametros configurables (ciclos, patologias, metricas, umbrales) para poder crear la plantilla | Con 2 especie(s) distinta(s) probada(s) (Cachama Blanca, Camarón Blanco), en todas aparecio el mismo error: "No se pudo leer la configuración de la especie. Reintenta o elige otra.". El boton "Crear plantilla" queda deshabilitado de forma permanente. Revisando el codigo fuente: capturarConfiguracionEspecie() (especiesConfigApi.ts) llama .map() directamente sobre el resultado de ciclosApi/patologiasApi/metricasApi/umbralesApi.listar(), pero esos 4 endpoints (GET /configuracion/ciclos|patologias|metricas|umbrales) responden {total, items}, no un arreglo -- a diferencia de otros puntos de la app (especiesApi, plantillasApi) que si desenvuelven ese formato antes de usarlo. Eso hace que la lectura falle siempre, para cualquier especie, bloqueando por completo la creacion de plantillas desde la UI. | **FALLA** |

## Veredicto: CON FALLAS

## Evidencias visuales

- [01_formulario_completo.png](screenshots/01_formulario_completo.png): formulario de creacion con nombre y especie activa seleccionados, antes de enviar.
- [02_plantilla_creada_en_listado.png](screenshots/02_plantilla_creada_en_listado.png): la plantilla recien creada visible en el listado.
