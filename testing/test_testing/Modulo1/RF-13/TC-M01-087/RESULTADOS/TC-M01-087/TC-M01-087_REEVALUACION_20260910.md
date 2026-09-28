# Reporte de Reevaluación Técnica: TC-M01-087

## 1. Información General de la Reevaluación

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M01-087` |
| **Módulo / Requerimiento** | Módulo 1 (Seguridad y Acceso) / `RF-13` (Seguridad JWT y Perfil) |
| **Caso de Uso** | CU07 – Consultar Historial y Auditoría / Perfil de Usuario Solo Lectura |
| **Fecha y Hora de Reevaluación** | 2026-09-10 20:25:00 (UTC-5) |
| **Responsable de Ejecución** | QA Technical Analyst |
| **Ambiente de Pruebas** | **Frontend TEST:** `http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`<br>**Backend TEST:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Usuario Ejecutor** | `pruebaas0608@gmail.com` |
| **Rol del Usuario** | Productor (Rol sin permisos administrativos de edición `[1, 3]`) |
| **Herramienta de Ejecución** | Cypress v13.17.0 (Runner Chrome Headless, 1920x1080) |

---

## 2. Resumen Comparativo: Original vs. Reevaluación

| Atributo | Ejecución Original (2026-09-03) | Reevaluación Actual (2026-09-10) | Estado |
| :--- | :--- | :--- | :--- |
| **Usuario Ejecutor** | `productor` | `pruebaas0608@gmail.com` (Productor) | Actualizado según rol |
| **Checkpoint 1** | OK | **OK** | Sin regresión |
| **Checkpoint 2** | FALLA (HTTP 400 / `id_usuario: undefined`) | **OK (HTTP 200 / `id_usuario: 92`)** | **CORREGIDO** |
| **Checkpoint 3** | FALLA (No evaluable por error HTTP) | **OK (0 campos editables en modal)** | **APROBADO** |
| **Checkpoint 4** | FALLA (Cálculo estático) | **OK (Cálculo dinámico: 4/4 OK)** | **APROBADO** |
| **Veredicto Global** | `CON FALLAS (ERROR EN CONSULTA DE DETALLE)` | `SIN FALLAS BLOQUEANTES (APROBADO)` | **SUPERADO** |

---

## 3. Resultados Detallados por Checkpoint

| Checkpoint | Descripción | Criterio de Aceptación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **CP-01** | Autenticación y Navegación SPA | Login con credenciales de Productor y redirección correcta a `/usuarios`. | Token JWT almacenado en `sessionStorage`, navegación fluida a `/usuarios`. | **OK** |
| **CP-02** | Consulta REST de Detalle de Usuario | Petición `GET /usuarios/{id}/detalle` responda con código HTTP 200 OK con payload válido. | La API retornó `HTTP 200 OK` para `id_usuario: 92` (Diana Paola Rincón). Payload deserializado correctamente. | **OK** |
| **CP-03** | Verificación de Solo Lectura en Modal | Modal de perfil debe contener exactamente `0` inputs, selects o textareas editables. | Detección en DOM (`[role="dialog"]`): `0` inputs, `0` selects, `0` textareas. Vista 100% de solo lectura. | **OK** |
| **CP-04** | Veredicto Global Dinámico | Coherencia integral de los 3 checkpoints previos evaluados en tiempo de ejecución. | 3 de 3 condiciones funcionales cumplidas. Veredicto emitido dinámicamente sin fallas. | **OK** |

---

## 4. Análisis de Causa Raíz y Corrección

### Causa Raíz Confirmada
En la ejecución histórica del 2026-09-03, el endpoint `GET /usuarios/admin` no incluía la propiedad `id_usuario` dentro de los objetos de la lista de usuarios. Al interactuar con la tarjeta del usuario "Diana Paola Rincón", la aplicación cliente interpoló el valor ausente, disparando la petición anómala:
```http
GET /api-sgpmp-test/usuarios/undefined/detalle
HTTP/1.1 400 Bad Request
```
El backend rechazaba la petición por parámetro inválido (`undefined` no numérico), impidiendo el despliegue del modal de auditoría/perfil.

### Corrección Verificada
El backend fue actualizado en su serializador de respuesta para incluir explícitamente `id_usuario: 92` en el listado de usuarios. La verificación en vivo demostró que la petición enviada por la aplicación es:
```http
GET /api-sgpmp-test/usuarios/92/detalle
HTTP/1.1 200 OK
```
El modal se abre de inmediato, renderizando la información de la usuaria en modo estático/informativo.

---

## 5. Clasificación Técnica del Hallazgo

- **Clasificación Original Documentada:** *Interfaz/UI o navegación; equipo de Diseño.*
- **Estado de la Clasificación:** **REFUTADA.**
- **Clasificación Corregida:** **Defecto de Backend / Integración de Contrato REST (Frontend-Backend).**

### Justificación Técnica
Un identificador evaluado como `undefined` y propagado directamente en la URL de una petición REST (`/usuarios/undefined/detalle`) constituye una violación de contrato de datos entre la API y el cliente frontend, o un defecto de deserialización en la capa de transporte. No está relacionado con estilos CSS, paletas de colores, diseño responsivo, distribución de componentes ni maquetación visual (responsabilidades de UI/Diseño). Asignar este hallazgo a diseño retrasó su resolución técnica en el componente correspondiente.

---


## 6. Evidencias de Ejecución

- **Reporte Automatizado JSON Generado:** `testing/test_testing/Modulo1/RF-13/TC-M01-087/RESULTADOS/TC-M01-087/TC-M01-087_resultado.json` *(generado por runner con veredicto dinámico `SIN FALLAS BLOQUEANTES`)*
- **Captura de Pantalla Modal Solo Lectura:** `testing/test_testing/Modulo1/RF-13/TC-M01-087/RESULTADOS/screenshots/tc-m01-087-perfil-solo-lectura.cy.ts/01_perfil_detalle_modal.png`
- **Grabación de Video de Ejecución:** `testing/test_testing/Modulo1/RF-13/TC-M01-087/RESULTADOS/videos/tc-m01-087-perfil-solo-lectura.cy.ts.mp4`

---

## 7. Estado del Incidente y Recomendaciones

- **Estado del Incidente:** **RESUELTO / CERRADO.**
- **Conclusión QA:** El caso de prueba `TC-M01-087` cumple a cabalidad con la regla de negocio del requerimiento `RF-13`: los perfiles de usuario desplegados en la vista de historial/auditoría son 100% de solo lectura (`0` campos editables) para roles no autorizados (ej. Productor).
- **Siguiente Paso:**
  1. Promover el spec refactorizado a la suite de regresión automatizada continua (CI/CD).
  2. Actualizar la matriz de trazabilidad de pruebas del Módulo 1 reflejando el caso como **APROBADO**.
