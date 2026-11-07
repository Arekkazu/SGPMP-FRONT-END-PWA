# INFORME TÉCNICO FASE 1 — ANÁLISIS DE PROCESO, AMBIENTE Y DATOS
## Caso Agrupado TC-M05-G23 (RF-77: Reporte de Gastos Acumulados por Activo y Exportación PDF/CSV)
**Sistema:** SGPMP — Módulo 5 (Suministros)  
**Ambiente:** TEST Oficial (`https://api.inmero.co/sigab-test/` / `https://api.inmero.co/api-sgpmp-test`)  
**Fecha:** 2026-11-06  

---

### A. Entorno

| Parámetro | Valor Observado | Evidencia / Comando |
| :--- | :--- | :--- |
| **Commit Backend (`sgpmp-backend`)** | `7ca523067631d92d84942a1017b070d9540d09d1` | `git rev-parse HEAD` |
| **Rama Backend** | `test-JuanSG` | `git branch --show-current` |
| **Coincidencia con commit TEST (`7ca52306`)** | **SÍ (COINCIDE EXACTAMENTE)** | Comparación contra prefijo `7ca52306` |
| **Commit Frontend (`SGPMP-FRONT-END-PWA`)** | `921cb9ecdceb11e301469bcfdf0db5e3287c58bb` | `git rev-parse HEAD` |
| **Rama Frontend** | `test-JuanSG` | `git branch --show-current` |
| **Estado de Git (ambos repos)** | Limpio/Sin alteraciones frente al inicio (solo tracking previo) | `git status --short` verificado en Paso 0.1 y 8.1 |
| **Carpeta del TC** | `testing\test_testing\Modulo5\RF-77\TC-M05-G23\` | Creada `evidencias\` en Paso 0.3 |
| **Carpeta Diagnóstico Desechable** | `C:\Users\Juansegutt\Integrador\_diag_m05\g23\` | Creada en Paso 0.3 |
| **Archivos de soporte reutilizables G13** | `commands.ts`, `cypress.config.js`, `package.json`, `tsconfig.json` | `TC-M05-G13\` |
| **Dependencias PDF/CSV en Frontend** | Ninguna instalada (`pdf-parse`, `pdfjs`, `csv-parse`, `papaparse` ausentes) | `package.json` |

---

### B. Frontend (Paso 1)

**Estado:** **SÍ EXISTE UI** para el Reporte de Gastos y Exportación en el Frontend.

| Ítem | Hallazgo | Ruta:Línea |
| :--- | :--- | :--- |
| **1.1 Ruta y Navegación** | Ruta relativa `/suministros/gastos` (en TEST: `/sigab-test/suministros/gastos`). Componente `ReporteGastosView` montado en pestaña `gastos`. Guardas RBAC: `usePermission(RECURSO_GASTOS, ACCION_R)` con `RECURSO_GASTOS = 51`. Lo ven Productor y Administrador; si no hay permiso muestra `AccesoDenegado`. | [`SuministrosPage.tsx:28,59`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/SuministrosPage.tsx#L28)<br>[`rbac.ts:18`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/rbac.ts#L18) |
| **1.2 Formulario de Generación** | Inputs sin `data-testid`, identificados por `id`: <br>• `#gastos-desde` (type `date`, max `hoyLocal()`, label "Desde")<br>• `#gastos-hasta` (type `date`, max `hoyLocal()`, label "Hasta")<br>• `#gastos-granularidad` (select: `CICLO_COMPLETO`, `MENSUAL`, `SEMANAL`)<br>• `#gastos-activo` (combobox `SelectorActivo` con autocompletado de activos)<br>• Checkboxes `ALIMENTACION` y `MEDICACION` (al menos una requerida)<br>• Botón submit: `Button` con icono `FileBarChart2` y texto `t('gastos.generar')` ("Generar reporte" / "Generate report"). | [`ReporteGastosView.tsx:81-125`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/ReporteGastosView.tsx#L81-L125) |
| **1.3 Llamadas HTTP de Pantalla** | • `POST /suministros/reportes-gastos` (`GenerarReportePayload`). Si 200: muestra detalle directo (`ReporteGasto`). Si 202: encola y muestra alerta informativa con sondeo de trabajo.<br>• `GET /suministros/reportes-gastos/historial?limite=20`: llena la tabla de historial inferior.<br>• `GET /suministros/reportes-gastos/{id}`: abre detalle desde historial.<br>• `GET /suministros/reportes-gastos/{id}/regenerar`: regenera reporte. | [`reportesApi.ts:13-33`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/api/reportesApi.ts#L13-L33)<br>[`ReporteGastosView.tsx:64-79`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/ReporteGastosView.tsx#L64-L79) |
| **1.4 Exportación y Descarga** | Botones en `ReporteGastoDetalle`: `<Button ...>PDF</Button>` y `<Button ...>CSV</Button>`. Disparan:<br>1) `POST /suministros/reportes-gastos/{id}/exportacion` con `{ formato_exportacion: "PDF" | "CSV" }` -> retorna `ArchivoExportacion` (`id_archivo`, `nombre_archivo`).<br>2) `GET /suministros/reportes-gastos/exportaciones/{id_archivo}` con `responseType: 'blob'`.<br>3) Descarga en cliente vía `guardarArchivo(blob, nombre)` creando `<a download={nombre}>` dinámico y ejecutando `.click()`. | [`ReporteGastoDetalle.tsx:57-58`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/ReporteGastoDetalle.tsx#L57-L58)<br>[`ReporteGastosView.tsx:75-80`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/ReporteGastosView.tsx#L75-L80)<br>[`descarga.ts:5-12`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/lib/descarga.ts#L5-L12) |
| **1.5 Manejo de Errores en UI** | Si falla la llamada HTTP, renderiza `<Alert variant={error.status >= 500 ? 'error' : 'warning'} title={error.message} />`. **NO EXISTE manejo específico** ni botón interactivo para "ofrecer descargar CSV como alternativa cuando falla el PDF" (el mensaje de texto viene directamente del error del backend). | [`ReporteGastosView.tsx:132`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/ReporteGastosView.tsx#L132) |
| **1.6 Visualización de Vigencia (24 h)** | **NO SE MUESTRA EN UI**. El backend expone `fecha_expiracion` en el DTO, pero ni `ReporteGastosView` ni `ReporteGastoDetalle` renderizan la fecha de vencimiento ni advertencias de tiempo restante. | [`ReporteGastoDetalle.tsx:40-70`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/ReporteGastoDetalle.tsx#L40-L70) |

---

### C. Backend (Paso 2)

#### Subsección Crítica: Compatibilidad con Sandbox Transaccional
- **Conexión de BD y Aislamiento:**  
  La generación síncrona (`POST /suministros/reportes-gastos`), la exportación (`POST /exportacion`) y la descarga (`GET /exportaciones/{id}`) utilizan la inyección estándar `db: Session = Depends(get_db)`.  
  Al enviar las cabeceras `X-Test-Run-Id` y `X-Sandbox-Secret`, `get_or_create_test_session` intercepta la sesión y la confina a un `SAVEPOINT` dentro de la transacción de prueba.
- **Ubicación de los Archivos Exportados:**  
  Los archivos generados (PDF y CSV) **NO se almacenan en el sistema de archivos del contenedor ni en buckets S3**, sino en la columna `contenido BYTEA` de la tabla `modulo5.archivos_exportacion_suministros` ([`archivo_exportacion_suministro_model.py:46`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/models/archivo_exportacion_suministro_model.py#L46)).  
  **Impacto:** Al ejecutarse el rollback del sandbox (`DELETE /test-control/runs/{run_id}`), la transacción de base de datos se revierte por completo, **eliminando automáticamente cualquier reporte generado y cualquier archivo PDF/CSV exportado sin dejar residuos en disco**.
- **Incompatibilidad con el Camino Asíncrono:**  
  Si un reporte excede el umbral y responde HTTP 202 (`_encolar`), la tarea queda en `modulo5.trabajos_reportes_gastos`. El worker batch que procesa esta cola corre en una conexión separada; por ende, **no ve datos no commiteados del sandbox y no puede operar dentro de una transacción aislada de prueba**.
- **Efectos Colaterales Externos:**  
  La generación y exportación del reporte **NO envían correos electrónicos ni notificaciones externas** (los use cases no inyectan `NotificacionPort`). Solo se emite auditoría en `modulo5.auditorias_suministros` en caso de fallo forzado de PDF, la cual queda también dentro del rollback transaccional.

#### Contrato y Comportamiento del Backend

| Aspecto | Regla / Contrato Técnico | Ruta:Línea |
| :--- | :--- | :--- |
| **2.1 Endpoints Exactos** | • `POST /suministros/reportes-gastos` (200 `ReporteGastoResponse` o 202 `TrabajoReporteResponse`)<br>• `POST /suministros/reportes-gastos/{id}/exportacion` (201 `ArchivoExportacionResponse`)<br>• `GET /suministros/reportes-gastos/exportaciones/{id_archivo}` (StreamingResponse binario, 410 si expiró)<br>• `GET /suministros/reportes-gastos/historial` (200 `HistorialReportesResponse`)<br>• `GET /suministros/reportes-gastos/{id}` (200 `ReporteGastoResponse`) | [`reporte_gastos_router.py:53-157`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/routers/reporte_gastos_router.py#L53-L157) |
| **2.2 Permisos RBAC** | Recurso `51` (`reporte_gastos_suministros`). Acción `E` (5) para generar y exportar; Acción `R` (2) para consultar historial y descargar. Autorizado para Productor y Administrador. Veterinario recibe HTTP 403 `PERMISO_DENEGADO`. | [`reporte_gastos_router.py:47-54`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/routers/reporte_gastos_router.py#L47-L54) |
| **2.3 Generación del Archivo** | • **PDF:** Generado con `ReportLab` (`SimpleDocTemplate`, orientación landscape A4). Encabezado con título, logo institucional vía `LogoInstitucionalPort`, fecha y resumen. Exactamente **25 registros por página** fijado en constante `FILAS_POR_PAGINA_PDF = 25`.<br>• **CSV:** Generado con módulo estándar `csv` en bloques de 1.000 filas, encoding `utf-8`.<br>• **Patrón de Nombres:**<br>  - PDF: `Reporte_Gastos_{identificador}_{inicio}_{fin}.pdf`<br>  - CSV: `Gastos_{identificador}_{inicio}_{fin}.csv`<br>• **Columnas CSV exactas:** `fecha`, `categoria`, `descripcion`, `monto_cop`, `estado`. | [`exportar_reporte_gastos_use_case.py:43, 98-118`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py#L43)<br>[`generador_archivos.py:21, 33-85`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/exportacion/generador_archivos.py#L21) |
| **2.4 Límites y TTL** | • Límite PDF: `MAX_REGISTROS_PDF = 500`. Si `len(filas) > 500` -> `BusinessRuleError(code="PDF_EXCEDE_LIMITE")` -> HTTP 422.<br>• Límite CSV: `MAX_BYTES_CSV = 52428800` (50 MB). Si se excede -> `PayloadTooLargeError(code="CSV_EXCEDE_TAMANO")` -> HTTP 413.<br>• TTL: `VIGENCIA["RF77"] = timedelta(hours=24)`. Si `ahora >= fecha_expiracion` -> `GoneError(code="ARCHIVO_EXPIRADO")` -> HTTP 410. | [`exportar_reporte_gastos_use_case.py:39-40, 100-125`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py#L39-L40)<br>[`archivo_exportacion.py:18, 65`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/domain/entities/archivo_exportacion.py#L18) |
| **2.5 Fallo Motor PDF y Flags de Prueba** | Captura cualquier `Exception` de ReportLab y lanza `InfrastructureError(code="ERROR_GENERACION_PDF", message="Error al generar el archivo PDF. Puede intentar la exportación nuevamente o descargar en formato CSV como alternativa.")` -> HTTP 500.<br>**Flags de prueba:** **NO EXISTEN** cabeceras ni flags para forzar fallo de PDF, viajar en el tiempo o simular tamaño de archivo desde el cliente. | [`exportar_reporte_gastos_use_case.py:195-207`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py#L195-L207) |
| **2.6 Purga de Archivos** | `PurgarArchivosVencidosUseCase`: corre periódicamente en segundo plano y borra el `contenido` binario dejando la fila con `fecha_eliminacion` para que la descarga continúe respondiendo 410. | [`purgar_archivos_vencidos_use_case.py:27-45`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/exportacion/purgar_archivos_vencidos_use_case.py#L27-L45) |
| **2.7 Umbral Síncrono vs Asíncrono** | • Individual: si `dias > 366` (> 12 meses) -> HTTP 202 `TrabajoReporteGasto`. Si <= 366 -> HTTP 200 síncrono.<br>• Agregado: si `dias > 183` (> 6 meses) -> HTTP 202. Si <= 183 -> HTTP 200 síncrono. | [`generar_reporte_gastos_use_case.py:53-54, 203`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/reporte_gastos/generar_reporte_gastos_use_case.py#L53-L54) |
| **2.8 Registros que Alimentan el Reporte** | Consulta `_SQL_DETALLE` con `UNION ALL` entre `registros_consumo_alimentos` y `registros_medicamentos`. Filtros estrictos: `estado_registro = 'VALIDADO'`, `fecha` dentro del rango del reporte, y pertenencia a las fincas del usuario. Cada registro con costo suma a `filas` para los límites de 30/500/501. | [`detalle_gasto_read_repository.py:26-78`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/detalle_gasto_read_repository.py#L26-L78) |

---

### D. Credenciales Disponibles (Paso 4)

- **Ruta 1:** `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test`
  - Variables detectadas: `VITE_API_BASE_URL`, `VITE_RECAPTCHA_SITE_KEY`, `ENABLE_TEST_SANDBOX`, `TEST_SANDBOX_SECRET`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD`, `VET_EMAIL`, `VET_PASSWORD`.
- **Ruta 2:** `C:\Users\Juansegutt\Integrador\sgpmp-backend\.env.test`
  - Variables detectadas: `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_PRODUCER_EMAIL`, `TEST_PRODUCER_PASSWORD`, `TEST_FIELD_ENGINEER_EMAIL`, `TEST_FIELD_ENGINEER_PASSWORD`, `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_BASE_URL`, `TEST_DATABASE_URL`, `ENABLE_TEST_SANDBOX`, `TEST_SANDBOX_SECRET`, `BROKER_SERVICE_TOKEN`.
- **Evaluación de Roles Requeridos para RF-77:**
  - **Productor:** Disponible en backend (`TEST_PRODUCER_EMAIL` / `TEST_PRODUCER_PASSWORD`).
  - **Administrador:** Disponible en ambos repos (`TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` y `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
  - **Puerta de decisión:** **SUPERADA**. Se procedió a la ejecución del censo en Paso 5.

---

### E. Datos en TEST (Paso 5)

El script de censo `censo_datos.mjs` ejecutó un único login por rol y consultas `GET` de solo lectura. Evidencia capturada en [censo_test.json](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-77/TC-M05-G23/evidencias/diag_g23/censo_test.json).

#### 5.1 Evidencias Literales de Autenticación
- **Productor (`TEST_PRODUCER_EMAIL`):** HTTP 200 | `request-id: 34082b1d-a98c-4d26-ab99-21c67e3723b4` | Hora UTC: `2026-11-07T03:09:15.270Z`.
- **Administrador (`TEST_ADMIN_EMAIL`):** HTTP 200 | `request-id: 1e09db65-c5c6-4303-963e-ecea53bd6494` | Hora UTC: `2026-11-07T03:09:17.939Z`.

#### 5.2 Tabla del Censo de Activos y Registros de Gasto en TEST

| Activo | Rol que lo Ve | Modalidad / Estado | Inicio Ciclo | # Consumos Válidos | # Medicamentos Válidos | Rango de Fechas | ¿Alcanza para 30 registros? | ¿Para 500 / 501? |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **778** | Administrador | INDIVIDUAL / ACTIVO | 2026-10-01 | **0** | **0** | Sin registros | **NO** (0 de 30) | **NO** |
| **776** | Administrador | POBLACIONAL (10) / ACTIVO | 2026-10-01 | **0** | **0** | Sin registros | **NO** (0 de 30) | **NO** |
| **296** | Administrador | POBLACIONAL (10) / ACTIVO | 2026-06-01 | **0** | **0** | Sin registros | **NO** (0 de 30) | **NO** |
| **778 / 776 / 296** | Productor (.env.test) | N/A (HTTP 404 `ACTIVO_NO_ENCONTRADO`)* | N/A | **0** | **0** | Sin registros | **NO** | **NO** |

*\*Nota sobre el Productor:* El usuario `TEST_PRODUCER_EMAIL` sembrado en `.env.test` corresponde a una cuenta sin activos asignados (id 96), por lo que recibe 404 al consultar los activos 778 y 776 cuyo dueño en base de datos es el usuario id 35.

#### 5.3 Censo Global de la Base de Datos TEST (Consultado como Administrador)
- **Total Alimentos Válidos (`VALIDADO` con costo > 0) en TODO TEST:** **4 registros**.
- **Total Medicamentos Válidos (`VALIDADO` con costo > 0) en TODO TEST:** **7 registros**.
- **Total Absoluto de Registros de Gasto en TEST:** **11 registros** (repartidos entre activo 5: 5 registros, activo 1: 3 registros, activo 8: 2 registros, activo 57: 1 registro).
- **Historial de Reportes Existentes:**
  - Productor: 2 reportes antiguos del 2026-07-31 (`id: 7` e `id: 9`) con `archivo_vigente: false` (expirados).
  - Administrador: 0 reportes en historial.

---

### F. Matriz de Viabilidad E1-E10 (Paso 3)

| Checkpoint Candidato | Descripción | ¿Viable con Cypress + Sandbox contra TEST? | Causa Principal y Justificación Técnica |
| :--- | :--- | :---: | :--- |
| **E1** | PDF exportado: nombre con patrón, encabezado, logo, 25 reg/pág. | **PARCIAL** | El backend genera el PDF correctamente con ReportLab y responde 201/200; se puede validar nombre, Content-Type, tamaño > 0 y encabezado usando un activo con gastos (ej. activo 5). **Pero no se puede validar paginación de 25/pág** porque ningún activo tiene >= 25 registros (el máximo existente es 5). |
| **E2** | CSV exportado: nombre, columnas (`fecha,categoria,descripcion,monto_cop,estado`). | **SÍ** | Completamente ejecutable. Se puede generar el reporte sobre un activo con gasto (ej. activo 5 o 1), exportar a CSV y verificar nombre `Gastos_*.csv` y columnas exactas en el texto decodificado. |
| **E3** | Vigencia del archivo = 24 h. | **SÍ** | La respuesta de `POST /exportacion` devuelve `fecha_expiracion` que es exactamente `fecha_generacion + 24 horas` (evaluable por API). En UI no se muestra. |
| **E4** | Descarga exitosa por `GET /exportaciones/{id_archivo}`. | **SÍ** | Operación de lectura StreamingResponse HTTP 200 con `Content-Disposition` y tamaño > 0. Completamente viable vía `cy.request`. |
| **E5** | Con 30 registros el PDF pagina 25 + 5. | **NO** | **Faltan datos en TEST:** Solo hay 11 registros en toda la base de datos (máximo 5 por activo). Y dado que `POST /suministros/medicamentos` y `POST /suministros/consumo-alimentos` responden HTTP 500 en TEST, **no es posible sembrar los 30 registros dentro del sandbox**. |
| **E6** | PDF con exactamente 500 registros se genera. | **NO** | **Faltan datos en TEST:** Se requieren 500 registros de gasto vinculados al ciclo del activo. No se pueden crear por la falla 500 de las APIs de suministros. |
| **E7** | PDF con 501 registros responde 422 (`PDF_EXCEDE_LIMITE`). | **NO** | **Faltan datos y no hay flag:** Requiere 501 registros reales en la consulta. No existe flag o cabecera en el backend para simular el volumen desde el cliente. |
| **E8** | CSV > 50 MB responde 413 (`CSV_EXCEDE_TAMANO`). | **NO** | **No viable por diseño:** Requiere cientos de miles de registros en BD para superar 50 MB. No existe mecanismo de inyección de carga ni flag de prueba. |
| **E9** | Descarga a las 24 h + 1 min responde 410 (`ARCHIVO_EXPIRADO`). | **NO** | **No viable por diseño de backend:** `datetime.now(timezone.utc)` está hardcodeado en `archivo_exportacion.py:58`. No existe cabecera de viaje en el tiempo (`X-Mock-Date`). Los archivos de julio existentes no pertenecen al Administrador (responden 403 `ARCHIVO_DE_OTRO_USUARIO`). |
| **E10** | Fallo forzado del motor PDF responde 500 y ofrece CSV como alternativa. | **NO** | **No viable por diseño de backend:** No existe interruptor ni cabecera (`X-Force-PDF-Fail`) para forzar la excepción de ReportLab desde el exterior. |

---

### G. Riesgos y Efectos Colaterales para la Fase 2

1. **Persistencia de Archivos Exportados (OBSERVADO):**  
   Los archivos exportados se guardan como registros binarios en la tabla `modulo5.archivos_exportacion_suministros`. Al correr con `X-Test-Run-Id` y `X-Sandbox-Secret`, participan en la transacción del sandbox. El rollback elimina el archivo por completo. **Riesgo de contaminación: CERO**.
2. **Incompatibilidad con Solicitudes Asíncronas (OBSERVADO):**  
   Rangos de fecha > 12 meses (individual) o > 6 meses (agregado) disparan HTTP 202 asíncrono. Los workers encolados no operan dentro del sandbox. **Riesgo:** Si el spec solicita rangos mayores a 12 meses, la prueba no obtendrá el reporte de inmediato y la cola fallará.
3. **Imposibilidad de Crear Datos Previos en Sandbox (OBSERVADO):**  
   Confirmado por la fase 4-DIAG-500 previa: `POST /suministros/consumo-alimentos` y `POST /suministros/medicamentos` fallan sistemáticamente con HTTP 500 en TEST. Cualquier test que pretenda crear suministros antes de pedir el reporte fallará de inmediato.
4. **Dependencia de Zona Horaria (OBSERVADO):**  
   El backend depende de `X-Zona-Horaria: America/Bogota` para resolver la fecha fin válida y evitar el error 400 `FECHA_FIN_FUTURA`. Todas las peticiones deben enviar esta cabecera obligatoriamente.
5. **Manejo de Descargas en Cypress 13 (OBSERVADO):**  
   Al presionar los botones PDF/CSV en la UI, el cliente ejecuta `URL.createObjectURL(blob)` y dispara un click simulado en un anchor. Para validar el contenido del archivo en Cypress sin dependencias de parseo en el navegador, la mejor estrategia es realizar la llamada de descarga mediante `cy.request` con validación de cabeceras y estructura.

---

### H. Propuesta y Datos Faltantes (Paso 7)

#### 7.1 Veredicto Consolidado
- **Elementos Ejecutables de Inmediato en Fase 2 (bajo rol Administrador):**
  - **E2:** Exportación exitosa a CSV (verificando estructura, columnas, nombre y contenido con activo 5 o 1).
  - **E3:** Validación de vigencia de 24 horas expuesta en la API (`fecha_expiracion`).
  - **E4:** Descarga binaria exitosa por `GET /exportaciones/{id_archivo}` con headers MIME correctos.
  - **E1 (Parcial):** Exportación exitosa a PDF (verificando generación 201, nombre, logo, encabezado y tamaño > 0, sin validar paginación de 25 registros).
- **Elementos No Ejecutables sin Intervención Externa:**
  - **E5 (Paginación 25+5), E6 (500 reg), E7 (501 reg -> 422):** Bloqueados por falta de datos en TEST (solo hay 11 registros en toda la base) e imposibilidad de crearlos debido al bug 500 de suministros.
  - **E8 (CSV > 50 MB -> 413), E9 (410 a las 24h), E10 (Fallo forzado PDF -> 500):** Bloqueados por diseño del backend (falta de flags de prueba, mocks de reloj y simulación de fallos).

#### 7.2 Qué Datos Faltan y Quién Debe Proporcionarlos
1. **Equipo de Backend / DevOps:**
   - Corregir el incidente del HTTP 500 en `POST /suministros/medicamentos` y `POST /suministros/consumo-alimentos` para permitir que los specs siembren datos transaccionales dentro del sandbox.
   - Alternativamente, sembrar en la base de datos de TEST un activo con **501 registros de gasto validados** para permitir probar los límites de exportación E5, E6 y E7.
   - Proveer un flag o endpoint de prueba para simular expiración de archivos (TTL de 24h) y fallo de ReportLab.
2. **Equipo de Gestión de Accesos:**
   - Si se requiere que las pruebas corran con el rol **Productor**, asignar en base de datos de TEST activos con gastos al usuario sembrado en `.env.test` (`TEST_PRODUCER_EMAIL`), o proporcionar en `.env.test` las credenciales del Productor id 35 (dueño de los activos 778 y 776).

#### 7.3 Selectores y Rutas Exactas para el Spec (UI)
- **Ruta:** `${appBasePath()}/suministros/gastos` (en TEST: `/sigab-test/suministros/gastos`).
- **Pestaña:** Sub-pestaña con texto `t('tabs.gastos')` ("Gastos" / "Expenses").
- **Campos del Formulario:**
  - Fecha desde: `#gastos-desde`
  - Fecha hasta: `#gastos-hasta`
  - Granularidad: `#gastos-granularidad` (valores: `CICLO_COMPLETO`, `MENSUAL`, `SEMANAL`)
  - Selector de activo: `#gastos-activo` (input de búsqueda interactivo)
  - Botón Generar: `form button[type="submit"]`
- **Botones de Exportación:**
  - Botón PDF: `button:contains("PDF")` dentro del panel `#reporte-titulo`.
  - Botón CSV: `button:contains("CSV")` dentro del panel `#reporte-titulo`.

---

### I. Verificación Final (Paso 8)

1. **Integridad de Git:**
   - `git -C C:\Users\Juansegutt\Integrador\sgpmp-backend status --short` -> **IDÉNTICO AL PASO 0.1**.
   - `git -C C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA status --short` -> **IDÉNTICO AL PASO 0.1**.
   - No se realizó ningún commit, push, stash ni modificación de archivos rastreados.
2. **Escaneo de Secretos:**
   - Se ejecutó escaneo de cadenas sensibles (`password`, `Bearer`, `secret`, `token` y valores reales) sobre todos los archivos generados.
   - **Resultado:** **LIMPIO** (Cero tokens, contraseñas o secretos filtrados).
3. **Lista de Archivos Creados:**
   - `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\fase1_analisis_G23.md` (este informe).
   - `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo5\RF-77\TC-M05-G23\evidencias\diag_g23\censo_test.json` (salida saneada del censo).
   - `C:\Users\Juansegutt\Integrador\_diag_m05\g23\censo_datos.mjs` (script de censo).
   - `C:\Users\Juansegutt\Integrador\_diag_m05\g23\check_all_gastos.mjs` (script de verificación global).
   - `C:\Users\Juansegutt\Integrador\_diag_m05\g23\check_creds.mjs` (script de validación de variables).

