# Diseño de TC-M08-G023 (RF-106; TC-M08-058)

| Fecha | Nombre | Qué se hizo |
|---|---|---|
| 2026-11-21 | Claude / Juan Sebastian Gutierrez | Fase 1 (análisis y diseño) y decisión de Sebastian: Playwright contra TEST en modo solo lectura con `POST /prediccion/retroalimentacion` simulado vía `page.route` |
| 2026-11-21 | Argon | Fase 2 v1: construcción de `tc-m08-g023.pw.ts`, `playwright.config.ts`, `ejecutar_tc_m08_g023.ps1`, `resultados/.gitkeep`, `evidencias/DISENO_TC-M08-G023.md` y prueba local de la herramienta en `evidencias/prueba_herramienta_v1/` (11 corridas) |

**Caso:** TC-M08-058 (acceso a RF-72 desde los ítems pendientes de evaluar del historial predictivo, registro de retroalimentación clínica con POST simulado, fuentes consultadas por la vista, carácter de solo lectura del historial y recarga al volver).

**Fuente normativa:** hoja «Modulo 8», RF-106 v1.0 (Descripción, Proceso 1, Proceso 5, Restricción 3, Postcondiciones 2 y 4, CA-4) y contrato de `POST /prediccion/retroalimentacion` (RF-72, Swagger).

## 1. Contexto técnico (Fase 1)

- **Historial (`src/prediction/pages/HistorialPredictivoView.tsx:275-283`):** por cada ítem de `pendientes.items`, renderiza un botón «Registrar retroalimentación» que navega mediante `history.push('/prediccion/retroalimentacion?resultado=' + id + '&activo=' + idActivo)`.
- **Bandeja RF-72 (`src/prediction/pages/RetroalimentacionView.tsx:106-112` y `:125-131`):** al llegar con `?resultado=<id>&activo=<idActivo>`, consulta `GET /prediccion/retroalimentacion/bandeja?id_activo_biologico=885...` y solo abre el formulario si `resultado` aparece en la página 1 de la bandeja y es evaluable (`motivoNoEvaluable(pedido) === null`).
- **Filtro del backend (`bandeja_retroalimentacion_repository.py:79-81`):** la bandeja únicamente retorna predicciones con `nivel_riesgo >= 2` que abren un episodio, con alerta generada o ya evaluadas, dentro de los últimos 120 días. Por ello se prevé **FALLA en CP-02** (pendiente de nivel `<= 1` dentro de la ventana de RF-72).
- **Formulario (`src/prediction/components/RetroalimentacionFormModal.tsx`):** `ModalShell` con `role="dialog"` y nombre accesible exacto «Retroalimentación clínica» (el `h1` de la página dice «Retroalimentación Clínica» con C mayúscula). Dentro incluye `<div title={id_resultado_inferencia}>`, la línea «Activo biológico: <identificador o #id>», los radios `role="radio"` («Correcto…», «Parcial…», «Incorrecto…», «Sin evento…») y el botón «Registrar evaluación». Si el registro responde `201`, el diálogo se cierra y aparece el `Alert` «Evaluación registrada».
- **Política de solo lectura en TEST (decisión de Sebastian, 2026-11-21):** no se escribe en TEST; `POST /prediccion/retroalimentacion` se intercepta y responde `201` con `page.route` (forma real de `RetroalimentacionClinicaResponse`), manteniendo activa la guardia global de escrituras.

## 2. Checkpoints (6 en total)

Cuenta Veterinario 97, activo 885, un solo login, guardia global activa y `POST /prediccion/retroalimentacion` simulado con `page.route`.

