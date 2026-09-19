# Reevaluación V3 — TC-M02-G24

## 1. Metadata
- **RUN_ID**: `G24-REEVAL-V3-20260918-203134`
- **Fecha**: `2026-09-18`
- **Hora Local**: 20:31:34 (UTC-5)
- **Hora UTC**: 2026-09-19T01:31:34Z
- **Entorno**: TEST (`https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`)
- **Frontend**: `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`
- **Evaluador**: Sebastian (según asignaciones.csv)
- **Ronda**: V3
- **Reintento**: `_reintento2`
- **Caso / Módulo / RF**: TC-M02-G24 / Módulo 2 / RF-36, RF-33, RF-37, RF-39, RF-44 (CU03)

---

## 2. Auditoría de código (Fase 0) y Correcciones Aplicadas (Fase A)

### 2.1 Estado Inicial del Spec
Previo a la ejecución, se auditó el código del spec (`TC-M02-048_ficha_lote_ui.cy.ts`, 337 líneas) y los archivos de soporte, evaluando los 7 defectos normativos y buenas prácticas:

| Defecto | ¿Presente? | Archivo:Línea | Corrección Requerida |
| :--- | :--- | :--- | :--- |
| **D1** | SÍ | `commands.ts:12-13`, `spec:19-20`, `postman:15,19` | Eliminados fallbacks y credenciales en duro. Uso estricto de variables de entorno. |
| **D2** | SÍ | `commands.ts:18` | Cambiado selector `'Ingresar'` por regex bilingüe `/^(Ingresar\|Sign In\|Log In)$/i`. |
| **D3** | SÍ | `commands.ts:19` | Ampliado timeout de transición de login de 15s a 120s para resiliencia ante latencia en TEST. |
| **D4** | SÍ | `cypress.config.js:16` | Ajustado `retries: { runMode: 2, openMode: 0 }`. |
| **D5** | SÍ | `spec:47` | Eliminada dependencia de seeds preexistentes; forzada creación dinámica y limpia de lote virgen. |
| **D6** | SÍ | `spec:138-141, 236, 295` | Reemplazados selectores monolingües por expresiones regulares bilingües (`/^(Cantidad actual\|Current quantity)$/i`, etc.). |
| **D7** | SÍ | `spec:87-104` | Teardown envuelto en `try/catch` y migrado de `'BAJA'` a `'INACTIVO'`. |
| **Adic.** | SÍ | `postman/TC-M02-G24.json` | Paso 0.4 actualizado a `id_ciclo_productiva: 4` (Cachama Blanca) y evento de crecimiento con payload completo (`tipo_medicion: 'PESO'`). |
| **Adic.** | SÍ | `spec` / `scanner.py` | Implementada emisión del JSON computable en `resultados/resultado_TC-M02-G24_reintento2.json`. |

### 2.2 Resumen de Diffs Aplicados
- `commands.ts`: Se removieron los defaults en texto plano y se implementó el selector bilingüe con timeout de 120000ms.
- `cypress.config.js`: Se estableció `runMode: 2`.
- `postman/TC-M02-G24.postman_collection.json`: Variables `admin_email` y `admin_password` vaciadas; asignación de ciclo enlazada a ID 4 de catálogo; evento de crecimiento incluye campos zootécnicos requeridos; teardown ajustado a `INACTIVO`.
- `postman/run_newman_tc_m02_g24.js`: Documentada separación de roles (Newman para reporte intermedio rápido, Cypress para el reporte computable definitivo en `resultados/`).
- `TC-M02-048_ficha_lote_ui.cy.ts`: Refactorización integral con creación dinámica de lote, asignación de fase, selectores bilingües, recálculos matemáticos rigurosos, try/catch en teardown y acumulación de checkpoints estructurados.

---

## 3. Preflight ejecutado (Fase B)
- **B.1 Health Check**: `GET /health` → **HTTP 200 OK**. Servicio activo y respondiendo.
- **B.2 Autenticación Administrativa**: `POST /sesiones/` → **HTTP 200 OK**. Token JWT administrativo obtenido satisfactoriamente sin rate-limiting.
- **B.3 Catálogo de Ciclo Productivo**: Confirmada existencia y validez de `id_ciclo_productiva = 4` (Cachama Blanca, "Ciclo completo cachama 2025-A", fase inicial "Fase juvenil cachama") en el catálogo de producción animal.
- **B.4 Infraestructura de Producción**: Confirmada existencia de `id_infraestructura = 3` (`Alevinera-01`, superficie `500.00 m²`, estanque activo, finca ID 1).

---

## 4. Contexto histórico
- **V1 (2026-09-08)**: Veredicto **Rechazado**. Falla bloqueante por error 500 en `POST /activos-biologicos` y rate-limiting de credenciales hardcodeadas inactivas.
- **V2 (2026-09-14)**: Veredicto **Rechazado**. Persistencia del error 500 al registrar el lote, trigger de baja abortando transacciones y densidad inicial nula.
- **Cambios de Backend entre V2 y V3**:
  - **PR #254** (`fix/rf45-inc-m02-80-g61-trigger-baja`): Corrige comparación del enum en trigger `trg_fn_baja_cantidad_valida`.
  - **PR #260** (`fix/inc-m02-195-g24-densidad-inicial`): Implementa cálculo automático de densidad inicial en lotes poblacionales vírgenes (superficie 500 m² / 100 animales = 0.2000).

