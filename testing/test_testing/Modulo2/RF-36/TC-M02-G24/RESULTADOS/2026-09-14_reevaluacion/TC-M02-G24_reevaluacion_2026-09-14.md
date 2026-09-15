# Reevaluación Técnica — TC-M02-G24 · RF-36 · Módulo 02
## Gestión y Consulta de Ficha Técnica de Lotes Poblacionales

---

## 1. Encabezado y Metadatos

| Parámetro | Detalle |
| :--- | :--- |
| **Título del Caso** | Reevaluación Integral Rediseñada — TC-M02-G24 · RF-36 · Módulo 02 |
| **Identificador de Caso** | `TC-M02-G24` (Subcasos: `TC-M02-048`, `TC-M02-049`, `TC-M02-050`, `TC-M02-056`, Prerrequisito `0.4`) |
| **Módulo / Requerimiento / CU** | Módulo 02 (Activos Biológicos) / `RF-36` (Gestión Poblacional), `RF-33`, `RF-37`, `RF-39`, `RF-44`, `RF-16` / `CU03` |
| **Fecha de Corrida Rediseñada** | 2026-09-14 (UTC-5) / `2026-09-15T01:45:10Z` |
| **Fecha de Corrida Histórica** | 2026-09-08 (`2026-09-08T03:09:35Z`) |
| **Entorno Frontend TEST** | `http://localhost:5173` / `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io` |
| **Entorno Backend TEST** | `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` (FastAPI) |
| **Base de Datos TEST** | PostgreSQL 15 (`158.69.200.27:5448/sgpmp_test`, Rol auditoría: `member_qa`) |
| **Herramientas de Ejecución** | Cypress v13.17.0 (Chrome 152 Headless) / Newman CLI v6.2.2 / Node.js v26.1.0 |
| **Cuenta de Ejecución Vigente** | `administador.dev@gmail.com` (Rol: Administrador / Contraseña: `Test1234!`) |
| **Veredicto Global** | 🚫 **FALLIDO (Regresión HTTP 500 en POST /activos-biologicos)** |


---

## 2. Resumen Ejecutivo

### 2.1. Tabla Resumen de Criterios y Veredicto por Subcaso

| Subcaso | Criterio de Aceptación | Herramienta | Resultado | Evidencia Técnica Directa |
| :--- | :--- | :--- | :---: | :--- |
| **TC-M02-048** | **C1:** Métricas agregadas de solo lectura en UI y API | Cypress UI + API | 🚫 **BLOCKED** | Aborto en precondición: `POST /activos-biologicos` retorna HTTP 500. |
| **TC-M02-049** | **C2:** Evento CRECIMIENTO y recálculo biomasa ($N \times P$) | Cypress + Newman | 🚫 **BLOCKED** | Sin lote creado; guard clause en Newman abortó ejecución en cadena. |
| **TC-M02-050** | **C3:** Evento BAJA y descuento de animales ($100 - 10 = 90$) | Cypress + Newman | 🚫 **BLOCKED** | Sin lote creado; suite previene URLs malformadas (`//eventos`). |
| **TC-M02-056** | **C4:** Inmutabilidad de `cantidad_inicial` y `peso_inicial` | Cypress + Newman | 🚫 **BLOCKED** | Sin lote creado; no hay mutación sobre la cual contrastar inmutabilidad. |

**Veredicto Global:** 🚫 **FALLIDO.** La regresión interna en la persistencia de activos biológicos en el entorno TEST impide la ejecución de las pruebas funcionales de negocio para RF-36.

---

## 3. Estado Previo y Contractual

### 3.1. Health-Check del Backend TEST
- **Endpoint:** `GET /health` → **HTTP 200 OK** (663 ms)
- **Cuerpo:** `{"status": "ok", "message": "API funcionando correctamente"}`

### 3.2. Consulta de Seeds y Últimos Lotes en BD TEST
```sql
SELECT COUNT(*) FROM modulo2.activos_biologicos a
LEFT JOIN modulo2.estados_activos_biologicos e ON a.id_estado = e.id_estado_activo_biologico
WHERE a.tipo = 'POBLACIONAL' AND e.nombre = 'ACTIVO';
-- Resultado: 56 lotes poblacionales activos en base de datos.

SELECT id_activo_biologico, tipo, id_infraestructura, fecha_creacion 
FROM modulo2.activos_biologicos ORDER BY fecha_creacion DESC LIMIT 3;
-- Resultado:
-- 1. ID #352 | POBLACIONAL | Infra 1 | 2026-09-12T19:04:30.406Z
-- 2. ID #351 | POBLACIONAL | Infra 1 | 2026-09-12T19:01:44.571Z
-- 3. ID #350 | INDIVIDUAL  | Infra 61| 2026-09-12T01:29:23.251Z
```
> **Hallazgo de Ambiente:** El último lote persistido en la base de datos TEST data del **2026-09-12 19:04 UTC**. Desde esa fecha, ningún registro de activos biológicos ha podido persistirse exitosamente.