| CP | Caso | Esperado | Fuente | Previsto | Prueba (`v1`, `normal`) |
|---|---|---|---|---|---|
| CP-01 | TC-M08-058, pendiente de nivel >= 2 dentro de la ventana de RF-72 | Al pulsar «Registrar retroalimentación» en la primera predicción pendiente de nivel >= 2 con menos de 89 días, la app va a `/prediccion/retroalimentacion?resultado=<id>&activo=885` y abre el formulario «Retroalimentación clínica» de RF-72 con ese `id_resultado_inferencia` y el activo 885 | RF-106 CA-4; Postcondición 2; Proceso 5 | OK | OK |
| CP-02 | TC-M08-058, pendiente de nivel <= 1 dentro de la ventana de RF-72 | Al pulsar «Registrar retroalimentación» en la primera predicción pendiente de nivel <= 1 con menos de 89 días, la app va a `/prediccion/retroalimentacion?resultado=<id>&activo=885` y abre el formulario «Retroalimentación clínica» de RF-72 con ese `id_resultado_inferencia` y el activo 885 | RF-106 CA-4; Postcondición 2; Proceso 5 («Cada ítem tiene un botón "Registrar retroalimentación" que abre el formulario de RF-72 prellenado») | FALLA | FALLA (`id_en_items=no \| dialogo=no`) |
| CP-03 | TC-M08-058, registro CORRECTO (POST simulado) | Con «Correcto» y «Registrar evaluación», el formulario envía un solo `POST /prediccion/retroalimentacion` con `id_resultado_inferencia` = el de CP-01, `id_activo_biologico = 885` y `estado_retroalimentacion = CORRECTO`; con la respuesta 201 el formulario se cierra y se muestra «Evaluación registrada» | RF-106 Restricción 3 y CA-4; contrato de `POST /prediccion/retroalimentacion` (RF-72, Swagger) | OK | OK |
| CP-04 | TC-M08-058, fuentes que consulta la vista | Mientras la pantalla es el historial predictivo (carga inicial y vuelta), la app consulta `GET /historial-predictivo/885` (`>= 2` veces, todas 200) y no hace ninguna petición a `/prediccion/inferencias` | RF-106 Descripción («RF-106 NUNCA consulta RF-66 directamente»); endpoints de TC-M08-058 | OK | OK |
| CP-05 | TC-M08-058, la vista es de solo lectura | La vista del historial no tiene controles para registrar ni editar valoraciones (`0 role=dialog`, `0 role=radiogroup`, `0 textarea`, `0` botones «Correcto», «Parcial», «Incorrecto», «Sin evento» o «Registrar evaluación»; en la lista de pendientes solo hay botones «Registrar retroalimentación», «Anterior» y «Siguiente»), no envía a la API peticiones distintas de GET (salvo la sesión) y el botón solo navega a RF-72 | RF-106 Restricción 3; Descripción («No modifica retroalimentaciones existentes») | OK | OK |
| CP-06 | TC-M08-058, volver a la vista | Al volver (atrás) al historial y elegir otra vez el 885, sale un `GET /historial-predictivo/885` nuevo (200) y la vista muestra la TVCO y la lista de pendientes de esa respuesta | RF-106 Postcondición 4 («La tasa de acierto mostrada es consistente con los datos actuales de RF-72») | OK | OK |

**Previsto en total:** 5 OK y 1 FALLA de 6 (FALLA prevista: CP-02).

## 3. Retirados

1. **TC-M08-058: `POST /prediccion/retroalimentacion` real responde 201:** No se escribe en TEST (decisión de Sebastian, 2026-11-21): tras el registro, el backend revisa la degradación del modelo con una sesión del sistema, fuera del sandbox (`retroalimentacion_clinica_router.py:104`; `tasa_validacion_m04_adapter.py`), y puede crear un aviso real tipo 45 para los Administradores. El POST se simula con `page.route` (CP-03).
2. **TC-M08-058: al volver, la inferencia sale de pendientes, aparece su check y la TVCO se recalcula:** Necesita una escritura real y el historial lee en una sesión aparte que no ve el sandbox (`instantanea_reportes.py`; `historial_predictivo_router.py:59`). El cálculo de pendientes y TVCO con datos reales del 885 está verificado en TC-M08-G022 (CP-11 y CP-12).

## 4. Observaciones previstas

1. **Sin acceso desde RF-103:** lectura de código (HEAD `3358b032`): ninguna ruta de `src/` enlaza a `/prediccion/historial-predictivo` fuera de `PrediccionPage`; no hay acceso desde el dashboard de RF-103 (RF-106 Proceso 1; v7 no lo menciona).
2. **Activo seleccionado se pierde al volver:** al regresar con «atrás» desde RF-72 a `/prediccion/historial-predictivo`, el combobox «Animal o lote» vuelve vacío y no dispara un `GET /historial-predictivo` automático sin volver a elegir el activo.
3. **Pendientes con más de 90 días:** aparecen en la lista de pendientes con el botón «Registrar retroalimentación» presente, aunque superan la ventana por defecto de 90 días de RF-72.
4. **Ruta tras el registro:** después de registrar la evaluación en RF-72, la aplicación permanece en `/prediccion/retroalimentacion?...` (no redirige automáticamente al historial).
5. **Texto del botón:** el botón en la lista de pendientes dice exactamente «Registrar retroalimentación», tal como exige RF-106.

