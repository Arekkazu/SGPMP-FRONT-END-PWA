# Diseño de Prueba — TC-M08-G028 (RF-107)

| Campo | Valor |
|---|---|
| Caso | `TC-M08-G028` (cubre `TC-M08-068` y `TC-M08-069`) |
| Requisito | `RF-107` — Confirmación de acciones críticas |
| Repositorio / Rama / HEAD | `SGPMP-FRONT-END-PWA` / `test-JuanSG` / `6356ea4f` |
| Nota de commit | El frontend se probó en HEAD `6356ea4f` (fast-forward del 2026-11-21 07:46 desde `3358b032`; solo cambiaron `ContratosView.tsx` y claves nuevas de `integracion.json`, ajenos a `TC-M08-G028`). |
| Tipo de prueba | Prueba de componente con Vitest + jsdom (`tc-m08-g028.test.tsx`) |
| Runner | `ejecutar_tc_m08_g028.ps1` (PowerShell 5.1, ASCII puro, CRLF, sin BOM) |
| Red | Simulada exclusivamente mediante `http.defaults.adapter` (con emulación de `config.timeout` de axios). Sin conexión a TEST ni a red externa. |
| Fecha de construcción | 2026-11-21 |

---

## 1. Fuentes vigentes

- **RF-107 Restricciones 2 y 3**: los diálogos de confirmación de acciones críticas son bloqueantes (no se cierran con la tecla `Escape`, ni haciendo clic en el fondo fuera del panel).
- **RF-107 Sección 8.1**: toda acción crítica exige confirmación previa antes de enviar la petición (`POST`); una acción no crítica (`requiere_confirmacion = false`) no muestra ningún modal y ejecuta directamente la operación.
- **RF-107 Sección 8.5 («Presentación del modal»)**:
  - `CIERRE_PERIODO`: debe indicar el período a cerrar, el número de activos que serán revaluados y advertir que no podrá reabrirse ni modificarse.
  - Demás acciones críticas (reversión, revocación): qué datos serán afectados y qué cambio es irreversible.
  - Dos botones (sin botón X `acciones.cerrar`), sin cierre por `Escape`, sin cierre por clic en el fondo y sin ningún temporizador de cierre automático.
- **CA-03**: cancelar no ejecuta la acción (0 `POST`); confirmar la ejecuta exactamente 1 vez.
- **CA-05**: bloqueo de cierre por `Escape`, clic fuera del panel y ausencia de botón `X`.

---

## 2. Checkpoints (`CP-01` a `CP-13`)

Cada checkpoint arranca en estado `FALLA` con `obtenido: "No alcanzado"`. No se usan `skip`/`only`, aserciones condicionales ni bucles vacíos.

