# TC-M09-G11 - Configurar Parámetros Productivos y Sanitarios por Especie (RF-16 - Modulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie - RF-16 |
| Tipo / Equipo | Funcional Híbrida (UI y API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-04T23:32:33.508Z |
| Especie evaluada | Cachama Blanca (ID #4) |
| Registros creados | Ciclo #14, Patología #11, Métrica #15 |
| Teardown ejecutado | Desactivación lógica completada: Ciclo #14 (HTTP 200), Patología #11 (HTTP 200), Métrica #15 (HTTP 200). |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Autenticación y Navegación a Detalle de Especie | Acceso a /configuracion -> Por especie -> Detalle de "Cachama Blanca" | Sesión autenticada como Admin y vista de detalle de "Cachama Blanca" (#4) cargada. | **OK** |
| CP-2: Registro en UI de Ciclo Biológico | Diligenciar ciclo "Engorde Test", duración 120 días y guardar | Formulario de ciclo biológico diligenciado correctamente con datos válidos. | **OK** |
| CP-4: Registro en UI de Patología | Diligenciar patología "Mastitis Test" con descripción genérica válida | Formulario de patología diligenciado correctamente con datos de prueba sanitarios. | **OK** |
| CP-6: Registro en UI de Métrica Productiva | Diligenciar métrica "Peso Test", tipo "PESO", unidad "kg", aplica "INDIVIDUAL" | Formulario de métrica de producción diligenciado respetando coherencia de tipo y unidad. | **OK** |
| CP-3: Contrato y Persistencia API de Ciclo Biológico | Respuesta HTTP 200/201 con id_especie: 4, duracion_dias: 120 | Ciclo registrado exitosamente en backend (ID #14, Especie #4, Duración 120 días). | **OK** |
| CP-5: Contrato y Persistencia API de Patología | Respuesta HTTP 200/201 con id_especie: 4 y descripción preservada | Patología registrada exitosamente en backend (ID #11, Especie #4). | **OK** |
| CP-7: Contrato y Persistencia API de Métrica Productiva | Respuesta HTTP 200/201 con id_especie: 4, tipo_medicion: PESO, unidad_medida: kg | Métrica registrada exitosamente en backend (ID #15, Especie #4, Coherencia unidad 'kg' validada). | **OK** |
| CP-8: Restauración y Limpieza Teardown | Desactivar lógicamente los registros creados en el ambiente TEST | Desactivación lógica completada: Ciclo #14 (HTTP 200), Patología #11 (HTTP 200), Métrica #15 (HTTP 200). | **OK** |

## Veredicto: SIN FALLAS BLOQUEANTES

> [!NOTE]
> **Resumen de Cumplimiento RF-16:**  
> Se evaluó el registro completo de las 3 entidades asociadas a la especie **Cachama Blanca** (#4): Ciclos Biológicos (Etapas), Patologías y Métricas Productivas. Se constató en API la vinculación directa con `id_especie: 4` y la regla de coherencia de unidad de medida. La prueba incluyó verificaciones de idempotencia pre-ejecución y rutina de desactivación lógica en el hook `after()`.

## Evidencias visuales

- [01_registro_ciclo_biologico_ui.png](screenshots/01_registro_ciclo_biologico_ui.png): Formulario y tabla de registro de Ciclo Biológico ("Engorde Test").
- [02_registro_patologia_ui.png](screenshots/02_registro_patologia_ui.png): Formulario y tabla de registro de Patología ("Mastitis Test").
- [03_registro_metrica_productiva_ui.png](screenshots/03_registro_metrica_productiva_ui.png): Formulario y tabla de registro de Métrica Productiva ("Peso Test").