## 5. Prueba de la herramienta (`evidencias/prueba_herramienta_v1/`)

Se compilaron 5 builds locales en `node_modules/.cache/qa_g023/` (`build_normal`, `build_control_post`, `build_control_inferencias`, `build_control_vista_valoracion`, `build_control_cache`) con `VITE_BASE_PATH=/sigab-test/` y `VITE_API_BASE_URL=http://127.0.0.1:4173/sigab-test/api`, servidos en `127.0.0.1:4173` por `controles/servidor_api_simulada.mjs.txt` (lanzado por `controles/lanzar_mock.mjs`) con un activo 885 sintético (`P1`–`P6`). En ninguna de las 11 corridas apareció `ESCRITURA_NO_PERMITIDA` en `mock.log` (solo `POST /sesiones/` y `POST /sesiones/refresh`).

| Corrida | Build / Escenario | Exit | Summary | Checkpoints que cambian y obtenido literal |
|---|---|---|---|---|
| `normal_1`, `normal_2`, `normal_3` | `build_normal` / `normal` | 1 | 5 OK, 1 FALLA (`Rechazado`); 0 precondiciones falsas; idénticas en las 3 corridas | CP-02 FALLA: `url="/sigab-test/prediccion/retroalimentacion?resultado=aa023003-0000-4000-8000-000000000003&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-58/61", total=2, ventana_dias=90, id_en_items=no} \| dialogo=no`; CP-01, CP-03, CP-04, CP-05, CP-06 OK |
| `bandeja_con_bajo` | `build_normal` / `bandeja_con_bajo` | 0 | 6 OK, 0 FALLA (`Aprobado`); 0 precondiciones falsas | CP-02 pasa a OK: `url="/sigab-test/prediccion/retroalimentacion?resultado=aa023003-0000-4000-8000-000000000003&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-61", total=3, ventana_dias=90, id_en_items=sí (estado_evaluacion=PENDIENTE, puede_evaluar=true)} \| dialogo=sí (title="aa023003-0000-4000-8000-000000000003", linea_activo="Activo biológico: QA-G88-266-IND-001")` |
| `bandeja_sin_alto` | `build_normal` / `bandeja_sin_alto` | 1 | 3 OK, 3 FALLA (`Rechazado`); 0 precondiciones falsas | CP-01 pasa a FALLA: `url="/sigab-test/prediccion/retroalimentacion?resultado=aa023001-0000-4000-8000-000000000001&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-56", total=1, ventana_dias=90, id_en_items=no} \| dialogo=no`; CP-03 pasa a FALLA: `formulario no abierto en CP-01: no se pudo registrar`; CP-02 FALLA; CP-04, CP-05, CP-06 OK |
| `control_post` | `build_control_post` / `normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | Solo CP-03 cambia a FALLA: `posts=1, body={id_resultado_inferencia="aa023001-0000-4000-8000-000000000001", id_activo_biologico=885, estado_retroalimentacion="PARCIAL"}, dialogo_cerrado=true, aviso=true` |
| `control_inferencias` | `build_control_inferencias` / `normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | Solo CP-04 cambia a FALLA: `GET /historial-predictivo/885=2 (status=[200, 200]); /prediccion/inferencias en historial=2 [GET /sigab-test/api/prediccion/inferencias, GET /sigab-test/api/prediccion/inferencias]` |
| `control_vista_valoracion` | `build_control_vista_valoracion` / `normal` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | Solo CP-05 cambia a FALLA: `dialogs=0, radiogroups=1, textareas=0, botones_valoracion=1 [Correcto], botones_pend=[Correcto, Registrar retroalimentación], no_get_historial=0, no_get_clic_cp01=0, no_get_clic_cp02=0` |
| `cambia_al_volver` | `build_normal` / `cambia_al_volver` | 1 | 5 OK, 1 FALLA (`Rechazado`); 0 precondiciones falsas | Igual que `normal`; CP-06 OK: `HTTP=200, x-request-id="qa-g023-59", respuesta_tvco="100% (2 validadas; 4 excluidas: sin retro)", pantalla_tvco="100% (2 validadas; 4 excluidas: sin retro)", li=3/3 (domOk=true), id_CP01_sigue_en_pendientes=false` |
| `cambia_al_volver_cache` | `build_control_cache` / `cambia_al_volver` | 1 | 4 OK, 2 FALLA (`Rechazado`); 0 precondiciones falsas | Solo CP-06 cambia a FALLA: `HTTP=200, x-request-id="qa-g023-59", respuesta_tvco="100% (2 validadas; 4 excluidas: sin retro)", pantalla_tvco="100% (1 validada; 5 excluidas: sin retro)", li=4/3 (domOk=false), id_CP01_sigue_en_pendientes=false` |
| `control_sin_simulacion` | `build_normal` / `normal` (spec sin `simularRegistro`) | 1 | 0 OK, 6 FALLA (`Rechazado`); 1 precondición falsa | Precondición falsa: `Ninguna escritura no permitida hacia TEST [POST /sigab-test/api/prediccion/retroalimentacion]`; `mock.log` sin `ESCRITURA_NO_PERMITIDA` |

