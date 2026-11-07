# Fase 1: Análisis Técnico de Proceso, Ambiente y Datos — TC-M05-G41 (RF-81)

---

## 1. Resumen Ejecutivo (≤ 10 líneas)

El caso agrupado TC-M05-G41 evalúa el historial de suministros por activo (RF-81, casos TC-M05-098, 099 y 104). La pantalla existe en `src/supplies/pages/HistorialView.tsx` bajo la ruta `/suministros/historial` (servida en TEST como `/sigab-test/suministros/historial`), requiriendo permiso de lectura sobre el recurso 52 (`historial_suministros`). El backend implementa `GET /suministros/historial` resolviendo el resumen sobre todos los registros y ordenando por `fecha_aplicacion DESC`. El enriquecimiento con M02 se resuelve internamente por SQL JOIN en PostgreSQL (no existe llamada externa ni timeout de 3 s en backend, y `datos_contexto_no_disponibles` está fijo en `False`), por lo que TC-M05-104 solo puede probarse en Cypress vía `cy.intercept`. En `.env.test` solo existen credenciales para Administrador y Veterinario; no existen credenciales para Gestor de Granja, Contador ni Revisor Fiscal. Por tanto, conforme a la Puerta de Decisión obligatoria, se detuvo la ejecución del Paso 5 (sondeo de datos en TEST) para evitar bloqueos y se solicita la parametrización de las cuentas de RF-81.

---

## 2. Frontend

