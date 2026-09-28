# Documento de Diseño y Especificación Técnica de Rediseño (V2)
## Suite: TC-M02-G24 · Módulo 02 · RF-36 · CU03
### Gestión y Consulta de Ficha Técnica de Lotes Poblacionales
### RUN_ID: G24-REEVAL-V2-20260914-010334

---

## 1. Tabla de Mapeo de Cobertura (Criterio → Subcaso → Capa → Aserción)

| Criterio | Subcaso | Capa | Aserción Exacta Declarada | Propósito y Regla de Negocio |
| :--- | :---: | :---: | :--- | :--- |
| **C1: Métricas de Solo Lectura** | TC-M02-048 | Cypress UI | `cy.get('@box*').find('input, textarea, ion-input').should('not.exist')` | Comprueba en el DOM que los indicadores zootécnicos no contienen controles de edición. |
| **C1: Métricas de Solo Lectura** | TC-M02-048 | Cypress API | `expect(resPatch.status).to.be.oneOf([400, 422])` | Comprueba que el backend rechaza intentos de mutación directa vía PATCH sobre métricas calculadas. |
| **C1: Métricas de Solo Lectura** | TC-M02-048 | Newman API | `pm.expect(pm.response.code).to.be.oneOf([400, 422])` | Petición PATCH `/activos-biologicos/{{lote_id}}` con campos calculados es rechazada contractualmente. |
| **C1: Densidad Inicial** | TC-M02-048 | Cypress API | `expect(parseFloat(det.densidad)).to.be.closeTo(0.2, 0.001)` | Si `densidad === null`, arroja excepción inmediata (`throw new Error`). |
| **C2: Recálculo de Biomasa** | TC-M02-049 | Cypress API | `expect(biomasaTotal).to.be.closeTo(cantActual * 12.5, 0.01)` | Verifica fórmula: $\text{biomasa\_total} = \text{cantidad\_actual} \times \text{peso\_promedio}$ tras evento de crecimiento. |
| **C2: Recálculo de Biomasa** | TC-M02-049 | Cypress UI | `cy.contains('div', /^Biomasa total$/i).parent().should('contain.text', biomasaTotal.toFixed(0))` | Verifica que la vista web de la ficha actualiza el valor calculado en pantalla. |
| **C2: Recálculo de Biomasa** | TC-M02-049 | Newman API | `pm.expect(biomasaCalc).to.be.closeTo(det.cantidad_actual * 12.5, 0.01)` | Consulta GET post-crecimiento valida la consistencia matemática de biomasa persistida. |
| **C3: Descuento por Baja** | TC-M02-050 | Cypress API | `expect(det.cantidad_actual).to.eq(90)` | Verifica descuento aritmético exacto: $100 - 10 = 90$ animales. |
| **C3: Descuento por Baja** | TC-M02-050 | Cypress API | `expect(biomasaResultante).to.be.closeTo(90 * pesoProm, 0.01)` | Valida recálculo proporcional de biomasa total post-baja. |
| **C3: Descuento por Baja** | TC-M02-050 | Cypress UI | `cy.contains('div', /^Cantidad actual$/i).parent().should('contain.text', '90')` | Verifica que el saldo en el DOM refleja inmediatamente los 90 individuos. |
| **C3: Descuento por Baja** | TC-M02-050 | Newman API | `pm.expect(det.cantidad_actual).to.eq(90)` y `pm.expect(densidad).to.be.closeTo(90 / 500, 0.001)` | Confirma decremento en base de datos y ajuste de densidad sobre $500\text{ m}^2$. |
| **C4: Inmutabilidad Histórica** | TC-M02-056 | Cypress API | `expect(det.cantidad_inicial).to.eq(100)` y `expect(Number(det.peso_promedio_inicial)).to.eq(10.0)` | Valida que los datos de origen no sufren alteraciones tras eventos de crecimiento y baja. |
| **C4: Inmutabilidad Histórica** | TC-M02-056 | Newman API | `pm.expect(det.cantidad_inicial).to.eq(100)` y `pm.expect(det.cantidad_actual).to.not.eq(100)` | Verifica inmutabilidad inicial y confirma que el lote efectivamente mutó su saldo actual. |

---

## 2. Resumen del Nuevo Spec Cypress (`TC-M02-048_ficha_lote_ui.cy.ts`)

- **Estructura y Precondición:**
  - Token obtenido con credenciales vigentes (`administador.dev@gmail.com` / `Test1234!`).
  - Lookup previo de seed poblacional activo (`GET /activos-biologicos?tipo=POBLACIONAL&id_estado=1&page_size=1`).
  - Fallback de creación dinámico solo si no hay seed. Si la creación falla, aborta limpiamente sin suposiciones ni datos simulados.
  - Teardown suave (`PATCH estado_nuevo = 'BAJA'`) ejecutado únicamente si el activo fue creado por el test.
