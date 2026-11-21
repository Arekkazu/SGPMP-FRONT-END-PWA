# Diseño y Prueba de Herramienta — TC-M08-G029 (RF-107, TC-M08-070)

## 1. Alcance y propósito

- **Caso:** `TC-M08-G029` (RF-107, subcaso `TC-M08-070`: baja de activo biológico con confirmación, cancelación, notificación de éxito con datos de contexto y manejo de error `409 ACTIVO_YA_EN_BAJA` en reintento sobre vista desactualizada).
- **Herramienta:** Playwright (`@playwright/test`, solo Chromium, `workers: 1`, `retries: 0`, `serviceWorkers: 'block'`, `trace: 'off'`, `video: 'off'`).
- **Base reutilizada:** `TC-M08-G024` (spec, config, runner y simulador/controles locales).
- **Constantes del spec:**
  - `TC = 'TC-M08-G029'`
  - `ACTIVO_PLANTILLA = 885`
  - `PROHIBIDOS = [930, 900, 901, 825]`
  - `BASE = process.env.QA_FRONT_URL ?? 'https://api.inmero.co/sigab-test/'`
- **Variables de entorno (solo en memoria, nunca escritas a disco ni consola):** `STAGING_DIR`, `RUN_ID`, `REINTENTO`, `QA_VET_EMAIL`, `QA_VET_PASSWORD`, `QA_SANDBOX_SECRET`.

---

## 2. Arquitectura de aislamiento (Sandbox y Guardia de Escrituras)

1. **`context.route('**/*')` registrado antes de toda navegación:**
   - Aborta hosts externos (`googleapis.com`, `gstatic.com`, `firebaseio.com`, `firebase.com`) y `POST /usuarios/me/fcm-token`.
   - A toda petición `fetch`/`xhr` le agrega `X-Test-Run-Id = RUN_ID`, `X-Sandbox-Secret = QA_SANDBOX_SECRET` y `X-Zona-Horaria = America/Bogota` si falta.
   - Escrituras permitidas:
     - `POST /sesiones` (máximo 1 vez; de aquí se deduce `apiBase`).
     - `POST /sesiones/refresh` y `DELETE /sesiones`.
     - `POST /activos-biologicos` (solo 1 vez desde el propio spec vía `page.request`; bloqueada desde la UI).
     - `POST /activos-biologicos/{A}/eventos/baja` (solo para el id `A` creado por el spec, máximo 3 veces).
   - Cualquier otra escritura es abortada y registrada como violación (invalida la corrida).
   - Cualquier respuesta HTTP `428` de la API invalida la corrida.
   - Se registra método, ruta, status y `error_code` de cada petición a la API; nunca cabeceras ni tokens.
2. **Cierre obligatorio (`try / finally`):**
   - Ejecuta `DELETE {apiBase}/test-control/runs/{RUN_ID}` con `X-Sandbox-Secret` y registra `sandbox: { run_id, rollback_http, rollback_ok }`.
   - Navega ambas páginas a `about:blank`.

---

## 3. Precondiciones y Checkpoints

### Precondiciones (si alguna es falsa, todos los CP pasan a `FALLA` con «Precondición no cumplida» y la corrida es inválida)
1. Credenciales (`QA_VET_EMAIL`, `QA_VET_PASSWORD`), `QA_SANDBOX_SECRET` y `RUN_ID` presentes en memoria.
2. Login único del Veterinario (la URL no termina en `/login`, `apiBase` y token en memoria capturados).
3. `GET {api}/activos-biologicos/885` → `200`, `tipo = INDIVIDUAL` con `detalle_individual.raza` y `sexo`.
4. `POST {api}/activos-biologicos` creando activo efímero `A` (`INDIVIDUAL`, `origen_financiero: 'nacimiento'`, `fecha_inicio_ciclo` hoy en `America/Bogota`, `identificador: QA-M08-G029-yyyyMMddHHmmss`) → `201`, `nombre_estado = ACTIVO`, `A` distinto de `885` y fuera de `PROHIBIDOS`.
5. `0` violaciones de escritura y `0` respuestas `428` (verificado tras creación y al final en `afterAll`).
6. Página 2 (abierta en el mismo contexto en `{BASE}activos-biologicos/{A}`, pestaña «Eventos»): botón «Baja» habilitado antes de `CP-01`.