### a) Ruta, Menú y Control de Acceso (Guardas / Permisos)
* **Ruta exacta:** `/suministros/historial` (con prefijo base en TEST: `/sigab-test/suministros/historial`). Definida en [SuministrosPage.tsx:66](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/SuministrosPage.tsx#L66) y registrada en el router global en [App.tsx:380](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/App.tsx#L380) con `IonReactRouter basename={import.meta.env.BASE_URL}` en [App.tsx:395](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/App.tsx#L395).
* **Entrada en el Menú:** Ítem en el `Sidebar` con clave `modulos.suministros` apuntando a `/suministros`, visible para roles con lectura en recurso 52 ([Sidebar.tsx:44-45](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/shared/design-system/Sidebar.tsx#L44-L45)). Subpestaña "Historial" en [SuministrosPage.tsx:30, 49, 58-64](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/SuministrosPage.tsx#L30) visible si `usePermission(RECURSO_HISTORIAL, ACCION_R)` es verdadero.
* **Roles autorizados:** Gestor de Granja, Contador y Revisor Fiscal (mapeados a recurso 52, acción 2 en `modulo1.permisos`).
* **Guardas de ruta:** Si el rol no tiene permiso, la vista retorna `<AccesoDenegado seccion={t('tabs.historial')} />` ([HistorialView.tsx:58](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L58)).

### b) Endpoint y Parámetros Enviados al Backend
* **Endpoint invocado:** `GET /suministros/historial` vía `historialApi.consultar(filtros)` ([historialApi.ts:18](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/api/historialApi.ts#L18)).
* **Query Params enviados en la llamada:**
  * `id_activo_biologico`: number (obligatorio en UI, obtenido de `SelectorActivo`).
  * `fecha_inicio_filtro`: string ISO `YYYY-MM-DD` (opcional).
  * `fecha_fin_filtro`: string ISO `YYYY-MM-DD` (opcional).
  * `tipo_suministro_filtro`: string (`'TODOS'`, `'ALIMENTO'`, `'MEDICAMENTO'`, `'SERVICIO_VETERINARIO'`, `'INSEMINACION'`).
  * `origen_precio_filtro`: string (`'TODOS'`, `'MANUAL'`, `'M40_AUTOMATICO'`).
  * `costo_min`: string/number (opcional).
  * `costo_max`: string/number (opcional).
  * `pagina`: number (inicia en 1).
  * `registros_por_pagina`: number (fijo en 50 por constante `POR_PAGINA = 50` en [HistorialView.tsx:29, 77](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L29)).
* **Construcción de la petición:** Se orquesta a través del hook `useHistorialSuministros()` ([useHistorialSuministros.ts:9](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useHistorialSuministros.ts#L9)) y el cliente singleton Axios `http.get('/suministros/historial', { params: filtros })`.

### c) Matriz de Requisitos RF-81 vs. Implementación en UI

| Requisito RF-81 | ¿La UI lo implementa? | Evidencia (Archivo:Línea) / Observación |
|---|:---:|---|
| **Orden `fecha_aplicacion DESC`** | Sí (Delegado al backend) | [HistorialView.tsx:201-214](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L201). La UI itera `pagina.items` en el orden devuelto por la API. No tiene botón para invertir orden. |
| **Paginación obligatoria (máx 200, def 50)** | Parcial | [HistorialView.tsx:217-220](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L217) y [Paginacion.tsx:1-31](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/Paginacion.tsx#L1). Paginador muestra Anterior/Siguiente y página actual. |
| **Selector de registros por página** | **NO** | [HistorialView.tsx:29](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L29). Está hardcodeado en `const POR_PAGINA = 50`. No hay selector en la interfaz. |
| **Filtro: Activo biológico** | Sí | [HistorialView.tsx:114](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L114) (`<SelectorActivo id="historial-activo" ...>`). Campo requerido. |
| **Filtro: Ciclo productivo** | **NO** | [HistorialView.tsx:113-128](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L113). En `types.ts:332` existe `id_ciclo_productivo?: number`, pero el formulario no incluye ningún campo ni dropdown para este filtro. |
| **Filtro: Rango `fecha_aplicacion`** | Sí | [HistorialView.tsx:115-116](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L115) (`id="historial-desde"`, `id="historial-hasta"`). Valida `desde > hasta` en cliente. |
| **Filtro: Tipo suministro** | Sí | [HistorialView.tsx:117-119](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L117) (`id="historial-tipo"`). Opciones: TODOS, ALIMENTO, MEDICAMENTO, SERVICIO_VETERINARIO, INSEMINACION. |
| **Filtro: Origen de precio** | Sí | [HistorialView.tsx:120-122](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L120) (`id="historial-origen"`). Opciones: TODOS, MANUAL, M40_AUTOMATICO. |
| **Filtro: Costo mín / Costo máx** | Sí | [HistorialView.tsx:123-125](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L123) (`id="historial-min"`, `id="historial-max"`). Valida `min > max` en cliente. |
| **Mensaje de lista vacía** | Sí | [HistorialView.tsx:183-184](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L183) (`EstadoVacio`: "Sin suministros con esos filtros" / "Amplía el rango de fechas o quita filtros"). |
| **Campo resumen: `total_registros_filtrados`** | Sí | [HistorialView.tsx:166](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L166) (`{t('comun.registros', { count: resumen.total_registros_filtrados })}`). |
| **Campo resumen: `monto_total_filtrado`** | Sí | [HistorialView.tsx:165](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L165) (`formatoMoneda(resumen.monto_total_filtrado)`). |
| **Campo resumen: `desglose_por_tipo_suministro`** | Sí | [HistorialView.tsx:168-175](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L168). Muestra monto y conteo por cada tipo. |
| **Campo resumen: `desglose_por_ciclo`** | **NO** | [HistorialView.tsx:161-181](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L161). El tipo `types.ts:364` lo contempla, pero la vista no renderiza el desglose por ciclo en el DOM. |
| **Campo resumen: `pagina_actual`** | Sí | [HistorialView.tsx:218](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L218) y [Paginacion.tsx:16](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/Paginacion.tsx#L16). |
| **Campo resumen: `total_paginas`** | Sí | [HistorialView.tsx:218](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L218) y [Paginacion.tsx:16](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/Paginacion.tsx#L16). |
| **Campo resumen: `datos_contexto_no_disponibles`** | Sí | [HistorialView.tsx:178](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L178). Renderiza texto de advertencia contextual. |
| **Campo resumen: `datos_actualizados_hasta`** | Sí | [HistorialView.tsx:177](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L177) (`Datos hasta {fecha}`). |
| **Aviso visual cuando `datos_contexto_no_disponibles=true`** | Sí | [HistorialView.tsx:178](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L178) (`· algunos datos de contexto (activo, ciclo) no están disponibles`). |
| **Exportación (PDF / Excel)** | Sí (Existe) | [HistorialView.tsx:108-109](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L108). Botones secundarios en el encabezado. |

### d) Selectores Estables para Cypress
* **data-testid:** **NO EXISTEN** en `HistorialView` ni en `src/supplies/`.
* **Selectores por ID (estables):**
  * Input Activo: `#historial-activo` (manejado por `SelectorActivo` / `Combobox`).
  * Input Fecha Desde: `#historial-desde`.
  * Input Fecha Hasta: `#historial-hasta`.
  * Select Tipo: `#historial-tipo`.
  * Select Origen de Precio: `#historial-origen`.
  * Input Costo Mínimo: `#historial-min`.
  * Input Costo Máximo: `#historial-max`.
* **Selectores por Rol y ARIA:**
  * Formulario de búsqueda: `form[role="search"]`.
  * Botón Consultar: `form[role="search"] button[type="submit"]` (Texto: `Consultar` / `Search`).
  * Botones de Exportar: `button` con texto `PDF` y `Excel`.
  * Región de Resumen: `section[aria-label="Resumen del historial"]` o `section[aria-label="Supplies history summary"]`.
  * Región de Tabla: `div[role="region"][aria-label="Historial de suministros"]` conteniendo `table`.
  * Botones de Paginador: `button` con texto `Anterior` (`Previous`) y `Siguiente` (`Next`).

---

## 3. Contrato Real (OpenAPI) y Diferencias con la Especificación

Fuente: Inspección directa de `GET https://api.inmero.co/api-sgpmp-test/openapi.json` (`operationId: consultar_historial_suministros_historial_get`).

### a) Parámetros de `GET /suministros/historial`
| Parámetro | Tipo | Requerido | Default | Restricciones / Formato |
|---|:---:|:---:|:---:|---|
| `id_activo_biologico` | integer | **Sí** | — | `exclusiveMinimum: 0` |
| `id_ciclo_productivo` | integer | No | `null` | `exclusiveMinimum: 0` |
| `fecha_inicio_filtro` | string | No | `null` | `format: date` (`YYYY-MM-DD`) |
| `fecha_fin_filtro` | string | No | `null` | `format: date` (`YYYY-MM-DD`) |
| `tipo_suministro_filtro`| string | No | `'TODOS'` | Enum: `ALIMENTO`, `MEDICAMENTO`, `SERVICIO_VETERINARIO`, `INSEMINACION`, `TODOS` |
| `origen_precio_filtro` | string | No | `'TODOS'` | Enum: `MANUAL`, `M40_AUTOMATICO`, `TODOS` |
| `costo_min` | number/string | No | `null` | `minimum: 0` |
| `costo_max` | number/string | No | `null` | `minimum: 0` |
| `pagina` | integer | No | `1` | `minimum: 1` |
| `registros_por_pagina` | integer | No | `50` | `minimum: 1`, `maximum: 200` |
| `X-Zona-Horaria` (header)| string | No | `UTC` | IANA Timezone (ej. `America/Bogota`) |

### b) Esquema de Respuesta
* **200 OK (`HistorialSuministroListResponse`):**
  * `items`: Array de `LineaHistorialResponse` con campos: `id_registro_suministro` (string), `id_activo_biologico`, `id_ciclo_productivo`, `tipo_suministro`, `descripcion`, `fecha_aplicacion` (date), `cantidad` (Decimal string), `unidad_medida`, `precio_unitario` (Decimal string), `costo_registro` (Decimal string), `origen_precio`, `tipo_operacion`, `observacion`, `fecha_registro` (date-time), `nombre_activo`, `especie`, `nombre_ciclo`, `estado_ciclo`.
  * `resumen`: `ResumenHistorialResponse` con campos obligatorios: `total_registros_filtrados` (int), `monto_total_filtrado` (Decimal string), `desglose_por_tipo_suministro` (object map), `desglose_por_ciclo` (object map), `pagina_actual` (int), `total_paginas` (int), `datos_contexto_no_disponibles` (boolean), `datos_actualizados_hasta` (date-time), `nivel_volumen` (int), y opcional `mensaje` (string|null).
* **202 Accepted (`ConsultaAsincronaResponse`):**
  * `id_consulta_asincrona`, `estado`, `mensaje`, `info_nivel_volumen` (cuando el volumen del activo supera umbrales sincrónicos: Nivel 3 con >3 filtros o timeout de 10s, o Nivel 4).
* **Códigos Documentados en OpenAPI:** `200`, `202`, `401`, `403`, `404`, `422`, `429`. (Nota: `500` no está documentado en responses OpenAPI por ser estándar no controlado de FastAPI).

### c) Tabla de Diferencias: Especificación vs. Contrato Real OpenAPI
| Término en Especificación | Nombre Exacto en OpenAPI | Discrepancia Identificada |
|---|---|---|
| "activo" o "id_activo" | `id_activo_biologico` | El contrato exige `id_activo_biologico`. |
| "ciclo" | `id_ciclo_productivo` | El contrato exige `id_ciclo_productivo`. |
| "rango de fecha_aplicacion" | `fecha_inicio_filtro` y `fecha_fin_filtro` | Dos query params separados de tipo fecha. |
| "tipo" | `tipo_suministro_filtro` | Nombre con sufijo `_filtro`. |
| "origen de precio" | `origen_precio_filtro` | Nombre con sufijo `_filtro`. |
| "máx. 200 por página, por defecto 50" | `registros_por_pagina` | El parámetro se llama `registros_por_pagina` (no `limit` ni `page_size`). |

---

## 4. Backend Local (sgpmp-backend)

### a) Ubicación de Router y Caso de Uso
* **Router:** [historial_suministros_router.py:90-142](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/routers/historial_suministros_router.py#L90-L142) (`@router.get("", ...)`).
* **Caso de Uso:** [consultar_historial_suministros_use_case.py:89-187](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L89-L187) (`ConsultarHistorialSuministrosUseCase`).
* **Repositorio de Lectura:** [historial_suministro_read_repository.py:134-216](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L134-L216) (`SqlAlchemyHistorialSuministroReadRepository`).

### b) Enriquecimiento con M02 y Timeout de 3 s
* **Hallazgo Crítico:** En el backend, el enriquecimiento con M02 (nombre del activo, especie, ciclo y estado de ciclo) se resuelve **directamente mediante SQL JOIN** sobre las tablas `modulo2.activos_biologicos`, `modulo9.especies`, `modulo9.ciclos_productivos` y `modulo2.gestiones_fases` ([historial_suministro_read_repository.py:43-51](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L43-L51)).
* **Timeout de 3 s:** **NO EXISTE**. En el docstring oficial ([historial_suministro_read_repository.py:15-20](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L15-L20)) se declara explícitamente:  
  > *"modulo2 y modulo9 viven en la misma base de datos que modulo5 (no hay una llamada de red real a un servicio M02 separado), así que no existe un modo de fallo de timeout genuino que simular; `datos_contexto_no_disponibles` es siempre `False` en esta implementación."*
* **Constante en código:** En [consultar_historial_suministros_use_case.py:177](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L177), `datos_contexto_no_disponibles=False` está fijado estáticamente en el código.
* **Mecanismo externo de simulación de fallo/lentitud de M02:** **NO EXISTE**. No hay variable de entorno, ni cabecera HTTP, ni flag de configuración que permita desacoplar o retrasar M02 desde fuera del proceso backend.

### c) Validaciones 422
Implementadas en [consultar_historial_suministros_use_case.py:206-240](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L206-L240) (`_validar_filtros`):
1. `fecha_fin_filtro < fecha_inicio_filtro`: Lanza `BusinessRuleError(code="COMBINACION_FILTROS_INVALIDA", field="fecha_fin_filtro")`.
2. `costo_max < costo_min`: Lanza `BusinessRuleError(code="COMBINACION_FILTROS_INVALIDA", field="costo_max")`.
3. `ciclo_pertenece_a_activo(...) is False`: Lanza `BusinessRuleError(code="CICLO_NO_PERTENECE_AL_ACTIVO", field="id_ciclo_productivo")` validando contra `modulo2.gestiones_fases`.

### d) Cálculo del Resumen
* **¿Se calcula sobre todos los registros filtrados?** **SÍ, CONFIRMADO.**
* **Evidencia:** En [historial_suministro_read_repository.py:82-100](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L82-L100):
  * `_SQL_TOTAL` ejecuta `SELECT COUNT(*) AS total, COALESCE(SUM(rs.costo_registro), 0) AS monto FROM ... WHERE ...` (aplica los filtros del `_WHERE` pero **sin `LIMIT` ni `OFFSET`**).
  * `_SQL_POR_TIPO` agrupa por `rs.tipo_suministro` sobre todo el universo filtrado.
  * `_SQL_POR_CICLO` agrupa por `cp.nombre, rs.id_gestion_fases` sobre todo el universo filtrado.
* **Ordenamiento:** `ORDER BY rs.fecha_aplicacion DESC, rs.id_registro_suministro DESC` ([historial_suministro_read_repository.py:77](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L77)).

### e) Tests Pytest Existentes de este Endpoint
* [test_m05_dominio.py:133-139](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/tests/supplies/test_m05_dominio.py#L133-L139): `test_cantidad_de_filtros_ignora_los_valores_todos()` (prueba unitaria de conteo de filtros para el gate de Nivel 3).
* [test_m05_flujo_completo_integration.py:237-242](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/tests/integration/test_m05_flujo_completo_integration.py#L237-L242): Prueba de integración de `GET /suministros/historial` validando respuesta 200, filtro `tipo_suministro_filtro="SERVICIO_VETERINARIO"` y suma en `monto_total_filtrado`.

---

## 5. Ambiente y Estructura

### a) Variables en `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test` (Solo Nombres)
* `VITE_API_BASE_URL`
* `VITE_RECAPTCHA_SITE_KEY`
* `ENABLE_TEST_SANDBOX`
* `TEST_SANDBOX_SECRET`
* `TEST_ADMIN_EMAIL`
* `TEST_ADMIN_PASSWORD`
* `ADMIN_EMAIL`
* `ADMIN_PASSWORD`
* `CYPRESS_ADMIN_EMAIL`
* `CYPRESS_ADMIN_PASSWORD`
* `VET_EMAIL`
* `VET_PASSWORD`

### b) Estado de Credenciales para los Roles de RF-81 en `.env.test`
* **Gestor de Granja:** **NO EXISTE**.
* **Contador:** **NO EXISTE**.
* **Revisor Fiscal:** **NO EXISTE**.

### c) Estado de la Carpeta del Caso G41
* Carpeta `testing\test_testing\Modulo5\RF-81\TC-M05-G41\`: **NO EXISTÍA** al inicio de esta fase (creada para albergar el presente informe en `evidencias/fase1_analisis_G41.md`).

### d) Helpers y Comandos Reutilizables de G13 ([TC-M05-G13/commands.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-76/TC-M05-G13/commands.ts))
1. `visitar(ruta)`: Navega a la ruta respetando el prefijo de subruta `APP_BASE_PATH` (`/sigab-test`).
2. `rutaApp(pathname)`: Limpia el prefijo `APP_BASE_PATH` de las URLs para aserciones limpias (ej. `/sigab-test/suministros/historial` → `/suministros/historial`).
3. `appBasePath()`: Lee y formatea el base path desde `Cypress.env('APP_BASE_PATH')`.
4. Bloqueo fail-closed de hosts: Intercept que vigila `/api-sgpmp-test/` y destruye peticiones si intentan salir hacia hosts no autorizados, previniendo fuga de credenciales.
5. `cy.loginUI(email, password)`: Automatiza el inicio de sesión web gestionando la sesión sin exponer contraseñas en logs.
6. `cy.apiSandbox(opciones)`: Ejecuta llamadas directas a la API inyectando `X-Test-Run-Id`, `X-Sandbox-Secret` y el token Bearer en memoria.
7. `cy.startSandbox(runId)` y `cy.rollbackSandbox(runId)`: Control de ciclo de vida del sandbox transaccional en PostgreSQL.

---

## 6. Datos de TEST (Paso 5)

> [!WARNING]
> ### Activación de la Puerta de Decisión: Paso 5 Omitido por Bloqueo
> **Regla de la Puerta de Decisión:** *"Si ningún rol de RF-81 tiene credenciales en .env.test: sáltate el Paso 5, repórtalo como bloqueo y pídeme las credenciales (nombre de variable sugerido, sin valores)."*
> 
> **Diagnóstico:** En `.env.test` únicamente se encuentran configuradas credenciales para Administrador y Veterinario. Dado que RF-81 restringe el alcance por finca/unidad productiva según el rol y la regla de seguridad prohíbe reintentos de login o uso de roles no admitidos, **se omitió en su totalidad la ejecución del Paso 5**.
> 
> **Solicitud de Credenciales (Nombres de Variables Sugeridos para `.env.test`):**
> * Para Gestor de Granja: `GESTOR_GRANJA_EMAIL` y `GESTOR_GRANJA_PASSWORD`.
> * Para Contador: `CONTADOR_EMAIL` y `CONTADOR_PASSWORD`.
> * Para Revisor Fiscal: `REVISOR_FISCAL_EMAIL` y `REVISOR_FISCAL_PASSWORD`.

### Información Previa Conocida sobre Datos en TEST (Inventario Seed Backend M05)
A partir de la inspección de solo lectura del archivo de inventario técnico [INVENTARIO_SEED_M05.md](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/tests/Test_Testing/Test_Modulo5/INVENTARIO_SEED_M05.md), se identificaron los siguientes activos sembrados o planificados para RF-81:
* `SEED-M05-HIST-10K`: Planificado con 10.000 suministros distribuidos en 2 fases/ciclos (1 fase cerrada con 5.000 registros y 1 fase activa con 5.000 registros) combinando los 4 tipos de suministro y 2 orígenes de precio.
* `SEED-M05-HIST-50K`: Planificado con 50.000 registros para pruebas de estrés Nivel 2.
* Estado real en el entorno TEST actual: **NO DETERMINABLE** vía API en este paso debido a la ausencia de credenciales de los roles autorizados de RF-81.

---

## 7. Cobertura por Cypress (Casos 098, 099, 104)

### TC-M05-098 (Historial sin filtros: orden, paginación y resumen)
* **¿Se puede probar contra la UI oficial?** **PARCIALMENTE REAL / REQUIERE INTERCEPT.**
* **Nivel de Fidelidad:**
  * Flujo de navegación, selección de activo y renderizado de tabla: **Real**.
  * Verificación de paginador y orden: **Real** (si existe activo sembrado con datos suficientes).
  * Selector de registros por página: **NO FACTIBLE CONTRA UI** porque la UI no tiene dicho selector (fijo en 50).
  * Desglose por ciclo en resumen: **NO FACTIBLE CONTRA UI** porque la UI no renderiza `desglose_por_ciclo`.
* **Bloqueos:**
  1. Falta de credenciales de roles de RF-81 en `.env.test`.
  2. Gaps en UI (ausencia de selector de tamaño de página y ausencia de visualización de ciclos en el resumen).

### TC-M05-099 (Filtros combinados)
* **¿Se puede probar contra la UI oficial?** **PARCIALMENTE REAL / HÍBRIDO.**
* **Nivel de Fidelidad:**
  * Filtros de activo, fechas, tipo, origen de precio, costo mín/máx y mensaje de lista vacía: **Real**.
  * Filtro por ciclo productivo: **NO FACTIBLE CONTRA UI** (la pantalla no expone el control de ciclo).
  * Validaciones de error 422 del backend: **Solo mediante intercept o API directa**, ya que el formulario valida `desde > hasta` y `costoMin > costoMax` en el cliente y detiene el submit.
* **Bloqueos:**
  1. Falta de credenciales de roles de RF-81 en `.env.test`.
  2. Falta de selector de ciclo en el formulario de la UI.

### TC-M05-104 (Enriquecimiento con M02, timeout de 3 s)
* **¿Se puede probar contra la UI oficial?** **ÚNICAMENTE SIMULADO CON `cy.intercept`.**
* **Nivel de Fidelidad:** **Simulación con mock de red (`cy.intercept`).**
* **Bloqueos:**
  1. **Bloqueo de arquitectura backend:** M02 no es un servicio separado; se consulta por SQL JOIN en la misma BD PostgreSQL. No existe timeout de 3 s ni fallback en el backend.
  2. **Valor hardcodeado:** El backend siempre entrega `datos_contexto_no_disponibles=false`.
  3. **Solución QA en Cypress:** La UI sí implementa la alerta visual cuando `resumen.datos_contexto_no_disponibles === true` ([HistorialView.tsx:178](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L178)). Para cubrir TC-M05-104, Cypress debe interceptar `GET /suministros/historial` y responder con `{ resumen: { datos_contexto_no_disponibles: true, ... } }` para validar que la interfaz despliegue el aviso sin colapsar.

---

## 8. OBSERVADO vs. HIPÓTESIS

### OBSERVADO (Con evidencia directa)
1. `HistorialView.tsx` no renderiza `desglose_por_ciclo` ni contiene un input/select para filtrar por `id_ciclo_productivo` ([HistorialView.tsx:113-175](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L113-L175)).
2. La constante de paginación está fija en `const POR_PAGINA = 50` y no hay selector de cantidad de registros por página en la UI ([HistorialView.tsx:29](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L29)).
3. En el backend, el enriquecimiento con M02 se realiza por SQL JOIN y `datos_contexto_no_disponibles` está hardcodeado a `False` ([consultar_historial_suministros_use_case.py:177](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L177) e [historial_suministro_read_repository.py:15-20](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L15-L20)).
4. No existe mecanismo alguno en el backend para simular caída o timeout de M02 desde fuera del proceso ([historial_suministro_read_repository.py:18-20](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L18-L20)).
5. El resumen del historial calcula `COUNT`, `SUM` y desgloses sobre todos los registros filtrados sin `LIMIT` ni `OFFSET` ([historial_suministro_read_repository.py:82-100](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L82-L100)).
6. En `SGPMP-FRONT-END-PWA/.env.test` no existen variables de credenciales para Gestor de Granja, Contador ni Revisor Fiscal (solo existen para Admin y Vet).

### HIPÓTESIS
1. Se hipotetiza que los activos sintéticos `SEED-M05-HIST-10K` y `SEED-M05-HIST-50K` detallados en el inventario del backend podrían estar ya insertados por el DBA en la base de datos persistente de TEST, lo cual se confirmará en cuanto se suministren las credenciales de uno de los roles autorizados.
2. Se hipotetiza que el rol Administrador podría tener acceso de lectura al endpoint `/suministros/historial` por permisos globales RBAC, pero no fue utilizado en el Paso 5 para respetar estrictamente la restricción de roles autorizados de RF-81 y la regla de la puerta de decisión.

---

## 9. Lo que NO se Pudo Determinar

1. **Datos reales en TEST:** No fue posible determinar qué activos biológicos concretos tienen historial de suministros en el ambiente TEST activo, cuántos registros poseen ni sus rangos de fechas/costos exactos, al estar bloqueado el acceso por falta de credenciales de los roles de RF-81 en `.env.test`.
2. **Coherencia matemática en vivo:** No se pudo contrastar en este paso la suma exacta de `costo_registro` de las páginas contra `monto_total_filtrado` sobre datos vivos de TEST.

---

## 10. Confirmación Explícita de Seguridad y Buenas Prácticas

1. **No escritura en TEST:** Se confirma explícitamente que no se realizó ninguna petición de mutación (`POST`, `PUT`, `PATCH`, `DELETE`) hacia ningún endpoint de negocio en el entorno TEST. La única llamada remota efectuada fue `GET /openapi.json` público y sin autenticación.
2. **No cambios en Git:** Se confirma que no se ejecutaron comandos `git commit`, `git push`, `git checkout`, `git stash` ni `git reset` en ningún repositorio local.
3. **No impresión ni persistencia de secretos:** Se realizó una búsqueda estricta en el presente archivo y en la salida de consola; no se registraron contraseñas, tokens JWT ni secretos de sandbox (`TEST_SANDBOX_SECRET`). Las variables de `.env.test` fueron tratadas únicamente por su nombre.
4. **Archivos creados:** El único archivo persistido en el repositorio es [fase1_analisis_G41.md](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/fase1_analisis_G41.md).

