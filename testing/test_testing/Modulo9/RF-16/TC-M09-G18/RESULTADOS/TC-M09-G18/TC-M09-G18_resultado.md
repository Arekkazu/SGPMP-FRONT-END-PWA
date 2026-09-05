# TC-M09-G18 - Integración de Parámetros por Especie en Formularios de Eventos (RF-16 / RF-39 / RF-40 / RF-43)

| Campo | Valor |
|---|---|
| Caso de uso / Requisitos | CU-02 - Configurar Parámetros Productivos y Sanitarios por Especie — RF-16 (Integración con RF-39, RF-40, RF-43) |
| Tipo de prueba | Integración / Funcional Híbrida (UI y API REST) |
| Ambiente Frontend | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend API | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome v152.0.7977.76 |
| Fecha ejecución | 2026-09-05T01:07:20.204Z |
| Especie evaluada | Cachama Blanca (ID #4) |
| Cuenta de ejecución | productor@pecuaria.co (Rol: Productor, Finca #1) |
| Activo Biológico de prueba | ID #74 (Creado temporalmente para el test) |
| Teardown ejecutado | Respuesta HTTP 500 al intentar desactivar activo #74: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-05T01:07:19.794228+00:00"} |

---

## 1. Veredicto Multidimensión

| Dimensión Evaluada | Estado / Dictamen | Descripción Resumida |
|---|---|---|
| **Contrato API Backend (solo_activas=true)** | 🟢 **CUMPLIDO** | La API REST excluye correctamente los parámetros inactivos (Ciclo #14, Patología #11, Métrica #15) cuando solo_activas=true. |
| **Gap de Integración UI Multirrequisito** | 🔴 **CON FALLAS - IMPACTO ALTO** | Ninguno de los formularios de eventos (RF-39, RF-40, RF-43) ni el modal de cambio de fase (RF-16) consume dinámicamente los catálogos de especie configurados por el usuario. |
| **Usabilidad y Flujos Abiertos (UI)** | 🟡 **OBSERVACIONES ABIERTAS** | Registro de texto libre en eventos productivos (RF-43), ausencia de botón de reactivación en /configuracion y la falta de feedback visual en ítems de menú con permisos en carga. |

---

## 2. Checkpoints de Pruebas (checks[])

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-06c: Inspección UI Configuración (/configuracion) | Gestión de parámetros inactivos en la interfaz | OBSERVACIÓN USABILIDAD: La interfaz de configuración muestra badges de estado "Inactivo" para parámetros desactivados, pero no ofrece botón de reactivación en la UI | **OBSERVACION** |
| CP-06d: Usabilidad Menú Lateral (Sidebar.tsx) | Feedback visual durante la carga de permisos | OBSERVACIÓN USABILIDAD: Cuando un ítem del sidebar está bloqueado por permisos aún en carga, el clic del usuario se ignora silenciosamente sin ningún indicador visual (spinner, estado disabled, tooltip) | **OBSERVACION** |
| CP-01: Autenticación Productor API | Obtención de Bearer Token válido en TEST | Autenticado con éxito como productor@pecuaria.co | **OK** |
| CP-02: Contrato API Backend (solo_activas=true) | Backend excluye parámetros inactivos (Ciclo #14 Engorde, Patología #11 Mastitis, Métrica #15 Peso) | API excluye correctamente entidades inactivas cuando solo_activas=true | **OK** |
| CP-03: Precondición de Activo Biológico (Cachama Blanca) | Creación exitosa de activo biológico temporal de prueba | Activo poblacional temporal creado con ID #74 | **OK** |
| CP-04: Evaluación EventoSanitarioForm (RF-39) | Formulario consume catálogo dinámico de patologías por especie (RF-16) | ALTO IMPACTO: El formulario utiliza un textarea libre ("diagnostico") y no consume el catálogo dinámico de patologías de la especie | **FALLA** |
| CP-05: Evaluación EventoCrecimientoForm (RF-40) | Formulario consume catálogo dinámico de métricas por especie (RF-16) | ALTO IMPACTO: El formulario utiliza un selector estático hardcodeado (PESO, TALLA, BIOMASA) y no lista las métricas configuradas por especie | **FALLA** |
| CP-06a: Evaluación EventoProductivoForm (RF-43) | Formulario gestiona tipo de producto y unidades | OBSERVACIÓN ABIERTA: El formulario utiliza entradas de texto libre ("tipo_producto" y "unidad_medida"). Se requiere definir si debe consumir un catálogo dinámico cerrado o mantener entrada abierta | **OBSERVACION** |
| CP-06b: Evaluación CambiarFaseModal (RF-16 / Etapas) | Modal desglosa selector dinámico de ciclos biológicos de la especie | ALTO IMPACTO: Exige digitación manual del ID numérico del ciclo ("id_ciclo_productiva") mediante <input type="number"> en lugar de presentar un selector dinámico con los ciclos biológicos de la especie | **FALLA** |
| CP-07: Teardown Seguro y Limpieza | Desactivación lógica (baja) de activo temporal | Respuesta HTTP 500 al intentar desactivar activo #74: {"error_code":"ERROR_INTERNO","message":"Error inesperado en base de datos","fields":[],"timestamp":"2026-09-05T01:07:19.794228+00:00"} | **OBSERVACION** |

---

## 3. Informes de Incidencia Registrados

> [!WARNING]
> **INC-M09-01: Defecto de Integración UI Multirrequisito (RF-16, RF-39, RF-40, RF-43):**  
> Dado que la sección de postcondiciones del **RF-16** establece que los catálogos de ciclos, patologías y métricas por especie deben estar disponibles en **RF-39 (Sanitarios)**, **RF-40 (Crecimiento)** y **RF-43 (Productivos)**, la sustitución de estos catálogos en la UI por textareas libres o selectores estáticos ocasiona un incumplimiento cruzado de los 4 requerimientos.

> [!CAUTION]
> **INC-M09-02: Fallo en Endpoint de Baja Lógica de Activos Biológicos (POST /activos-biologicos/{id}/eventos/baja):**  
> Se identificó un error interno de base de datos (HTTP 500 - ERROR_INTERNO) al ejecutar solicitudes de baja lógica sobre el activo temporal #72. Comparte el síntoma de respuesta con el incidente INC-M09-01 de especies, pero pertenece a un módulo independiente. Los endpoints de inactivación de parámetros en /configuracion/ (usados en TC-M09-G11) funcionan correctamente.

---

## 4. Desglose de Severidad por Componente Inspeccionado

| Componente / Vista UI | Requisito Relacionado | Severidad / Impacto | Diagnóstico y Comportamiento Detectado |
|---|---|---|---|
| **EventoSanitarioForm.tsx** | RF-39 · Eventos Sanitarios | 🔴 **ALTO IMPACTO** | Sustituye el catálogo dinámico de patologías por un campo de texto libre (textarea diagnostico). No permite seleccionar patologías activas previamente configuradas (ej. Ich, Columnaris) ni excluye inactivas. |
| **EventoCrecimientoForm.tsx** | RF-40 · Eventos de Crecimiento | 🔴 **ALTO IMPACTO** | Reemplaza las métricas configuradas por especie con un selector estático hardcodeado (PESO, TALLA, BIOMASA), invalidando el propósito de la personalización por especie. |
| **CambiarFaseModal (FasesSection.tsx)** | RF-16 / Etapas y Ciclos | 🔴 **ALTO IMPACTO** | Exige la digitación manual del ID numérico del ciclo (input type="number" id_ciclo_productiva) en lugar de desplegar un selector con los ciclos biológicos de la especie. |
| **EventoProductivoForm.tsx** | RF-43 · Eventos Productivos | 🟡 **OBSERVACIÓN ABIERTA** | Implementa entradas de texto libre (tipo_producto, unidad_medida). Requiere definir si debe consumir un catálogo dinámico cerrado o mantener entrada abierta. |
| **Vista Configuración (/configuracion)** | RF-16 · Administración | 🟡 **OBSERVACIÓN USABILIDAD** | La interfaz muestra badges de estado "Inactivo" para ciclos, patologías y métricas, pero no ofrece botón ni acción para reactivar parámetros desactivados. |
| **Barra Lateral (Sidebar.tsx)** | Usabilidad / UX | 🟡 **OBSERVACIÓN USABILIDAD** | Cuando un ítem del menú lateral está bloqueado por permisos en estado de carga asíncrona, el clic del usuario se ignora silenciosamente sin mostrar spinner, tooltip ni estado disabled. |

---

## 5. Evidencias Visuales Capturadas

- [01_evento_sanitario_form_ui.png](screenshots/01_evento_sanitario_form_ui.png): Formulario Sanitario con área de texto libre diagnostico.
- [02_evento_crecimiento_form_ui.png](screenshots/02_evento_crecimiento_form_ui.png): Formulario de Crecimiento con selector estático hardcodeado (PESO, TALLA, BIOMASA).
- [03_evento_productivo_form_ui.png](screenshots/03_evento_productivo_form_ui.png): Formulario Productivo con campos de texto libre para tipo de producto y unidad.
- [04_cambiar_fase_modal_ui.png](screenshots/04_cambiar_fase_modal_ui.png): Modal de Cambio de Fase exigiendo digitación manual de ID numérico del ciclo.
- [05_configuracion_ausencia_reactivar_ui.png](screenshots/05_configuracion_ausencia_reactivar_ui.png): Vista de Configuración evidenciando parámetros inactivos sin botón de reactivación.
