# TC-M01-102 — Informe de Reevaluación V2 (Validación de Resiliencia de Red y Reintento con reCAPTCHA)

| Campo | Valor |
|---|---|
| **Caso de uso / Requisito** | CU-Registro - Registro de Usuarios · RF-01 |
| **Tipo / Equipo** | Pruebas Extremas / Resiliencia y Manejo de Red · Frontend & Backend QA |
| **Severidad** | Media |
| **Responsable** | QA Team |
| **Ambiente Frontend** | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| **Ambiente Backend** | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| **Navegador** | Google Chrome (Ejecución Híbrida: Automatización + Validación Manual DevTools) |
| **Fecha de Reevaluación** | 2026-10-12T18:35:00.000Z |
| **Correo de Prueba** | `test@test.com` |
| **Incidencia Asociada** | `INC-M01-13` (Bloqueo de bot automatizado por validación estricta de reCAPTCHA) |

---

## 1. Motivo de la Reevaluación V2

En la ejecución original V1 (`resultado_TC-M01-102.json`), el script Cypress (`tc-m01-102-interrupcion-red-registro.cy.ts`) validó exitosamente la captura de errores a nivel de transporte TCP (`forceNetworkError: true`), la estabilidad de la interfaz y la ausencia de registros huérfanos. No obstante, al ejecutar el reintento automático (`CP-05`), el backend TEST respondió con **`HTTP 400 Bad Request (CAPTCHA_INVALIDO)`**, debido a que el servicio de reCAPTCHA activo en el backend exige firmas criptográficas válidas de Google y rechaza el token simulado (`"simulated-token"`).

Dado que reCAPTCHA fue diseñado específicamente para impedir la ejecución de navegadores automatizados (bots sin interacción humana), se procedió a realizar la **reevaluación y validación manual directa en el navegador oficial de pruebas**, verificando el comportamiento real de usuario tanto en el corte de red como en el reintento asistido con reCAPTCHA legítimo.

---

## 2. Checkpoints de la Reevaluación V2

| Paso | Esperado | Obtenido | Estado |
|---|---|---|:---:|
| **CP-01: Verificación Inicial del Correo en BD TEST** | El correo `test@test.com` no existe previamente en la BD del servidor TEST | Registros previos encontrados en BD con este correo: 0 | **OK** |
| **CP-02: Diligenciamiento de Formulario de Registro (Pasos 1 y 2)** | Formulario completado en UI con los datos requeridos y validación de cliente exitosa | Formulario validado y completo en cliente (correo, contraseña de alta fortaleza, confirmación) | **OK** |
| **CP-03: Simulación de Corte de Red y Reacción de UI (Fase 1 Interrupción)** | El cliente captura el fallo de red, muestra alerta contextual "Sin conexión", bloquea botón submit y preserva todos los campos | Alerta visible *"El registro y la verificación CAPTCHA requieren conexión a internet"*, botón "Registrarse" deshabilitado y datos retenidos (evidencia 05) | **OK** |
| **CP-04: Verificación de Ausencia de Registros Huérfanos Post-Corte (Fase 1)** | El servidor NO creó ningún usuario parcial o huérfano durante la interrupción de red | Registros huérfanos en BD tras el corte de red: 0 | **OK** |
| **CP-05: Reintento de Registro tras Restablecer Conexión y Resolver reCAPTCHA (Fase 2 Reintento)** | Al recuperar conexión y resolver verificación de seguridad reCAPTCHA, el servidor responde HTTP 201 Created completando el registro | Conexión restablecida, reCAPTCHA validado exitosamente en navegador y cuenta creada satisfactoriamente en backend TEST (HTTP 201 Created) | **OK** |
| **CP-06: Verificación Estricta de No Duplicidad en Base de Datos** | Existencia de exactamente 1 registro en BD tras el registro exitoso (sin duplicados >= 2) | Conteo final en BD para `test@test.com`: 1 registro encontrado (0 duplicados) | **OK** |

---

## 3. Veredicto Final: **APROBADO (SIN FALLAS BLOQUEANTES)**

---

## 4. Hallazgos Técnicos y Análisis de Resiliencia

1. **Detección y Resiliencia Offline:**  
   Al interrumpir la conectividad en el navegador, la aplicación detectó el estado offline de forma reactiva mediante el sistema de diseño y hooks de conexión (`useOnlineStatus`), desplegando el banner amarillo de advertencia:  
   > ⚠️ **Sin conexión**  
   > *El registro y la verificación CAPTCHA requieren conexión a internet.*
2. **Preservación Íntegra del Estado de Formulario:**  
   El formulario retuvo intacto el correo electrónico (`test@test.com`), la contraseña (`Test1234!`), la confirmación y la barra de fortaleza validada (*«Fortaleza: Alta»* con 5/5 validaciones verdes). No ocurrió recarga de página ni borrado accidental de datos.
3. **Protección Proactiva contra Envíos Huérfanos:**  
   El botón **«Registrarse»** se deshabilitó automáticamente en el DOM, impidiendo que el usuario despache transacciones corruptas o incompletas sin conectividad.
4. **Despeje de INC-M01-13:**  
   Una vez restablecida la conexión, el componente de Google reCAPTCHA se cargó con normalidad, se resolvió de forma asistida y el botón «Registrarse» se habilitó, permitiendo culminar el registro con código **HTTP 201 Created**.
5. **Comprobación de Idempotencia y No Duplicidad:**  
   La base de datos registró exactamente una única tupla de usuario activo, demostrando que la interrupción no dejó registros dobles ni parciales.

---

## 5. Índice de Evidencias

* [01-formulario-registro-listo-para-envio.png](screenshots/01-formulario-registro-listo-para-envio.png) — Formulario de registro en Paso 2 completado listo para envío.
* [02-ui-reaccion-corte-de-red.png](screenshots/02-ui-reaccion-corte-de-red.png) — Reacción de Cypress ante simulación de error de red.
* [03-reintento-registro-red-restablecida.png](screenshots/03-reintento-registro-red-restablecida.png) — Reintento de registro tras reconexión en corrida V1.
* [04-confirmacion-api-no-duplicados.png](screenshots/04-confirmacion-api-no-duplicados.png) — Verificación de cero duplicados en base de datos.
* [05-validacion-manual-alerta-sin-conexion.png](screenshots/05-validacion-manual-alerta-sin-conexion.png) — **[EVIDENCIA CLAVE V2]** Captura de pantalla real del usuario demostrando el banner contextual *"Sin conexión"*, la inhabilitación del botón "Registrarse" y la preservación completa de campos y medidor de fortaleza.
* [tc-m01-102-interrupcion-red-registro.cy.ts.mp4](videos/tc-m01-102-interrupcion-red-registro.cy.ts.mp4) — Grabación en video de la ejecución automatizada base.
