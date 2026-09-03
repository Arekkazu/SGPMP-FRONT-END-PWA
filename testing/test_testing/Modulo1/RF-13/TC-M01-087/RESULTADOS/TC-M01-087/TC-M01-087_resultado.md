# TC-M01-087 — Verificar que el perfil de usuario sea de solo lectura

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Consultar Historial y Auditoría · RF-13 |
| Tipo / Equipo | Funcional / Seguridad · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-03T00:55:42.400Z |
| Precondiciones | Autenticado como Admin (admin@pecuaria.co) |

## Nota de Precondición de Datos
> [!NOTE]
> El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura.

## Hallazgo de Error en Consulta de Detalle
> [!WARNING]
> Al intentar abrir el modal de detalle del usuario, el sistema emite la petición HTTP GET /usuarios/undefined/detalle, generando un error de respuesta HTTP 400 Bad Request ("Input should be a valid integer, unable to parse string as an integer") y desplegando la alerta "Error al cargar" en la interfaz.

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Checkpoint 1: Autenticación y Navegación al Módulo de Usuarios | Inicio de sesión exitoso como admin y navegación a /usuarios mediante la barra lateral SPA | Navegación completada exitosamente a la vista /usuarios | **OK** |
| Checkpoint 2: Carga de Información de Detalle del Perfil | Carga exitosa de los datos del usuario en la pantalla de detalle (HTTP 200 OK) | Error de servidor HTTP 400 Bad Request ("Input should be a valid integer") al realizar la solicitud /usuarios/undefined/detalle | **FALLA** |
| Checkpoint 3: Verificación de Entradas de Formulario Editables | 0 campos de entrada editables en la pantalla (inputs, selects, textareas) | No fue posible verificar por falla de carga de datos en el modal de detalle | **FALLA** |
| Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13) | Pantalla 100% solo lectura (0 elementos editables en total) | FALLA: La consulta de detalle falla con HTTP 400 por enviar ID undefined al backend | **FALLA** |

## Veredicto: **CON FALLAS (ERROR EN CONSULTA DE DETALLE)**

## Registro Técnico de Red y Navegación
- **Ruta de Navegación**: /login -> /dashboard -> Sidebar -> /usuarios -> Modal Detalle de Usuario ("Diana Paola Rincón").
- **Detalle de Ejecución**: El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura (POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/ -> HTTP 201).

## Hallazgos y Observaciones Técnicas
- El usuario no existía previamente en TEST y fue creado por el propio test como precondición para poder ejecutar la validación de solo lectura.
- Al intentar abrir el modal de detalle del usuario, el sistema emite la petición HTTP GET /usuarios/undefined/detalle, generando un error de respuesta HTTP 400 Bad Request ("Input should be a valid integer, unable to parse string as an integer") y desplegando la alerta "Error al cargar" en la interfaz.
- Checkpoint 1: Autenticación y Navegación al Módulo de Usuarios -> Navegación completada exitosamente a la vista /usuarios (OK)
- Checkpoint 2: Carga de Información de Detalle del Perfil -> Error de servidor HTTP 400 Bad Request ("Input should be a valid integer") al realizar la solicitud /usuarios/undefined/detalle (FALLA)
- Checkpoint 3: Verificación de Entradas de Formulario Editables -> No fue posible verificar por falla de carga de datos en el modal de detalle (FALLA)
- Checkpoint 4: Veredicto de Solo Lectura de la Pantalla de Perfil (RF-13) -> FALLA: La consulta de detalle falla con HTTP 400 por enviar ID undefined al backend (FALLA)

## Evidencias Visuales (Capturas .PNG)
- [01_perfil_detalle_modal.png](screenshots/01_perfil_detalle_modal.png) — Vista del modal de detalle del perfil de usuario consultado.