---

## 5. Resultados por subcaso

### 5.1 TC-M02-048 — Consulta de Ficha Técnica y Métricas Solo Lectura (RF-36)
- **Estado**: **FALLA** (en UI) / **OK** (en API)
- **Pasos Ejecutados**:
  - Creación dinámica de lote poblacional virgen ID #354 (Newman) y #356 (Cypress) vía `POST /activos-biologicos` → **HTTP 201 Created**. Densidad calculada en `0.2000` (Verificado PR #260).
  - Intento de mutación directa vía `PATCH /activos-biologicos/{id}` con métricas calculadas → **HTTP 400 Bad Request** (C1 API cumplido).
  - Navegación UI Web a `/activos-biologicos/{id}`: la aplicación cliente intentó refrescar la sesión disparando `POST /sesiones/refresh`, el cual respondió **HTTP 500 Internal Server Error**, redirigiendo inmediatamente a `/login` y provocando `TOKEN_REVOCADO`. El contenedor DOM no pudo ser verificado.
- **Evidencia**: `cypress_screenshots/TC-M02-G24 — Suite E2E de Gestión Poblacional (RF-36 RF-33 RF-37 RF-39 RF-44) -- TC-M02-048 (C1) Consulta de Ficha Técnica — verificación DOM de métricas y regla de solo lectura (UI + API) (failed) (attempt 3).png`.

### 5.2 TC-M02-049 — Evento CRECIMIENTO y Fórmula Biomasa (RF-39)
- **Estado**: **OK** (en API) / **FALLA** (en UI por revocación de sesión)
- **Pasos Ejecutados**:
  - Registro de evento de crecimiento vía `POST /activos-biologicos/{id}/eventos/crecimiento` con peso `12.50 kg` → **HTTP 201 Created**.
  - Consulta GET: `peso_promedio` actualizado a `12.50 kg`, `biomasa_total` recalculada exactamente a `1250.00 kg` (`100 * 12.50`). Fórmula zootécnica validada.
- **Evidencia**: `TC-M02-G24_postman_resultado_V3.json` (Ejecución Paso TC-M02-049).

### 5.3 TC-M02-050 — Evento BAJA y Descuento de Cantidad (RF-39)
- **Estado**: **FALLA**
- **Pasos Ejecutados**:
  - Solicitud `POST /activos-biologicos/354/eventos/baja` con `fecha_baja: "2026-09-19"`, `cantidad_afectada: 10`.
  - **Respuesta Backend**: **HTTP 400 Bad Request**.
  - **Detalle de Error**: `{"error_code":"FECHA_INVALIDA","message":"La fecha del evento (2026-09-19 00:00:00+00) no puede ser anterior a la fecha de registro del activo (2026-09-19 01:32:14.661954+00)."}`.
  - **Causa Raíz**: En lotes creados en la misma fecha UTC actual, el backend compara la fecha truncada a medianoche (`00:00:00`) contra el timestamp con hora de creación (`01:32:14`), resultando en que la fecha del evento aparece erróneamente como anterior al registro. Si se envía la fecha de mañana (`2026-09-20`), el backend la rechaza con `FECHA_BAJA_FUTURA`. Si se envía formato ISO con hora, el validador Pydantic rechaza la solicitud exigiendo formato estricto `YYYY-MM-DD`. Por consiguiente, es imposible registrar bajas el mismo día de creación del lote.
- **Evidencia**: `postman_stdout.log`, `TC-M02-G24_postman_resultado_V3.json`.

### 5.4 TC-M02-056 — Inmutabilidad de Registro Original (RF-33)
- **Estado**: **FALLA** (en dinamismo)
- **Pasos Ejecutados**:
  - Consulta `GET /activos-biologicos/{id}`: `cantidad_inicial = 100` y `peso_promedio_inicial = 10.0` se mantuvieron intactos.
  - No obstante, la aserción de dinamismo (`cantidad_actual != cantidad_inicial`) falló porque el evento de baja fue rechazado por el backend, manteniendo la cantidad actual en 100.
- **Evidencia**: `postman_stdout.log`.

---

## 6. Resumen de checkpoints

