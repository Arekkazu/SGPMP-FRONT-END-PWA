# Diseño de TC-M08-G026 (RF-107): cola, coexistencia, duplicados e historial de sesión

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 y Fase 2: Vitest (CP-01 a CP-20) + Playwright contra TEST (CP-21 a CP-24), probados en el contenedor; pendiente la corrida oficial |
| 2026-11-20 | Juan Sebastian Gutierrez | Corrida oficial validada (Rechazado 17/24), promovida a `resultados/`; caso cerrado (ronda 1). Issue único INC-M08-NN-G026 |
| 2026-11-22 | Claude / Juan Sebastian Gutierrez | Reintento 1 (#706, INC-M08-385-G026): Fase 1, specs v1.1 (ADAPT-1 a ADAPT-4, aprobados por Sebastian) y runner con dos archivos más de `src` en su lista de SHA; prueba de la herramienta en `evidencias/prueba_herramienta_reintento1/`; respaldo de la ronda 1 en `evidencias/fuentes_generador/ronda1/*.txt` (sección 9) |
| 2026-11-22 | Claude / Juan Sebastian Gutierrez | Reintento 1 cerrado: corrida oficial `qa-m08-g026-20261122-141304` Aprobado 24/24, promovida a `resultados/resultado_TC-M08-G026_reintento1.json` por orden de Sebastian (sección 9.6) |

**Casos:** TC-M08-065 (cola de errores y saturación), TC-M08-066 (coexistencia), TC-M08-067 (sin duplicados) y TC-M08-074 (metadatos e historial de sesión).

**Código de referencia:** frontend `test-JuanSG` en `f557e23a`, con `src/` sin cambios locales. Backend `8606b90d`: no hay `id_operacion` en `src/`, así que la deduplicación depende de lo que el frontend asigne.

## 1. Decisiones (Sebastian, 20/11/2026)

- **Versión que manda:** las filas vigentes del RF-107 (Entradas, Proceso 8.1 a 8.5, CA-01 a CA-16). Un FA de la Descripción solo vale si la 8.x lo nombra.
- **Herramientas (opción 2):** Vitest para la lógica y Playwright en navegador real contra TEST para lo que jsdom no mide. Lo no medible en jsdom es la recarga al cerrar sesión, la posición de los avisos, la forma del panel y el ícono tapado por el modal. Un solo runner y un solo `resultado_TC-M08-G026.json`.
- **Cuenta de Playwright:** Veterinario 97 (`TEST_VET_EMAIL` y `TEST_VET_PASSWORD` de `sgpmp-backend\.env.test`). Un solo login por corrida.
- **CP-06 (065 d, salir del módulo):** checkpoint según la 8.3 («la cola… se descarta… al navegar fuera del módulo que originó los errores»).
  - Se considera que CA-14 se refiere a la saturación y no a cuánto vive la cola.
  - «Módulo» se toma como el prefijo de la ruta: de `/prediccion` a `/reportes`.
- **CP-10 y CP-24 (066 d):** el checkpoint es «visible / no oculto», como dicen TC-M08-066 y la 8.2 nivel 5. Que el ícono quede bloqueado (`inert` y tapado por el overlay) va a **observación medida**: el Leeme lo marca como ambigüedad frente al nivel 1 («el modal bloquea toda la interfaz»).

## 2. Checkpoints

| CP | Caso | Esperado | Fuente | Previsto | Contenedor |
|---|---|---|---|---|---|
| CP-01 | 065 a | Con E1 a E4 se ven E1, E2 y E3; E4 en cola | 8.2 nivel 2; 8.3 | OK | OK |
| CP-02 | 065 a | Al cerrar E1 entra E4 (FIFO) | 8.3 | OK | OK |
| CP-03 | 065 b | Con 5 (3 + 2), sin aviso de saturación | 8.3; CA-14 | OK | OK |
| CP-04 | 065 b | Con 6: «Hay 6 notificaciones pendientes. Toca aquí para ver todas.» en lugar de E1 | 8.3; CA-14 | OK | OK |
| CP-05 | 065 c | El historial de la sesión en orden cronológico, con tipo, mensaje, hora y estado | 8.3 | OK | OK |
| CP-06 | 065 d | Al pasar de `/prediccion` a `/reportes`, la cola se descarta | 8.3 (decisión de QA) | FALLA | **FALLA**: E4 sigue en cola y entra al cerrar E1 |
| CP-07 | 066 a | El error queda debajo del éxito; el éxito se va a los 5 s y el error sigue | 8.2 niveles 2 y 4 | OK | OK |
| CP-08 | 066 b | El éxito no desplaza ni oculta el error (mismo nodo, mismo texto) | 8.2 nivel 4 | OK | OK |
| CP-09 | 066 c | Con el indicador de proceso visible llega un error: el indicador se cierra y el error ocupa su lugar | 8.2 nivel 3 | OK | OK |
| CP-10 | 066 d | Con el modal crítico abierto, `.ds-sync` sigue en el DOM sin ocultar | 8.2 nivel 5 | OK | OK |
| CP-11 | 067 a | Mismo `id_operacion` con el banner visible: se actualiza, no se duplica | 8.3; CA-12 | OK | OK |
| CP-12 | 067 b | Cerrado por el usuario: el evento siguiente se descarta en silencio | 8.3 | OK | OK |
| CP-13 | 067 | Mismo id en la cola: no se crea otro mensaje | 8.3; CA-12 | OK | OK |
| CP-14 | 074 | Éxito «Se cerró solo» y error «Cerrado por ti», con tipo, mensaje y hora, en orden | 8.3; 8.5 | OK | OK |
| CP-15 | 074 | Se registra el `id_operacion` | 8.5 | OK | OK |
| CP-16 | 074 | `timestamp_mostrado`: F4, encolado a las 09:02 y visible a las 09:05, debe figurar con 09:05 | 8.5 | FALLA | **FALLA**: figura 09:02 (`useToast.ts`:133) |
| CP-17 | 074 | `duracion_visible`: unos 5.000 ms el éxito y 30.000 ms el error | 8.5 | FALLA | **FALLA**: el campo no existe |
| CP-18 | 074 | `bloquea_interfaz = false` en los banners | 8.5 | FALLA | **FALLA**: el campo no existe |
| CP-19 | 074 | El modal crítico queda en el historial con `bloquea_interfaz = true` | 8.5; TC-M08-074 | FALLA | **FALLA**: el modal no se registra |
| CP-20 | 074 | Los avisos y el historial no hacen peticiones al servidor (0) | Postcondición | OK | OK |
| CP-21 | 065 d | Al cerrar sesión, la cola y el historial se descartan (documento nuevo, sin avisos) | 8.3 | OK | OK (simulador) |
| CP-22 | 066 | Banners de error y de éxito arriba, bajo el AppBar, en el tercio superior | 8.2 niveles 2 y 4; Salida | FALLA | **FALLA** (simulador): error en y=661 y éxito en y=699, en una ventana de 768 |
| CP-23 | 065 c | El historial se abre en un panel lateral (pegado a un borde y con al menos el 90 % del alto) | 8.3 | FALLA | **FALLA** (simulador): panel centrado, x=323, ancho 720 |
| CP-24 | 066 d | Con «Confirma la baja» abierto, el ícono de sincronización sigue visible | 8.2 nivel 5 | OK | OK (simulador) |

Previsión: **17 OK y 7 FALLA** (CP-06, CP-16 a CP-19, CP-22 y CP-23), es decir, Rechazado.

## 3. Retirados

- **074, la advertencia de log por la contradicción entre `requiere_confirmacion` y `nivel_criticidad_accion`.** Se genera en 068(d), que es de G028. Ninguna acción de `src/` usa `nivel_criticidad_accion`: solo aparece en `InfraestructuraSection`, que es otro concepto.

## 4. Observaciones medidas (no cuentan en el veredicto)

| Id | Qué se mide | Dato en el contenedor |
|---|---|---|
| OBS-1 | Ícono de sincronización con el modal crítico | `inert` (`useModalA11y.ts`:16-33). En el navegador, el elemento en su centro es `<div class="ds-modal">` y un clic no abre el panel |
| OBS-2 | Cierre de sesión | Se mide como CP-21 en navegador real: `window.location.replace` (`useLogout.ts`:27) recarga la página. `limpiarToasts` no se llama nunca |
| OBS-3 | Doble clic en «Exportar» (067 c, FA-6 de la versión anterior) | Sale 1 `POST /reportes`; no aparece el aviso «Esta operación ya está en curso…» |
| OBS-4 | Quién asigna `idOperacion` | Solo `ReportesPage` (3 llamadas). El resto de módulos no deduplica |
| OBS-5 | Éxito reemplazado por otro éxito | Queda «Cerrado por ti» (`useToast.ts`:125) y luego se descarta un evento con su id |
| OBS-6 | Evento con el id de un aviso que expiró solo | Crea un banner nuevo; la 8.3 no lo define |
| OBS-7a | Forma del historial | `role=dialog` (`ModalShell`). La posición se mide en CP-23 |
| OBS-8 | Advertencias en el umbral de saturación | Cuentan (`useToast.ts`:78-80); la 8.3 habla de errores |
| OBS-9 | Error durante el proceso (066 c) | `Alert` dentro de la sección, no en la zona global (`ReportesPage.tsx`:263-269) |
| OBS-10 | Control en navegador real del criterio R-2 | El éxito que expira solo figura «Se cerró solo» |

## 5. Riesgos y cómo se cubren

- **R-1. Store global del módulo.** `beforeEach` y `afterEach` llaman a `limpiarToasts()` (exportada, sin otro efecto). Una sonda (`useToast`) lee el estado sin modificarlo.
- **R-2. Reloj simulado y agrupación de `act()`.**
  - El problema: `Alert` tiene su propio temporizador de 5 s (`Alert.tsx`:52-60). Dentro de un único `act()`, se dispara después del temporizador del store y marca el éxito como «cerrado».
  - Comprobado en el contenedor: con todo agrupado sale `["cerrado"]`; dejando correr el ciclo de eventos sale `["expirado"]`.
  - En el navegador, React desmonta el `Alert` en la microtarea siguiente y su temporizador se cancela. OBS-10 lo confirma en Chromium.
  - Por eso el spec avanza el reloj con `vi.advanceTimersByTimeAsync` fuera del agrupamiento de `act` (`avanzar()`). No es una adaptación al resultado, sino fidelidad al ciclo de eventos real.
- **R-3. Zona horaria.** `formatearHora` usa la del proceso. El runner fija `TZ=America/Bogota`, una precondición lo comprueba y la hora esperada se calcula con `timeZone: 'America/Bogota'`.
- **R-4. Secretos en Playwright.**
  - Se configura `trace: 'off'`, `video: 'off'` y `screenshot: 'off'`. Las capturas propias se toman después del login, con la zona del usuario del AppBar enmascarada.
  - Al final se navega a `about:blank`, para que el `error-context.md` no lleve la página.
  - El escaneo recorre todo el staging, incluidos el resumen y `pw-salida/`, con los valores `*PASSWORD*/*SECRET*/*TOKEN*/*EMAIL*` de los dos `.env.test`.
- **R-5. Protección de escrituras.**
  - Toda petición distinta de GET se aborta, salvo la sesión (POST `/sesiones/` una vez, POST `/sesiones/refresh`, DELETE `/sesiones/`). `POST …/reportes` se simula.
  - Probado en el contenedor con una copia que pulsa «Confirmar baja»: el `POST …/eventos/baja` se abortó, el servidor recibió 0 y la corrida quedó inválida.
- **R-6. Una sesión por cuenta.** SIGAB mantiene una sola sesión por cuenta: el login del runner cierra cualquier otra sesión abierta del Veterinario 97.
- **R-7. Datos de TEST.** El 885 debe seguir en ACTIVO, aparecer en `/reportes/opciones/activo` del Veterinario y dar 200 en el historial. Si no, es una precondición falsa (código 3), no un FALLA.
- **R-8. Chromium.** Si no está en `%LOCALAPPDATA%\ms-playwright`, el runner sale con código 2. Lo instala Sebastian, no el agente.

## 6. Validación de la herramienta en el contenedor

- **Vitest.** Misma `src/` que el equipo (SHA de los 14 archivos probados iguales, HEAD `f557e23a`): **15 OK y 5 FALLA**, con exit 1.
- **Playwright.** Contra un build local (`VITE_BASE_PATH=/sigab-test/`) y una API simulada, con Chrome del contenedor: **2 OK y 2 FALLA**; precondiciones OK; 11 peticiones distintas de GET, todas permitidas o simuladas.
- **Unión.** 24 checkpoints, 17 OK y 7 FALLA; las mismas validaciones del runner, sin hallazgos de secretos.
- **Tipos.** `tsc` sin errores en los dos specs. Al de Playwright solo le faltan los tipos de Node, que el proyecto no instala; Playwright transpila sin chequear tipos.
- **Mutaciones de control** (sobre la copia del contenedor; `src/` restaurado y comparado después):

| Mutación | Cambian (y solo esos) |
|---|---|
| M01 `MAX_ERRORES_VISIBLES = 4` | CP-01, CP-03, CP-13 |
| M02 saturación con `>=` | CP-03 |
| M03 no actualizar el banner visible | CP-11, CP-12 |
| M04 no descartar el cerrado | CP-12 |
| M05 no deduplicar en la cola | CP-13 |
| M06 no ocultar el error más antiguo al saturar | CP-04 |
| M07 error nuevo arriba | CP-01, CP-02, CP-04, CP-07 |
| M08 el indicador no se cierra | CP-09 |
| M09 el modal pone `aria-hidden` | CP-10 |
| M10 (positiva) `duracion_visible` y `bloquea_interfaz` | CP-17 y CP-18 pasan a OK |
| M11 (positiva) hora al hacerse visible | CP-16 pasa a OK |
| M12 petición al abrir el historial | CP-20 |
| M13 cerrar a mano marca «expirado» | CP-12, CP-14 |

## 7. Archivos del caso (SHA-256)

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g026.test.tsx` | `B6989C73240149DEDF760DC839E9539A6BFB6935C60E33CCF640182F141776D5` |
| `tc-m08-g026.pw.ts` | `D66FAB8192A47D2B46A406C23636ED7657E9AA530166A45C32E30CFF533BCB5B` |
| `playwright.config.ts` | `BEED200AC1E2CBF0778819D3E4BC117E01DDE4BF45E265742A83971BEE670A21` |
| `unir_reporte_tc_m08_g026.mjs` | `10024BF527A86A0EF33CD00B49689F66569AD21AA6CC9EAC362315D9A3CA0C4B` |
| `ejecutar_tc_m08_g026.ps1` | `7D4B36AD00AF9CB8483DA8F2975A5190048D662E68DE53323D44CE2EE2A3DBB9` |

**Ejecución:** desde la carpeta del caso, `.\ejecutar_tc_m08_g026.ps1` (PowerShell 5.1). El staging queda en `evidencias\run-<ts>\`; nada se escribe en `resultados\`.

**Códigos de salida:**

| Código | Significado |
|---|---|
| 0 | Todos los checkpoints OK |
| 1 | Hay checkpoints FALLA (corrida válida) |
| 2 | Configuración |
| 3 | Corrida inválida |
| 4 | Secretos |
| 6 | `resultados\` cambió |

## 8. Corrida oficial y cierre (2026-11-20)

- **RUN:** `qa-m08-g026-20261120-095439` (staging `evidencias/run-20261120-095439/`), ejecutada por el agente con el prompt cerrado; una sola carpeta de corrida.
- **Validación contra los archivos del equipo:**
  - SHA de los 5 archivos del caso iguales a los entregados; `src/` sin cambios (HEAD `f557e23a`), con los 14 SHA iguales a los probados en el contenedor.
  - 24 checkpoints, ninguno «No alcanzado»; 13 precondiciones OK.
  - Un solo login; las 6 exportaciones simuladas por `page.route`; ninguna escritura no permitida. La baja del 885 no se confirmó (captura CP-24 y «Volver»).
  - Bundle de TEST `index-CyFbOmNY.js` (con #693).
  - Escaneo de secretos: 0 hallazgos. Se revisaron a mano `error-context.md` y las 3 capturas.
  - `resultados/` sin cambios durante la corrida.
- **Resultado:** **Rechazado, 17/24**, igual que la previsión. FALLA en CP-06, CP-16, CP-17, CP-18, CP-19, CP-22 y CP-23.
- **Promoción:** `resultados/resultado_TC-M08-G026.json` (SHA `FB2E897F…`, igual al del staging). Registro en `evidencias/PROMOCION_TC-M08-G026.txt`.
- **Issue:** uno solo, INC-M08-NN-G026, con los cuatro defectos y siete observaciones (decisión de Sebastian, 2026-11-20). Falta el NN.
- **Ajuste para la próxima versión del spec de Playwright:** enmascarar también el pie del menú lateral en las capturas, porque deja leer parte del nombre de la cuenta.
- **Reevaluación:** reintento 1 (`-Reintento 1`, reporte `resultado_TC-M08-G026_reintento1.json`) cuando Desarrollo despliegue la corrección en TEST.

## 9. Reintento 1 (2026-11-22)

### 9.1 Cambio de Desarrollo (observado)

- PR «Incidencias de QA de M08», issue 706 (INC-M08-385-G026): commit `ac134ec1`, integrado en `test-JuanSG` por `03086c80` (#732). Frontend HEAD `af93ae87` (`src/` sin cambios locales). Entre `f557e23a` (ronda 1) y HEAD también entraron `b370f754` (Escape lee la opción vigente en `useModalA11y`) y M8-14 (2026-11-19: el ícono de sincronización pasa al AppBar, `App.tsx` `estado={<EstadoSincronizacion />}`).
- `useToast.ts` (`D9860DF0…`): `RegistroToast` con `tipo_retroalimentacion`, `timestamp_mostrado`, `duracion_visible`, `bloquea_interfaz`; `registrar()`/`marcar()` (:86-98); `descartarCola()` (estado `descartado`) y `registrarModalCritico()` (:177-188).
- `ToastHost.tsx`: descarta la cola cuando cambia el primer segmento de la ruta (:24-30); historial `ModalShell lateral`; meta «hora · estado[ · visible N s]» con `timestamp_mostrado ?? creado` (:63-65).
- `ModalShell.tsx`: el modal bloqueante se registra en el historial y no se abre con una operación en curso (`operacionEnCurso.ts`, arreglo de G027): avisa «Espera a que finalice … antes de continuar.» y se cierra.
- `Layout.css`: `.ds-toasts { top: calc(var(--topbar-h) + var(--s3)) }`; `.ds-modal--lateral` (borde derecho, 420 px, alto `100dvh`).
- `useLogout.ts`: `limpiarToasts()` antes de `location.replace`.
- **Despliegue en TEST** (navegador integrado, sin sesión, 2026-11-22): `index-BUhd1sjz.js` y `index-Cd0A_9s-.css` con `top:calc(var(--topbar-h) + var(--s3))`, `ds-modal--lateral`, `timestamp_mostrado`, `bloquea_interfaz`, `CONFIRMACION_ACCION_CRITICA`, «Descartado al cambiar de sección» y «visible {{segundos}} s».

### 9.2 Specs de la ronda 1 sin cambios contra el código actual

Contenedor de Claude, `src/` de `af93ae87` (`prueba_herramienta_reintento1/ronda1_sin_cambios/`):
- **Vitest:** 10 OK / 10 FALLA, todas de la herramienta: CP-05 y CP-14 exigían que la meta **terminara** en el estado (ahora sigue «· visible N s»); CP-09 esperaba el indicador 1 s y ahora aparece a los 3,001 s (arreglo de G027, RF-107 8.5 paso 3); su POST diferido quedó sin resolver, la operación siguió «en curso» (store de módulo) y los `ModalShell` bloqueantes de CP-10 y CP-14 a CP-20 no se abrieron («No alcanzado»); la precondición «`EstadoSincronizacion` hermano de `<main>`» fue falsa (M8-14).
- **Playwright** (build local + `servidor_api_simulada.mjs.txt`, derivado del de G024 con la ficha y los eventos del 885 y el permiso 29/C): 4/4 OK; la máscara `.ds-appbar__right` tapaba el ícono que mide CP-24 y el pie del menú lateral seguía sin máscara.
- Sonda de diagnóstico de la Fase 1 (`sonda_fase1/`): con las tres fallas de herramienta corregidas en una copia, 20/20.

### 9.3 Specs v1.1 (aprobados por Sebastian, 2026-11-22)

- **ADAPT-1 (CP-09, OBS-3 y guarda de fuga):** el indicador se espera hasta 5 s; si no aparece, CP-09 da FALLA con lo medido (no «No alcanzado»); CP-09 y OBS-3 tienen límite propio de 20 s (el de Vitest, 5 s, las cortaba y el código seguía en segundo plano: en el primer control anotó el conteo de peticiones de la prueba siguiente). Toda respuesta diferida se resuelve en `afterEach` y se espera a que `operacionEnCurso()` quede vacía; CP-10 y CP-14 registran la precondición «Sin operación en curso heredada».
- **ADAPT-2 (CP-05, CP-14):** el estado de una fila del historial es el segundo campo de «hora · estado[ · visible N s]» (`estadoDeMeta`).
- **ADAPT-3 (CP-10):** el spec monta `.ds-app-content > header.ds-appbar > .ds-appbar__right > EstadoSincronizacion`, seguido de `main`; precondiciones literales nuevas sobre `App.tsx` (`estado={<EstadoSincronizacion />}` entre `<AppBar` y `<main`, una sola vez) y `AppBar.tsx` (`{estado}` primer hijo de `.ds-appbar__right`).
- **ADAPT-4 (capturas de Playwright):** máscaras `.ds-appbar__avatar` y `.ds-sidebar__footer` en lugar de `.ds-appbar__right`.
- Observaciones de texto fijo reescritas porque describían el código anterior: OBS-1 (`FUERA_DEL_INERT`, el ícono en el AppBar), OBS-5 (`useToast.ts`:153), OBS-7a (ahora mide la clase `ds-modal--lateral`), OBS-8 (`useToast.ts`:106-108), OBS-9 (`ReportesPage.tsx`:272) y el texto del obtenido de CP-17 («el panel muestra duraciones» detecta «visible N s»).
- Runner: solo agrega `AppBar.tsx` y `operacionEnCurso.ts` a la lista de SHA de `src`. Sin cambios: checkpoints, esperados, fuentes, retirado, guardia de escrituras, `playwright.config.ts` y `unir_reporte_tc_m08_g026.mjs`.
- Diffs: `prueba_herramienta_reintento1/diff_*_ronda1_vs_v1.1.txt`.

### 9.4 Prueba de la herramienta (`evidencias/prueba_herramienta_reintento1/`)

Contenedor de Claude, `src/` de `af93ae87`. Controles con plugin de Vite que reemplaza texto exacto en memoria (`controles/vite.control_*.config.ts`; `vitest run --config` o `vite build --config`); `src/` no se toca.

| Corrida | Resultado |
|---|---|
| `vitest_normal_1` a `3` | 20/20, exit 0, todas las precondiciones OK (CP-09 tarda ~3,1 s) |
| `vitest_control_sin_descarte` | solo CP-06 FALLA |
| `vitest_control_hora_llegada` | solo CP-16 FALLA |
| `vitest_control_sin_duracion` | solo CP-17 FALLA (CP-05 y CP-14 siguen OK sin «visible N s»: ADAPT-2 acepta las dos formas) |
| `vitest_control_sin_bloquea` | solo CP-18 FALLA |
| `vitest_control_sin_registro_modal` | solo CP-19 FALLA |
| `vitest_control_indicador_nunca` | solo CP-09 FALLA («no visible en 5.000 ms … POST /reportes enviados: 1»); OBS-3 registra «Indicador visible en 5 s: no» |
| `vitest_control_sync_oculto` | solo CP-10 FALLA |
| `vitest_control_estado_crudo` | CP-05 y CP-14 FALLA (control de ADAPT-2) |
| `vitest_control_fuga_operacion` (spec sin la resolución del `afterEach` + `indicador_nunca`) | precondición «Sin operación heredada» falsa en CP-10 y CP-14: el runner dejaría la corrida inválida |
| `pw_normal_1` a `3` | 4/4, exit 0; avisos en y=76 bajo el AppBar (y=64); panel en x=946, 420×768; ícono visible |
| `pw_control_avisos_abajo` | solo CP-22 FALLA (y=661 y 699) |
| `pw_control_historial_centrado` | solo CP-23 FALLA (x=323, 720×720) |
| `pw_control_confirmar_baja` | precondición «Ninguna escritura no permitida» falsa (`POST …/885/eventos/baja` abortado); el simulador no recibió la escritura |

Ningún «No alcanzado» fuera de los controles que lo provocan a propósito. Capturas revisadas: avatar y pie del menú enmascarados, ícono «Sincronizado» visible en CP-24. SHA de la prueba en `prueba_herramienta_reintento1/SHA256SUMS.txt`.

### 9.5 Archivos del reintento 1 (SHA-256 en la entrega)

`tc-m08-g026.test.tsx` v1.1, `tc-m08-g026.pw.ts` v1.1 y `ejecutar_tc_m08_g026.ps1` (reintento 1); `playwright.config.ts` y `unir_reporte_tc_m08_g026.mjs` sin cambios. Respaldos de la ronda 1 en `evidencias/fuentes_generador/ronda1/` (`*.test.tsx.txt`, `*.pw.ts.txt`, `*.ps1.txt`, `*.mjs.txt`, `*.config.ts.txt`, `DISENO_TC-M08-G026.md.txt`).

**Hallazgo de la Fase 1:** `evidencias/PROMOCION_TC-M08-G026.txt`, citado en la sección 8 y en el estado, no existe en el equipo; el reporte promovido sí (`resultados/resultado_TC-M08-G026.json`, `FB2E897F…`).

### 9.6 Corrida oficial y promoción

- **RUN** `qa-m08-g026-20261122-141304` (staging `evidencias/run-20261122-141304/`), 2026-11-22 14:13, exit 0, `-Reintento 1`, ejecutada por el agente con el prompt cerrado (SHA, HEAD, `Test-Path` del `_reintento1.json` = False, `ParseFile`, `vitest list` = 13 pruebas, `playwright --list` = 1 prueba en 1 archivo, una ejecución).
- **Validada por Claude contra los archivos del equipo:** SHA de los 5 archivos del caso y de los 16 de `src` (HEAD `af93ae87`, sin cambios locales; `AppBar.tsx` `944ED474…`, `operacionEnCurso.ts` `47627F99…`); una sola carpeta `run-*` nueva, sin archivos fuera del staging; 24 checkpoints OK, ninguno «No alcanzado»; 16 precondiciones OK (incluidas las de ADAPT-1 y ADAPT-3 y el bundle `index-BUhd1sjz.js`); mismo `run_id` y reintento en las dos partes; peticiones distintas de GET: login, 2 refresh, 7 `POST /reportes` simulados y el `DELETE /sesiones/` del cierre; escaneo 0 hallazgos y revisión manual sin `eyJ`, `Bearer` ni correos; `pw-salida` solo con `.last-run.json`; capturas (tema oscuro) con el avatar y el pie del menú enmascarados y el ícono «Sincronizado» visible; la parte Vitest es idéntica, obtenido por obtenido, a `vitest_normal_1`.

| CP | Obtenido (reintento 1) | Ronda 1 |
|---|---|---|
| CP-01 a CP-05, CP-07, CP-08, CP-11 a CP-15, CP-20 | Igual que en la prueba normal | OK |
| CP-06 | 0 en cola tras pasar a `/reportes`; al cerrar E1 no entra E4 | FALLA → **OK** |
| CP-09, CP-10 | Indicador «Generando el reporte...» y luego el error; ícono en el AppBar sin ocultar | OK |
| CP-16 | F4 en 9:05 a. m. (`timestamp_mostrado`) | FALLA → **OK** |
| CP-17 | 5.000 ms y 30.000 ms | FALLA → **OK** |
| CP-18 | `false` en los banners | FALLA → **OK** |
| CP-19 | Modal crítico en el historial con `bloquea_interfaz=true` | FALLA → **OK** |
| CP-21 | `/login` con documento nuevo, 0 avisos | OK |
| CP-22 | Avisos en y=76 bajo el AppBar (y=64) | FALLA → **OK** |
| CP-23 | Panel en x=946, 420 × 768 | FALLA → **OK** |
| CP-24 | Ícono visible («Sincronizado») con «Confirma la baja» abierto | OK |

- **Observaciones que siguen:** OBS-1 (el ícono queda `inert` y bajo el overlay del modal: contradicción 8.2 nivel 1 / nivel 5, para Análisis), OBS-3, OBS-5, OBS-6, OBS-8 y OBS-9 (sin cambios de fondo respecto de la ronda 1).
- **Promoción** (2026-11-22, por orden de Sebastian): `resultados/resultado_TC-M08-G026_reintento1.json` = `118E9147E715F84598845744845ECBD4F6226790B76A9748737EC77CA59287AA`, igual en origen y destino; ronda 1 intacta (`FB2E897F…`). Registro `evidencias/PROMOCION_TC-M08-G026_reintento1.txt`. Lectura: total 24, passed 24, failed 0 → **Aprobado**. INC-M08-385-G026 (GitHub 706) corregido.
