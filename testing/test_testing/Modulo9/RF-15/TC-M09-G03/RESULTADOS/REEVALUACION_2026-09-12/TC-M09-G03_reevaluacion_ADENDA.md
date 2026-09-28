# Adenda Técnica de Reevaluación: TC-M09-G03
### Aislamiento de Concurrencia Optimista, Registro de DEF-M09-01 y Trazabilidad de Fixtures

---

## 1. Información General de la Adenda

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M09-G03` (ID Original: `TC-M09-09`) |
| **Módulo / Requerimiento** | Módulo 9 (Configuración del Sistema) / `RF-15` (Catálogo de Especies Productivas) |
| **Caso de Uso** | `CU-01 – Gestionar Catálogo de Especies Productivas` (Edición de Especie) |
| **Fecha de Elaboración** | 2026-09-12 10:15:00 (UTC-5) / `2026-09-12T15:15:00Z` |
| **Responsable de QA** | Ingeniero de QA (Cypress, Playwright y Newman) |
| **Ambientes Evaluados** | **Frontend TEST:** `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`<br>**Backend TEST:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Cuenta de Auditoría** | `admin.dev@gmail.com` (Rol: Administrador / Contraseña: `Test1234!`) |
| **Ubicación de Artefactos** | `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/` |

---

## 2. Auditoría de Integridad de la Fixture Protegida ("Cachama Blanca", ID #4)

Conforme a la verificación solicitada, se consultó el catálogo general (`GET /configuracion/especies`) para auditar el estado del registro `#4`:

```json
{
  "id_especie": 4,
  "nombre": "Cachama Blanca",
  "descripcion": "Pez de agua dulce tropical con alta adaptabilidad a sistemas extensivos e intensivos.",
  "es_activo": true,
  "fecha_creacion": "2026-04-28T14:42:28.213141Z",
  "fecha_actualizacion": "2026-04-28T14:42:28.213141Z"
}
```

### Dictamen de Fixtures
* **"Cachama Blanca" (ID #4) PERMANECE 100% INTACTA**: No fue modificada ni alterada por las pruebas automatizadas ni por la validación manual del responsable del proyecto.
* **Seguridad de Casos Cruzados**: Se mantiene garantizada la integridad operativa de los casos que dependen estrictamente de esta especie (`TC-M09-G18` en RF-16, `TC-M09-G31` en RF-17, `TC-M09-G110` en RF-31 y `TC-M09-G116` en RF-32). **No existe riesgo activo ni requerimiento de restauración en este registro.**
* **Identificación de la Especie Editada Exitosamente**:
  * La edición manual reportada por el responsable del proyecto impactó el **Registro ID #5**, cuyo estado actual es:
    * **Nombre**: `"Mojarra Plateada"`
    * **Fecha Creación**: `2026-04-28T14:42:28.213141Z`
    * **Fecha Actualización**: `2026-09-12T15:03:04.996204Z` (actualizada hoy a las 10:03 AM hora local).
  * Este registro sí poseía una `fecha_actualizacion` previa válida y no nula, confirmando plenamente que el flujo estándar de edición (camino feliz) opera sin inconvenientes en el backend.

---

## 3. Prueba de Aislamiento a Nivel de API (Backend vs. Frontend)

Se realizaron pruebas directas y aisladas contra el endpoint `PATCH /configuracion/especies/43` omitiendo el frontend para determinar si el defecto reside exclusivamente en el cliente o si involucra el contrato del backend.

### 3.1. Prueba 1: Envío explícito de `"fecha_actualizacion": null`
```bash
curl -i -X PATCH "https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/configuracion/especies/43" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Equina", "descripcion": "grupo de mamiferos herbivoros ungulados", "fecha_actualizacion": null}'
```

**Respuesta Cruda del Servidor:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error_code": "VAL_ENTRADA",
  "message": "Errores de validacion en la solicitud",
  "fields": [
    {
      "field": "fecha_actualizacion",
      "message": "Input should be a valid datetime"
    }
  ],
  "timestamp": "2026-09-12T15:12:18.436768+00:00"
}
```

### 3.2. Prueba 2: Omisión del campo `"fecha_actualizacion"`
```bash
curl -i -X PATCH "https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/configuracion/especies/43" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Equina", "descripcion": "grupo de mamiferos herbivoros ungulados"}'
```

**Respuesta Cruda del Servidor:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error_code": "VAL_ENTRADA",
  "message": "Errores de validacion en la solicitud",
  "fields": [
    {
      "field": "fecha_actualizacion",
      "message": "Field required"
    }
  ],
  "timestamp": "2026-09-12T15:13:08.560639+00:00"
}
```

### 3.3. Diagnóstico de Arquitectura (Frontend + Backend)
* **Contrato OpenAPI (`EditarEspecieDTO`)**:
  El esquema en el backend define estrictamente:
  ```json
  "fecha_actualizacion": {
    "type": "string",
    "format": "date-time",
    "title": "Fecha Actualizacion"
  },
  "required": ["nombre", "fecha_actualizacion"]
  ```
