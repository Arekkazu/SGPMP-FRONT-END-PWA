# TC-M01-089 — Verificar que la contraseña nunca sea visible en el perfil

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Seguridad / Privacidad · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T01:50:33.478Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Diagnóstico de Incidencia en Interfaz y Video / Capturas
> [!WARNING]
> **1. Bloqueo de Modal en UI (Captura y Video)**: En la interfaz desplegada del ambiente TEST, hacer clic en "Ver detalle" intenta consultar `/usuarios/undefined/detalle` (por falta de `id_usuario` en la lista de la API). Por ello, el modal no se abre con datos y la captura/video quedan congelados en la vista principal de Gestión de Usuarios (`/usuarios`).  
> **2. Fallo HTTP 503 en Creación por API**: El endpoint público `POST /usuarios/` responde HTTP 503 (`CAPTCHA_SERVICIO_NO_DISPONIBLE: El servicio de validación de seguridad no está disponible temporalmente`).  
> **3. Evaluación sobre API Genuina (HTTP 200 OK)**: Para verificar formalmente la privacidad sobre un perfil genuino, el test consultó directamente el endpoint autenticado con un ID válido (ID 1 - `admin@pecuaria.co`).

## Evidencia Completa de Llaves del JSON Genuino de Respuesta de la API (HTTP 200 OK)
> [!INFO]
> **Llaves presentes en la respuesta HTTP GET /usuarios/1/detalle**:  
> `id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version`

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Autenticación y Carga de Sesión | Inicio de sesión exitoso como admin en la interfaz y navegación a /usuarios | Sesión autenticada correctamente como admin@pecuaria.co y vista /usuarios cargada | **OK** |
| Checkpoint 2: Apertura del Modal de Detalle desde Tabla UI | El clic en el botón de la tabla debe abrir la vista de detalle del usuario | FALLA DE UI: GET /usuarios/admin no entrega id_usuario en los elementos, haciendo la solicitud /usuarios/undefined/detalle (HTTP 400). El modal no despliega datos y la pantalla queda congelada en /usuarios (evidenciado en captura y video). | **FALLA** |
| Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK) | La respuesta HTTP 200 OK de la API no contiene el campo de contraseña ni hashes expuestos | OK - Ninguna propiedad de contraseña expuesta. Llaves totales (11): [id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version] | **OK** |
| Checkpoint 4: Verificación de Privacidad en Capa de DOM/HTML (Renderizado Cliente) | 0 elementos input[type="password"] ni texto plano de contraseña (Test1234!) visible o en atributos del DOM | OK - Confirmado: 0 elementos HTML o textos con la contraseña expuestos en la interfaz | **OK** |
| Checkpoint 5: Verificación de Almacenamiento en Cliente (localStorage / sessionStorage) | La contraseña de prueba NO debe ser almacenada en texto plano en localStorage ni sessionStorage | OK - Confirmado: 0 credenciales en texto plano encontradas en almacenamiento web (1 llaves en localStorage, 0 llaves en sessionStorage) | **OK** |

## Veredicto: **NO APROBADO (FALLA EN TABLA ID UNDEFINED Y 503 CAPTCHA)**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /usuarios -> Clic en "Ver detalle" (Fallo por ID undefined) -> API /usuarios/1/detalle (Admin Profile) -> Almacenamiento Web & DOM.
- **Detalle de Ejecución**: Consulta de perfil genuino GET https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/1/detalle -> HTTP 200 OK

## Hallazgos y Observaciones Técnicas
- Hallazgo 1 (Captura/Video): En la UI de TEST el modal no abre los datos del perfil y se queda en /usuarios debido al envío de ID undefined.
- Hallazgo 2 (Infraestructura / Backend): POST /usuarios/ retorna HTTP 503 CAPTCHA_SERVICIO_NO_DISPONIBLE en el ambiente de TEST.
- Hallazgo 3 (UI / Backend Contract): GET /usuarios/admin no retorna id_usuario en los elementos de la tabla, provocando solicitudes /usuarios/undefined/detalle (HTTP 400).
- Llaves detectadas en el JSON genuino de perfil (HTTP 200 OK): id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version
- Checkpoint 1: Autenticación y Carga de Sesión -> Sesión autenticada correctamente como admin@pecuaria.co y vista /usuarios cargada (OK)
- Checkpoint 2: Apertura del Modal de Detalle desde Tabla UI -> FALLA DE UI: GET /usuarios/admin no entrega id_usuario en los elementos, haciendo la solicitud /usuarios/undefined/detalle (HTTP 400). El modal no despliega datos y la pantalla queda congelada en /usuarios (evidenciado en captura y video). (FALLA)
- Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK) -> OK - Ninguna propiedad de contraseña expuesta. Llaves totales (11): [id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version] (OK)
- Checkpoint 4: Verificación de Privacidad en Capa de DOM/HTML (Renderizado Cliente) -> OK - Confirmado: 0 elementos HTML o textos con la contraseña expuestos en la interfaz (OK)
- Checkpoint 5: Verificación de Almacenamiento en Cliente (localStorage / sessionStorage) -> OK - Confirmado: 0 credenciales en texto plano encontradas en almacenamiento web (1 llaves en localStorage, 0 llaves en sessionStorage) (OK)

## Evidencias Visuales (Capturas .PNG y Video .MP4)
- [01_perfil_detalle_seguridad.png](screenshots/01_perfil_detalle_seguridad.png) — Muestra la vista de /usuarios congelada tras intentar abrir el modal de detalle sin éxito por el bug de ID undefined.
- [tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4](videos/tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4) — Grabación en video del intento de navegación y apertura del detalle.
