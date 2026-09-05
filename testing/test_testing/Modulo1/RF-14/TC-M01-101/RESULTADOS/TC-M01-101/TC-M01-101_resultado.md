# TC-M01-101 — Notificaciones offline (RF-14)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU08 - Notificar a Usuarios · RF-14 |
| Tipo / Equipo | Resiliencia / Offline · Frontend & QA |
| Responsable | Juan Hernando |
| Ambiente (front) | http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-05T05:11:19.249Z |
| Cuenta de prueba | gestor.granja.test@pecuaria.co |

## Checkpoints
| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-01: Bandeja en línea | Notificaciones reales visibles, sin aviso de modo offline | 20 notificación(es) reales, sin aviso offline | **OK** |
| CP-02/03: Bandeja offline (fallback a caché) | Aviso "Sin conexión: mostrando las notificaciones guardadas en este dispositivo." visible, lista no vacía | Aviso offline visible, 20 notificación(es) desde caché local | **OK** |
| CP-04-DIAG: Llamada real al reconectar | La solicitud GET /notificaciones responde 200 tras restaurar la red | HTTP 200 — body: {"total":24,"no_leidas":24,"pagina":1,"tamano":20,"items":[{"id_notificacion":1402,"id_evento":4666,"tipo_evento":3,"mensaje":"Hemos registrado un nuevo inicio de sesión en tu cuenta.","fecha_envio":" | **OK** |
| CP-04: Reconexión | El aviso de "Sin conexión" desaparece al reconectar | El aviso offline ya no aparece — volvió a modo en línea | **OK** |

## Veredicto: **SIN FALLAS BLOQUEANTES**
