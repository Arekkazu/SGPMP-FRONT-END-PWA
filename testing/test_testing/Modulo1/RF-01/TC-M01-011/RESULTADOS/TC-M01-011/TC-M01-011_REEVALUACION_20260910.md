# TC-M01-011 — Reevaluación Técnica de QA

| Parámetro | Detalle |
|---|---|
| **Caso de Prueba** | TC-M01-011 · Validación de rechazo de registro por reCAPTCHA no resuelto / fallido |
| **Caso de Uso / Requisito** | CU01 - Registro de Usuario · RF-01 |
| **Tipo de Prueba** | Manejo de Errores / Ciberseguridad (Defensa en Profundidad) |
| **Ambiente Frontend** | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| **Backend Evaluado** | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| **Fecha y Hora de Reevaluación** | 2026-09-10 19:39:08 (UTC-5) / 2026-09-11T00:39:08.068Z (UTC) |
| **Responsable de la Reevaluación** | QA Technical Analyst — Antigravity Agent |
| **Navegador y Runner** | Chrome 152 (Headless) / Cypress 13.17.0 / Node v26.1.0 |

---

## 1. Veredicto Comparativo: Original vs. Reevaluación

| Métrica | Ejecución Original (2026-09-03) | Reevaluación Actual (2026-09-10) | Variación / Hallazgo |
|---|---|---|---|
| **Veredicto General** | **NO APROBADO (CAPTCHA SIMULADO)** | ✅ **APROBADO TÉCNICAMENTE (SUBSANADO EN BACKEND)** | El backend implementó la validación estricta de `captcha_token`. |
| **Comportamiento UI** | ✅ OK (Botón `Registrarse` disabled) | ✅ OK (Botón `Registrarse` disabled) | Consistente: la UI siempre protegió el envío. |
| **API con Token Vacío** |  HTTP 201 Created (Mock) | ✅ **HTTP 400 Bad Request (`VAL_ENTRADA`)** | Cambio crítico: El backend ahora rechaza solicitudes vacías. |
| **API con Token Inválido** | HTTP 201 Created (Mock) | ✅ **HTTP 400 Bad Request (`CAPTCHA_INVALIDO`)** | Cambio crítico: El backend ahora rechaza tokens ilegítimos. |

---

## 2. Resultado Detallado por Checkpoint

| Checkpoint | Comportamiento Esperado | Comportamiento Obtenido en Reevaluación | Estado |
|---|---|---|---|
| **Checkpoint 1: Bloqueo de envío en la interfaz (UI)** | Botón "Registrarse" deshabilitado en UI cuando `captcha_token` es nulo o no resuelto. | El botón "Registrarse" permanece físicamente deshabilitado en el DOM (`disabled`) impidiendo el submit. | **OK** |
| **Checkpoint 2: Respuesta HTTP con CAPTCHA vacío** | HTTP 400 (Rechazo por falta de token de seguridad). | **HTTP 400** (`{"error_code":"VAL_ENTRADA","message":"Errores de validacion en la solicitud","fields":[{"field":"captcha_token","message":"String should have at least 1 character"}]}`) | **OK** |
| **Checkpoint 3: Respuesta HTTP con CAPTCHA inválido** | HTTP 400 (Rechazo por validación fallida contra Google). | **HTTP 400** (`{"error_code":"CAPTCHA_INVALIDO","message":"Validación de seguridad fallida. Por favor, confirme que no es un robot e intente enviar el formulario nuevamente."}`) | **OK** |
| **Checkpoint 4: Veredicto Global de Seguridad** | Rechazo por CAPTCHA efectivo tanto en UI como en la API REST. | Todos los escenarios de ataque directo a la API y bloqueo visual pasaron satisfactoriamente (**100% de aserciones cumplidas**). | **OK** |

---

## 3. Registro Técnico de Red (Peticiones Directas a la API)

Durante la reevaluación se realizaron las siguientes llamadas automáticas `cy.request` hacia el backend TEST:

1. **Escenario A (Token Vacío)**:
   - **Solicitud**: `POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/`
   - **Payload**: `captcha_token: ""` + datos de registro válidos.
   - **Código de Respuesta**: **HTTP 400 Bad Request**
   - **Cuerpo de Respuesta**:
     ```json
     {
       "error_code": "VAL_ENTRADA",
       "message": "Errores de validacion en la solicitud",
       "fields": [
         {
           "field": "captcha_token",
           "message": "String should have at least 1 character"
         }
       ],
       "timestamp": "2026-09-11T00:39:07.882530+00:00"
     }
     ```

