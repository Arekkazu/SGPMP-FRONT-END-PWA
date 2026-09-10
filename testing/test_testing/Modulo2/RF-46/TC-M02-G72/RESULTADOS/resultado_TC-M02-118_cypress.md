# TC-M02-G72 — Informe de Ejecución: Historial Consolidado del Activo (RF-46)

| Metadato | Valor |
|---|---|
| **Caso Agrupado** | TC-M02-G72 (RF-46 · CU10A) |
| **Subcaso Principal** | TC-M02-118 (Consultar historial completo consolidado - UI + API) |
| **Ambiente Frontend** | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| **Ambiente Backend** | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| **Navegador** | electron 118.0.5993.159 |
| **Fecha de Ejecución** | 2026-09-10T11:39:26.563Z |
| **Veredicto Global Subcaso 118** | **SIN FALLAS BLOQUEANTES** |

---

## 1. Resumen Ejecutivo
Se evaluó el subcaso híbrido **TC-M02-118** sobre el frontend del activo biológico individual **Activo 2 (BOV-002)**, constatando la navegación SPA visual a través del Sidebar y el catálogo con filtro de estado, la apertura de la ficha de detalle de BOV-002, el renderizado de la pestaña de Historial, las columnas de datos obligatorias, el orden cronológico ascendente verificado en el DOM y la concordancia bidireccional exacta entre la interfaz y la API REST del backend.

---

## 2. Checkpoints Evaluados
| Paso | Comportamiento Esperado | Resultado Obtenido | Estado |
|---|---|---|---|
| CP-01: Autenticación Admin en UI | Inicio de sesión exitoso y redirección | Usuario autenticado y redirigido a /dashboard | **OK** |
| CP-02: Navegación SPA a Módulo Activos Biológicos | Navegación fluida por Sidebar sin pérdida de sesión JWT | Ruta /activos-biologicos cargada con catálogo | **OK** |
| CP-03: Apertura de Ficha de Activo 2 (BOV-002) | Carga de la ficha de detalle de BOV-002 | Ficha cargada con identificador BOV-002 visible | **OK** |
| CP-04: Activación de Pestaña Historial | Visualización de la sección Historial consolidado | Pestaña seleccionada y título Historial consolidado visible | **OK** |
| CP-05: Columnas Obligatorias en Tabla | Presencia de Fecha, Categoría, Descripción, Responsable y Origen | Las 5 cabeceras requeridas están presentes en la tabla | **OK** |
| CP-06: Renderizado de Filas de Historial | Renderiza registros históricos en la tabla | Se renderizaron 20 filas en la página actual | **OK** |
| CP-07: Orden Cronológico Ascendente en UI | Las fechas en td:nth-child(1) están ordenadas ascendentemente (getTime) | Fechas verificadas en orden estrictamente ascendente: 20 elementos conformes | **OK** |
| CP-08: Verificación Híbrida API (cy.request) | HTTP 200 OK con total_registros=42 y registros_por_pagina=20 | GET /activos-biologicos/2/historial HTTP 200 - total_registros: 42, pagina: 1/3, registros devueltos: 20 | **OK** |
| CP-09: Verificación de Seguridad y RBAC | Petición con token inválido rechazada con HTTP 401 | HTTP 401 {"error_code":"TOKEN_INVALIDO","message":"El token es inválido o ha expirado.","fields":[],"timestamp":"2026-09-10T11:39:25.725770+00:00"} | **OK** |

---

## 3. Verificación Híbrida de Red (API REST Backend TEST)
- **Endpoint:** `GET /activos-biologicos/2/historial?pagina=1&page_size=20`
- **Detalle de Red:** GET /activos-biologicos/2/historial HTTP 200 - total_registros: 42, pagina: 1/3, registros devueltos: 20
- **Concordancia UI vs API:** Verificada exitosamente. La API retorna 42 registros consolidados y el paginador de la UI refleja la existencia de los registros.

---

## 4. Verificación de Seguridad y RBAC (Observación 4)
- **Validación con Token Inválido:** Invocación a `GET /activos-biologicos/2/historial` con cabecera Bearer manipulada respondió estrictamente **HTTP 401 Unauthorized** (`TOKEN_INVALIDO`), protegiendo el acceso no autorizado al historial.

---

## 5. Evidencias Visuales
- [01_historial_tabla_ui.png](screenshots/01_historial_tabla_ui.png) — Renderizado de la tabla de historial con columnas y badges.
- [02_paginacion_y_orden_ui.png](screenshots/02_paginacion_y_orden_ui.png) — Verificación de paginación y orden cronológico ascendente.