### Checkpoints y Observaciones
- **OBS-ESC (observación, enlazada a `INC-M08-NN-G025`):** con «Confirma la baja» visible se pulsa `Escape` y se esperan 500 ms; se anota si el diálogo sigue abierto y los POST de baja (0).
- **CP-01** (`TC-M08-070 a; RF-107 CA-03 y 8.5 paso 2`): heading «Confirma la baja», botones «Volver» y «Confirmar baja» visibles, y `0` POST de baja. Captura `captura_TC-M08-G029_CP-01_confirma.png`.
- **CP-02** (`TC-M08-070 a; FA-1; Postcondiciones 3 y 5`): tras «Volver» y luego «Cancelar», `0` diálogos abiertos, `0` POST de baja, `GET {api}/activos-biologicos/{A}` en `ACTIVO`, `0` `.ds-alert--success` nuevas, `0` avisos nuevos en `.ds-toasts`.
- **CP-03** (`TC-M08-070 b; Postcondición 3; 8.5`): al confirmar, exactamente `1` POST nuevo de baja con `201`, y `GET {api}/activos-biologicos/{A}` con `nombre_estado = BAJA`.
- **CP-04** (`TC-M08-070 b; CA-10`): tras el `201`, al menos `1` `.ds-alert--success` visible, `0` alertas de «No se pudo registrar la baja» y `0` toasts de error.
- **CP-05** (`TC-M08-070 b; CA-09`): texto completo normalizado del `.ds-alert--success` de Eventos contiene el identificador exacto de `A`. Captura `captura_TC-M08-G029_CP-05_exito.png`. *(Falla prevista en el producto actual: «Evento registrado Baja registrada.»).*
- **CP-06** (`TC-M08-070 c; Restricción 1; CA-02; CA-10`): en Página 2 (vista desactualizada), confirmar baja repetida → `409 ACTIVO_YA_EN_BAJA`, texto de error visible en el diálogo con `>= 5` palabras, sin códigos HTTP ni `SNAKE_CASE`, y `0` `.ds-alert--success` nuevas en Página 2. Captura `captura_TC-M08-G029_CP-06_409.png`.

### Códigos de salida del runner (`ejecutar_tc_m08_g029.ps1`)
- `0`: todos los checkpoints `OK` y rollback `OK`.
- `1`: corrida válida con al menos un checkpoint `FALLA` y rollback `OK`.
- `2`: error de configuración o precondición local.
- `3`: corrida inválida (reporte ausente, checkpoints distintos de 6, `No alcanzado`, precondición falsa, violación o `428`, exit incoherente).
- `4`: hallazgos en el escaneo de secretos.
- `5`: `sandbox.rollback_ok` distinto de `true` (prioridad sobre `0` y `1`).
- `6`: `resultados\` cambió durante la corrida.

---

## 4. Resultados de la Prueba de la Herramienta (`evidencias\prueba_herramienta_v1\`)

Ejecutada en local contra 3 builds de Vite (`normal`, `control_exito_con_datos`, `control_cancelar_post`) servidos en `http://127.0.0.1:4173/sigab-test/` con el simulador `controles\servidor_api_simulada.mjs.txt` (sin red externa ni `.env.test`).

