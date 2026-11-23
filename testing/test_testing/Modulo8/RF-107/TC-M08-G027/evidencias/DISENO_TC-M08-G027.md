# Diseño de Prueba — TC-M08-G027 (RF-107)

| Campo | Valor |
|---|---|
| Caso | `TC-M08-G027` (cubre `TC-M08-063` y `TC-M08-064`) |
| Requisito | `RF-107` — Proceso en curso y bloqueo de operaciones dependientes |
| Repositorio / Rama / HEAD | `SGPMP-FRONT-END-PWA` / `test-JuanSG` / `3358b032` |
| Tipo de prueba | Prueba de componente con Vitest + jsdom (`tc-m08-g027.test.tsx`) |
| Runner | `ejecutar_tc_m08_g027.ps1` (PowerShell 5.1, ASCII puro, CRLF, sin BOM) |
| Red | Simulada exclusivamente mediante `http.defaults.adapter` (con emulación de `config.timeout` de axios). Sin conexión a TEST ni a red externa. |
| Fecha de construcción | 2026-11-21 |
| Reintento 1 | 2026-11-22: HEAD `af93ae87`, spec v1.1 y runner v1.1 (10 checkpoints); corrida `qa-m08-g027-20261122-151841` Aprobado 10/10, promovida (sección 7.6) |

---

## 1. Fuentes vigentes

- **RF-107 Entradas (`R129`, `R131`)**: `tiempo_estimado_operacion` (umbral `<= 3.000 ms` no activa indicador; `> 3.000 ms` activa indicador) y `progreso` (`null` muestra spinner con mensaje, sin `role="progressbar"`).
- **RF-107 Sección 8.2 nivel 1**: bloqueo de intento de operación crítica dependiente mientras existe un cierre en curso, mostrando mensaje informativo.
- **RF-107 Sección 8.3 («Bloqueo de operaciones dependientes») y Restricciones**: deshabilitación de controles dependientes con tooltip `^Espera a que finalice .+ antes de continuar\.$`, sin bloquear la navegación a otras secciones del sistema (sin `inert` ni `aria-modal="true"`).
- **RF-107 Sección 8.5 pasos 3 y 4**:
  - Paso 3: umbral `<= 3.000 ms` / `> 3.000 ms`, spinner cuando `progreso === null`, aviso de operación larga cuando supera los 30 s (`30.000 ms` no, `30.001 ms` sí), y `FA-3` cuando supera el tiempo máximo permitido.
  - Paso 4: retiro del indicador al finalizar en estado `EXITOSO` (banner de éxito) o `FALLIDO` (mensaje de error).
- **RF-107 `FA-3`** (nombrado en 8.5 paso 3): al agotarse el tiempo máximo permitido, retirar el indicador y mostrar exactamente `«La operación no pudo completarse. Intenta nuevamente.»`.
- **TC-M08-063 d**: frontera estricta de 30 s (`30,000 s` no muestra aviso; `30,001 s` sí).

---

## 2. Checkpoints (`CP-01` a `CP-11`)

> Ronda 1. En el reintento 1 cambian CP-02, CP-03 y CP-05 y CP-04 pasa a observación (sección 7.3).

Cada checkpoint arranca en estado `FALLA` con `obtenido: "No alcanzado"`. No se usan aserciones condicionales ni `skip`/`only`.

