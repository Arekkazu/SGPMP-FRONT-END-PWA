# TC-M09-G03 — Diseño del Caso de Prueba

| Metadato | Detalle |
| :--- | :--- |
| **Identificador del Caso** | `TC-M09-G03` |
| **Requisito Funcional** | `RF-15` (Catálogo de especies productivas) — `CU-01` |
| **Ambiente Objetivo** | TEST (`https://api.inmero.co` \| Backend `https://api.inmero.co/back-sigab-test`) |
| **Tipo de Prueba** | Funcional E2E Híbrida (Cypress UI + API REST Contract) |
| **Herramientas** | Cypress v13, Electron 118, TypeScript v5 |
| **Credenciales** | Variables de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_ADMIN_PASSWORD`) / `.env.test` |

---

## 1. Objetivo y Alcance

Validar el flujo integral de edición de especies existentes en el catálogo productivo bajo las especificaciones de **RF-15 (CU-01)**, evaluando:
1. La persistencia y reflejo inmediato de cambios en la interfaz de usuario.
2. El contrato API del endpoint `PATCH /configuracion/especies/{id}`.
3. El avance automático y autónomo del timestamp de modificación (`fecha_actualizacion`).
4. La resiliencia del sistema ante especies que nunca antes habían sido editadas (`fecha_actualizacion: null`), demostrando la mitigación de los defectos **DEF-M09-01** (conflicto falso de concurrencia HTTP 412) e **INC-UI-STATE** (fuga de mensaje de error al cerrar/reabrir modales).

---

## 2. Reglas Duras de Selección de Datos y Preflight

1. **Protección Estricta de Fixtures Críticas**:
   - El registro ID `#4` (`Cachama Blanca`) está **protegido contra mutaciones** para garantizar la estabilidad de casos cruzados dependientes (`TC-M09-G18`, `TC-M09-G31`, `TC-M09-G110`, `TC-M09-G116`).
2. **Especie Objetivo**:
   - Se utiliza **`Equino` (ID #42)**, registro activo (`es_activo: true`) nacido originalmente con `fecha_actualizacion: null`, siendo la prueba de fuego para validar la corrección de concurrencia optimista (#231).
3. **Preflight de Verificación**:
   - Antes de iniciar la navegación en la UI, el test consulta `GET /configuracion/especies` vía API autenticado para confirmar la presencia y el estado activo del registro objetivo.
4. **Mutación Controlada**:
   - El nombre se modifica a `Equino Editado` y la descripción a `Especie editada en prueba de reevaluación QA`.

---

## 3. Matriz de Checkpoints

| ID | Herramienta | Paso | Resultado Esperado | Método de Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **CP-1** | Cypress | Autenticación y Navegación SPA | Inicio de sesión exitoso como Admin y navegación a `/configuracion` | `cy.loginUI`, esperar redirección, acceso a sidebar y catálogo. |
| **CP-2** | Cypress | Localización de registro "Equino" | Ubicar en la tabla la especie activa "Equino" y capturar su ID | Selector de fila en tabla `tbody tr`, filtrado por buscador y confirmación de ID `#42`. |
| **CP-3** | Cypress | Diligenciamiento de Edición UI | Diligenciamiento de campos de nombre y descripción válidos | `input[name="nombre"]` y `textarea#especie-desc`, captura visual `01_formulario_edicion_especie_ui.png`. |
| **CP-4** | Cypress | Contrato API PATCH de Edición | Respuesta HTTP 200/201 con objeto actualizado | Intercepción de `@editarEspecie`, validación de status 200 y body. |
| **CP-5** | Cypress | Verificación de `fecha_actualizacion` | El timestamp avanza a un valor posterior y no nulo | Comparación de `fecha_actualizacion` previa vs. posterior devuelta por la API. |
| **CP-6** | Cypress | Restauración Teardown | Reversión automática del registro a "Equino" y descripción original | Petición `PATCH` en hook `after()` con token fresco de API REST. |

---

## 4. Teardown Garantizado y Resiliencia

- **Hook `after()` Indestructible**: Se ejecuta incluso en caso de aserciones no cumplidas, obteniendo un token administrativo fresco para restaurar el registro `#42` a su estado base original.
- **Concurrencia Controlada**: Ejecución estricta con `workers: 1` para prevenir bloqueos de cuenta compartida por colisión de tokens JWT.
- **Ruta de Salida Estandarizada**:
  - Salida computable para el dashboard de QA: `resultados/resultado_TC-M09-G03.json` y `resultados/resultado_TC-M09-G03_reintento1.json`.
  - Evidencias de ejecución: `evidencias/screenshots/`, `evidencias/videos/`.