| CP | Esperado | Fuente | Previsto (`6356ea4f`) |
|---|---|---|---|
| `CP-01` | Baja: al llegar a «Confirma la baja» hay 1 diálogo y 0 POST de baja; «Volver» y luego «Cancelar» cierran sin POST (0); repetir el flujo y «Confirmar baja» => exactamente 1 POST de baja. | RF-107 8.1; Restricciones; CA-03 | `OK` |
| `CP-02` | Reversión: al pulsar «Revertir reconocimiento» hay 1 diálogo y 0 POST; «Cancelar» => diálogo cerrado y 0 POST; reabrir, motivo, confirmar => 1 POST de reversión. | RF-107 8.1; CA-03 | `OK` |
| `CP-03` | Cierre: «Cerrar período» => 1 diálogo y 0 POST de cierre; «Cancelar» => 0; reabrir y confirmar => 1 POST. | RF-107 8.1; CA-03 | `OK` |
| `CP-04` | Revocación: «Revocar QA Cliente G028» => 1 diálogo y 0 POST; «Cancelar» => 0; reabrir, motivo, confirmar => 1 POST. | RF-107 8.1; CA-03 | `OK` |
| `CP-05` | Acción no crítica: «Exportar en PDF» => 0 diálogos en todo momento y exactamente 1 POST `/reportes`. | RF-107 8.1 («requiere_confirmacion = false: no muestra ningún modal») | `OK` |
| `CP-06` | El diálogo del cierre contiene el nombre del período tal como lo muestra la app (`nombrePeriodo`: «Octubre de 2026»). | RF-107 8.5 (`CIERRE_PERIODO`: «el período a cerrar») | `OK` |
| `CP-07` | El diálogo del cierre contiene el número de activos que se revaluarán: el texto del diálogo cumple `/\b\d+\s+activos?\b/i`. | RF-107 8.5 («el número de activos que serán revaluados») | `FALLA` |
| `CP-08` | El diálogo del cierre advierte que no podrá reabrirse ni modificarse: el texto cumple `/(reabr\|irreversible)/i` Y `/(modific\|inmutable)/i`. | RF-107 8.5 | `OK` |
| `CP-09` | Reversión y revocación: el texto del diálogo (título + descripción) nombra lo afectado («BOV-QA-G028-R» en la reversión; «QA Cliente G028» en la revocación) Y advierte la irreversibilidad `/(irreversible\|no se puede deshacer\|definitiv)/i`. Exige 2 diálogos evaluados. | RF-107 8.5 («para las demás acciones críticas: qué datos serán afectados, qué cambio es irreversible») | `FALLA` |
| `CP-10` | Escape (`fireEvent.keyDown(document, {key:'Escape'})`) con el diálogo de confirmación abierto de la reversión, el cierre y la revocación: los 3 siguen abiertos y 0 POST. | RF-107 Restricciones («no tiene cierre por tecla Escape»); 8.5; CA-05 | `OK` |
| `CP-11` | Clic en el fondo del diálogo (`fireEvent.click` sobre el propio `[role="dialog"]`) en los 4 diálogos (la baja en su paso «Confirma la baja»): los 4 siguen abiertos y 0 POST. | RF-107 Restricciones; CA-05 | `OK` |
| `CP-12` | Ninguno de los 4 diálogos (la baja en «Confirma la baja») tiene el botón X (`acciones.cerrar`). | RF-107 8.5 («dos botones»); CA-05; v7 | `OK` |
| `CP-13` | Con cada uno de los 4 diálogos abiertos (la baja en «Confirma la baja»), avanzar `600.000 ms`: siguen abiertos y 0 POST. | RF-107 8.5 («No tiene ningún temporizador de cierre automático») | `OK` |

---

## 3. Datos fijos, precondiciones, retirados y observaciones

### Datos fijos
- **Baja**: `EventosSection` del activo `4101` (`BOV-QA-G028`), `tipo="INDIVIDUAL"`, `estadoActual="ACTIVO"`, `sinFase=false`, permiso `RECURSO_ACTIVOS` + `ACCION_C`. Flujo: `Baja` -> tipo `Muerte`, fecha por defecto, motivo `Baja de prueba QA G028` -> `Registrar baja` -> paso `Confirma la baja`. `POST /activos-biologicos/4101/eventos/baja` responde `201` con forma real `EventoActivoResponse`.
- **Reversión**: `DetalleActivoModal` con `idActivo=4102`, `identificador="BOV-QA-G028-R"`, permiso `R_RECONOCIMIENTO` + `ACCION_D`; `GET /finanzas/activos/4102` devuelve `HistorialActivo` con un reconocimiento `estado="CONFIRMADO"`. Motivo: `Reversion de prueba QA G028`. `POST /finanzas/reconocimientos/4102/reversion` responde `200`.
- **Cierre**: `CierreView` en `ProveedorPeriodo` con período `7` (`Octubre de 2026`, `ABIERTO`), prevalidación `puede_cerrar=true` sin pendientes, permisos `R_CIERRE` (`ACCION_R`, `ACCION_E`). `POST /finanzas/periodos/7/cierre` responde `200` con `ResultadoCierre` (`activos_procesados: 12`).
- **Revocación**: `ClientesView` con cliente `502` (`QA Cliente G028`, `ACTIVO`), permisos `R_CLIENTES` (`ACCION_R`, `ACCION_D`). Motivo: `Revocacion QA`. `POST /integracion/clientes/502/revocar` responde `200`.
- **Acción no crítica**: `ReportesPage`, catálogo + vista previa -> botón `Exportar en PDF` -> `POST /reportes` responde `201` (`estado="GENERADO"`, `partes: []`).