### 3.3. Parámetros de Infraestructura (Superficie)
- **Infraestructura ID 3 (`Alevinera-01`):** `500.00 m²`
- **Infraestructura ID 1 (`Estanque-01`):** `2500.00 m²`
- Para un lote de 100 animales en Infraestructura 3, la densidad nominal esperada es:
  $$\text{Densidad} = \frac{100\text{ animales}}{500.00\text{ m}^2} = 0.2000\text{ ind/m}^2$$

---

## 4. Resultados de la Ejecución de Cypress

- **Comando:**
  ```bash
  npx cypress run --config-file cypress.config.js --browser chrome --headless \
    --env ADMIN_EMAIL="administador.dev@gmail.com",ADMIN_PASSWORD="Test1234!"
  ```
- **Duración:** 2 segundos. **Exit Code:** 1.
- **Log de Salida:** [cypress_stdout_2026-09-14.log](cypress_stdout_2026-09-14.log)

| Test / Bloque | Código Obtenido | Estado | Detalle del Resultado |
| :--- | :---: | :---: | :--- |
| `TC-M02-048 (C1): Consulta Ficha Técnica` | Error Precondición | ❌ FAIL (Bloqueado) | `Precondición no satisfecha: no hay lote poblacional activo en BD ni fue posible crearlo vía POST /activos-biologicos. Ver defecto bloqueante en backend.` |
| `TC-M02-049 (C2): Evento CRECIMIENTO` | Error Precondición | ❌ FAIL (Bloqueado) | `Precondición no satisfecha: lote no disponible.` |
| `TC-M02-050 (C3): Evento BAJA` | Error Precondición | ❌ FAIL (Bloqueado) | `Precondición no satisfecha: lote no disponible.` |
| `TC-M02-056 (C4): Inmutabilidad` | Error Precondición | ❌ FAIL (Bloqueado) | `Precondición no satisfecha: lote no disponible.` |

### Artefactos Generados por Cypress
- **Video:** `RESULTADOS/TC-M02-G24/videos/TC-M02-048_ficha_lote_ui.cy.ts.mp4`
- **Screenshots:**
  - `screenshots/TC-M02-048_ficha_lote_ui.cy.ts/TC-M02-G24 ... TC-M02-048 (C1) ... (failed).png`
  - `screenshots/TC-M02-048_ficha_lote_ui.cy.ts/TC-M02-G24 ... TC-M02-049 (C2) ... (failed).png`
  - `screenshots/TC-M02-048_ficha_lote_ui.cy.ts/TC-M02-G24 ... TC-M02-050 (C3) ... (failed).png`
  - `screenshots/TC-M02-048_ficha_lote_ui.cy.ts/TC-M02-G24 ... TC-M02-056 (C4) ... (failed).png`

---

## 5. Resultados de la Ejecución de Newman

- **Comando:**
  ```bash
  npx newman run postman/TC-M02-G24.postman_collection.json \
    --env-var "admin_email=administador.dev@gmail.com" \
    --env-var "admin_password=Test1234!" \
    --reporters cli,json \
    --reporter-json-export "RESULTADOS/2026-09-14_reevaluacion/TC-M02-G24_postman_resultado_2026-09-14.json" \
    --timeout-request 15000
  ```
- **Duración:** 2.2 segundos. **Exit Code:** 1.
- **Log de Salida:** [postman_stdout_2026-09-14.log](postman_stdout_2026-09-14.log)

| Request | Endpoint | Esperado | Obtenido | Tiempo | Veredicto |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Paso 0.1 — Login Admin** | `POST /sesiones/` | HTTP 200 | HTTP 200 OK | 1327 ms | ✅ **PASS** |
| **Paso 0.2 — Crear Ciclo Biológico** | `POST /configuracion/ciclos` | HTTP 201 | HTTP 201 Created | 177 ms | ✅ **PASS** |
| **Paso 0.3 — Crear Lote Poblacional** | `POST /activos-biologicos` | HTTP 201 | **HTTP 500 ERROR_INTERNO** | 211 ms | ❌ **FAIL (Regresión)** |
| **Paso 0.4 — Asignar Fase Productiva** | `POST /activos-biologicos//fases` | HTTP 200/201 | **HTTP 405 Method Not Allowed** | 230 ms | ❌ **FAIL (Cascada)** |
| *Subcasos 048, 049, 050, 056* | `/eventos/*`, `/activos/*` | — | **SALTADOS POR GUARD CLAUSE** | — | 🚫 **BLOCKED** |

> **Diagnóstico Newman:** A diferencia de la versión anterior, la aserción estricta de HTTP 201 expuso de inmediato el HTTP 500 del servidor. El script de pre-request activó la *guard clause* (`[GUARD CLAUSE] lote_id no disponible. Abortando flujo.`), interrumpiendo la colección y evitando 8 peticiones con URLs malformadas.