- **Bloques de Prueba (`it`):**
  1. `TC-M02-048 (C1)`: Login UI, navegación a `/activos-biologicos/${loteId}`, captura de pantalla `01_ficha_lote_ui`, comprobación DOM de que los contenedores de indicadores zootécnicos no son inputs editables, intento de PATCH inválido rechazado con 400/422 y comprobación de densidad inicial con tolerancia $0.001$ (falla explícitamente si es `null`).
  2. `TC-M02-049 (C2)`: Registro de evento de crecimiento ($12.5\text{ kg}$) vía `POST /activos-biologicos/${loteId}/eventos/crecimiento` exigiendo HTTP 201, GET de post-condición comprobando fórmula $\text{biomasa\_total} = \text{cantidad\_actual} \times 12.5$, y comprobación DOM en UI.
  3. `TC-M02-050 (C3)`: Registro de evento de baja ($10\text{ animales}$) vía `POST /activos-biologicos/${loteId}/eventos/baja` exigiendo HTTP 201, GET de post-condición comprobando $\text{cantidad\_actual} == 90$, recálculo de biomasa y densidad, y verificación DOM en UI.
  4. `TC-M02-056 (C4)`: Comprobación estricta de inmutabilidad: `cantidad_inicial == 100` y `peso_promedio_inicial == 10.0` intactos, y `cantidad_actual != 100` para certificar la mutación del saldo.

---

## 3. Resumen de la Nueva Colección Newman (`TC-M02-G24.postman_collection.json`)

- **Variables y Configuración:**
  - `admin_email`: `administador.dev@gmail.com`
  - `admin_password`: `Test1234!`
  - `base_url`: Endpoint de FastAPI TEST.
- **Secuencia de Peticiones y Aserciones:**
  1. `Paso 0.1 — Login Admin`: Exige HTTP 200 y captura `token`.
  2. `Paso 0.2 — Crear Ciclo Biológico Propio (RF-16)`: Exige HTTP 201 y captura `ciclo_id`.
  3. `Paso 0.3 — Crear Lote Poblacional Propio (RF-33)`: Exige HTTP 201 y captura `lote_id`.
  4. `Paso 0.4 — Asignar Fase Productiva (RF-37)`: Exige estrictamente HTTP 200 o 201 (eliminada la tolerancia a 400 `CICLO_INVALIDO`).
  5. `TC-M02-048 — Validar Métricas Solo Lectura C1 (RF-36)`: PATCH con métricas calculadas debe responder HTTP 400 o 422.
  6. `TC-M02-049 — Evento CRECIMIENTO (RF-39)`: Exige estrictamente HTTP 201 (eliminada tolerancia a 400/422).
  7. `TC-M02-049.1 — Verificación Post-Crecimiento C2 (RF-36 / RF-39)`: GET valida `peso_promedio == 12.5` y $\text{biomasa\_total} == \text{cantidad\_actual} \times 12.5$.
  8. `TC-M02-050 — Evento BAJA (RF-39)`: Exige estrictamente HTTP 201 (eliminada tolerancia a HTTP 500).
  9. `TC-M02-050.1 — Verificación Post-Baja C3 (RF-36 / RF-39)`: GET valida `cantidad_actual == 90`, biomasa recalculada y densidad recalculada ($\approx 0.1800$).
  10. `TC-M02-056 — Validar Inmutabilidad Registro Original C4 (RF-33)`: GET valida `cantidad_inicial == 100`, `peso_promedio_inicial == 10.0` y `cantidad_actual != 100`.
  11. `Teardown Lote (RF-44)`: PATCH estado a `BAJA` exige HTTP 200.
  12. `Teardown Ciclo (RF-16)`: PATCH desactivar ciclo exige HTTP 200.

---

## 4. Checklist de Auto-Validación (Tarea 4)

| Ítem de Validación | Estado | Detalle de Cumplimiento |
| :--- | :---: | :--- |
| **Cobertura C1 (Solo Lectura)** | ✅ CUMPLE | Aserción DOM contra inputs en UI + PATCH rechazado con 400/422 en Cypress y Postman. |
| **Cobertura C2 (Fórmula Biomasa)** | ✅ CUMPLE | POST Crecimiento exige 201; GET post-condición valida $\text{biomasa} = \text{cantidad} \times \text{peso}$; UI valida texto en DOM. |
| **Cobertura C3 (Descuento por Baja)** | ✅ CUMPLE | POST Baja exige 201; GET post-condición valida $\text{cantidad} == 90$ y recálculos; UI valida texto '90' en DOM. |
| **Cobertura C4 (Inmutabilidad)** | ✅ CUMPLE | GET valida $\text{cantidad\_inicial} == 100$ y $\text{peso\_promedio\_inicial} == 10.0$ intactos. |
| **Anti-Antipatrón A1 (UI sin DOM)** | ✅ CUMPLE | El spec consulta directamente los contenedores DOM de los indicadores mediante `cy.contains().parent()`. |
| **Anti-Antipatrón A4 (Tipos incorrectos)** | ✅ CUMPLE | Conversión numérica explícita con `parseFloat()` y comparaciones de punto flotante con `closeTo()`. |
| **Anti-Antipatrón A6 (Teardown destructivo)** | ✅ CUMPLE | Uso estricto de PATCH soft-delete; nunca `DELETE` físico ni modificaciones DDL. |
| **Anti-Antipatrón A7 (Credenciales obsoletas)** | ✅ CUMPLE | Variables y fallbacks actualizados a `administador.dev@gmail.com` / `Test1234!`. |
| **Anti-Antipatrón A9 (Criterios sin aserción)** | ✅ CUMPLE | Todos los criterios C1-C4 cuentan con aserciones cuantitativas directas. |
| **Anti-Antipatrón A11 (Ramas permisivas)** | ✅ CUMPLE | Cero condicionales que perdonen errores 400 o 500. El test falla ruidosamente ante cualquier fallo del backend. |
