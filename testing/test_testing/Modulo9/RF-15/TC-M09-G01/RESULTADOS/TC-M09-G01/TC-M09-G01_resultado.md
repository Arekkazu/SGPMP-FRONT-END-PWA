# TC-M09-G01 — Registro de Especie Productiva (RF-15 · Módulo9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas · RF-15 |
| Tipo / Equipo | Funcional (UI & API) · Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Incidente de Infraestructura | **INC-M09-01-G01** (Fecha de detección: 03/09/2026) |
| Estado de Ejecución | ⚠️ **NO EJECUTADO — Bloqueado por incidente de infraestructura INC-M09-01-G01 (Mixed Content HTTPS→HTTP), detectado 03/09/2026** |
| Datos de prueba | Nombre: `Bovino` (límite 3-50 chars), Descripción: `Especie bovina productiva` |
| TODO Pendiente | Confirmar endpoint real de creación de especie (RF-15) y rol/cuenta de ejecución antes de correr este caso — actualmente sin verificar contra el backend. |

## Estado del Caso de Prueba y Próximos Pasos
- **Estado de Redacción**: El spec Cypress ([`tc-m09-g01-registro-especie.cy.ts`](../../tc-m09-g01-registro-especie.cy.ts)) y la colección Postman ([`Newman/tc-m09-g01-especie-postman-collection.json`](../../Newman/tc-m09-g01-especie-postman-collection.json)) están **completamente redactados con lógica real y listos para ejecutarse**.
- **Causa de Bloqueo**: El Frontend TEST opera en HTTPS mientras que el Backend TEST responde en HTTP plano, provocando que los navegadores bloqueen las peticiones XHR/API por *Mixed Content* (`INC-M09-01-G01`).
- **Acción requerida para ejecución**: Una vez resuelto el incidente de red y confirmado el endpoint real en `ENDPOINT_ESPECIES` / `CUENTA_EJECUCION_EMAIL`, se ejecutará `npx cypress run` y el spec generará automáticamente su reporte real dinámico en este directorio, reemplazando este reporte estático inicial.

> *Nota: Este informe es un documento inicial estático. No contiene checkpoints evaluados OK/FALLA ya que la prueba no ha sido ejecutada en el navegador.*
