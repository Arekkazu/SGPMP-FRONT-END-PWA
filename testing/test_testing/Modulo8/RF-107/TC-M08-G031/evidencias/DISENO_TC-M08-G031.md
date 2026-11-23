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


## 3. Reintento 1 (2026-11-22, INC-M08-394-G031, GitHub 734)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-22 | Juan Sebastian Gutierrez | Fase 1 y 2 del reintento 1: spec v1.1 (ADAPT-1 en CP-09, OBS reescritas y nuevas) y runner del reintento; prueba de la herramienta en `prueba_herramienta_reintento1/` |

### 3.1 Respaldo de la ronda 1

`fuentes_generador/ronda1/` (con extensión `.txt`) y `$HOME/respaldo_g031_ronda1/` de la VM: spec `7DC99980…`, runner `C4418882…`, DISENO `75F89D7A…` (SHA verificado en el equipo).

### 3.2 Cambio de Desarrollo (observado)

- Commit `0f42adbb` («Closes #734, #705»), mergeado con el PR #766. Frontend `test-JuanSG` HEAD `f10009d5`; `src` sin cambios locales salvo finales de línea (`git diff --ignore-cr-at-eol` vacío).
- `EstadoSincronizacion.tsx`: `fechaSync()` (AAAA-MM-DD HH:MM con la hora local); acciones con `<Button>` («Resolver conflicto» navega a `RUTA_MODULO[clave]`; «Ver cola» y «Ver detalle» despliegan la cola del módulo con etiquetas `sincronizacion.operacion.*`); sección «Datos en conflicto» con «Valor guardado en este equipo», «Respuesta del servidor» y «Conflicto desde»; sin conexión, `offline_desde` con fecha y minutos y la lista «Datos guardados en este equipo: …» (módulos con último intercambio en la sesión).
- `estadoSincronizacion.ts` devuelve `operaciones`; `syncQueue.ts`:111-113 guarda `servidor = backendMessage ?? message` y `fechaConflicto = Date.now()`; `db.ts` agrega los dos campos.
- Despliegue en TEST: bundle `index-BsxWgc0X.js` con «Datos en conflicto», «Conflicto desde», «Ver cola», `offline_desde_one` y `fechaConflicto` en `syncQueue`; sin «Sin conexión desde las». Verificado con `fetch` sin caché y sin sesión (2026-11-22 23:1x).

### 3.3 Spec de la ronda 1 sin cambios contra HEAD

10/11 (`prueba_herramienta_reintento1/ronda1_sin_cambios/`): CP-06 y CP-08 pasan a OK; CP-10 OK; CP-09 FALLA por la herramienta (buscaba las claves crudas `registrar_evento`/`registrar_crecimiento`, que ahora se muestran traducidas y dentro de «Ver cola», y la palabra «caché», que ahora es «Datos guardados en este equipo»).

### 3.4 Spec v1.1

- **ADAPT-1 (CP-09):** esperado y fuente literales. (i) tiempo transcurrido con la misma expresión; (ii) se pulsa la acción de la fila de Activos («Ver cola», 8.4: enlace «para revisar las operaciones pendientes de envío») y se exigen las dos acciones por su clave cruda o su etiqueta i18n (`common:sincronizacion.operacion.*`); (iii) antes de cortar la red se siembra un intercambio exitoso de Activos y se exige un elemento del diálogo, fuera de la tabla, que hable de caché o de «datos guardados en este equipo» y nombre «Activos biológicos». Controles: `sin_tiempo`, `cola_incompleta`, `sin_lista_cache` (FALLA solo CP-09, cada uno en su parte) y la corrida normal (OK).
- **CP-10:** medición literal de la ronda 1 por **decisión de Sebastian (2026-11-22, opción B)**. La diferencia con 8.4 («el valor disponible en el servidor») queda en OBS-6 con lo medido: la app muestra el mensaje de rechazo del servidor. Control `conflicto_sin_detalle` (FALLA CP-10).
- **Observaciones:** OBS-1 reescrita (sigue en ventana centrada; `ModalShell` ya tiene `lateral` desde INC-M08-385-G026 y este panel no lo usa); OBS-2 con App.tsx:236; nuevas OBS-6 (valor del servidor = mensaje de rechazo), OBS-7 (lista de caché desde la sesión en memoria, no desde IndexedDB; leída del código), OBS-8 («Resolver conflicto» → `/activos-biologicos`, medido con MemoryRouter en una prueba sin aserciones), OBS-9 (módulo y tipo de cambio, no campo o registro) y OBS-10 («Conflicto desde» = hora del rechazo o de creación).
- La prueba de observación OBS-8 no tiene aserciones: no cambia el veredicto ni el exit de Vitest (12 pruebas, 11 checkpoints).

### 3.5 Runner del reintento 1

Mismos 11 checkpoints. Se agregan a la lista de SHA `Button.tsx`, `db.ts`, `useModalA11y.ts`, `operacionEnCurso.ts` y `useToast.ts` (los monta `ModalShell`), y el estado de `src` se calcula con `git diff --ignore-cr-at-eol --numstat HEAD -- src` (en git 2.34, `--name-only` no respeta la opción y contaba 51 archivos solo por CRLF).

### 3.6 Prueba de la herramienta (contenedor, `fe_src.tgz` `74DB706B…` de HEAD `f10009d5`)

| Corrida | OK / 11 | FALLA | Previsto |
|---|---:|---|---|
| `ronda1_sin_cambios` (spec v1) | 10 | CP-09 | Sí |
| `normal_1` a `normal_3` (v1.1) | 11 | — | Sí, idénticas salvo fecha y run_id |
| `control_fecha_local` | 10 | CP-06 | Sí |
| `control_acciones_texto` | 10 | CP-08 | Sí |
| `control_sin_tiempo` | 10 | CP-09 (tiempo=false) | Sí |
| `control_cola_incompleta` | 10 | CP-09 (registrar_crecimiento=false) | Sí |
| `control_sin_lista_cache` | 10 | CP-09 (cache=false) | Sí |
| `control_conflicto_sin_detalle` | 10 | CP-10 | Sí |
| `control_sin_offline` | 7 | CP-03, CP-07, CP-08, CP-09 | Sí |
| `control_conflicto_oculto` | 10 | CP-04 | Sí |

Un solo config (`controles/vitest.mutacion.config.mts.txt`) con `QA_MUTACION`, reemplazo exacto en memoria con CRLF normalizado, guarda «aparece 1 vez» y una línea `[QA_MUTACION] … aplicado` por control (presente en las 8 consolas). Ningún «No alcanzado». La precondición de zona horaria es verdadera en todas.

### 3.7 Hallazgo

El registro de promoción de la ronda 1 (`evidencias/PROMOCION_TC-M08-G031.txt`, `19732AC9…`), citado en el cierre, no existe en el equipo; el reporte promovido sí (`7BBE5DE5…`). Mismo caso que G026.