| Paso | Esperado | Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| Paso 0.1 — Login administrativo y JWT | HTTP 200 con JWT válido | HTTP 200 OK con token JWT | **OK** |
| Paso 0.2 — Creación dinámica de lote virgen | HTTP 201 Created con ID lote | HTTP 201 Created (ID #354 / #356) | **OK** |
| Paso 0.3 — Asignación de fase inicial | HTTP 201 Created (fase ciclo 4) | HTTP 201 Created | **OK** |
| TC-M02-048 — C1 API: Rechazo mutación directa | HTTP 400 o 422 Bad Request | HTTP 400 Bad Request | **OK** |
| TC-M02-048 — C1 UI: Consulta Ficha DOM | Tarjetas métricas solo lectura | Falla: HTTP 500 en `/sesiones/refresh` | **FALLA** |
| TC-M02-049 — C2 API: Evento CRECIMIENTO | HTTP 201 Created con nuevo peso | HTTP 201 Created (peso 12.50 kg) | **OK** |
| TC-M02-049.1 — C2 API: Fórmula Biomasa Total | `biomasa == 1250.00 kg` | `biomasa == 1250.00 kg` exacto | **OK** |
| TC-M02-050 — C3 API: Evento BAJA | HTTP 201 Created (-10 animales) | HTTP 400 Bad Request (`FECHA_INVALIDA`) | **FALLA** |
| TC-M02-050.1 — C3 API: Descuento cantidad | `cantidad_actual == 90` | Falla en cascada (permaneció en 100) | **FALLA** |
| TC-M02-056 — C4 API: Inmutabilidad y dinamismo | Iniciales intactas y actual mutada | Falla: actual no mutó por fallo en baja | **FALLA** |

- **Checkpoints Totales**: 10
- **Checkpoints OK**: 6
- **Checkpoints FALLA**: 4

---

## 7. Idempotencia y limpieza
- **Lotes Creados en la Corrida V3**:
  - Lote Newman: ID #354.
  - Lote Cypress: ID #356.
  - Lote de verificación: ID #355.
- **Teardown Ejecutado**:
  - Lote #354: `PATCH /activos-biologicos/354/estado` con `estado_nuevo: "INACTIVO"` → **HTTP 200 OK**.
  - Lote #356: `PATCH /activos-biologicos/356/estado` con `estado_nuevo: "INACTIVO"` → **HTTP 200 OK**.
  - Lote #355: `PATCH /activos-biologicos/355/estado` con `estado_nuevo: "INACTIVO"` → **HTTP 200 OK**.
- **Confirmación**: Cero residuos activos en base de datos TEST (`id_estado = 1` no contiene lotes efímeros de esta suite). Cero sentencias `DELETE` físico ejecutadas (100% apego a soft-delete).

---

## 8. Veredicto final
- **Veredicto Global**: **Rechazado**
- **Dictamen**: La suite TC-M02-G24 se califica como **Rechazado** debido a la presencia de dos defectos técnicos independientes y diferenciados en su ámbito de responsabilidad: un defecto funcional propio del flujo zootécnico (D-A) y un defecto de infraestructura/auditoría transversal de sesiones (D-B).

### 8.1 Defectos que bloquean el veredicto

| Defecto | Endpoint | Categoría | Severidad | Impacto V3 |
| :--- | :--- | :--- | :--- | :--- |
| **D-A** (Nuevo) | `POST /activos-biologicos/{id}/eventos/baja` | FUNCIONAL / VAL_ENTRADA | Severo | Subcaso TC-M02-050 bloqueado: rechazo con HTTP 400 `FECHA_INVALIDA` por comparación entre `fecha_baja` (medianoche UTC 00:00:00) y `fecha_registro` (timestamp 01:32:14 UTC). Impide verificar descuento de cantidad a 90 y dinamismo en C4. |
| **D-B** (Conocido) | `POST /sesiones/refresh` | AUDITORIA | Crítico | Cypress E2E bloqueado: la PWA dispara refresh de sesión que falla con HTTP 500 (`AUDITORIA_OBLIGATORIA_FALLIDA` por `tipo_evento: 23` no sembrado en `modulo1.tipos_eventos`). Redirige al login y revoca el token en los 4 subcasos UI. |

### 8.2 Defectos resueltos desde V2

- **Densidad inicial calculada correctamente (PR #260)**: El endpoint `POST /activos-biologicos` calcula automáticamente `densidad: 0.2000` (100 animales / 500 m²) en lotes vírgenes, satisfaciendo el criterio C1 en REST.
- **Trigger de baja ya no arroja 500 en comparación de tipo (PR #254)**: La excepción no controlada por comparación case-sensitive de enum fue superada; la petición ahora alcanza la capa de validación de negocio (revelando el defecto D-A).
- **POST /activos-biologicos ya no arroja 500**: La creación dinámica del activo biológico poblacional es 100% operativa y responde HTTP 201 Created.

---

## 9. Recomendaciones
1. **Backend (Defecto D-A / RF-36)**: Modificar la validación cronológica en eventos de activos biológicos para comparar fechas (`date(fecha_evento) < date(fecha_registro)`) en lugar de comparar `timestamp` con hora contra `date` a medianoche.
2. **Backend (Defecto D-B / Transversal M01)**: Sembrar la fila faltante para `id = 23` (`REFRESH_TOKEN_ROTADO`) en `modulo1.tipos_eventos` y revisar si el `id = 24` también falta, evitando la excepción 500 en `POST /sesiones/refresh`.
3. **Seguimiento**: Remitir los hallazgos técnicos al equipo de Desarrollo Backend para su subsanación antes de una nueva ronda de evaluación.