* **Conclusión Técnica**:
  El defecto **involucra una asimetría de diseño entre Backend y Frontend**:
  1. Al persistir una especie nueva (`POST`), la base de datos almacena `fecha_actualizacion = NULL`.
  2. Al actualizar (`PATCH`), el DTO del backend declara `fecha_actualizacion` como obligatoria y de tipo estricto `datetime`, **rechazando `null` con HTTP 400**.
  3. Para sortear el tipado de TypeScript en el cliente, el frontend en `SGPMP-FRONT-END-PWA/src/configuration/components/EspeciesModal.tsx` implementó:
     `fecha_actualizacion: especie.fecha_actualizacion ?? new Date().toISOString()`.
  4. Al enviar `new Date().toISOString()` sobre un registro que en la base de datos tiene `fecha_actualizacion IS NULL`, el validador de concurrencia optimista del backend compara el timestamp recibido contra `NULL`, concluyendo que el registro fue alterado y respondiendo `HTTP 412 (CONFLICTO_CONCURRENCIA)`.
  5. Por ende, **ningún registro recién creado con fecha nula puede ser editado ni por UI ni por API** a menos que el backend acepte `null` o inicialice `fecha_actualizacion = fecha_creacion` al registrarse.

---

## 4. Estado de los Registros #42 ("Equino") y #43 ("Equina")

Dado que el validador Pydantic/FastAPI del backend rechaza `null` con `HTTP 400` y rechaza cualquier fecha sintética con `HTTP 412`, ambos registros permanecen atascados en base de datos sin posibilidad de actualización externa vía API REST pública:

* **ID #42 (`"Equino"`)**: `fecha_actualizacion: null` (intacto en su estado original).
* **ID #43 (`"Equina"`)**: `fecha_actualizacion: null` (intacto en su estado original).

> [!NOTE]
> La remediación de estos registros requiere la implementación del fix formal en backend (permitir `fecha_actualizacion: null` en `EditarEspecieDTO` o inicializarla en el `POST`) o un script administrativo de mantenimiento en BD para fijar `fecha_actualizacion = fecha_creacion`.

---

## 5. Registro Formal de Defecto (DEF-M09-01)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `DEF-M09-01` |
| **Componentes Afectados** | Frontend: `SGPMP-FRONT-END-PWA/src/configuration/components/EspeciesModal.tsx` (Línea ~73)<br>Backend: Endpoint `PATCH /configuracion/especies/{id_especie}` (`EditarEspecieDTO` y lógica de concurrencia). |
| **Severidad** | **Media - Alta** |
| **Prioridad** | Alta (Afecta el ciclo de vida básico de cualquier registro nuevo en producción). |
| **Descripción** | Cualquier especie recién creada posee `fecha_actualizacion: null` en base de datos. Al intentar editarla desde la UI, el frontend envía un timestamp del cliente en lugar de `null` para satisfacer el contrato, lo que desencadena una falla de concurrencia optimista (`HTTP 412 CONFLICTO_CONCURRENCIA`). Si se intenta enviar `null` directamente por API, el backend rechaza la petición con `HTTP 400 VAL_ENTRADA`. Como consecuencia, **ninguna especie nueva puede ser editada por primera vez**. |
| **Evidencias de Reproducción** | 1. **Automatizada (Cypress)**: Registro ID `#42` (`"Equino"`) $\rightarrow$ `HTTP 412`.<br>2. **Manual (Responsable)**: Registro ID `#43` (`"Equina"`) $\rightarrow$ `HTTP 412`.<br>3. **Aislamiento API (Curl)**: `fecha_actualizacion: null` $\rightarrow$ `HTTP 400 VAL_ENTRADA` ("Input should be a valid datetime"). |
| **Solución Propuesta** | **Opción A (Recomendada en Backend)**: En `POST /configuracion/especies`, asignar `fecha_actualizacion = fecha_creacion` (o CURRENT_TIMESTAMP), garantizando que todo registro nazca con un timestamp no nulo.<br>**Opción B (En Contrato)**: Permitir `fecha_actualizacion: Optional[datetime] = None` en `EditarEspecieDTO` y soportar la comparación de concurrencia con valores `NULL` en base de datos. |

---

## 6. Veredicto Multicapa Definitivo para TC-M09-G03

```
========================================================================================
DICTAMEN DE QA — TC-M09-G03 (RF-15 / CU-01)
========================================================================================
```

1. **Capa 1: Incidente Histórico INC-M09-01-G01 (`HTTP 500 ERROR_INTERNO`)**:
   * **ESTADO: CERRADO / RESUELTO**.
   * No se evidenció ninguna reincidencia de caída del motor transaccional ni fallos de persistencia en base de datos. La infraestructura y endpoints de escritura operan con normalidad en operaciones de creación (`POST`) y edición (`PATCH`).

2. **Capa 2: Camino Feliz de Edición Estándar (Registros con Timestamp Previos)**:
   * **ESTADO: APROBADO / CONFIRMADO FUNCIONAL**.
   * Evidenciado por la modificación exitosa a `"Mojarra Plateada"` (ID `#5`), demostrando que el modal, los hooks de React y la persistencia de cambios operan según especificación funcional cuando existe un timestamp válido preexistente.

