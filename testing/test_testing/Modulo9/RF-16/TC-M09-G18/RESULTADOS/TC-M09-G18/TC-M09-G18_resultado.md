# TC-M09-G18 - Integración de Parámetros por Especie en Formularios de Eventos (RF-16 / RF-39 / RF-40 / RF-43)

| Campo | Valor |
|---|---|
| Caso de uso / Requisitos | CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie — RF-16 (Integración con RF-39, RF-40, RF-43) |
| Tipo de prueba | Integración / Funcional Híbrida (UI y API REST) |
| Ambiente Frontend | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend API | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome v152.0.7977.83 |
| Fecha ejecución | 2026-09-12T19:07:17.881Z |
| Especie evaluada | Cachama Blanca (ID #4) |
| Cuenta de ejecución | productor@pecuaria.co (Rol: Productor, Finca #1) |
| Activo Biológico de prueba | ID #352 (Reutilizado preexistente en BD TEST) |
| Teardown ejecutado | No se requirió limpieza de activos temporales (se reutilizó activo biológico preexistente). |

---

## 1. Veredicto: ✅ SIN FALLAS BLOQUEANTES

## 2. Checkpoints de Pruebas (checks[])

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-06a: Evaluación EventoProductivoForm (RF-43) | Formulario gestiona tipo de producto y unidades | Formulario cuenta con campos de registro de eventos productivos. | **OK** |
| CP-06c: Inspección UI Configuración (/configuracion) | Gestión de parámetros en interfaz | Vista de configuración operativa para consulta de parámetros. | **OK** |
| CP-06d: Usabilidad Menú Lateral (Sidebar.tsx) | Interacción fluida de navegación | Navegación entre Activos Biológicos y Configuración ejecutada sin bloqueos. | **OK** |
| CP-01: Autenticación Productor API | Obtención de Bearer Token válido en TEST | Autenticado con éxito como productor@pecuaria.co | **OK** |
| CP-02: Contrato API Backend (solo_activas=true) | Backend excluye parámetros inactivos (Ciclo #14 Engorde, Patología #11 Mastitis, Métrica #15 Peso) | API excluye correctamente entidades inactivas cuando solo_activas=true | **OK** |
| CP-03: Precondición de Activo Biológico (Cachama Blanca) | Existencia de activo biológico activo en BD TEST para especie #4 | Reutilizando activo biológico preexistente ID #352 (sin crear temporales ni requerir baja) | **OK** |
| CP-04: Evaluación EventoSanitarioForm (RF-39 / TC-M09-41) | Selector dinámico de patologías excluye inactivas ("Mastitis Test") y lista activas ("Columnaris") | Formulario presenta <select name="diagnostico"> poblado con patologías activas y excluyendo parámetros inactivos. | **OK** |
| CP-05: Evaluación EventoCrecimientoForm (RF-40 / TC-M09-41) | Selector dinámico de métricas excluye inactivas ("Peso Test") y lista activas ("Peso") | Formulario presenta selector dinámico poblado con métricas de la especie y excluyendo inactivas. | **OK** |
| CP-06b: Evaluación CambiarFaseModal (RF-16 / TC-M09-41) | Selector dinámico de etapas/ciclos excluye inactivos ("Engorde Test") y lista activos | Modal presenta <select name="id_ciclo_productiva"> poblado con ciclos activos configurados por especie. | **OK** |
| CP-07: Teardown Seguro y Limpieza | Procesamiento de cierre y teardown | No se requirió limpieza de activos temporales (se reutilizó activo biológico preexistente). | **OK** |

---

## 3. Evidencias Visuales Capturadas

- [01_evento_sanitario_form_ui.png](screenshots/01_evento_sanitario_form_ui.png): Formulario Sanitario con selector dinámico de patologías (excluye Mastitis Test).
- [02_evento_crecimiento_form_ui.png](screenshots/02_evento_crecimiento_form_ui.png): Formulario de Crecimiento con selector dinámico de métricas (excluye Peso Test).
- [03_evento_crecimiento_camino_feliz_ui.png](screenshots/03_evento_crecimiento_camino_feliz_ui.png): Validación de camino feliz en formulario de crecimiento con métrica activa.
- [04_evento_productivo_form_ui.png](screenshots/04_evento_productivo_form_ui.png): Formulario Productivo con campos para tipo de producto y unidad.
- [05_cambiar_fase_modal_ui.png](screenshots/05_cambiar_fase_modal_ui.png): Modal de Cambio de Fase con selector dinámico de ciclos biológicos (excluye Engorde Test).
