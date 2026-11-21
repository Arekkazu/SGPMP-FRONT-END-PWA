# Diseño y verificación local de herramienta — TC-M08-G030 (RF-107)

## 1. Alcance y trazabilidad

- **Grupo:** `TC-M08-G030` (Módulo 8 · RF-107).
- **Casos cubiertos:**
  - `TC-M08-072 a` (CA-06): cambio del indicador `button.ds-sync` a `ds-sync--OFFLINE` (`Sin conexión`, `<= 5.000 ms`) y retorno a `ds-sync--SINCRONIZADO` (`<= 10.000 ms`) en Chromium y WebKit.
  - `TC-M08-072 c` (RNF-04): navegación sin conexión por el menú lateral hacia `Panel principal` (`/dashboard`) y `Activos biológicos` (`/activos-biologicos`) sin error de sección (`No se pudo mostrar esta sección`) y conservando `ds-sync--OFFLINE`, en Chromium y WebKit.
  - `TC-M08-073` (CA-01, RNF-01, RNF-02): 10 mediciones del banner de éxito (`<= 500 ms`), 10 del banner de error (`<= 500 ms`) tras `POST /reportes` simulado (`201`/`422`), y 10 del modal crítico `Confirma la baja` (`<= 200 ms`, `0` `POST .../eventos/baja`), en Chromium y WebKit.
  - `TC-M08-069 c` (Restricción 3, CA-05, §8.5): modal crítico bloqueante `Cerrar período` en `/finanzas/cierre` (WebKit, Administrador), comprobando permanencia tras `Escape` (`500 ms`), clic en overlay `(10, 10)`, ausencia de botón `X`, y avance de reloj virtual `fastForward('10:00')`, sin redirección a `/login` y con `0` `POST .../cierre`.
  - `OBS-FA4` (observación, no checkpoint): estado del indicador y avisos al perder conexión con `POST /reportes` retenido en vuelo.

## 2. Arquitectura del spec y del runner

- **Organización en Playwright:** `playwright.config.ts` define 1 proyecto (`chromium`, `workers: 1`, `retries: 0`, `serviceWorkers: 'block'`, `trace: 'off'`, `video: 'off'`). El spec `tc-m08-g030.pw.ts` contiene 1 prueba única que ejecuta:
  1. **Parte A (Veterinario, Chromium):** login único, calentamiento de chunks por navegación SPA (`/dashboard` -> `/activos-biologicos` -> `/prediccion/historial-predictivo`), `CP-01..CP-06` y `OBS-FA4`. Luego guarda `storageState` y cierra el contexto de Chromium.
  2. **Parte A (Veterinario, WebKit):** lanza WebKit con `webkit.launch()`, crea contexto con `storageState` (sin segundo login) y ejecuta `CP-07..CP-12` y `OBS-FA4`.
  3. **Parte B (Administrador, WebKit):** contexto nuevo sin cookies, login único de Administrador, `/finanzas/cierre` y `CP-13` con `page.clock.install()` + `fastForward('10:00')`.
- **Guardia de solo lectura:** `registrarRutas` intercepta `**/*`. Bloquea hosts externos y `/fcm-token`. Permite 1 solo login por cuenta, `/sesiones/refresh` y `DELETE /sesiones`. `POST /reportes` siempre se responde con `route.fulfill` (`201`/`422`) o `route.abort` (`OBS-FA4`), nunca llega al backend. Cualquier otra escritura (`POST .../eventos/baja`, `POST .../cierre`, etc.) se aborta, se registra en `violaciones` e invalida toda la corrida.
- **Runner (`ejecutar_tc_m08_g030.ps1`):** deriva de `TC-M08-G024`, lee `TEST_VET_EMAIL`, `TEST_VET_PASSWORD`, `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` desde `sgpmp-backend\.env.test` en memoria (sin imprimirlos ni escribirlos en disco), exige binarios de Chromium y WebKit, escanea secretos en el staging para ambas cuentas y retorna códigos `0/1/2/3/4/6`.