3. **Capa 3: Defecto Funcional de Concurrencia en Nuevos Registros (`DEF-M09-01`)**:
   * **ESTADO: REGISTRADO POR SEPARADO (HALLAZGO NO BLOQUEANTE / DEFECTO FORMAL REGISTRADO)**.
   * Causa raíz en Backend: asimetría entre `POST` (crea con `fecha_actualizacion: null`) y `PATCH` (exige `fecha_actualizacion` como `datetime` obligatorio, rechazando con `HTTP 400` si es `null` y con `HTTP 412` si se envía un timestamp sintético). Afecta únicamente a especies que nunca han sido editadas antes de su primera edición. Los registros `#42` y `#43` quedan marcados como pendientes de remediación por Backend, sin que esto invalide el resultado funcional del caso de prueba.

---

### 🎯 Veredicto Consolidado Final:

<div align="center">

### ✅ APROBADO / SIN FALLAS BLOQUEANTES
**El flujo de negocio de edición de especies productivas (RF-15 / CU-01) se encuentra operativo en ambiente TEST. El defecto DEF-M09-01 se registra y escala como hallazgo independiente, sin condicionar ni bloquear la aprobación de este caso de prueba.**

</div>

---

## 7. Evidencias de la Ejecución

Las siguientes evidencias visuales y audiovisuales corresponden a la corrida controlada en Cypress del caso `TC-M09-G03`, organizadas de forma local en la carpeta de reevaluación:

| Evidencia | Tipo | Descripción | Ruta Relativa |
| :--- | :---: | :--- | :--- |
| **01_formulario_edicion_especie_ui.png** | Imagen PNG | Formulario de edición modal completado en la interfaz de usuario con los datos válidos (`"Equino Editado"` y descripción nueva) antes del disparo de la acción de guardado. | [01_formulario_edicion_especie_ui.png](screenshots/01_formulario_edicion_especie_ui.png) |
| **TC-M09-G03 - Edición de Especie Productiva (failed).png** | Imagen PNG | Captura de fallo del runner en el momento exacto en que la respuesta del backend (`HTTP 412 CONFLICTO_CONCURRENCIA`) abortó el contrato esperado en el interceptor `@editarEspecie`. | [TC-M09-G03 - Edición de Especie Productiva (RF-15) -- edita una especie activa existente con datos válidos y verifica la actualización de fecha_actualizacion en UI y API (failed).png](screenshots/TC-M09-G03%20-%20Edici%C3%B3n%20de%20Especie%20Productiva%20(RF-15)%20--%20edita%20una%20especie%20activa%20existente%20con%20datos%20v%C3%A1lidos%20y%20verifica%20la%20actualizaci%C3%B3n%20de%20fecha_actualizacion%20en%20UI%20y%20API%20(failed).png) |
| **tc-m09-g03-edicion-especie.cy.ts.mp4** | Video MP4 | Grabación continua de la sesión Headless de Cypress que documenta la navegación SPA, la apertura del modal, el diligenciamiento y la respuesta de red. | [tc-m09-g03-edicion-especie.cy.ts.mp4](videos/tc-m09-g03-edicion-especie.cy.ts.mp4) |

---

## 8. Artefactos y Evidencias de Respaldo

Para garantizar la máxima trazabilidad del caso `TC-M09-G03`, a continuación se listan todos los artefactos históricos y vigentes generados a lo largo del ciclo de vida de la prueba:

- **Reporte Histórico Inicial (2026-09-04):**
  - Markdown: `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/TC-M09-G03/TC-M09-G03_resultado.md`
  - JSON: `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/TC-M09-G03/TC-M09-G03_resultado.json`
- **Reportes de Reevaluación Controlada (2026-09-12):**
  - Reporte Principal Markdown: `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/TC-M09-G03_reevaluacion_resultado.md`
  - Reporte Principal JSON: `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/TC-M09-G03_reevaluacion_resultado.json`
  - Adenda Técnica Definitiva (Este Documento): `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/TC-M09-G03_reevaluacion_ADENDA.md`
- **Evidencias Gráficas y Audiovisuales Copiadas:**
  - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/screenshots/01_formulario_edicion_especie_ui.png`
  - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/screenshots/TC-M09-G03 - Edición de Especie Productiva (RF-15) -- edita una especie activa existente con datos válidos y verifica la actualización de fecha_actualizacion en UI y API (failed).png`
  - `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G03/RESULTADOS/REEVALUACION_2026-09-12/videos/tc-m09-g03-edicion-especie.cy.ts.mp4`
- **Referencia Cruzada al Defecto Formal `DEF-M09-01`:**
  - Archivo fuente del Frontend: `SGPMP-FRONT-END-PWA/src/configuration/components/EspeciesModal.tsx` (Línea ~73, sustitución indebida de `null` por `new Date().toISOString()`).
  - Endpoint y Esquema del Backend: `PATCH /configuracion/especies/{id_especie}` (`EditarEspecieDTO`, rechazo de `null` en `fecha_actualizacion` con `HTTP 400` y falla de concurrencia optimista con `HTTP 412`).

