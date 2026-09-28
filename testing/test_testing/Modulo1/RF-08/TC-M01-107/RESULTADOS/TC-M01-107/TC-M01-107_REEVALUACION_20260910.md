# Reporte de Reevaluación Técnica: TC-M01-107

## 1. Información General de la Reevaluación

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M01-107` |
| **Módulo / Requerimiento** | Módulo 1 (Seguridad y Acceso) / `RF-08` (Recuperación de Contraseña) |
| **Caso de Uso** | CU-RecuperacionContrasena — Pruebas Extremas / Interrupción de Red Post-202 |
| **Fecha y Hora de Reevaluación** | 2026-09-10 21:06:00 (UTC-5) / 2026-09-11T02:06:34Z |
| **Responsable de Ejecución** | QA Technical Analyst (Sebastian) |
| **Ambiente de Pruebas** | **Frontend TEST:** `http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`<br>**Backend TEST:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Cuenta de Prueba (Sujeto)** | `gestor.granja.test@pecuaria.co` (ID: 30, Estado: `Activo`) |
| **Cuenta de Administración** | `admin@pecuaria.co` |
| **Dirección IP del Runner** | `200.118.145.38` |
| **Cuota Previa por IP en la Última Hora** | **$N = 0$ solicitudes registradas** (Verificación previa en `/auditoria/`) |
| **Herramienta de Ejecución** | Cypress v13.17.0 (Runner Chrome Headless 152, 1280x900) |

---

## 2. Línea de Tiempo Comparativa: 3 Ejecuciones

| Parámetro / Checkpoint | 1. Corrida Original (2026-09-03) | 2. Aislamiento Histórico (2026-09-05) | 3. Reevaluación de Hoy (2026-09-10) |
| :--- | :--- | :--- | :--- |
| **Commit Asociado** | `6d511de8` | `8b0dff47` | Ejecución en vivo (aislada) |
| **IP Pública del Runner** | `200.118.145.38` | `181.59.67.25` | `200.118.145.38` |
| **Cuota Previa en Última Hora** | Saturada por pruebas concurrentes | $N=0$ previa | **$N=0$ previa (verificada limpia)** |
| **CP-01 (Cuenta Activa)** | OK | OK | **OK (ID: 30, Activo)** |
| **CP-02 (Corte de Red Post-202)** | OK (`forceNetworkError`) | OK (`forceNetworkError`) | **OK (`forceNetworkError`)** |
| **CP-03 (Auditoría Backend)** | OK (Evento ID 3661) | OK (Evento ID 4518) | **OK (Evento ID 9248, exitoso)** |
| **CP-04 (Reintento Rate-Limit)** | **FALLA** (HTTP 422 prematuro) | **OK** (HTTP 202 OK) | **OK (HTTP 202 OK)** |
| **Veredicto Final** | `CON FALLAS (RATE-LIMIT PENALIZA PREMATURAMENTE)` | `SIN FALLAS BLOQUEANTES` | **SIN FALLAS BLOQUEANTES (APROBADO)** |

---

## 3. Resultados Detallados por Checkpoint (Ejecución de Hoy)

| Checkpoint | Descripción | Criterio de Aceptación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **CP-01** | Precondición de Cuenta Sujeto | Confirmar en `GET /usuarios/admin` que la cuenta existe y está activa. | Cuenta `gestor.granja.test@pecuaria.co` localizada con ID: 30 y estado: `Activo`. | **OK** |
| **CP-02** | Interrupción de Red Post-Envío | Petición POST viaja al backend real y el cliente sufre corte simulado (`forceNetworkError`). | POST recibido por el backend; cliente recibió interrupción de red exitosamente simulada. | **OK** |
| **CP-03** | Auditoría Backend Post-Corte | Evento de recuperación registrado en BD con resultado `exitoso` e IP del runner. | Evento ID **9248** registrado a las 2026-09-11T02:06:28Z (IP: `200.118.145.38`, Resultado: exitoso). | **OK** |
| **CP-04** | Reintento y Rate-Limit ($N < 3$) | Con $N=1$ solicitud previa acumulada en la hora, el reintento ($N+1=2$) debe responder HTTP 202 sin penalización prematura. | **HTTP 202 OK** — El reintento fue aceptado inmediatamente por el backend sin bloqueo. | **OK** |

---

## 4. Análisis de Causa Raíz Confirmada

- **Causa Raíz Real:** **Saturación transitoria de la cuota de rate-limit por IP compartida.**
- **Mecanismo:** El backend aplica un algoritmo estricto de control de tráfico en la función `contar_solicitudes_recuperacion_por_ip`, que limita a **3 solicitudes de recuperación por hora por dirección IP pública**. 
- En la corrida original del 2026-09-03, la suite completa de pruebas del Módulo 1 se ejecutó concurrentemente desde la misma IP pública (`200.118.145.38`), acumulando múltiples intentos previos. Cuando TC-M01-107 intentó hacer su reintento, la IP ya había superado el umbral de 3 peticiones/hora, provocando la respuesta legítima `HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO`.
- **Comprobación:** Al verificar previamente que la IP `200.118.145.38` contaba con $N=0$ solicitudes en la última hora y ejecutar de forma aislada, el reintento respondió `HTTP 202 OK` en 6.7 segundos, demostrando que **el backend no posee ningún defecto de lógica en el conteo de rate-limit**.

---

## 5. Clasificación Técnica del Hallazgo

- **Clasificación Original Documentada:** *Interfaz/UI o navegación; equipo de Diseño.*
- **Estado de la Clasificación:** **REFUTADA EN SU TOTALIDAD.**
- **Clasificación Corregida:** **Control de Tráfico / Seguridad de Backend (Rate-Limiting por IP).**

### Justificación Técnica
La respuesta `HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO` es generada por el middleware de seguridad del backend en función de los registros persistidos en la tabla `modulo1.auditoria`. No interviene ningún componente de presentación visual, maquetación CSS, sistema de diseño ni navegación de la interfaz de usuario. Catalogar un bloqueo de rate-limit como defecto de diseño visual representó un error metodológico de clasificación.

---

## 6. Corrección de Dato Administrativo y de Ficha Técnica

> [!IMPORTANT]
> **Corrección de Cuenta de Prueba Sujeto:**  
> La ficha descriptiva original del caso documentaba como dato de prueba el correo `ana.martinez.qa1@sgpmp-test.com`.  
> Sin embargo, en el ambiente TEST desplegado dicha cuenta se encuentra registrada en estado **`Pendiente`** (ID: 86), lo que incumple la precondición operativa de cuenta activa (CP-01).  
> El spec automatizado implementa y utiliza correctamente la cuenta **`gestor.granja.test@pecuaria.co`** (ID: 30, estado **`Activo`**). Debe corregirse este dato en la matriz de trazabilidad para reflejar la cuenta real sujeta a prueba.

---

## 7. Recomendaciones Operativas para Automatización y CI/CD

1. **Sensibilidad a Concurrencia de IP:**  
   Este caso consume exactamente **2 solicitudes de la cuota de 3/hora por IP** (1 en CP-02 y 1 en CP-04). Si se ejecuta en suites paralelas o pipelines de CI/CD que compartan la misma IP pública de salida (NAT), existirá un alto riesgo de falsos negativos por agotamiento de cuota.
2. **Estrategia Recomendada:**  
   - En pipelines automatizados, aislar este caso o garantizar una ventana de enfriamiento de 60 minutos entre ejecuciones.
   - Alternativamente, configurar runners con IPs dinámicas o parametrizar el límite de rate-limit en variables de entorno del ambiente de pruebas continuas.

---

## 8. Evidencias de Ejecución

- **Reporte JSON del Runner:** [TC-M01-107_resultado.json](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-107/RESULTADOS/TC-M01-107/TC-M01-107_resultado.json) *(preservado intacto con trazabilidad histórica)*
- **Capturas de Pantalla Generadas:**
  - Precondición de Cuenta: [01-precondiciones-cuenta.png](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-107/RESULTADOS/screenshots/tc-m01-107-interrupcion-recuperacion.cy.ts/01-precondiciones-cuenta.png)
  - Corte de Red Post-Envío: [02-corte-red-respuesta.png](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-107/RESULTADOS/screenshots/tc-m01-107-interrupcion-recuperacion.cy.ts/02-corte-red-respuesta.png)
  - Reintento Rate-Limit (HTTP 202): [04-reintento-ratelimit.png](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-107/RESULTADOS/screenshots/tc-m01-107-interrupcion-recuperacion.cy.ts/04-reintento-ratelimit.png)
- **Grabación en Video:** [tc-m01-107-interrupcion-recuperacion.cy.ts.mp4](file:SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-107/RESULTADOS/videos/tc-m01-107-interrupcion-recuperacion.cy.ts.mp4)

---

## 9. Estado del Incidente y Siguiente Paso

- **Estado del Incidente:** **CERRADO / RESUELTO (FALSO DEFECTO).**
- **Conclusión QA:** El caso `TC-M01-107` está **100% APROBADO**. Se comprobó con evidencia verificable que el servidor procesa y persiste la solicitud de recuperación a pesar de cortes visuales de red en el cliente, y que la cuota de rate-limit no penaliza prematuramente los reintentos legítimos cuando $N < 3$.
- **Siguiente Paso:** Actualizar la matriz de trazabilidad del Módulo 1 (`INFORME_PROYECTO_Y_PRUEBAS.md`) marcando el caso como **APROBADO (`SIN FALLAS BLOQUEANTES`)**, corrigiendo el correo sujeto a `gestor.granja.test@pecuaria.co`.