| CP | Esperado | Fuente | Previsto (código actual `3358b032`) |
|---|---|---|---|
| `CP-01` | Operación con `tiempo_estimado_operacion=3000` y duración real `3000 ms`: el indicador (`role="status"` con `aria-busy="true"` de `ProcesoEnCurso`) NO aparece en `t0+0`, `t0+1000` ni `t0+2999`. | RF-107 Entradas R129; 8.5 paso 3 | `FALLA` |
| `CP-02` | `tiempo_estimado_operacion=3001` y duración `3001 ms`: indicador visible en `t0+0` y `t0+3000` con el texto exacto de `reportes.json generar.generando`. | RF-107 Entradas R129; 8.5 paso 3 | `OK` |
| `CP-03` | Durante `CP-02` (`progreso null`): hay spinner (`svg.ds-btn__spinner` dentro del indicador) y NO hay `role="progressbar"`. | RF-107 Entradas R129, R131; 8.5 paso 3 | `OK` |
| `CP-04` | Operación de `45.000 ms`. `t1` = instante en que el indicador aparece. En `t1+30.000` NO hay texto común `proceso.largo`. | RF-107 8.5 paso 3; TC-M08-063 d | `FALLA` |
| `CP-05` | Misma operación: en `t1+30.001` el texto exacto de `proceso.largo` está visible dentro del indicador. | RF-107 8.5 paso 3 | `OK` |
| `CP-06` | `EXITOSO` a los `5.000 ms`: en `t0+5.000` (tras estabilidad) el indicador ya no está y hay un banner de éxito con el texto de `avisos.generado`. | RF-107 8.5 paso 4 (EXITOSO) | `OK` |
| `CP-07` | `FALLIDO` (`422`) a los `5.000 ms`: indicador ausente y un error visible (`Alert` de la sección o banner) con el `message` del 422. | RF-107 8.5 paso 4 (FALLIDO) | `OK` |
| `CP-08` | Sin respuesta: el simulador agota el timeout de `60.000 ms`. En `t0+60.000` (tras estabilidad): indicador ausente y visible exactamente `«La operación no pudo completarse. Intenta nuevamente.»`. | RF-107 8.5 paso 3 y FA-3 | `FALLA` |
| `CP-09` | En `/finanzas/cierre`, tras «Cerrar período» -> confirmar en el modal, con el POST de cierre pendiente: el botón «Cerrar período» (y `cierre.cancelar_no` si está en pantalla) está deshabilitado (`disabled` o `aria-disabled="true"`) Y tiene un tooltip que cumple `/^Espera a que finalice .+ antes de continuar\.$/`. | RF-107 8.3; 8.5 paso 3 | `FALLA` |
| `CP-10` | Con el mismo cierre pendiente: `history.push('/reportes')` del anfitrión cambia la ubicación a `/reportes` y se ve el título de `ReportesPage`; ningún elemento del documento tiene `inert` ni `aria-modal="true"`. | RF-107 Restricciones; 8.3 | `OK` |
| `CP-11` | Con el POST de cierre AÚN pendiente: navegar a `/integracion/clientes` y pulsar el botón de revocar de `«QA Cliente G027»`. Esperado: `0` `role="dialog"` abiertos y un mensaje visible (`alert`/`status`/`toast`) que contenga `«espera»` y (`«finalice»` o `«termine»`) sin distinguir mayúsculas. | RF-107 8.2 nivel 1 | `FALLA` |

---

## 3. Precondiciones, datos fijos, retirados y observaciones

### Precondiciones (`P1`–`P6`)
- `P1`: `ProcesoEnCurso.tsx` contiene `const AVISO_LARGO_MS = 30_000;`.
- `P2`: `ReportesPage.tsx` contiene `<ProcesoEnCurso mensaje={t('generar.generando')} />`.
- `P3`: `reportesApi.ts` (`generar`) usa `{ timeout: 60000 }`.
- `P4`: `CierreView.tsx` contiene `<ModalShell bloqueante title={t('cierre.confirmar_titulo'`.
- `P5`: `ClientesView.tsx` contiene `bloqueante={estado.accion === 'revocar'}`.
- `P6`: El reloj simulado (`vi.useFakeTimers()`) avanza `Date.now()` con `vi.advanceTimersByTimeAsync`.

### Datos fijos y mecanismo de prueba
- Fecha base de reloj simulado: `2026-11-21T10:00:00-05:00`.
- Catálogo de reportes simulado con `tiempo_estimado_operacion` instrumentado mediante `Object.defineProperty` (getter que cuenta lecturas del campo en `CP-01` y `CP-02`).
- Adaptador HTTP (`http.defaults.adapter`) con emulación de `config.timeout` (`ECONNABORTED`, `timeout of 60000ms exceeded`) para `CP-08`, y promesas diferidas para mantener el POST de cierre pendiente a través de `CP-09`, `CP-10` y `CP-11`.
- Componente `Anfitrion` con `MemoryRouter` y rutas `/reportes`, `/finanzas/cierre` (envuelto en `ProveedorPeriodo`) y `/integracion/clientes` (con cliente `«QA Cliente G027»`), compartiendo `ToastHost` y `AuthContext`.

### Retirado
- `063 (b) avance N/Total del cierre (CA-07)`: fuera de la entrega v7, sección 9.

