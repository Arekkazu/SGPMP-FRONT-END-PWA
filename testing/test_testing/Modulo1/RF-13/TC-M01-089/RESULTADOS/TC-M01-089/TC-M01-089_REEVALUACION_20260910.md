# Reporte de Reevaluación Técnica: TC-M01-089

## 1. Información General de la Reevaluación

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M01-089` |
| **Módulo / Requerimiento** | Módulo 1 (Seguridad y Acceso) / `RF-13` (Seguridad JWT y Perfil) |
| **Caso de Uso** | CU07 – Consultar Historial y Auditoría / Privacidad de Contraseña en Perfil |
| **Fecha y Hora de Reevaluación** | 2026-09-10 20:42:00 (UTC-5) / 2026-09-11T01:42:19Z |
| **Responsable de Ejecución** | QA Technical Analyst (Sebastian) |
| **Ambiente de Pruebas** | **Frontend TEST:** `http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`<br>**Backend TEST:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Usuario Ejecutor** | `admin@pecuaria.co` |
| **Rol del Usuario** | Administrador del Sistema |
| **Herramienta de Ejecución** | Cypress v13.17.0 (Runner Chrome Headless 152, 1280x900) |

---

## 2. Resumen Comparativo: Original vs. Reevaluación

| Atributo | Ejecución Original (2026-09-03) | Reevaluación Actual (2026-09-10) | Estado |
| :--- | :--- | :--- | :--- |
| **Checkpoint 1 (Login y Navegación)** | OK | **OK** | Sin regresión |
| **Checkpoint 2 (Apertura Modal Tabla)** | FALLA (HTTP 400 por `id_usuario: undefined`) | **OK (HTTP 200 / Modal abierto en DOM)** | **CORREGIDO** |
| **Checkpoint 3 (JSON API - Sin Contraseña)** | OK (11 llaves sin credenciales expuestas) | **OK (12 llaves sin credenciales expuestas)** | **MANTIENE OK** |
| **Checkpoint 4 (DOM/HTML - Sin Contraseña)** | OK (0 inputs password, 0 texto plano) | **OK (0 inputs password, 0 texto plano)** | **MANTIENE OK** |
| **Checkpoint 5 (Storage - Sin Contraseña)** | OK (0 contraseñas en localStorage / sessionStorage) | **OK (0 contraseñas en localStorage / sessionStorage)** | **MANTIENE OK** |
| **Veredicto Global** | `NO APROBADO (FALLA EN TABLA ID UNDEFINED Y 503 CAPTCHA)` | `SIN FALLAS BLOQUEANTES (APROBADO)` | **SUPERADO** |

> [!IMPORTANT]
> **El objetivo nuclear de este caso (RF-13 / Seguridad y Privacidad de la Contraseña) estuvo en estado `OK` al 100% desde la ejecución histórica original.** El resultado negativo anterior fue provocado por el fallo colateral de navegación en el modal (Checkpoint 2). Con la corrección del backend y la dinamización del test, el caso refleja su estado de aprobación real y genuino.

---

## 3. Resultados Detallados por Checkpoint

| Checkpoint | Descripción | Criterio de Aceptación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **CP-01** | Autenticación y Navegación SPA | Inicio de sesión con credenciales de administrador y redirección a `/usuarios`. | Sesión autenticada correctamente como `admin@pecuaria.co`. Vista `/usuarios` desplegada. | **OK** |
| **CP-02** | Apertura de Modal de Detalle desde Tabla | Clic en "Ver detalle" debe emitir `GET /usuarios/{id}/detalle` respondiendo HTTP 200 y desplegando el diálogo en el DOM. | Petición interceptada `HTTP 200 OK`. Diálogo `div[role="dialog"]` visible en DOM. Captura tomada. | **OK** |
| **CP-03** | Privacidad en Capa de Red (JSON API Genuino) | Respuesta HTTP 200 del endpoint de perfil no debe contener llaves sensibles (`contrasena`, `password`, `clave`, `hash`, `secret`). | `OK`: 0 llaves sensibles expuestas. 12 llaves verificadas: `[id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version, fincas]`. | **OK** |
| **CP-04** | Privacidad en Capa de DOM/HTML (Renderizado) | 0 elementos `input[type="password"]` y 0 ocurrencias de la contraseña conocida (`Test1234!`) en nodos de texto del DOM. | `OK`: Confirmado 0 inputs de contraseña y 0 textos planos en el árbol renderizado de la aplicación. | **OK** |
| **CP-05** | Privacidad en Almacenamiento Web (Storage) | `win.localStorage` y `win.sessionStorage` no deben persistir credenciales de usuario en texto plano. | `OK`: 0 credenciales encontradas en almacenamiento (2 llaves en `localStorage`, 0 en `sessionStorage`). | **OK** |

---

## 4. Análisis de Causa Raíz de Hallazgos Colaterales

### Checkpoint 2 (ID undefined en Tabla de Usuarios)
- **Causa Raíz Confirmada:** El endpoint `GET /usuarios/admin` no incluía la propiedad `id_usuario` dentro de los registros serializados de la lista. Cuando la UI intentaba consultar el detalle al hacer clic en el botón de la tabla, concatenaba un valor indefinido:
  ```http
  GET /api-sgpmp-test/usuarios/undefined/detalle
  HTTP/1.1 400 Bad Request
  ```
- **Corrección Verificada en Backend:** El backend corrigió la serialización del listado para incluir explícitamente el `id_usuario`. Durante la reevaluación actual, la petición se emitió y completó con éxito total:
  ```http
  GET /api-sgpmp-test/usuarios/92/detalle
  HTTP/1.1 200 OK
  ```
  El modal abrió de inmediato y el Checkpoint 2 pasó de `FALLA` a `OK`.


---

## 5. Clasificación Técnica del Hallazgo

- **Clasificación Original Documentada:** *Interfaz/UI o navegación; equipo de Diseño.*
- **Estado de la Clasificación:** **REFUTADA EN SU TOTALIDAD.**
- **Clasificación Corregida:** **Defecto de Backend / Contrato de Datos REST.**

### Justificación Técnica
1. **ID undefined en tabla:** La interpolación de `undefined` en una URL REST (`/usuarios/undefined/detalle`) se originó en la falta de un campo en el contrato del payload de datos devuelto por la API (`GET /usuarios/admin`), no en el diseño responsivo, CSS ni maquetación visual de la vista.

---

## 6. Nota Técnica sobre la Automatización (Spec de Cypress)

> [!NOTE]
> El spec `tc-m01-089-contrasena-no-visible-perfil.cy.ts` fue refactorizado para eliminar el valor quemado de `FALLA` en el Checkpoint 2, incorporando una intercepción de red (`cy.intercept`) y una aserción de visibilidad del modal en tiempo de ejecución. Asimismo, se parametrizó la URL del backend con `Cypress.env('BACKEND_URL')` y se dinamizó el veredicto global para que refleje el estado real de los 5 checkpoints sin arrastrar etiquetas estáticas de errores ajenos. Estas mejoras conciernen exclusivamente al arnés de prueba automatizado y no alteran la lógica del producto.

---

## 7. Evidencias de Ejecución

- **Captura de Pantalla Modal Abierto y Privacidad:** [01_perfil_detalle_seguridad.png](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-13/TC-M01-089/RESULTADOS/screenshots/tc-m01-089-contrasena-no-visible-perfil.cy.ts/01_perfil_detalle_seguridad.png)
- **Grabación de Video de Ejecución Completa:** [tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-13/TC-M01-089/RESULTADOS/videos/tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4)
- **Archivos Históricos Preservados:** [TC-M01-089_resultado.json](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-13/TC-M01-089/RESULTADOS/TC-M01-089/TC-M01-089_resultado.json) y [TC-M01-089_resultado.md](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-13/TC-M01-089/RESULTADOS/TC-M01-089/TC-M01-089_resultado.md) preservan intacta la ejecución del 2026-09-03 para fines de trazabilidad y auditoría.

---

## 8. Estado del Incidente y Recomendaciones

- **Estado del Incidente:** **RESUELTO / CERRADO.**
- **Conclusión QA:** El caso `TC-M01-089` se encuentra **100% APROBADO**. El sistema cumple de manera estricta y verificada con la política de seguridad y privacidad del requerimiento `RF-13`: las contraseñas de los usuarios no son expuestas en el JSON de la API REST (HTTP 200), no son renderizadas en el DOM HTML de la aplicación, ni son almacenadas en texto claro en el Storage del navegador (`localStorage` ni `sessionStorage`).
- **Siguiente Paso:**
  1. Integrar el spec dinámico en la suite de regresión automatizada continua (CI/CD).
  2. Actualizar el informe de matriz de pruebas y trazabilidad del Módulo 1 catalogando el caso `TC-M01-089` como **APROBADO**.
