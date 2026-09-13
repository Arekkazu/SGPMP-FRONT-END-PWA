# TC-M09-G31 — Evaluación V2 (reevaluación TC-M09-66/67/68, semáforo RF-17)

Reevaluación de la clasificación semafórica de mediciones con los niveles RF-17
(Normal/Verde, Precaución/Amarillo, Crítico/Rojo). Coexiste con la evaluación V1
de `RF-17/TC-M09-G31/` (BLOCKED), que es de solo lectura.

`run-newman.cjs` es una verificación de **solo lectura** (login + GET) en
`G31_ENV` (`TEST` | `DEV`). Hace cuatro cosas:

- Elige la configuración RF-17 activa con niveles más amplios.
- Calcula los valores interiores (puntos medios) de cada nivel, sin enviarlos.
- Consulta dashboard e historial de Monitoreo.
- Ejecuta la colección Newman con precondiciones y oráculo, y registra la
  evidencia de código de backend y frontend: trigger `VERDE` fijo, alertas M03,
  stub del historial, ausencia de uso de `niveles_alerta_ambientales` y
  `SemaforoPill`.

No genera mediciones ni modifica configuraciones.

## Ejecución

```bash
export G31_REEVAL_V2_RUN_ID=G31-REEVAL-V2-<fecha>-<hora>
export TEST_ADMIN_PASSWORD=...   # nunca en archivos
export DEV_ADMIN_PASSWORD=...    # fallback DEV (admin.general), solo para G31_ENV=DEV
NODE_PATH="$(npm root -g)" G31_ENV=TEST node run-newman.cjs
NODE_PATH="$(npm root -g)" G31_ENV=DEV  node run-newman.cjs
```

El script no sobrescribe evidencia existente.

Resultado de `G31-REEVAL-V2-20260913-103722`: **DESAPROBADO — FUNCIONALIDAD NO
IMPLEMENTADA** para los tres originales (FLUJO → Desarrollo; actualizar
INC-M09-32-G31).
