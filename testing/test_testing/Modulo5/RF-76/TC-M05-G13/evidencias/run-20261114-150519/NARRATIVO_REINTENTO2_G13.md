| fecha | autor | qué se hizo |
|---|---|---|
| 2026-11-14 | Juan Sebastian Gutierrez | Narrativo del reintento 2 de TC-M05-G13 (RF-76, Cypress) |

# TC-M05-G13 · Reintento 2 · Aprobado (14/14)

**Corrida oficial:** `evidencias/run-20261114-150519` (2026-11-14 15:05–15:06, hora de Bogotá). Exit 0, retries 0 y 3 rollbacks con HTTP 200. T00 = T99 y el escaneo de secretos no tuvo hallazgos.
**Reporte:** `resultado_TC-M05-G13_reintento2.json` (SHA-256 `0BB0A3EE27901033E7A7D343B7FBB1C8B556ADBE21B0857F08711AAB7C43BB3A`).
**Código ejecutado:** spec `529154CD…` (ajustes R2 + R3, ver `evidencias/prep-R3-20261114/diff_R3.txt`), commands `8C5CCED4…`, config `7CAFD300…`.

## Historial del caso
- **Ronda 1 (2026-11-06):** Rechazado, 5/14. Hubo dos causas:
  - POST /suministros/medicamentos respondía 500. Fallaron CP-05/06/07/11/12/13.
  - El formulario no mostraba la cantidad del lote ni la dosis por individuo (CP-09/CP-10). Ese día el formulario todavía no tenía los campos: el commit que los agrega (`37caa5c4`) es del 2026-11-10.
- **Reintento 1 (2026-11-12, `run-20261112-123527`):** ARCHIVADO NO OFICIAL. El 500 ya estaba corregido (201). CP-09 y CP-10 fallaron por el detector del script, no por el producto: las capturas mostraban los campos. Su JSON sigue en `resultados/` como historial.
- **Corrida del 2026-11-14 14:48 (`run-20261114-144138`):** inválida por ambiente. `GET /sesiones/me/permisos` respondió 500 ERROR_INTERNO (X-Request-Id `5682def0-3057-4b8a-afb2-96e4b7b95df2`). No generó reporte oficial. 17 minutos después el mismo endpoint respondió 200: el fallo no se reprodujo.
- **Reintento 2 (esta corrida):** Aprobado, 14/14.

## Lo que demuestra el reintento 2 (RF-76 Proceso 4 y Restricción 8)
- **CP-09:** el campo `#medicamento-cantidad-actual` («Población actual del lote») muestra "10". Es de solo lectura (`readonly` y `aria-readonly="true"`).
- **CP-10:** el campo `#medicamento-dosis-por-individuo` («Dosis por individuo (ml)») recalcula en vivo. Con dosis 20 muestra "2 ml"; al cambiar a 50, "5 ml"; al volver a 20, "2 ml". Es de solo lectura. La región aria-live dice «Cada uno de los 10 individuos recibe 2 ml.».
- **CP-11:** el POST de la pantalla no envía `dosis_por_individuo`. El servidor responde 201 con `dosis_por_individuo = "2.0000"`, costo 4000 y fin de retiro hoy+3 (X-Request-Id `2027dc54-c66d-4b0d-8825-4d222829533c`).
- **CP-05/CP-11/CP-13:** responden 201/201/200. El 500 de la ronda 1 no reaparece.

## Observaciones
- La observación «CP-06 lista: fila En retiro: no; estado Validado: no» es un falso negativo del detector auxiliar. La captura `cp06-registro-individual.png` muestra la fila «DIS141-BOV-OUTLIER · Oxitetraciclina · En retiro hasta 21/11/2026 · Validado». El detector busca el texto "#778", que la tabla no muestra. No afecta a CP-06, que se evalúa con el toast (RF-76 Proceso 10).
- Correos reales: los registros 284 (activo 778), 285 y 286 (activo 776) generaron avisos de retiro. El rollback no deshace esos correos.
- Un informe anterior del agente (`run-20261114-144138`) reportó un SHA incorrecto para `resultado_TC-M05-G13.json`. El valor real, verificado, es `4DA139DE…6684A4C391E9`.
