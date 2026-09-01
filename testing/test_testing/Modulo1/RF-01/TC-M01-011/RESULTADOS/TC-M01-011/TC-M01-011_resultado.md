# TC-M01-011 — Rechazo del formulario de registro por fallo de CAPTCHA

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU01 - Registro de Usuario · RF-01 |
| Tipo / Equipo | Manejo de Errores (Seguridad) · Frontend / QA |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.65 |
| Fecha ejecución | 2026-09-01T06:49:42.891Z |
| Precondiciones | Vista /registro, Formulario datos personales completos |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| Paso 1: Llenado de datos personales | Campos obligatorios válidos | Ingresados datos para ID 9995372325 | **OK** |
| Verificar estado del checkbox de CAPTCHA | Checkbox no marcado (checked = false) | checked = false | **OK** |
| Estado del botón Registrarse sin CAPTCHA marcado | Deshabilitado (disabled = true) | disabled = true | **OK** |
| Respuesta del Backend TEST al enviar sin CAPTCHA válido | HTTP Status 400 (Debe rechazar) | HALLAZGO DE SEGURIDAD: El backend ACEPTÓ el registro sin CAPTCHA (HTTP 201). Respuesta: {"message":"Registro exitoso, envío de correo en proceso."} | **FALLA** |

## Veredicto: CON FALLAS

## Nota de Clasificación QA (Responsabilidad de Equipo)
> **IMPORTANTE**: Según la clasificación oficial de QA del sistema, si este caso de prueba presenta fallas derivadas de la interfaz gráfica o problemas de navegación en el formulario de registro, la responsabilidad directa corresponde al **equipo de Diseño / Frontend** (no constituye un bug del backend).

## Registro Técnico de Red (Espionaje Real)
- **Naturaleza del CAPTCHA**: 100% simulado internamente (checkbox HTML `#captcha-check`). Sin dependencias ni claves de Google reCAPTCHA.
- **Detalle de Petición HTTP Real**: Petición REAL realizada a /usuarios/. HTTP Status: 201. Respuesta: {"message":"Registro exitoso, envío de correo en proceso."}
- **Hallazgos**:
- Paso 1: Llenado de datos personales -> Ingresados datos para ID 9995372325 (OK)
- Verificar estado del checkbox de CAPTCHA -> checked = false (OK)
- Estado del botón Registrarse sin CAPTCHA marcado -> disabled = true (OK)
- Respuesta del Backend TEST al enviar sin CAPTCHA válido -> HALLAZGO DE SEGURIDAD: El backend ACEPTÓ el registro sin CAPTCHA (HTTP 201). Respuesta: {"message":"Registro exitoso, envío de correo en proceso."} (FALLA)

## Evidencias Visuales (Capturas .PNG)
- [01_paso1_datos_personales.png](screenshots/01_paso1_datos_personales.png) — Datos personales ingresados en el Paso 1.
- [02_paso2_captcha_sin_marcar.png](screenshots/02_paso2_captcha_sin_marcar.png) — Paso 2 de credenciales con checkbox de CAPTCHA sin marcar.
- [03_error_captcha_rechazado.png](screenshots/03_error_captcha_rechazado.png) — Estado final de la interfaz tras el intento de envío sin CAPTCHA.
