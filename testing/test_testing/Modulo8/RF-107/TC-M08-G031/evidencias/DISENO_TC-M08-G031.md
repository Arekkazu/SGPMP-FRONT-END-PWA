# Diseño y verificación local de herramienta — TC-M08-G031 (RF-107, TC-M08-071)

## 1. Alcance y trazabilidad

- **Grupo:** `TC-M08-G031` (Módulo 8 · RF-107 · `TC-M08-071`).
- **Componentes evaluados:** `<EstadoSincronizacion />` (`src/shared/design-system/EstadoSincronizacion.tsx`), `src/shared/sync/estadoSincronizacion.ts`, `src/shared/hooks/useOnlineStatus.ts`, `src/shared/design-system/ModalShell.tsx`, `src/shared/i18n/formato.ts`, `src/shared/i18n/locales/es-CO/common.json`.
- **Montaje y simulación:** Vitest + jsdom, sin red, `TZ=America/Bogota`, `i18n.changeLanguage('es-CO')`. `vi.mock` sobre `src/shared/sync/syncQueue` (`getQueue`, `getConflictos`, `SYNC_REPLAY_TERMINADO = 'sgpmp:sync-replay-terminado'`) con operaciones de la forma real `SyncOperation` (`src/shared/db/db.ts:223-237`). Reloj simulado con `vi.useFakeTimers({ toFake: ['Date'] })` fijado en `2026-11-21T20:00:00Z` (`15:00` en Bogotá).
- **Checkpoints (`CP-01`..`CP-11`):**
  - `CP-01` (`SINCRONIZADO`), `CP-02` (`SINCRONIZANDO`), `CP-03` (`OFFLINE`), `CP-04` (`CONFLICTO`).
  - `CP-05`: panel con 6 filas en orden exacto (`Activos biológicos`, `Telemetría`, `Predicción`, `Suministros`, `Finanzas`, `Integración contable`) y 4 celdas `td` por fila.
  - `CP-06`: formato último sincronizado `2026-11-21 15:00` (falla prevista en normal: `21/11/2026 3:00 p. m.`).
  - `CP-07`: pendientes `(a)` `0` en las 6 filas en `SINCRONIZADO` y `(b)` `2` en `Activos biológicos` con estado `Sin conexión` en `OFFLINE`.
  - `CP-08`: acción disponible interactiva por estado (`<button>Resolver conflicto</button>`, `<a>`/`<button>` `Ver cola`, `<a>`/`<button>` `Ver detalle`, sin botón/enlace en `SINCRONIZADO`; falla prevista en normal por texto plano).
  - `CP-09`: contenido `OFFLINE` tras avanzar 5 min (tiempo transcurrido, `registrar_evento` y `registrar_crecimiento`, mención de caché; falla prevista en normal).
  - `CP-10`: contenido `CONFLICTO` (valor local `Lote QA 1`, valor del servidor `/servidor/i` y fecha de divergencia; falla prevista en normal).
  - `CP-11`: `SINCRONIZANDO` por módulo con 3 operaciones en cola para `suministros`.
- **Observaciones (`OBS-1`..`OBS-5`):** registradas en `observaciones[]` sin afectar el veredicto.

## 2. Verificación local de la herramienta (`prueba_herramienta_v1`)

Se ejecutaron 8 corridas con Vitest local (`TZ=America/Bogota`, sin red):

| Corrida | Config / Control | OK / Total | Precondiciones | Checkpoints en FALLA | Coincide con lo previsto |
|---|---|---:|---:|---|---|
| `normal_1` | base | 7 / 11 | 1 / 1 | `CP-06`, `CP-08`, `CP-09`, `CP-10` | Sí |
| `normal_2` | base | 7 / 11 | 1 / 1 | `CP-06`, `CP-08`, `CP-09`, `CP-10` | Sí (idéntica a `normal_1`) |
| `normal_3` | base | 7 / 11 | 1 / 1 | `CP-06`, `CP-08`, `CP-09`, `CP-10` | Sí (idéntica a `normal_1`) |
| `control_fecha_iso` | `vitest.control_fecha_iso.config.ts` | 8 / 11 | 1 / 1 | `CP-08`, `CP-09`, `CP-10` (solo `CP-06` pasa a OK) | Sí |
| `control_acciones` | `vitest.control_acciones.config.ts` | 8 / 11 | 1 / 1 | `CP-06`, `CP-09`, `CP-10` (solo `CP-08` pasa a OK) | Sí |
| `control_contenido` | `vitest.control_contenido.config.ts` | 9 / 11 | 1 / 1 | `CP-06`, `CP-08` (solo `CP-09` y `CP-10` pasan a OK) | Sí |
| `control_sin_offline` | `vitest.control_sin_offline.config.ts` | 5 / 11 | 1 / 1 | `CP-03`, `CP-06`, `CP-07`, `CP-08`, `CP-09`, `CP-10` | Sí |
| `control_conflicto_oculto` | `vitest.control_conflicto_oculto.config.ts` | 6 / 11 | 1 / 1 | `CP-04`, `CP-06`, `CP-08`, `CP-09`, `CP-10` | Sí |


## Revisión de Claude (2026-11-21)

- Spec (540 líneas) leído entero; runner revisado con diff contra G028: solo cambian nombre del caso, 11 checkpoints, lista de src y TZ=America/Bogota (se restaura al final). Controles: un reemplazo exacto con guarda «aparece 1 vez».
- 8 JSON verificados en el equipo: coinciden con lo previsto; precondición TZ verdadera; ningún «No alcanzado»; normal_1..3 idénticas.
- Nota de medición CP-10 «fecha»: da false porque el texto del diálogo se concatena sin espacios («…Conflicto21/11/2026…») y \b no corta. La única fecha visible es la del «Último intercambio» (heredada del estado global que deja CP-06), no la de la divergencia. El veredicto de CP-10 no depende de esa parte: falta el valor local «Lote QA 1» y no hay valor del servidor (el «servidor» que encuentra es el texto genérico de la descripción).
- Nota CP-09: el texto real dice «desde las 3:00 p. m..» (doble punto: la hora ya termina en punto y la plantilla agrega otro). Se anota como observación menor, no como checkpoint.
