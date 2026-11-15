| fecha | autor | qué se hizo |
|---|---|---|
| 2026-11-14 | Juan Sebastian Gutierrez | Narrativo del reintento 2 de TC-M05-G23 (RF-77, Cypress) |

# TC-M05-G23 · Reintento 2 · Rechazado (13/14)

**Corrida oficial:** `evidencias/run-20261114-151915`, el 2026-11-14 entre 15:19 y 15:20 (hora de Bogotá). Retries 0, rollback HTTP 200 y escaneo de secretos sin hallazgos. El aislamiento posterior al rollback quedó confirmado (CP-09).
**Reporte:** `resultado_TC-M05-G23_reintento2.json` (SHA-256 `25418924844B6AF65A85A81E79550E4786EF56863FEA18840A1E211A46A4D469`).
**Código ejecutado:** spec `5B0C9449…` (cambios H1–H5 en `evidencias/prep-R2-20261114/diff_R2.txt`), commands `8101F9E6…`, config `C5AB91D7…`.
**Despliegue:** antes de la corrida, la sonda de la API confirmó que el fix del INC-M05-360-G23 ya estaba activo en TEST (`sonda_despliegue_G23.txt`). El fix es el commit `e3e5bd25` en `origin/test` (2026-11-13), que corresponde al PR #1118.

## Resultado por INC
- **INC-M05-360-G23 (nota de recorte, RF-77 Proceso paso 6): corregido.**
  - CP-08E OK: la API y el PDF muestran SIN_BASE_COMPARATIVA con las dos notas; la de recorte trae la fecha 2026-01-01.
  - CP-08F OK: el recorte parcial también funciona. Con el rango 2026-03-01 a 2026-07-31 se generan las dos notas (X-Request-Id `93922f96-66f4-492f-ab72-c9f5d62a75d9`).
- **INC-M05-269-G23 (PDF: encabezado, desglose, tendencia y logo):** los puntos 2, 3 y 4 están corregidos (CP-08C, CP-08D y CP-08E OK). **El logo sigue faltando (CP-08B FALLA).**
  - QA verificó el PDF con herramientas independientes del detector del spec (`VERIFICACION_CP08B_G23.txt`): no tiene imágenes, no tiene XObject y el render de la página no muestra logo.
  - La finca 1 sí tiene un logo configurado (`EVIDENCIA_LOGO_G23.txt`).
  - Según Desarrollo, falta una acción de ambiente en TEST: configurar `LOGOS_STORAGE_PATH` sobre un volumen persistente y volver a subir el logo de la finca 1. El INC sigue abierto por eso.

## Observaciones
- El texto del obtenido de CP-08B incluye `static_status=404`. Ese valor sale de una URL mal armada por el spec (`/uploads/logos/` + un logo_path que ya trae `/assets/logos/…`), así que no se usa como evidencia.
- El detector de CP-08B solo busca `/Subtype /Image`. Para este PDF (versión 1.4, sin object streams) eso alcanza, pero conviene reforzarlo en la próxima ronda.
