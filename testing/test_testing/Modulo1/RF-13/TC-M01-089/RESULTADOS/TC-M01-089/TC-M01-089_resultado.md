# TC-M01-089 — Verificar que la contraseña nunca sea visible en el perfil

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Seguridad / Privacidad · Frontend & Backend QA |
| Severidad | Alta |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 153.0.8010.48 |
| Fecha ejecución | 2026-09-21T02:41:26.304Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Diagnóstico de Privacidad de Perfil
> [!NOTE]
> Verificación integral de privacidad del perfil de usuario conforme a RF-13 (CU07): inspección de ausencia de contraseña en capa de API REST (JSON), árbol DOM/HTML de la aplicación y almacenamiento web del cliente (localStorage / sessionStorage).

## Evidencia Completa de Llaves del JSON Genuino de Respuesta de la API (HTTP 200 OK)
> [!INFO]
> **Llaves presentes en la respuesta HTTP GET /usuarios/1/detalle**:  
> `id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version, fincas`

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Autenticación y Carga de Sesión | Inicio de sesión exitoso como admin en la interfaz y navegación a /usuarios | Sesión autenticada correctamente como admin@pecuaria.co y vista /usuarios cargada | **OK** |
| Checkpoint 2: Apertura de Modal de Detalle desde Tabla | Apertura exitosa del modal con datos del usuario (HTTP 200 OK) | Modal cargado correctamente (HTTP 200) | **OK** |
| Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK) | La respuesta HTTP 200 OK de la API no contiene el campo de contraseña ni hashes expuestos | OK - Ninguna propiedad de contraseña expuesta. Llaves totales (12): [id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version, fincas] | **OK** |
| Checkpoint 4: Verificación de Privacidad en Capa de DOM/HTML (Renderizado Cliente) | 0 elementos input[type="password"] ni texto plano de contraseña (Test1234!) visible o en atributos del DOM | OK - Confirmado: 0 elementos HTML o textos con la contraseña expuestos en la interfaz | **OK** |
| Checkpoint 5: Verificación de Almacenamiento en Cliente (localStorage / sessionStorage) | La contraseña de prueba NO debe ser almacenada en texto plano en localStorage ni sessionStorage | OK - Confirmado: 0 credenciales en texto plano encontradas en almacenamiento web (2 llaves en localStorage, 0 llaves en sessionStorage) | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /usuarios -> Clic en "Ver detalle" (Apertura de Modal) -> API /usuarios/1/detalle (Admin Profile) -> Almacenamiento Web & DOM.
- **Detalle de Ejecución**: Consulta de perfil genuino GET https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/1/detalle -> HTTP 200 OK

## Hallazgos y Observaciones Técnicas
- Llaves detectadas en el JSON genuino de perfil (HTTP 200 OK): id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version, fincas
- Checkpoint 1: Autenticación y Carga de Sesión -> Sesión autenticada correctamente como admin@pecuaria.co y vista /usuarios cargada (OK)
- Checkpoint 2: Apertura de Modal de Detalle desde Tabla -> Modal cargado correctamente (HTTP 200) (OK)
- Checkpoint 3: Verificación de Privacidad en Capa de Red (JSON API Genuino HTTP 200 OK) -> OK - Ninguna propiedad de contraseña expuesta. Llaves totales (12): [id_usuario, nombre, apellidos, correo_electronico, tipo_identificacion, numero_identificacion, fecha_nacimiento, fecha_registro, nombre_rol, estado_cuenta, version, fincas] (OK)
- Checkpoint 4: Verificación de Privacidad en Capa de DOM/HTML (Renderizado Cliente) -> OK - Confirmado: 0 elementos HTML o textos con la contraseña expuestos en la interfaz (OK)
- Checkpoint 5: Verificación de Almacenamiento en Cliente (localStorage / sessionStorage) -> OK - Confirmado: 0 credenciales en texto plano encontradas en almacenamiento web (2 llaves en localStorage, 0 llaves en sessionStorage) (OK)

## Evidencias Visuales (Capturas .PNG y Video .MP4)
- [01_perfil_detalle_seguridad.png](screenshots/01_perfil_detalle_seguridad.png) — Vista del modal de detalle de usuario abierto para verificación de privacidad.
- [tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4](videos/tc-m01-089-contrasena-no-visible-perfil.cy.ts.mp4) — Grabación en video del flujo de navegación y validación de seguridad.
