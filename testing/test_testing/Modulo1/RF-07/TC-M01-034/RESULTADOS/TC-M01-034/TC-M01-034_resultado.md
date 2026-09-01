# TC-M01-034 — Rechazo cuando la nueva contraseña y su confirmación no coinciden

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU07 - Cambio de Contraseña · RF-07 |
| Tipo / Equipo | Manejo de Errores (VAL_ENTRADA) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T08:05:50.197Z |
| Cuenta de Prueba | admin@pecuaria.co |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Paso 1: Autenticación inicial de usuario en la UI (`/login`) | Inicio de sesión exitoso y redirección fuera de `/login` | **FALLA DE RED / CORS:** Bloqueado por política CORS al realizar `POST /sesiones/` y `POST /sesiones/refresh` (No 'Access-Control-Allow-Origin' header is present). | **FALLA** |
| Paso 2: Navegación a la vista `/perfil` | Acceso a la vista de perfil para cambiar contraseña | **OMITIDO:** No fue posible ingresar a `/perfil` debido al fallo de autenticación inicial. | **OBSERVACION** |
| Paso 3: Validación de mismatch de contraseñas en UI | Muestra mensaje de error y bloquea el envío | **OMITIDO:** La prueba no pudo alcanzar el formulario de cambio de contraseña. | **OBSERVACION** |

## Veredicto: CON FALLAS BLOQUEANTES (BLOQUEO CORS EN LOGIN DE BACKEND TEST)

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: La ejecución del caso de prueba no pudo completarse debido a un bloqueo de políticas CORS entre el frontend de TEST (`sigab-frontendtest-...`) y el backend de TEST (`sigab-backendtest-...`) durante las peticiones a `POST /sesiones/` y `POST /sesiones/refresh`. Esta configuración del servidor impide el inicio de sesión. La responsabilidad de corregir la política de orígenes permitidos (CORS headers) corresponde al **equipo de Backend / Infraestructura**.

## Registro Técnico de Red (Error Detectado)
- **Error HTTP / Browser**: `Access to XMLHttpRequest at 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/sesiones/' from origin 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
- **Recurso afectado**: `POST /sesiones/` y `POST /sesiones/refresh` (Status: `net::ERR_FAILED`).
- **Hallazgos**:
- Paso 1: Autenticación inicial de usuario en la UI (/login) -> FALLA DE RED / CORS: Bloqueado por política CORS al realizar POST /sesiones/ (FALLA)
- El cliente mostró en pantalla el mensaje de error: "Error al iniciar sesión: Ocurrió un error inesperado. Intente nuevamente." (1 de 5 intentos fallidos).

## Evidencias Visuales (Capturas .PNG)
- [TC-M01-034 (failed).png](screenshots/tc-m01-034-rechazo-mismatch-confirmar-contrasena.cy.ts/TC-M01-034%20%C2%B7%20Rechazo%20de%20cambio%20de%20contrase%C3%B1a%20por%20mismatch%20en%20confirmaci%C3%B3n%20--%20valida%20el%20rechazo%20de%20cambio%20de%20contrase%C3%B1a%20cuando%20nueva%20y%20confirmaci%C3%B3n%20difieren%20(failed).png) — Muestra el fallo de inicio de sesión por CORS y la alerta roja en la UI.