### Observaciones (`OBS-1`–`OBS-4`)
- `OBS-1`: `tiempo_estimado_operacion` aparece 0 veces en `src\` ni lo envía el backend (lectura de Claude, backend `135bc318`); lecturas medidas: `CP-01=0`, `CP-02=0`.
- `OBS-2`: `ProcesoEnCurso` acepta `progreso` 0-100 (barra), pero ningún llamador le pasa `progreso` (usos con prop `progreso` en `src\`: 0).
- `OBS-3`: el «tiempo máximo permitido» de `FA-3` no lo define el RF; se tomó el timeout del cliente de `generar` (`60.000 ms`, `reportesApi.ts`).
- `OBS-4`: el cierre usa su propia barra de RF-87 («Progreso» de `CierreView`), no `ProcesoEnCurso`.

### Ajuste técnico registrado durante Fase 2
- En `src/shared/design-system/Button.tsx`, cuando `loading={true}` el botón no establece el atributo HTML `disabled` sino `aria-disabled="true"` (junto con `aria-busy="true"`) por accesibilidad (WCAG 2.4.3 / 4.1.3). `CP-09` evalúa deshabilitación como `el.disabled || el.getAttribute('aria-disabled') === 'true'` y registra ambos atributos en el `obtenido`.

---

## 4. Verificación estática del runner (`ejecutar_tc_m08_g027.ps1`)

- `BOM=False`
- `nonAscii=0`
- `lfSinCr=0`
- `parseErrors=0` (`[System.Management.Automation.Language.Parser]::ParseFile`)

---

## 5. Resultados literales de la prueba de la herramienta (`evidencias/prueba_herramienta_v1/`)

Todas las 11 corridas finalizaron con `EXIT=1`, `precondiciones_falsas=0` y 0 checkpoints en `"No alcanzado"`.

### Corridas normales (`normal_1`, `normal_2`, `normal_3` — idénticas)
- `summary`: `total=11, ok=6, falla=5, veredicto="Rechazado"`
- `CP-01 [FALLA]`: `visible en [0, 1000, 2999] ms; texto="Generando el reporte..."; lecturas del campo=0`
- `CP-02 [OK]`: `t0+0=visible ("Generando el reporte..."), t0+3000=visible ("Generando el reporte..."); lecturas=0`
- `CP-03 [OK]`: `spinners=1, progressbars=0, texto="Generando el reporte..."`
- `CP-04 [FALLA]`: `t1+29.999=ausente; t1+30.000=presente ("Esta operación puede tardar unos minutos. Puedes seguir usando otras secciones del sistema mientras esperas.")`
- `CP-05 [OK]`: `t1+30.001="Esta operación puede tardar unos minutos. Puedes seguir usando otras secciones del sistema mientras esperas."`
- `CP-06 [OK]`: `indicador=no; banners_exito=1 ["El reporte «Inventario biológico» está listo 10 registros. La descarga empieza ahora."]`
- `CP-07 [OK]`: `indicador=no; errores=1 [seccion:"No se pudo generar el reporte El rango de fechas supera el máximo permitido."]`
- `CP-08 [FALLA]`: `indicador=no; textos_error=["Ocurrió un error inesperado. Intenta nuevamente."]`
- `CP-09 [FALLA]`: `"Cerrar período" {disabled=false, aria-disabled=true, aria-busy=true, tooltip="sin tooltip"}`
- `CP-10 [OK]`: `ruta="/reportes", titulo="Reportes", inert=0, aria-modal=0`
- `CP-11 [FALLA]`: `dialogos=1 ["Revocar"]; mensajes=[]; cierre pendiente=sí`

### Controles (`a`–`h`)

| Control | Config | Resumen (`ok/falla`) | Diferencias frente a `normal` |
|---|---|---|---|
| `a` (`umbral`) | `vite.control.umbral.config.ts` | `7 / 4` | Solo `CP-01` pasa a `OK` (`no visible en [0, 1000, 2999] ms; texto=""; lecturas del campo=1`); `CP-02` mantiene `OK` con `lecturas=1`. |
| `b` (`aviso_estricto`) | `vite.control.aviso_estricto.config.ts` | `7 / 4` | Solo `CP-04` pasa a `OK` (`t1+29.999=ausente; t1+30.000=ausente`). |
| `c` (`fa3`) | `vite.control.fa3.config.ts` | `7 / 4` | Solo `CP-08` pasa a `OK` (`indicador=no; textos_error=["La operación no pudo completarse. Intenta nuevamente."]`). |
| `d` (`tooltip`) | `vite.control.tooltip.config.ts` | `7 / 4` | Solo `CP-09` pasa a `OK` (`"Cerrar período" {disabled=false, aria-disabled=true, aria-busy=true, tooltip="Espera a que finalice el cierre del período antes de continuar."}`). |
| `e` (`bloqueo_critico`) | `vite.control.bloqueo_critico.config.ts` | `7 / 4` | Solo `CP-11` pasa a `OK` (`dialogos=0 []; mensajes=["Espera a que finalice el cierre del período antes de continuar."]; cierre pendiente=sí`). |
| `f` (`sin_indicador`) | `vite.control.sin_indicador.config.ts` | `4 / 7` | `CP-01 [OK]` (por ausencia), `CP-02 [FALLA]`, `CP-03 [FALLA]`, `CP-04 [FALLA]` (`sin t1`), `CP-05 [FALLA]` (`sin t1`). Resto igual a `normal`. |
| `g` (`indicador_pegado`) | `vite.control.indicador_pegado.config.ts` | `4 / 7` | `CP-06 [FALLA]`, `CP-07 [FALLA]`, `CP-08 [FALLA]` (todos con `indicador=sí`). Resto igual a `normal`. |
| `h` (`navegacion_bloqueada`) | `vite.control.navegacion_bloqueada.config.ts` | `5 / 6` | `CP-10 [FALLA]` (`ruta="/finanzas/cierre", titulo="(ausente)"`), `CP-11 [FALLA]` (`no se pudo navegar (ruta="/finanzas/cierre")`). Resto igual a `normal`. |

---

## 6. SHA-256 de archivos del caso, controles y fuentes `src`

### Archivos del caso
- `tc-m08-g027.test.tsx`: `8124FBB5769EA8CD1A0E4042D9187FC88564EC2C69EA747389819EFA7FFD1464`
- `ejecutar_tc_m08_g027.ps1`: `E3C444BDF2E2337C156F8CB05911880F759E20164E812F52E888CFA2112B6A3D`
- `resultados\.gitkeep`: `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855`

### Controles (`evidencias\prueba_herramienta_v1\controles\`)
- `vite.control.umbral.config.ts`: `BC4FA737EE1F809E338F950113CAAFC6C90132D9749947C3CE9A10BC95414ECE`
- `vite.control.aviso_estricto.config.ts`: `4A28D4B5F466C7E521318667C833831DDED2860C3E4B7FA456049349AA1FBC43`
- `vite.control.fa3.config.ts`: `3E8FCFDDFD27533E35BBE195C1507949D743D183CC412724ED59488E5B78EAA9`
- `vite.control.tooltip.config.ts`: `543DFD3FBD4E06D89F1DA5CC7131C01B2F659CF23642F63C0F836D78636A4DAC`
- `vite.control.bloqueo_critico.config.ts`: `220368851613AA6F3433A7346D7EF2C1A35B65B32F7B7C5B60FFE4C89B8474F4`
- `vite.control.sin_indicador.config.ts`: `74D2210BAB15C49F0C7EAB942F38308C592AB83FF5CFCB8FCEEA96E41CF0DCC6`
- `vite.control.indicador_pegado.config.ts`: `7BDF6629CFA476DDBD74B30177A5BD08FD025386FE3E784555652D04B3D2DDC7`
- `vite.control.navegacion_bloqueada.config.ts`: `684C8CBFF1DE352E65FB16349E68C5BCAB5ACC6E48998BCD28C686A23A79D684`

### Fuentes `src` (commit `3358b032`)
- `src\shared\design-system\ProcesoEnCurso.tsx`: `631009959AB6A61E69CF64810018C188C51B161DE7344B4D87178808FF34EA38`
- `src\reportes\pages\ReportesPage.tsx`: `EE073F260B9D327DC9486CC81DD721ADB03456C6420357588CC86138F805C1C1`
- `src\reportes\api\reportesApi.ts`: `FC53F49E2486B37DB65117C332C3E78B63D5756D42003DD8C9BA9E9F3BCFCECA`
- `src\shared\api\http.ts`: `117C6708C01575885C943732162CD64108A015A403253CB50480A486258CCB08`
- `src\shared\api\errors.ts`: `27786CAB33D5F6A702E58A5C51E2CBA5521D46447F1C777851D4EAD720AE6190`
- `src\shared\hooks\useToast.ts`: `19F22A80E2C0EA9BB75035FB3FCAC88ADF28CD89B157B609C3E419D8F28BD2BA`
- `src\shared\design-system\ToastHost.tsx`: `AE61697DB4790AF9AF67710271EC3BC724BA29C61AF45F1578AE7466D777593C`
- `src\shared\design-system\ModalShell.tsx`: `F33987DA4F04CE0913C59600BF122586FAE1FF810584D2679EBAC5FCC5670F0A`
- `src\shared\hooks\useModalA11y.ts`: `CA9BF35A83DED94900151F9F41A36BE023A5AC13333C21F451D4B3C8143FE037`
- `src\shared\design-system\Button.tsx`: `BBA04250B19119A084243CEDBF4A61F37E857F9D82841F6C72A94AEF249CE7CB`
- `src\financial_valuation\pages\CierreView.tsx`: `7D8E7C6D47975C5A025A25C0830DF2711528673F05C25041B4FC7215B3FBAF9C`
- `src\accounting_integration\pages\ClientesView.tsx`: `8D6456A802A001218C2F114E566114AD17C18BB80C1E727D6239EE38C1577CCF`
- `src\shared\i18n\locales\es-CO\common.json`: `81E2B962499A555DD7EEE4DB360A610AF13DD8D91E24D2E542B8AD5A8056EA59`
- `src\shared\i18n\locales\es-CO\reportes.json`: `74A06B5AB5A8FC3B606333F407EB86A9D19CE20A05E25103EE4DC7205FAFE0CA`
- `src\shared\i18n\locales\es-CO\finanzas.json`: `E9717F056254E98F66AB1468C93E46FCFF1A1D292ECCC847D588463477B9B765`
- `src\shared\i18n\locales\es-CO\integracion.json`: `AC006F7B08A1A31A87F8FCA835A5625424D9C32EB7A284A80FD42372D7B8A89F`

---

## 7. Reintento 1 (2026-11-22)

### 7.1 Cambio de Desarrollo (observado)

- Issue 730 (INC-M08-392-G027): commit `ac134ec1` («avisos, proceso en curso y confirmaciones criticas») y `d19d23c1` (el aviso «Espera a que finalice…» sale una sola vez con StrictMode), en `test-JuanSG` HEAD `af93ae87`, `src/` sin cambios locales.
- `ProcesoEnCurso.tsx`: `UMBRAL_PROCESO_MS = 3_000` (:22); se monta al empezar la operación y se deja ver en `UMBRAL_PROCESO_MS + 1` (:35); el aviso `AVISO_LARGO_MS = 30_000` (:17) cuenta desde el montaje (:36). No lee `tiempo_estimado_operacion` (1 referencia en `src\`, en un comentario).
- `errors.ts`: sin respuesta por `ECONNABORTED`/`ETIMEDOUT`, mensaje `errores.tiempo_agotado` (:41-42).
- `CierreView.tsx`: «Cerrar período» con `title` `proceso.espera` mientras el cierre está en curso (:341) y `enOperacion(t('cierre.operacion'))`; `ReportesPage.tsx`: `enOperacion(t('generar.operacion'))` y `title` `esperaGeneracion` (:137, :257).
- `ModalShell.tsx`: con `operacionEnCurso()` el modal bloqueante no se abre, avisa `proceso.espera` y llama a `onClose` (:58-73).
- Despliegue en TEST revisado en el navegador integrado (bundle `index-BUhd1sjz.js`).

### 7.2 Specs de la ronda 1 sin cambios contra el código actual

Contenedor de Claude, `src/` de `af93ae87` (`prueba_herramienta_reintento1/ronda1_sin_cambios/`): 7 OK / 4 FALLA (Rechazado).
- CP-01, CP-06 a CP-11 OK (CP-08, CP-09 y CP-11 pasan de FALLA a OK).
- CP-02 FALLA: el spec exigía el indicador en `t0+0` (R129 / 8.5 paso 3 con `tiempo_estimado_operacion=3001`); la entrega lo muestra en `t0+3.001`.
- CP-03, CP-04 y CP-05 FALLA de herramienta: medían en `t0` y sin `t1` porque el indicador ya no se ve de inmediato.

### 7.3 Specs v1.1 (decisión de Sebastian 2026-11-22: opción B, «como la entrega»)

- **CP-02:** operación de 10.000 ms; el indicador NO se ve en `t0+3.000` y SÍ en `t0+3.001` con el texto exacto de `generar.generando` (activación por tiempo transcurrido). La diferencia con R129 («Si > 3000 ms, se activa PROCESO_EN_CURSO») y 8.5 paso 3 («M08 evalúa el campo tiempo_estimado_operacion…») queda en **OBS-6** para los líderes y Análisis.
- **ADAPT-1 (CP-03):** se mide en `t0+3.001`, con el indicador visible.
- **ADAPT-2 (CP-05):** `t1` es el instante real en que aparece el indicador (esperado literal de la ronda 1): el spec avanza el reloj simulado de a 1 ms y lee la pantalla tras drenar microtareas, hasta 10.000 ms; mide `t1+30.001`. Medido: `t1 = t0+3.001`. Límite propio de 60 s para esa prueba. Si el indicador no aparece, CP-05 da FALLA con lo medido.
- **CP-04 pasa a OBS-5** (decisión de Sebastian 2026-11-21, límite exacto del reloj simulado): registra `t1+29.999`, `t1+30.000` y también `t0+29.999/30.000/30.001` (el aviso cuenta desde el inicio de la operación, según la entrega). Quedan 10 checkpoints: CP-01 a CP-03 y CP-05 a CP-11.
- **P7 (nueva):** `ProcesoEnCurso.tsx` contiene `export const UMBRAL_PROCESO_MS = 3_000;` y `setTimeout(() => setVisible(true), UMBRAL_PROCESO_MS + 1)`.
- **OBS-1 reescrita:** cuenta referencias totales y fuera de comentarios (`refsTiempoEstimadoCodigo`).
- **CP-11:** el `Anfitrion` no monta `EstadoSincronizacion`, así que no hace falta endurecer el filtro de mensajes de la ronda 1 (el ícono de sincronización no puede aportar un `status` falso).
- **Runner:** lista explícita de ids (`CP-01`, `CP-02`, `CP-03`, `CP-05` … `CP-11`), rechaza ids no esperados, `$checkpointsEsperados = 10` y `src\shared\hooks\operacionEnCurso.ts` en la lista de SHA. Verificación estática en el contenedor: `BOM=False`, `nonAscii=0`, `lfSinCr=0`; el contenedor no tiene PowerShell: `ParseFile` va en el prompt de la corrida oficial.
- Diffs: `prueba_herramienta_reintento1/diff_vitest_ronda1_vs_v1.1.txt` y `diff_runner_ronda1_vs_v1.1.txt`.

### 7.4 Prueba de la herramienta (`evidencias/prueba_herramienta_reintento1/`)

Contenedor de Claude, `src/` de `af93ae87`, `TZ=America/Bogota`, `REINTENTO=1`. Controles con un plugin de Vite que reemplaza texto exacto en memoria (`controles/vitest.mutacion.config.mts.txt`, copiado a la raíz del repo sin `.txt` y con `QA_MUTACION=<nombre>`); `src/` no se toca. Cada control vale solo si la consola trae una línea `[QA_MUTACION]` por reemplazo.

| Corrida | Mutación | Resultado |
|---|---|---|
| `vitest_normal_1` a `3` | — | 10/10, exit 0, P1–P7 OK, `t1 = t0+3.001` |
| `vitest_control_umbral_0` | indicador visible en 0 ms | CP-01 y CP-02 FALLA |
| `vitest_control_indicador_nunca` | `if (true) return null;` | CP-02, CP-03 y CP-05 FALLA (CP-05 «sin t1», con lo medido) |
| `vitest_control_aviso_nunca` | `setLargo(false)` | solo CP-05 FALLA |
| `vitest_control_progreso_50` | `progreso = 50` por defecto | CP-02 (texto «… 50 %») y CP-03 (barra, sin spinner) FALLA |
| `vitest_control_sin_fa3` | sin `errores.tiempo_agotado` | solo CP-08 FALLA («Ocurrió un error inesperado…») |
| `vitest_control_sin_title_cierre` | `title={undefined}` en «Cerrar período» | solo CP-09 FALLA |
| `vitest_control_sin_guarda_modal` | `operacionEnCurso()` → `null` en `ModalShell` (2 reemplazos) | solo CP-11 FALLA (diálogo «Revocar» abierto) |
| `vitest_control_indicador_pegado` | sin `setGenerando(false)` | CP-06, CP-07 y CP-08 FALLA (`indicador=sí`) |

Ningún «No alcanzado» y ninguna precondición falsa. `vitest list`: 7 pruebas. SHA de la prueba en `prueba_herramienta_reintento1/SHA256SUMS.txt`.

### 7.5 Archivos del reintento 1

- `tc-m08-g027.test.tsx` v1.1: `E48434917261A2B6C6BD182E632401EB194803B0BF122D1FB1C74D7C23841D48`
- `ejecutar_tc_m08_g027.ps1` (reintento 1): `6C81EBCB4F78270993F97F9D74A4DDDA8F33ECDAE55596EC3E341757FD14A29E`
- Respaldos de la ronda 1 en `evidencias/fuentes_generador/ronda1/`: `tc-m08-g027.test.tsx.txt` (`8124FBB5…`), `ejecutar_tc_m08_g027.ps1.txt` (`E3C444BD…`), `DISENO_TC-M08-G027.md.txt` (`8E1BFB8D…`).
- Fuentes `src` nuevas en la lista del runner: `src\shared\hooks\operacionEnCurso.ts` `47627F990598B418EFA3D86C5BDFA5118606190D732CF8C14214E7EF96107BC8`; las demás se registran en la corrida oficial.

### 7.6 Corrida oficial y promoción

- **RUN** `qa-m08-g027-20261122-151841` (staging `evidencias/run-20261122-151841/`), 2026-11-22 15:18, exit 0, `-Reintento 1`, ejecutada por el agente con el prompt cerrado (SHA, HEAD, `Test-Path` del `_reintento1.json` = False, `ParseFile`, `vitest list` = 7 pruebas, una ejecución).
- **Validada por Claude contra los archivos del equipo:** SHA del spec, del runner y del DISENO; 17 archivos de `src` (HEAD `af93ae87`, sin cambios locales; `operacionEnCurso.ts` `47627F99…`); una sola carpeta `run-*` nueva, sin archivos fuera del staging; Vitest 7/7; 10 checkpoints OK con los ids esperados, ninguno «No alcanzado»; P1–P7 OK; escaneo 0 hallazgos; `resultados\` sin cambios durante la corrida.

| CP | Obtenido (reintento 1) | Ronda 1 |
|---|---|---|
| CP-01 | No visible en 0, 1.000 y 2.999 ms | FALLA → **OK** |
| CP-02 | Ausente en `t0+3.000`, visible en `t0+3.001` («Generando el reporte...») | OK (esperado de la ronda 1: visible en `t0`) → **OK** según la entrega (OBS-6) |
| CP-03 | En `t0+3.001`: 1 spinner, 0 barras | OK |
| CP-04 | Pasa a OBS-5: `t1+29.999` y `t1+30.000` presentes; desde el inicio, `t0+29.999` ausente y `t0+30.000` presente | FALLA → observación |
| CP-05 | `t1 = t0+3.001`; en `t1+30.001` el aviso `proceso.largo` | OK |
| CP-06, CP-07 | Indicador retirado; banner de éxito / error del 422 | OK |
| CP-08 | «La operación no pudo completarse. Intenta nuevamente.» | FALLA → **OK** |
| CP-09 | «Cerrar período» `aria-disabled=true` con «Espera a que finalice el cierre del período antes de continuar.» | FALLA → **OK** |
| CP-10 | Navega a `/reportes`, sin `inert` ni `aria-modal` | OK |
| CP-11 | 0 diálogos; aviso «Espera a que finalice el cierre del período antes de continuar.» | FALLA → **OK** |

- **Observaciones que siguen:** OBS-6 (activación por tiempo transcurrido frente a `tiempo_estimado_operacion` de R129 / 8.5 paso 3, para líderes y Análisis), OBS-1 a OBS-5.
- **Promoción** (2026-11-22, por orden de Sebastian): `resultados/resultado_TC-M08-G027_reintento1.json` = `2CBB169CAE54ECE4954E96B747B5583BE80372AE66AF8B0BED33F3D97123B11E`, igual en origen y destino; ronda 1 intacta (`098C183D…`). Registro `evidencias/PROMOCION_TC-M08-G027_reintento1.txt`. Lectura: total 10, passed 10, failed 0 → **Aprobado**. INC-M08-392-G027 (GitHub 730) corregido.