| # | Corrida | Veredicto | CP-01 | CP-02 | CP-03 | CP-04 | CP-05 | CP-06 | Sandbox `rollback_ok` | Coincide con lo previsto |
|---|---|---|---|---|---|---|---|---|---|---|
| 1a | `normal_1` | Rechazado (5/6) | OK | OK | OK | OK | FALLA | OK | `true` (200) | Sí |
| 1b | `normal_2` | Rechazado (5/6) | OK | OK | OK | OK | FALLA | OK | `true` (200) | Sí |
| 1c | `normal_3` | Rechazado (5/6) | OK | OK | OK | OK | FALLA | OK | `true` (200) | Sí |
| 2 | `control_exito_con_datos` | Aprobado (6/6) | OK | OK | OK | OK | OK | OK | `true` (200) | Sí |
| 3 | `baja_500` | Rechazado (2/6) | OK | OK | FALLA | FALLA | FALLA | FALLA | `true` (200) | Sí |
| 4 | `repetida_201` | Rechazado (4/6) | OK | OK | OK | OK | FALLA | FALLA | `true` (200) | Sí |
| 5 | `mensaje_tecnico` | Rechazado (4/6) | OK | OK | OK | OK | FALLA | FALLA | `true` (200) | Sí |
| 6 | `estado_sin_cambio` | Rechazado (4/6) | OK | OK | FALLA | OK | FALLA | OK | `true` (200) | Sí |
| 7 | `control_cancelar_post` | Rechazado (3/6) | OK | FALLA | FALLA | OK | FALLA | OK | `true` (200) | Sí |
| 8 | `control_guardia` | Rechazado (0/6, inválida) | FALLA | FALLA | FALLA | FALLA | FALLA | FALLA | `true` (200) | Sí |
| 9 | `control_sin_cabecera` | Rechazado (0/6, inválida) | FALLA | FALLA | FALLA | FALLA | FALLA | FALLA | `true` (200) | Sí |
| 10 | `control_rollback` | Rechazado (5/6) | OK | OK | OK | OK | FALLA | OK | `false` (404) | Sí |

Notas verificadas:
- `normal_1`, `normal_2` y `normal_3` son idénticas salvo horas e identificador (`QA-M08-G029-20261121103303`, `...103410`, `...103423`); `OBS-ESC` registró `dialogo_sigue_abierto=false, post_baja_antes=0, post_baja_despues=0` en todas.
- En `control_exito_con_datos`, solo `CP-05` cambió de `FALLA` a `OK` (`"Evento registrado Baja registrada. QA-M08-G029-20261121103436"`).
- En `control_cancelar_post`, `CP-02` falló con `post_baja_total=1; get_estado=200/BAJA; nuevas_alert_success=1` y `CP-03` falló en cascada con `paso_abrir=botón «Baja» deshabilitado; post_nuevos=0` (ningún checkpoint quedó `No alcanzado`).
- En `control_guardia`, la guardia abortó `POST /sigab-test/api/prediccion/retroalimentacion` e invalidó la corrida marcando todos los CP como `Precondición no cumplida`.
- En `control_sin_cabecera`, `GET /activos-biologicos/885` recibió `428 SIN_SANDBOX` e invalidó la corrida marcando todos los CP como `Precondición no cumplida`.
- En `control_rollback`, `DELETE /test-control/runs/qa-m08-g029-prueba-12` devolvió `404` dejando `sandbox.rollback_ok=false` con los 6 CP idénticos a `normal`.

## Revision de Claude (2026-11-21, v1.1)

Spec leido entero y runner revisado con diff contra G024. Dos correcciones (respaldo de v1 fuera de las carpetas conectadas):
1. Spec: about:blank en las dos paginas antes del DELETE /test-control/runs (que la app no envie peticiones con el run_id despues del rollback).
2. Runner: el fallo del rollback (exit 5) tiene prioridad sobre la corrida invalida (exit 3); solo el escaneo (4) va antes.
Resultados de la prueba v1 verificados contra los JSON del equipo. Repetir normal y control_rollback con v1.1 (prueba_herramienta_v2).

## Corrida archivada y v1.2 (2026-11-21)

RUN qa-m08-g029-20261121-104736: exit 3, ARCHIVADO_NO_OFICIAL (el spec uso el primer token; el refresco posterior al login lo revoco -> 401 TOKEN_REVOCADO en el GET del 885). Rollback 200.
v1.2 (Claude, respaldo v1.1 fuera de las carpetas conectadas): se usa siempre el ultimo Authorization de la app; networkidle tras el login y tras la recarga de la pagina 1; en CP-03 y CP-06 los 401 de sesion que el interceptor reintenta (http.ts:241-257) no cuentan como intento y se anotan (reintentos_401); CP-06 exige 1 POST de negocio; guardia de bajas hasta 4.
Pendiente: simulador con rotacion de token y prueba_herramienta_v3 (Neon).