2. **Escenario B (Token Inválido)**:
   - **Solicitud**: `POST https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test/usuarios/`
   - **Payload**: `captcha_token: "invalid-token-qa-xyz"` + datos de registro válidos.
   - **Código de Respuesta**: **HTTP 400 Bad Request**
   - **Cuerpo de Respuesta**:
     ```json
     {
       "error_code": "CAPTCHA_INVALIDO",
       "message": "Validación de seguridad fallida. Por favor, confirme que no es un robot e intente enviar el formulario nuevamente.",
       "fields": [
         {
           "field": "captcha_token",
           "message": "Validación de seguridad fallida. Por favor, confirme que no es un robot e intente enviar el formulario nuevamente."
         }
       ],
       "timestamp": "2026-09-11T00:39:08.165776+00:00"
     }
     ```

---

## 4. Causa Raíz Confirmada en esta Reevaluación

- **Diagnóstico Confirmado**:  
  La causa del fallo histórico fue **exclusivamente de Backend y Configuración de Ambiente TEST** (el backend TEST tenía implementado un bypass/mock que aceptaba cualquier valor y emitía HTTP 201).
- **Estado Actual**:  
  El backend de TEST fue actualizado: ahora contiene la lógica de validación de esquema (`VAL_ENTRADA` cuando `length < 1`) y la verificación de token (`CAPTCHA_INVALIDO`), respondiendo con los códigos de error estándar `HTTP 400`.

---

## 5. Clasificación Corregida y Refutación Técnica

> **Nota de Clasificación Original**:  
> *"Se sugiere que el hallazgo real es de Interfaz/UI o navegación, y correspondería al equipo de Diseño en lugar de ser un defecto de backend/seguridad."*

### Veredicto QA sobre la Nota: **TOTALMENTE REFUTADA (Falso Positivo de Clasificación)**

### Justificación Técnica Formal:
1. **La UI nunca falló**:
   - En `src/auth/pages/RegistroPage.tsx:380`, el botón de envío siempre ha estado deshabilitado (`disabled={!online || !recaptchaConfigured || !captchaToken}`).
   - El **Checkpoint 1** ha marcado consistentemente estado **OK** tanto el 2026-09-03 como el 2026-09-10. No existió jamás un defecto visual, de navegación ni de maquetación en el Frontend.
2. **La seguridad reside en el Servidor, no en el Cliente**:
   - En una arquitectura web segura (OWASP / Defensa en Profundidad), las validaciones del cliente son accesorias para la experiencia de usuario (UX); **la única barrera de seguridad real frente a bots y atacantes es el Backend**.
   - Cualquier atacante puede eludir la UI usando herramientas automatizadas (`curl`, scripts o `cy.request`). Si el backend acepta peticiones con `captcha_token` vacío o inválido y crea la cuenta (HTTP 201), el defecto es una **vulnerabilidad de Backend/Seguridad**, no de Diseño ni de Navegación.
3. **Corrección de Asignación**:
   - El hallazgo queda formalmente clasificado como **Defecto de Backend / Validación de Seguridad (Capa API)**.
   - Es un error conceptual escalar este incidente al equipo de Diseño.

---

## 6. Estado del Incidente y Prerrequisitos

- **Estado del Incidente**: **CERRADO / RESUELTO EN BACKEND**.
  - El backend TEST ya no presenta el mock vulnerable y rechaza activamente solicitudes malformadas con HTTP 400.

---

## 7. Evidencias Generadas en la Reevaluación

- **Captura de Pantalla UI**: `RESULTADOS/screenshots/tc-m01-011-rechazo-registro-captcha-fallido.cy.ts/01_registro_ui_captcha.png` (Confirma botón `Registrarse` deshabilitado).
- **Video de Ejecución**: `RESULTADOS/videos/tc-m01-011-rechazo-registro-captcha-fallido.cy.ts.mp4`.
- **Archivo Histórico Original Preservado**: `RESULTADOS/TC-M01-011/TC-M01-011_resultado.json` y `TC-M01-011_resultado.md` (intactos para auditoría histórica).

---

## 8. Recomendación y Siguientes Pasos

1. **Cerrar el ticket de QA correspondiente a TC-M01-011** como **APROBADO** en el ambiente TEST.
2. **Actualizar la matriz de pruebas del proyecto** en `INFORME_PROYECTO_Y_PRUEBAS.md` para reflejar que el backend ya valida reCAPTCHA con `HTTP 400`.