## 6. SHA-256 finales

### Archivos entregados de `TC-M08-G023`

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g023.pw.ts` | `6A649A5CC8097690702A78317F08813678E83AF29E9CE759E705C93F5E7CCA3F` |
| `playwright.config.ts` | `75C66F3DDD32E09133C68351D6512EA8DD7DD7A2D78DF1A9BE4B007DC7194B4E` |
| `ejecutar_tc_m08_g023.ps1` | `90BECD0FE59138BCECF19B3EDD423AEA003B646A89157FA4BCC5812A536F0122` |
| `resultados\.gitkeep` | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |

### Controles en `evidencias/prueba_herramienta_v1/controles/`

| Archivo | SHA-256 |
|---|---|
| `servidor_api_simulada.mjs.txt` | `74472A9A9EDF9B6CE95D631143E026DC73ED0BE9F13A64A88776BC2CDA732BE9` |
| `lanzar_mock.mjs` | `5D00F58B4CB82F8539D574F32897F0E011B765FF9EECE15AB8BDE67EA09ABA73` |
| `vite.control_post.config.ts` | `3E8CD0D24C33CB9EF6A29764638EDFF661C672B10BB37D72F15047569D313482` |
| `vite.control_inferencias.config.ts` | `BA092D088BB7A9C36A2F284423EFAC21C94AE6B897D8FBC924EEA04A46C483C6` |
| `vite.control_vista_valoracion.config.ts` | `EB3AD92F8FFC855208902C59A31A8FE5515A2C1FFDC6BD086CC47121D1C3F613` |
| `vite.control_cache.config.ts` | `28387591C9EBE5F16F6FFF62CC6A25F8F771F95AAC06D545C834D07CCD6B9EA1` |
| `control_sin_simulacion.pw.ts.txt` | `E4A36C228E2EA4CDA0171208EF39759DE2D90A9A292952A6EF7C121AC1B56B5C` |

### Archivos de `src` registrados por el runner

| Archivo | SHA-256 |
|---|---|
| `src\prediction\pages\PrediccionPage.tsx` | `3A7B576FBE36BBE736335AAC4B574DFA018096D6AB54BFD67B4862B9132DDC13` |
| `src\prediction\pages\HistorialPredictivoView.tsx` | `EFB390901B03470EDCEB074D7E71DAA115C6DD00F1D2D9CF9C6E53B6986B3F36` |
| `src\prediction\api\historialPredictivoApi.ts` | `EEBCB360395D9FD6F89B3384DB8E8CED18D4A2363EE2892E1F9D417F2767D737` |
| `src\prediction\pages\RetroalimentacionView.tsx` | `5A412A12F826518586C16E8028AD9C8AB24701A2372D01A25EE311B50D3F3C5A` |
| `src\prediction\components\RetroalimentacionFormModal.tsx` | `E7228D7A41C8ABDE797C5664400BB3B7E2045CA23254CC1FE57911223AD4C283` |
| `src\prediction\api\retroApi.ts` | `6903554E91EA09678EF6552140242D04745B5B2BCB4E8BBF558B7EC41AEDA812` |
| `src\prediction\hooks\useRetroalimentacion.ts` | `174CC40DE19DEEB5AABE7EA1BAF4F898FC50B0A0BB5C9B38E105E6E90BE812FF` |
| `src\prediction\hooks\useBandejaRetroalimentacion.ts` | `AB67637D9C87A2E7C6EE15E2752526D307E0DE5781F04C3BC339257CB672DA71` |
| `src\shared\design-system\ModalShell.tsx` | `F33987DA4F04CE0913C59600BF122586FAE1FF810584D2679EBAC5FCC5670F0A` |
| `src\shared\api\http.ts` | `117C6708C01575885C943732162CD64108A015A403253CB50480A486258CCB08` |
| `src\reportes\api\reportesApi.ts` | `FC53F49E2486B37DB65117C332C3E78B63D5756D42003DD8C9BA9E9F3BCFCECA` |
| `src\shared\i18n\locales\es-CO\prediction.json` | `B51867FB0B62AC3802C1A1DD94EADEAA8FAC272ED0798C7EEFD1AA75F459A252` |

---

## 7. v1.1 (Claude)

- **Motivo:** en la prueba `v1`, la corrida `cambia_al_volver_cache` pulsó `aa023004` en CP-02 porque el spec usaba el índice de la respuesta (`h2.pendientes.items`) mientras la pantalla mostraba los datos guardados en caché (`h1`).
- **Cambio:** ubicar el `<li>` en pantalla por fecha formateada en `America/Bogota`, nivel y condición del ítem esperado, e incluir `li_pantalla=<indice>` en el obtenido de CP-01 y CP-02.
- **SHA-256 nuevo de `tc-m08-g023.pw.ts`:** `116BFB1992F24F4020518BD3D1CC1EB22A9A7DCF169D67B215E29768A6124A5B`

### Prueba de la herramienta `evidencias/prueba_herramienta_v2/`

Se ejecutaron 6 corridas locales contra los mismos builds en `node_modules/.cache/qa_g023/` y el mismo servidor simulado (`evidencias/prueba_herramienta_v1/controles/lanzar_mock.mjs`). En las 6 corridas hubo 0 «No alcanzado», 0 precondiciones falsas y `mock.log` registró únicamente `POST /sesiones/` y `POST /sesiones/refresh` como métodos distintos de `GET`.

| Corrida | Build / Escenario | Exit | Summary | Checkpoints y obtenido literal relevante |
|---|---|---|---|---|
| `normal_1`, `normal_2`, `normal_3` | `build_normal` / `normal` | 1 | 5 OK, 1 FALLA (`Rechazado`); idénticas en las 3 corridas | CP-01 OK: `li_pantalla=0 \| url="/sigab-test/prediccion/retroalimentacion?resultado=aa023001-0000-4000-8000-000000000001&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-56", total=2, ventana_dias=90, id_en_items=sí (estado_evaluacion=PENDIENTE, puede_evaluar=true)} \| dialogo=sí (title="aa023001-0000-4000-8000-000000000001", linea_activo="Activo biológico: QA-G88-266-IND-001")`; CP-02 FALLA: `li_pantalla=2 \| url="/sigab-test/prediccion/retroalimentacion?resultado=aa023003-0000-4000-8000-000000000003&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-61", total=2, ventana_dias=90, id_en_items=no} \| dialogo=no`; CP-03 a CP-06 OK como en v1 |
| `bandeja_con_bajo` | `build_normal` / `bandeja_con_bajo` | 0 | 6 OK, 0 FALLA (`Aprobado`) | CP-02 pasa a OK: `li_pantalla=2 \| url="/sigab-test/prediccion/retroalimentacion?resultado=aa023003-0000-4000-8000-000000000003&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-61", total=3, ventana_dias=90, id_en_items=sí (estado_evaluacion=PENDIENTE, puede_evaluar=true)} \| dialogo=sí (title="aa023003-0000-4000-8000-000000000003", linea_activo="Activo biológico: QA-G88-266-IND-001")` |
| `bandeja_sin_alto` | `build_normal` / `bandeja_sin_alto` | 1 | 3 OK, 3 FALLA (`Rechazado`) | CP-01 FALLA: `li_pantalla=0 \| url="/sigab-test/prediccion/retroalimentacion?resultado=aa023001-0000-4000-8000-000000000001&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-56", total=1, ventana_dias=90, id_en_items=no} \| dialogo=no`; CP-02 FALLA (`li_pantalla=2`, `id_en_items=no`, `dialogo=no`); CP-03 FALLA: `formulario no abierto en CP-01: no se pudo registrar`; CP-04, CP-05, CP-06 OK |
| `cambia_al_volver_cache` | `build_control_cache` / `cambia_al_volver` | 1 | 4 OK, 2 FALLA (`Rechazado`) | CP-02 FALLA: `li_pantalla=2 \| url="/sigab-test/prediccion/retroalimentacion?resultado=aa023003-0000-4000-8000-000000000003&activo=885" \| bandeja={HTTP=200, x-request-id="qa-g023-61", total=2, ventana_dias=90, id_en_items=no} \| dialogo=no`; CP-06 FALLA: `HTTP=200, x-request-id="qa-g023-59", respuesta_tvco="100% (2 validadas; 4 excluidas: sin retro)", pantalla_tvco="100% (1 validada; 5 excluidas: sin retro)", li=4/3 (domOk=false), id_CP01_sigue_en_pendientes=false`; CP-01, CP-03, CP-04, CP-05 OK |

### SHA-256 finales de todos los archivos del caso (v1.1)

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g023.pw.ts` | `116BFB1992F24F4020518BD3D1CC1EB22A9A7DCF169D67B215E29768A6124A5B` |
| `playwright.config.ts` | `75C66F3DDD32E09133C68351D6512EA8DD7DD7A2D78DF1A9BE4B007DC7194B4E` |
| `ejecutar_tc_m08_g023.ps1` | `90BECD0FE59138BCECF19B3EDD423AEA003B646A89157FA4BCC5812A536F0122` |
| `resultados\.gitkeep` | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |


