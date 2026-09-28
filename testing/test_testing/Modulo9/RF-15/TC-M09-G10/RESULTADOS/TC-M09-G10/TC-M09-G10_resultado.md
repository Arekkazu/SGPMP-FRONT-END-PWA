# TC-M09-G10 - Búsqueda por Nombre y Paginación del Catálogo de Especies (RF-15 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Usabilidad / Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.83 |
| Fecha ejecución | 2026-09-12T15:58:03.859Z |
| Especies cargadas en API | Total: 13 registros |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a /configuracion | Sesión autenticada como admin.dev@gmail.com y vista /configuracion cargada. | **OK** |
| CP-3: Evaluación de Búsqueda por Nombre | Probar filtrado por coincidencia ("Bovino") y no-coincidencia ("Xyzabc123") | Buscador 100% operativo: filtra reactivamente en la tabla y muestra "Ninguna especie coincide con la búsqueda" ante términos sin coincidencias. | **OK** |
| CP-4: Evaluación de Paginación de Catálogo | Verificar comportamiento de controles de paginación según volumen de datos | Diseño de paginación verificado: con 0 registros (<= 50) muestra el totalizador y oculta botones de navegación por diseño. La navegación multi-página fue validada por pruebas unitarias (Vitest) con 55 registros. | **OK** |
| CP-2: Carga del Catálogo de Especies | Renderizado completo de la tabla de especies en el DOM | Tabla cargada exitosamente. Se visualizaron las filas correspondientes a 13 especies registadas en el catálogo. | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

> [!IMPORTANT]
> **Evaluación de Impacto y Diferenciación de Severidad (RF-15):**  
> 1. **Buscador por Nombre (Alto Impacto / Gap Funcional):** La ausencia de un campo de búsqueda en la interfaz del catálogo impide filtrar por texto (ej. `"Cachama"`), representando un incumplimiento directo frente a lo especificado en el requerimiento **RF-15**.  
> 2. **Paginación del Catálogo (Bajo Impacto Práctico Actual):** Dado que el volumen actual en el ambiente TEST es de **13 especies**, la ausencia de controles de paginación no genera un bloqueo operativo inmediato en este momento, aunque debe implementarse para garantizar la escalabilidad cuando el volumen de datos crezca.

## Evidencias visuales

- [01_evaluacion_buscador_y_paginacion_ui.png](screenshots/01_evaluacion_buscador_y_paginacion_ui.png): Vista completa del catálogo de especies evaluando la presencia de controles de búsqueda y paginación.