### Precondiciones (`P1`–`P6`)
- `P1`: `ModalShell.tsx` contiene `useModalA11y(onClose, { escape: !bloqueante })` y `{!bloqueante && (`.
- `P2`: `RegistrarBajaModal.tsx` contiene `bloqueante={pendiente !== null}`.
- `P3`: `DetalleActivoModal.tsx` contiene `min={20} max={2000} peligro bloqueante`.
- `P4`: `CierreView.tsx` contiene `<ModalShell bloqueante title={t('cierre.confirmar_titulo'`.
- `P5`: `ClientesView.tsx` contiene `bloqueante={estado.accion === 'revocar'}`.
- `P6`: Reloj simulado avanza `Date.now()` con `vi.advanceTimersByTimeAsync`.

### Retirados
- `068 (b) configurar requiere_confirmacion=false`: el campo no existe en el frontend; las confirmaciones están fijas en cada vista.
- `068 (d) contradicción nivel_criticidad_accion/requiere_confirmacion y advertencia en log`: los campos no existen y no hay log en el frontend.

### Observaciones (`OBS-1`–`OBS-6`)
- `OBS-1`: referencias en `src\` a `requiere_confirmacion=0`, `nivel_criticidad_accion=0`.
- `OBS-2`: título e ícono de advertencia (`svg` o `.ds-alert--warning`) de los 4 diálogos (`baja`: `"Registrar baja"`, icono `sí`; `reversion`: `"Revertir el reconocimiento inicial"`, icono `no`; `cierre`: `"¿Cerrar el período Octubre de 2026?"`, icono `no`; `revocacion`: `"Revocar"`, icono `no`). El Tipo 5 de la Descripción (versión anterior) pide «¿Confirmas esta acción?» con ícono.
- `OBS-3`: textos de botones en el paso de confirmación (`baja`: `["Volver", "Confirmar baja"]`; `reversion`: `["Cancelar", "Revertir reconocimiento"]`; `cierre`: `["Cancelar", "Cerrar período"]`; `revocacion`: `["Cancelar", "Revocar"]`). La 8.5 dice «Confirmar» y «Cancelar». **Decisión del evaluador**: observación.
- `OBS-4`: la baja no muestra el identificador del activo `BOV-QA-G028` en el diálogo (`contiene="no"`). **Decisión del evaluador**: observación.
- `OBS-5`: en la baja, cancelar desde «Confirma la baja» exige pulsar «Volver» y luego «Cancelar».
- `OBS-6`: `Escape` en «Confirma la baja»: `se cerró, 0 POST`. Defecto ya reportado en `INC-M08-NN-G025` (defecto 2); **decisión del evaluador**: no cuenta en este caso (observación).

---

## 4. Verificación estática del runner (`ejecutar_tc_m08_g028.ps1`)

- `BOM=False`
- `nonAscii=0`
- `lfSinCr=0`
- `parseErrors=0` (`[System.Management.Automation.Language.Parser]::ParseFile`)

---

## 5. Resultados literales de la prueba de la herramienta (`evidencias/prueba_herramienta_v1/`)

Todas las 10 corridas finalizaron con `EXIT=1`, `precondiciones_falsas=0` y `0` checkpoints en `"No alcanzado"`.

### Corridas normales (`normal_1`, `normal_2`, `normal_3` — idénticas)
- `summary`: `total=13, ok=11, falla=2, veredicto="Rechazado"`
- `CP-01 [OK]`: `en_confirmacion={dialogos=1, post=0}; tras_volver_y_cancelar={dialogos=0, post=0}; tras_confirmar={post=1}`
- `CP-02 [OK]`: `en_confirmacion={dialogos=1, post=0}; tras_cancelar={dialogos=0, post=0}; tras_confirmar={post=1}`
- `CP-03 [OK]`: `en_confirmacion={dialogos=1, post=0}; tras_cancelar={dialogos=0, post=0}; tras_confirmar={post=1}`
- `CP-04 [OK]`: `en_confirmacion={dialogos=1, post=0}; tras_cancelar={dialogos=0, post=0}; tras_confirmar={post=1}`
- `CP-05 [OK]`: `boton_exportar=presente; dialogos=[antes=0, inmediato=0, despues=0]; post_reportes=1`
- `CP-06 [OK]`: `esperado="Octubre de 2026"; texto="¿Cerrar el período Octubre de 2026?Vas a cerrar Octubre de 2026 · Finca QA · NIT 900123456. El período queda inmutable: los hechos con fecha de este período que lleguen después se registran en el siguiente.Se cerrará Octubre de 2026: la acción es irreversible.CancelarCerrar período"`
- `CP-07 [FALLA]`: `coincidencia=ninguna; texto="¿Cerrar el período Octubre de 2026?Vas a cerrar Octubre de 2026 · Finca QA · NIT 900123456. El período queda inmutable: los hechos con fecha de este período que lleguen después se registran en el siguiente.Se cerrará Octubre de 2026: la acción es irreversible.CancelarCerrar período"`
- `CP-08 [OK]`: `patrones={reabr_o_irreversible="irreversible", modific_o_inmutable="inmutable"}; texto="¿Cerrar el período Octubre de 2026?Vas a cerrar Octubre de 2026 · Finca QA · NIT 900123456. El período queda inmutable: los hechos con fecha de este período que lleguen después se registran en el siguiente.Se cerrará Octubre de 2026: la acción es irreversible.CancelarCerrar período"`
- `CP-09 [FALLA]`: `evaluados=2/2; reversion={texto="Revertir el reconocimiento inicial | Genera el asiento espejo. Solo es posible si el activo no tiene mediciones ni costos posteriores.", nombra=no, irreversible=no}; revocacion={texto="Revocar | La revocación de QA Cliente G028 es definitiva: no se puede deshacer.", nombra=sí, irreversible=sí}`
- `CP-10 [OK]`: `reversion: sigue abierto, post=0; cierre: sigue abierto, post=0; revocacion: sigue abierto, post=0`
- `CP-11 [OK]`: `baja: sigue abierto, post=0; reversion: sigue abierto, post=0; cierre: sigue abierto, post=0; revocacion: sigue abierto, post=0`
- `CP-12 [OK]`: `baja: boton_X=ausente; reversion: boton_X=ausente; cierre: boton_X=ausente; revocacion: boton_X=ausente`
- `CP-13 [OK]`: `baja: tras_600000ms=sigue abierto, post=0; reversion: tras_600000ms=sigue abierto, post=0; cierre: tras_600000ms=sigue abierto, post=0; revocacion: tras_600000ms=sigue abierto, post=0`
- `OBS-6`: `Escape en «Confirma la baja»: se cerró, 0 POST. Defecto ya reportado en INC-M08-NN-G025 (defecto 2); no cuenta en este caso.`

### Controles (`a`–`g`)

| Control | Config | Resumen (`ok/falla`) | Diferencias literales frente a `normal` |
|---|---|---|---|
| `a` (`cierre_con_conteo`) | `vite.control.cierre_con_conteo.config.ts` | `12 / 1` | Solo `CP-07` pasa a `OK` (`coincidencia="12 activos"`). |
| `b` (`reversion_completa`) | `vite.control.reversion_completa.config.ts` | `12 / 1` | Solo `CP-09` pasa a `OK` (`reversion={..., nombra=sí, irreversible=sí}; revocacion={..., nombra=sí, irreversible=sí}`). |
| `c` (`cierre_no_bloqueante`) | `vite.control.cierre_no_bloqueante.config.ts` | `8 / 5` | `CP-10 [FALLA]` (`cierre: se cerró, post=0`), `CP-11 [FALLA]` (`cierre: se cerró, post=0`), `CP-12 [FALLA]` (`cierre: boton_X=presente`). Resto igual. |
| `d` (`revocar_directo`) | `vite.control.revocar_directo.config.ts` | `6 / 7` | `CP-04 [FALLA]` (`sin diálogo al pulsar revocar (dialogos=0, post=1)`), `CP-09 [FALLA]` (`evaluados=1/2; ... revocacion={texto="(sin diálogo)", nombra=no, irreversible=no}`), `CP-10 [FALLA]` (`revocacion: sin diálogo, post=1`), `CP-11 [FALLA]` (`revocacion: sin diálogo, post=1`), `CP-12 [FALLA]` (`revocacion: sin diálogo`), `CP-13 [FALLA]` (`revocacion: sin diálogo, post=1`). Resto igual. |
| `e` (`cierre_autocierre`) | `vite.control.cierre_autocierre.config.ts` | `10 / 3` | Solo `CP-13` pasa a `FALLA` (`cierre: tras_600000ms=se cerró, post=0`). |
| `f` (`exportar_sin_post`) | `vite.control.exportar_sin_post.config.ts` | `10 / 3` | Solo `CP-05` pasa a `FALLA` (`post_reportes=0`). |
| `g` (`escape_corregido`) | `vite.control.escape_corregido.config.ts` | `11 / 2` | Los 13 CP iguales; `OBS-6` cambia a `Escape en «Confirma la baja»: sigue abierto, 0 POST. Defecto ya reportado en INC-M08-NN-G025 (defecto 2); no cuenta en este caso.` |

---

## 6. Desviaciones

Ninguna.

---

## 7. SHA-256 de fuentes `src` (HEAD `6356ea4f`)

- `src\shared\design-system\ModalShell.tsx`: `F33987DA4F04CE0913C59600BF122586FAE1FF810584D2679EBAC5FCC5670F0A`
- `src\shared\hooks\useModalA11y.ts`: `CA9BF35A83DED94900151F9F41A36BE023A5AC13333C21F451D4B3C8143FE037`
- `src\shared\design-system\Button.tsx`: `BBA04250B19119A084243CEDBF4A61F37E857F9D82841F6C72A94AEF249CE7CB`
- `src\supplies\components\MotivoModal.tsx`: `EC43B81944B3D6169015186578E06AA7568297AAC1BCC95F8D52A543ABE57335`
- `src\biological_assets\components\EventosSection.tsx`: `4D1AC47310B14B682149EFF0E0054EEC3FC8F4F5F67C0E67FF57E138E9DEC064`
- `src\biological_assets\components\RegistrarBajaModal.tsx`: `FE08FA954921F4968D11C1E6F80ED9522607CCB5C49521E471DFEC65FF46A18F`
- `src\biological_assets\api\eventosApi.ts`: `ABD3A9C699317583D9CFA70E3CF138FCE8189379B6D81C816903A1BEBD0AE0A7`
- `src\financial_valuation\components\DetalleActivoModal.tsx`: `CF547289F5D5AAA98C0828AC2705F885C9028EE6910823FBC162A309A9B7B54B`
- `src\financial_valuation\api\finanzasApi.ts`: `B72DDC444B07A410736A6BCFBBD058B0C6DE167C0AB8C24640750F4FF1B6D8F1`
- `src\financial_valuation\pages\CierreView.tsx`: `7D8E7C6D47975C5A025A25C0830DF2711528673F05C25041B4FC7215B3FBAF9C`
- `src\accounting_integration\pages\ClientesView.tsx`: `8D6456A802A001218C2F114E566114AD17C18BB80C1E727D6239EE38C1577CCF`
- `src\accounting_integration\api\integracionApi.ts`: `37084E4B7BC6CA2E3D235F3B688D826F7B77DECECA0C817DDF26B7EF34F21219`
- `src\reportes\pages\ReportesPage.tsx`: `EE073F260B9D327DC9486CC81DD721ADB03456C6420357588CC86138F805C1C1`
- `src\shared\api\http.ts`: `117C6708C01575885C943732162CD64108A015A403253CB50480A486258CCB08`
- `src\shared\i18n\locales\es-CO\biologicalAssets.json`: `B31F8C68C01AD2B83C06F47795AB4C9A9A091D55B25289647E154701E64373B2`
- `src\shared\i18n\locales\es-CO\finanzas.json`: `E9717F056254E98F66AB1468C93E46FCFF1A1D292ECCC847D588463477B9B765`
- `src\shared\i18n\locales\es-CO\integracion.json`: `2AB7B747BFDD84C1EEE3047E5D5526C14B71CABFCBCC8BFFDC2A7E39CB274A20`
- `src\shared\i18n\locales\es-CO\supplies.json`: `C279268B1929836F49EB7A0FF1D85C731F2C8532AC9ECEA9FAAA3A64B1CEC914`
- `src\shared\i18n\locales\es-CO\common.json`: `81E2B962499A555DD7EEE4DB360A610AF13DD8D91E24D2E542B8AD5A8056EA59`
- `src\shared\i18n\locales\es-CO\reportes.json`: `74A06B5AB5A8FC3B606333F407EB86A9D19CE20A05E25103EE4DC7205FAFE0CA`
