# TC-M01-107 — Pérdida de Conexión en Respuesta HTTP 202 (Recuperación de Contraseña)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-RecuperacionContrasena - Recuperación de Contraseña · RF-08 |
| Tipo / Equipo | Pruebas Extremas / Resiliencia y Red · Frontend & Backend QA |
| Severidad | Media |
| Responsable | Sebastian |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-05T01:58:57.439Z |
| Cuenta de Prueba (Sujeto) | gestor.granja.test@pecuaria.co |
| Cuenta de Administración | admin@pecuaria.co |
| IP Runner Capturada | 181.59.67.25 |
| Intentos Previos Reales por IP (Última Hora) | 0 |
| Total Consumidos Pre-CP04 (N = Previos + CP02) | 1 |
| Respuesta Esperada CP-04 | HTTP 202 |
| Respuesta Real CP-04 | HTTP 202 (EXITOSO) |

## Contexto de Ejecución y Metodología de Resiliencia
> [!INFO]
> **1. Verificación Inicial de Precondiciones (CP-01)**: Se confirmó vía API la existencia y estado activo de la cuenta `gestor.granja.test@pecuaria.co` en `GET /usuarios/admin` con normalización de casing (`.toUpperCase()`) y lectura segura del ID de usuario (N/A).  
> **2. Intercepción Fiel de Respuesta HTTP 202 (CP-02)**: Se utilizó `req.continue((res) => res.send({ forceNetworkError: true }))` para garantizar que el servidor backend recibiera el POST real para `gestor.granja.test@pecuaria.co` antes de simular el corte de red en el cliente.  
> **3. Matching Estricto en Auditoría y Captura de IP (CP-03)**: Se validó mediante `GET /auditoria/` que el evento fue registrado en la BD para `gestor.granja.test@pecuaria.co` y se capturó la dirección IP real del runner (`181.59.67.25`).  
> **4. Conteo en Dos Fases por IP Real (CP-03 -> CP-04)**: Una vez obtenida la IP (`181.59.67.25`), se contabilizaron TODOS los eventos de recuperación originados por esa IP en la última hora (independientemente del correo) para obtener el $N$ real (0).  
> **5. Evaluación Determinista del Rate-Limit (CP-04)**: Con $N = 1$ solicitudes consumidas antes del reintento de CP-04:
>    - Si $N < 3$: Se exige `HTTP 202` (marcando `FALLA` si responde `HTTP 429` o `HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO`).
>    - Si $N \ge 3$: Se exige bloqueo de cuota por IP (`HTTP 429` o `HTTP 422 LIMITE_SOLICITUDES_EXCEDIDO`).

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Precondición de Cuenta | Cuenta gestor.granja.test@pecuaria.co existente y activa (HTTP 200) | Cuenta encontrada ID: 0, Estado: Activo | **OK** |
| CP-02: Interrupción de Red en Respuesta 202 | Solicitud enviada al backend real y respuesta interceptada con error de red en cliente | POST enviado exitosamente al backend; cliente recibió falla de red (forceNetworkError) | **OK** |
| CP-03: Auditoría Backend Post-Interrupción | Evento de recuperación registrado en BD exigiendo coincidencia con gestor.granja.test@pecuaria.co | Evento ID 4518 registrado a las 2026-09-05T01:58:45.181877Z (IP: 181.59.67.25, Resultado: exitoso) | **OK** |
| CP-04: Reintento y Rate-Limit (N < 3) | Con N=1 solicitudes previas en IP (< 3), la solicitud (N+1=2) EXIGE HTTP 202 | HTTP 202 OK — El reintento fue aceptado sin penalización prematura | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**

## Registro Cuantitativo de Consumo de Cuota (Rate-Limit IP)
- **Ventana temporal**: Última hora previa a la ejecución.
- **IP real del runner capturada**: `181.59.67.25`
- **Solicitudes de recuperación registradas previamente para esa IP (cualquier correo)**: 0
- **Solicitudes consumidas durante la corrida actual**: 2
- **Consumo total acumulado en la hora para la IP**: 2 / 3 por IP
- **Observación de repetibilidad**: La prueba consumió 2 solicitud(es) de la cuota de 3/hora por IP (Total acumulado IP 181.59.67.25: 2).

## Evidencias Visuales Múltiples (Capturas .PNG y Video .MP4)
- [01-precondiciones-cuenta.png](screenshots/01-precondiciones-cuenta.png) — Verificación de existencia y estado activo de la cuenta gestor.granja.test@pecuaria.co vía API Admin.
- [02-corte-red-respuesta.png](screenshots/02-corte-red-respuesta.png) — Captura del cliente experimentando error de red post-envío de formulario de recuperación.
- [03-auditoria-backend.png](screenshots/03-auditoria-backend.png) — Registro de auditoría backend comprobando que la solicitud fue procesada por el servidor y capturando la IP real.
- [04-reintento-ratelimit.png](screenshots/04-reintento-ratelimit.png) — Resultado del reintento evaluando determinísticamente la respuesta del rate-limit según la cuota real de la IP.
- [tc-m01-107-interrupcion-recuperacion.cy.ts.mp4](videos/tc-m01-107-interrupcion-recuperacion.cy.ts.mp4) — Grabación en video de la prueba automatizada completa.
