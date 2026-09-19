# RESULTADOS DE PRUEBA: GRUPO TC-M02-G24
**Módulo:** Modulo2 (Gestión Biológica)  
**Requisitos:** RF-36 (Gestión Poblacional), RF-33, RF-37, RF-39, RF-44, RF-16  
**Caso de Uso:** CU03 (Gestión de Lotes Poblacionales)  
**Fecha de Ejecución:** 2026-09-08T03:09:35Z  
**Ambiente Frontend:** https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io  
**Backend API:** https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test  
**Navegador / Herramientas:** Chrome 152.0 (Cypress E2E UI Headless + Video) / Newman CLI 6.2.2 (Postman API Collection)

---

## 1. Veredicto Final
### **⚠️ CON FALLAS (Bloqueo de Backend en RF-37 y Error 500 en Eventos BAJA)**
- **Checkpoints Totales Evaluados:** 11
- **Checkpoints OK:** 7 / 11
- **Checkpoints FALLA:** 4 / 11

---

## 2. Checkpoints Evaluados

| Paso | Esperado | Obtenido | Estado | Clasificación |
|---|---|---|---|---|
| Fase 0 — Asignar Fase Productiva [RF-37] | HTTP 200/201 (fase activa asignada) | HTTP 400: CICLO_INVALIDO — "El ciclo productivo con ID 25 no existe." | **FALLA** | Bloqueo Backend (id_ciclo_biologico vs id_ciclo_productiva) |
| TC-M02-048 — UI Ficha `cantidad_inicial` [RF-33] | 100 (inmutable / histórico) | 100 | **OK** | Conforme RF-33 |
| TC-M02-048 — UI Ficha `peso_promedio_inicial` [RF-33] | 10.0 (inmutable / histórico) | 10.0 | **OK** | Conforme RF-33 |
| TC-M02-048 — UI Ficha `cantidad_actual` [RF-36] | 100 | 100 | **OK** | Conforme RF-36 |
| TC-M02-048 — UI Ficha `densidad` [RF-36] | 0.2000 (cantidad_actual / superficie = 100 / 500.00) | null | **FALLA** | Defecto Backend (Cálculo supeditado a fase activa) |
| TC-M02-049 — Evento CRECIMIENTO [RF-39] | HTTP 200/201 con evento registrado | HTTP 400: VAL_ENTRADA / SIN_FASE_ACTIVA | **FALLA** | Bloqueo Backend (Consecuencia de falla en RF-37) |
| TC-M02-050 — Evento BAJA [RF-39] | HTTP 200/201 con cantidad_actual reducida en 10 | HTTP 500: ERROR_INTERNO — Error inesperado en base de datos | **FALLA** | Bloqueo Backend / Defecto de Persistencia |
| TC-M02-056 — Inmutabilidad `cantidad_inicial` [RF-33] | 100 (sin alteración tras eventos) | 100 | **OK** | Conforme RF-33 |
| TC-M02-056 — Inmutabilidad `peso_promedio_inicial` [RF-33] | 10.0 (sin alteración tras eventos) | 10.0 | **OK** | Conforme RF-33 |
| Teardown Lote [RF-44] | HTTP 200 OK (estado_nuevo: 6 BAJA) | HTTP 200 OK (estado_nuevo: 6) | **OK** | Conforme RF-44 |
| Teardown Ciclo [RF-16] | HTTP 200 OK (es_activo: false) | HTTP 200 OK (es_activo: false) | **OK** | Conforme RF-16 |

---

## 3. Evidencias Generadas

- **[TC-M02-G24_postman_resultado.json](TC-M02-G24_postman_resultado.json)**: JSON de ejecución completa de Newman CLI.
- **[screenshots/01_ficha_lote_ui.png](screenshots/01_ficha_lote_ui.png)**: Captura de pantalla de la ficha del lote en el frontend web SGPMP (`/activos-biologicos/100`).
- **[videos/TC-M02-048_ficha_lote_ui.cy.ts.mp4](videos/TC-M02-048_ficha_lote_ui.cy.ts.mp4)**: Grabación de video completa de la ejecución headless de Cypress UI.

---

## 4. Hallazgos y Defectos Documentados

1. **Brecha de Arquitectura REST (`id_ciclo_biologico` vs `id_ciclo_productiva`):** `POST /configuracion/ciclos` (RF-16) crea ciclos biológicos de especie (ej. ID #25). `POST /activos-biologicos/{id}/fases` (RF-37) rechaza dicho ID con `HTTP 400 CICLO_INVALIDO` ("El ciclo productivo con ID 25 no existe"). No existe ningún endpoint REST público para consultar o generar `id_ciclo_productiva` válidos.
2. **Defecto de Cálculo de Densidad en Ficha Virgien (`TC-M02-048`):** El endpoint `GET /activos-biologicos/{id}` retorna `densidad = null` tras la creación del lote, aun cuando la superficie de la infraestructura es conocida (500.00 m²) y la cantidad inicial es 100 (densidad matemáticamente calculable = 0.2000).
3. **Defecto de Persistencia HTTP 500 en Eventos BAJA (`TC-M02-050`):** `POST /activos-biologicos/{id}/eventos/baja` retorna `HTTP 500 ERROR_INTERNO` ("Error inesperado en base de datos"), evidenciando una excepción unhandled en el backend al procesar bajas de activos poblacionales.
