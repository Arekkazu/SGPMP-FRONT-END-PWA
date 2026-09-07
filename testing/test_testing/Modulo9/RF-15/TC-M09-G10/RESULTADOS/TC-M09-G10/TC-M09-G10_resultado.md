# TC-M09-G10 - Búsqueda por Nombre y Paginación del Catálogo de Especies (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Usabilidad / Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-04T23:13:57.798Z |
| Especies cargadas en API | Total: 7 registros |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a /configuracion | Sesión autenticada como admin@pecuaria.co y vista /configuracion cargada. | **OK** |
| CP-2: Carga del Catálogo de Especies | Renderizado completo de la tabla de especies en el DOM | Tabla cargada exitosamente. Se visualizaron las filas correspondientes a 7 especies registadas en el catálogo. | **OK** |
| CP-3: Evaluación de Búsqueda por Nombre | Localización de input de búsqueda o filtro por nombre de especie | Funcionalidad no implementada: No se encontró campo de búsqueda por nombre en la interfaz del catálogo de especies. | **OBSERVACION** |
| CP-4: Evaluación de Paginación de Catálogo | Localización de controles de paginación o selector de tamaño de página | Funcionalidad no implementada: La lista de especies se renderiza de forma plana completa (7 registros) sin controles de paginación. | **OBSERVACION** |

## Veredicto: ⚠️ CON FALLAS (FUNCIONALIDAD NO IMPLEMENTADA: BUSCADOR Y PAGINACIÓN AUSENTES)

> [!IMPORTANT]
> **Evaluación de Impacto y Diferenciación de Severidad (RF-15):**  
> 1. **Buscador por Nombre (Alto Impacto / Gap Funcional):** La ausencia de un campo de búsqueda en la interfaz del catálogo impide filtrar por texto (ej. `"Cachama"`), representando un incumplimiento directo frente a lo especificado en el requerimiento **RF-15**.  
> 2. **Paginación del Catálogo (Bajo Impacto Práctico Actual):** Dado que el volumen actual en el ambiente TEST es de **7 especies**, la ausencia de controles de paginación no genera un bloqueo operativo inmediato en este momento, aunque debe implementarse para garantizar la escalabilidad cuando el volumen de datos crezca.

## Evidencias visuales

- [01_evaluacion_buscador_y_paginacion_ui.png](screenshots/01_evaluacion_buscador_y_paginacion_ui.png): Vista completa del catálogo de especies evaluando la presencia de controles de búsqueda y paginación.