## Reintento 1 (2026-11-23, INC-M08-390-G023, GitHub 727)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-23 | Juan Sebastian Gutierrez | Fase 1 y 2 del reintento 1: spec v1.2 (5 checkpoints) y runner con lista explícita de ids; prueba de la herramienta en `prueba_herramienta_reintento1/` |

**Respaldo de la ronda 1:** `fuentes_generador/ronda1/*.txt` (spec `116BFB19…`, config `75C66F3D…`, runner `90BECD0F…`, DISENO `6068B648…`) y `$HOME/respaldo_g023_ronda1/` de la VM. Los controles de la ronda 1 se copiaron a `node_modules\.cache\qa_g023_r1\` para traerlos al contenedor (están a 8 carpetas de la conectada).

**Código observado:** frontend `test-JuanSG` HEAD `f10009d5` (`src` sin cambios salvo finales de línea); TEST bundle `index-BsxWgc0X.js` (chunk `PrediccionPage-CQ8NWQBg.js`). `RetroalimentacionView.tsx` (a74c51cb) manda `id_resultado_inferencia` a la bandeja y muestra un aviso si la predicción pedida no llega. Backend `bf3e5aeb`: la bandeja no acepta `id_resultado_inferencia` (router :153-160; openapi de TEST igual).

**Checkpoints del reintento 1 (5):** CP-01, CP-03, CP-04, CP-05 y CP-06, con el esperado, la fuente y la medición de la ronda 1. La línea base exige pendientes (≥ 2) y uno de nivel ≥ 2 dentro de la ventana; CP-05 cuenta las peticiones distintas de GET del clic de CP-01.

**Spec v1.2:** cambios solo de alcance (comparable con el respaldo de la ronda 1 en `fuentes_generador/ronda1/`). **Runner:** 5 ids explícitos (rechaza ids de más o de menos); estado de `src` con `git diff --ignore-cr-at-eol --numstat`; el escaneo ya iba al final.

**Prueba de la herramienta** (contenedor: build local de `f10009d5` con `VITE_BASE_PATH=/sigab-test/` y la API simulada de la ronda 1, Chromium `/usr/bin/google-chrome`, Playwright 1.65.1; un mock nuevo por corrida):

| Corrida | Build / escenario | Resultado | Previsto |
|---|---|---|---|
| `normal_1` a `normal_3` | base / `normal` | 5/5 | Sí |
| `control_post` | `vite.control_post` / `normal` | FALLA CP-03 (body `PARCIAL`) | Sí |
| `control_inferencias` | `vite.control_inferencias` / `normal` | FALLA CP-04 (2 GET a `/prediccion/inferencias`) | Sí |
| `control_vista_valoracion` | `vite.control_vista_valoracion` / `normal` | FALLA CP-05 (radiogroup y «Correcto») | Sí |
| `cambia_al_volver_cache` | `vite.control_cache` / `cambia_al_volver` | FALLA CP-06 (pantalla ≠ respuesta) | Sí |
| `bandeja_sin_alto` | base / `bandeja_sin_alto` | FALLA CP-01 y CP-03 | Sí |
| `control_sin_simulacion` | base / `normal`, spec sin la simulación del POST | precondición de escrituras falsa (todo FALLA); el mock no recibió el POST | Sí |

Los 4 builds de control compilan con la guarda «el texto viejo aparece 1 vez», así que las mutaciones siguen aplicando sobre `f10009d5`. Nota de la herramienta: en un primer intento el mock de la corrida anterior siguió vivo en el puerto y los controles no se aplicaron (todo 5/5); se corrigió el lanzador (`exec` y comprobación de arranque) y se repitió todo.
