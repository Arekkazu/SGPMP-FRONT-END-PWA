# NOTA DE ELEMENTOS NO EJECUTABLES EN TEST — CASO TC-M05-G23 (RF-77)

**Fecha:** 2026-11-06 (UTC: 2026-11-07)  
**Ambiente:** TEST Oficial (`https://api.inmero.co/api-sgpmp-test` / Frontend: `https://api.inmero.co/sigab-test/`)  
**Autor:** Ingeniero de Automatización de QA  

En el diseño del caso de prueba agrupado TC-M05-G23 (RF-77), el sub-caso 1 (TC-M05-054) fue automatizado integralmente en `tc-m05-g23-reporte-gastos-exportacion.cy.ts`. Sin embargo, los escenarios extremos y de volumen correspondientes al sub-caso 2 (TC-M05-055) **NO son ejecutables en el ambiente TEST oficial** en la fecha actual por razones arquitectónicas y de estado de datos observadas durante las Fases 1, 1b, 1c y 1d.

---

## TABLA DE ELEMENTOS NO EJECUTABLES

| Elemento / Escenario | Motivo Observado en TEST | Qué se Necesita para su Automatización |
|:---|:---|:---|
| **Paginación PDF (25 y 30 registros)** | En TEST, el activo 57 solo cuenta con 1 consumo validado (alimento 31). No existe ningún activo con >= 26 gastos con costo válido. Intentar sembrar 29 consumos adicionales mediante la API falla con HTTP 500 o saturaría el ambiente. | Un activo biológico de prueba sembrado con al menos 26 a 30 registros de suministros (alimentos o medicamentos) validados con costo en base de datos. |
| **PDF con 500 y 501 registros (Límite 422)** | En TEST no existe ningún activo ni lote con 500 o 501 gastos registrados. La constante `MAX_REGISTROS_PDF = 500` está fija en el código (`exportar_reporte_gastos_use_case.py:47`) y no puede ser modificada por variables de entorno ni flags de prueba. | Inyección de una semilla masiva de 501 gastos en base de datos para un activo de prueba, o un entorno de pruebas con parámetro de umbral configurable (`MAX_REGISTROS_PDF`). |
| **CSV > 50 MB (Límite 413 sin archivo parcial)** | La constante `MAX_BYTES_CSV = 50 * 1024 * 1024` (50 MB) en `exportar_reporte_gastos_use_case.py:48` requeriría generar cientos de miles de filas en TEST, lo cual es inviable en el ambiente compartido. | Configuración de un umbral reducido para pruebas (p. ej. `MAX_BYTES_CSV = 1024` vía variable de entorno) o un mock a nivel de infraestructura. |
| **Descarga a las 24 h + 1 min (HTTP 410 Gone)** | La vigencia de 24 horas está codificada de forma fija en `archivo_exportacion.py:18` (`VIGENCIA = {"RF77": timedelta(hours=24)}`). No existe reloj inyectable (`freeze_time`) ni parámetros de tiempo acelerado en TEST. Los archivos expirados de julio ya tienen `archivo: null` en base de datos y no exponen su `id_archivo` vía GET. | Capacidad de manipulación temporal en el servidor (via cabecera de prueba `X-Test-Time` o similar) o persistencia en semilla de un registro de archivo con `fecha_expiracion` en el pasado y contenido purgado. |
| **Fallo forzado del motor PDF (HTTP 500 con alternativa CSV)** | En el backend no existen flags de falla simulada (`FAIL_PDF`, `FORCE_500`, etc.) según el barrido de código verificado en la Fase 1b y 1c. El generador ReportLab funciona normalmente en TEST para documentos válidos. | Flag o interceptor de pruebas en backend (`X-Test-Fail-Pdf: true`) para simular la excepción en `generar_pdf()`. |

---
**Regla de aseguramiento:** Ninguno de estos 5 elementos fue codificado como checkpoint dentro del spec de Cypress, garantizando que el reporte de ejecución refleje únicamente aseveraciones con viabilidad técnica real en TEST.



---

## Estado final G23

### 1. Elementos NO ejecutados (E5-E10) y su motivo
- **E5 (30 registros, 25 por página), E6 (500 registros PDF) y E7 (501 registros, 422 PDF_EXCEDE_LIMITE):** No ejecutables porque faltan datos semilla en TEST (en TEST el activo 57 solo posee 1 consumo validado y no existen activos con volumen de 30 o 500+ consumos).
- **E8 (CSV > 50 MB, 413) y E10 (fallo de generación del PDF, 500 con alternativa CSV):** No ejecutables debido a constantes fijas en el backend sin flags ni mecanismos para provocarlos desde el cliente.
- **E9 (archivo vencido 24 h + 1 min, 410):** No ejecutable porque depende de datos de archivos vencidos (sección G del DBA) y no existe mecanismo de manipulación temporal (`freeze_time`) en el servidor TEST.

### 2. CP-08B: PDF sin imagen
- **Observado:** La finca 1 tiene configurado `logo_path: "/assets/logos/remanso.png"` (`GET /configuracion/identidad-visual/1` -> HTTP 200). Sin embargo, las consultas directas `GET /uploads/logos/assets/logos/remanso.png` y `GET /uploads/logos/remanso.png` respondieron HTTP 500 (sondeo 2026-11-07T09:57:32Z).
- **Causa de ambiente PROBABLE (HIPÓTESIS):** Ausencia física del directorio `LOGOS_STORAGE_PATH` en el contenedor del backend de TEST, provocando que Starlette `StaticFiles` falle con 500 y el adaptador de M05 omita la imagen al no superar `os.path.isfile()`. Pendiente de confirmación del equipo de Backend / Infraestructura.
