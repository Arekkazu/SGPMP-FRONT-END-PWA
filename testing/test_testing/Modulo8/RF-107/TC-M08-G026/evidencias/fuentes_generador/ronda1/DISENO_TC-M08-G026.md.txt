# Diseño de TC-M08-G026 (RF-107): cola, coexistencia, duplicados e historial de sesión

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 y Fase 2: Vitest (CP-01 a CP-20) + Playwright contra TEST (CP-21 a CP-24), probados en el contenedor; pendiente la corrida oficial |
| 2026-11-20 | Juan Sebastian Gutierrez | Corrida oficial validada (Rechazado 17/24), promovida a `resultados/`; caso cerrado (ronda 1). Issue único INC-M08-NN-G026 |

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