## 3. Verificación local de la herramienta (`prueba_herramienta_v1`)

Se ejecutaron 7 corridas locales contra `servidor_api_simulada.mjs.txt` (dos cuentas simuladas con rotación de token y payload base64url con espacio inicial para evitar encabezados JWT) y 5 builds Vite aislados en `%TEMP%\qa-g030-builds\`:

| Escenario | Build | OK / Total | Precondiciones | Checkpoints en FALLA | Escrituras no permitidas al mock | Coincide con lo previsto |
|---|---|---:|---:|---|---:|---|
| `normal_1` | normal | 13 / 13 | 16 / 16 | Ninguno | 0 | Sí |
| `normal_2` | normal | 13 / 13 | 16 / 16 | Ninguno | 0 | Sí |
| `control_banner_lento` | `vite.control_banner_lento.config.ts` (+800 ms toasts) | 9 / 13 | 16 / 16 | Solo `CP-04` (807–815 ms), `CP-05` (807–815 ms), `CP-10` (813–827 ms), `CP-11` (809–827 ms) | 0 | Sí |
| `control_modal_lento` | `vite.control_modal_lento.config.ts` (+500 ms `setPendiente`) | 11 / 13 | 16 / 16 | Solo `CP-06` (504–512 ms), `CP-12` (534–550 ms) | 0 | Sí |
| `control_sin_offline` | `vite.control_sin_offline.config.ts` (`handleOffline` vacío) | 11 / 13 | 16 / 16 | `CP-01`, `CP-07` (timeout >6000 ms, queda `SINCRONIZADO`); resto medido, ninguno `No alcanzado` | 0 | Desvío documentado (`CP-03`/`CP-09` pasan) |
| `control_cierre_escape` | `vite.control_cierre_escape.config.ts` (quita `bloqueante`) | 12 / 13 | 16 / 16 | Solo `CP-13` (`tras_escape=no`) | 0 | Sí |
| `control_guardia` | normal + `control_guardia.pw.ts` (pulsa `Confirmar baja` 1 vez) | 0 / 13 | 15 / 16 | Todos invalidados por `Precondición no cumplida (Ninguna escritura no permitida hacia TEST)` | 0 | Sí |

### Nota sobre `control_sin_offline` (`CP-03` y `CP-09`)

Al neutralizar únicamente `const handleOffline = () => setOnline(false);` en `src/shared/hooks/useOnlineStatus.ts`, el indicador en `/prediccion/historial-predictivo` permanece en `ds-sync--SINCRONIZADO` al perder red (`CP-01` y `CP-07` fallan por timeout `> 6000 ms`, y `OBS-FA4` también registra `ds-sync--SINCRONIZADO`). Sin embargo, al hacer clic en `Panel principal` y `Activos biológicos` (`CP-03` y `CP-09`), cada vista monta su propio `AppShell` -> `EstadoSincronizacion` -> `useOnlineStatus()`, cuyo estado inicial es `useState(navigator.onLine)`, leyendo `false` al montar y mostrando `ds-sync--OFFLINE`. Todos los demás checkpoints se miden sin quedar en `No alcanzado`.

## Revision de Claude (2026-11-21)
Spec leido entero (1.030 lineas) y runner revisado con diff contra G024: sin correcciones. Guardia: POST /reportes siempre simulado; baja y cierre abortados y contados; sin sandbox. /usuarios/me trae id_usuario y nombre_rol (gestion_schema.py:105-125). La X del modal tiene aria-label «Cerrar» (common.json acciones.cerrar); en control_cierre_escape el dialogo ya estaba cerrado al medirla. Desvio aceptado de control_sin_offline: CP-03 y CP-09 dan OK porque cada vista monta un EstadoSincronizacion nuevo que lee navigator.onLine al montar (comportamiento real). Resultados de las 7 corridas verificados contra los JSON del equipo.