---

## 6. Evidencia de Persistencia Post-Condición

### 6.1. Verificación en PostgreSQL TEST
```sql
SELECT a.id_activo_biologico, a.tipo, p.cantidad_inicial, p.cantidad_actual,
       p.peso_promedio_inicial, p.peso_promedio, p.biomasa_total, p.densidad,
       a.fecha_creacion
FROM modulo2.activos_biologicos a
LEFT JOIN modulo2.detalles_activos_biologicos_poblacionales p ON a.id_activo_biologico = p.id_activo_biologico
WHERE a.id_activo_biologico = 352;
```
- **Resultado:**
  ```json
  {
    "id_activo_biologico": 352,
    "tipo": "POBLACIONAL",
    "cantidad_inicial": 500,
    "cantidad_actual": 500,
    "peso_promedio_inicial": "0.1000",
    "peso_promedio": null,
    "biomasa_total": null,
    "densidad": null
  }
  ```

### 6.2. Auditoría Reciente en Módulo 02
```sql
SELECT id_bitacora, rf_origen, tipo_evento, resultado, id_usuario_responsable, timestamp_registro
FROM modulo2.bitacora_auditoria_m02 ORDER BY id_bitacora DESC LIMIT 5;
```
- **Registro de Auditoría:**
  - ID #1278: `RF35` | `ACTIVO_INDIVIDUAL_CONSULTA` | `EXITOSO` | Usuario 104 (`administador.dev@gmail.com`)
  - ID #1277: `RF36` | `VALIDACION_RECHAZADA` | `FALLIDO` | Usuario 104
  - ID #1276: `RF36` | `VALIDACION_RECHAZADA` | `FALLIDO` | Usuario 104

---

## 7. Verificación de Limpieza

```sql
SELECT COUNT(*) FROM modulo2.activos_biologicos a
LEFT JOIN modulo2.estados_activos_biologicos e ON a.id_estado = e.id_estado_activo_biologico
WHERE e.nombre = 'ACTIVO' AND a.fecha_creacion >= NOW() - INTERVAL '60 minutes';
-- Conteo resultante: 0 lotes huérfanos.
```
- **Cumplimiento Append-Only:**
  - Cero comandos `DELETE` físicos ejecutados.
  - Cero modificaciones DDL en la base de datos.
  - Rollback transaccional íntegro ejecutado por el backend ante la excepción 500.

---

## 8. Dictamen por Criterio de Aceptación

| Criterio | Estado | Evidencia Concreta | Observación Técnica |
| :--- | :---: | :--- | :--- |
| **C1. Métricas de Solo Lectura** | 🚫 **BLOQUEADO** | Cypress abortó en `before()`; Newman falló en Paso 0.3. | Imposible validar inmutabilidad en DOM / API sin lote persistido. |
| **C2. Recálculo Fórmula Biomasa** | 🚫 **BLOQUEADO** | Saltado por guard clause en Newman y abortado en Cypress. | El endpoint de eventos de crecimiento requiere lote activo con fase. |
| **C3. Descuento por Baja** | 🚫 **BLOQUEADO** | Saltado por guard clause en Newman y abortado en Cypress. | El endpoint de eventos de baja requiere lote activo. |
| **C4. Inmutabilidad Histórica** | 🚫 **BLOQUEADO** | Saltado por guard clause en Newman y abortado en Cypress. | Sin eventos ejecutados, no se puede contrastar inmutabilidad. |

---

## 9. Recomendaciones para el Equipo de Desarrollo (Backend)


1. **Defecto Principal:** Excepción HTTP 500 no controlada en `POST /activos-biologicos`.
2. **Respuesta del Servidor:**
   ```json
   {
     "error_code": "ERROR_INTERNO",
     "message": "Ocurrió un error interno. Intenta de nuevo; si el problema persiste, contacta al equipo de soporte.",
     "fields": [],
     "timestamp": "2026-09-15T01:44:06.432352+00:00"
   }
   ```
3. **Payload de Reproducción Mínimo (cURL):**
   ```bash
   curl -X POST "https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/activos-biologicos" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_ADMIN_VALIDO>" \
     -d '{
       "tipo_activo": "POBLACIONAL",
       "id_especie": 4,
       "id_infraestructura": 3,
       "fecha_inicio_ciclo": "2026-09-14",
       "origen_financiero": "compra",
       "costo_adquisicion": 50000,
       "soporte_documental": "Factura-TC-M02-G24",
       "cantidad_inicial": 100,
       "peso_promedio_inicial": 10.0
     }'
   ```
4. **Punto de Inspección en Código Backend:**
   - Revisar `modulo2/infraestructura/repositorios/activo_biologico_repository.py` en el método `guardar()`.
   - Inspeccionar triggers de base de datos en `modulo2.activos_biologicos` y `modulo2.detalles_activos_biologicos_poblacionales`.