## Prueba de la herramienta v3 (v1.2, simulador con rotacion de token) - revisada por Claude

normal_1 y normal_2: 5 OK, CP-05 FALLA, reintentos_401=0 (la app reparte el token entre pestanas: BroadcastChannel sigab-sesion y navigator.locks, http.ts:184-215; la prevision inicial de Claude de un 401 en la pagina 2 era incorrecta). control_exito_con_datos: 6/6. control_revocar_cp03: CP-03 OK con reintentos_401=1. control_rollback: rollback_ok=false. control_token_fijo (spec con el token fijo de v1.1): CP-02 y CP-03 FALLA con 401 TOKEN_REVOCADO en los GET del spec; el simulador no refresca justo tras el login (TEST si), por eso el 401 no cae en la precondicion del 885, pero el control demuestra que el token fijo falla con rotacion y la v1.2 no. Verificado contra los JSON del equipo.

## v1.3 (2026-11-21)
RUN qa-m08-g029-20261121-111004 archivado NO OFICIAL (400 VALOR_FUERA_DE_RANGO en el alta). v1.3: identificador QA29-<yyMMddHHmmss> (17 car.) y message/field del alta en la precondicion. Sin cambio de comportamiento en los checkpoints: no se repite la prueba de la herramienta (solo esbuild y --list).

## Detenido (2026-11-21 11:20, decision de Sebastian)
Tres corridas oficiales archivadas NO OFICIAL (104736 token; 111004 identificador largo; 111809 pagina 2 sin boton Baja, refresh 500). Para retomar: abrir la pagina 2 DESPUES de la baja no sirve (boton deshabilitado); alternativa sin segunda pestana: CP-06 con un POST de baja repetido desde la misma pagina tras forzar el estado ACTIVO en la respuesta del GET con page.route, o pedir a Sebastian otra forma.

## v1.4 (2026-11-21, Claude; retomado por pedido de Sebastian)
Sin segunda pestana. CP-06: tras la baja, page.route responde los GET de A y de su ficha con el estado leido antes de la baja (vista desactualizada simulada), se recarga la pagina y se repite la baja: el POST es real (409 esperado). Si la simulacion no se aplica, precondicion falsa (corrida invalida) sin borrar lo medido en CP-01 a CP-05. Respaldo v1.3 fuera de las carpetas conectadas.

## v1.5 (2026-11-21)
RUN 112721 archivado NO OFICIAL: en TEST, tras la navegacion, la app quedo sin permisos (menu reducido, sin botones de eventos). v1.5: preparacion con hasta 3 recargas anotadas (no checkpoint) y precondicion si no queda lista; CP-06 solo si CP-03 tuvo 201; 5xx de la API en observaciones.

## v1.6 / runner v1.2 (2026-11-21 11:36, autorizado por Sebastian)
RUN 113247 archivado NO OFICIAL: el sandbox de TEST usa una sola sesion de BD compartida (testing_sandbox.py:35-68); con ~10 GET paralelos al cargar la app responde 500 a todos. Desde v1.6 la corrida va SIN sandbox: crea un activo de QA real (QA29-...) en la finca del 885 y lo deja en BAJA. La baja de un individual no dispara RF-105 ni M06 (revisado). Runner: modo SIN_SANDBOX aceptado sin rollback.

## Decision de Sebastian (2026-11-21 11:47)
CP-05 pasa a observacion (OBS-6). G029 aprobado por decision del evaluador; sin issue. Reporte promovido sin cambios (5/6). Reintento: CP-05 como observacion.

## Limpieza (2026-11-21 11:50, pedido de Sebastian)
Borradas las 5 corridas NO OFICIALES (run-20261121-104736, -111004, -111809, -112721, -113247). Su causa queda descrita arriba y en claude/CAMBIOS_CIERRE_G029.md. Se conservan la corrida oficial run-20261121-113921 y las pruebas de la herramienta.
Borradas tambien las pruebas de la herramienta v1 a v5 (incluidos el simulador y los controles), por pedido de Sebastian (11:51). Sus resultados quedan descritos en este DISENO.
