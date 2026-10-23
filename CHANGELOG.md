## [1.4.0-rc.1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.3...v1.4.0-rc.1) (2026-10-23)

### Features

* **m03:** prototipos v2 de RF-53, RF-55, RF-56, RF-60 y RF-62 (RFC-011, RFC-016) ([333bc4f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/333bc4ff71a7ab91ecf34662b94c8de6e6a75e39))
* **m04:** prototipos v2 de RF-65, RF-66, RF-68, RF-69, RF-70, RF-71 y RF-73 (RFC-009) ([33d8cef](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/33d8cefc18a97cfcffedf5fa610a867a0c95ae98))
* **rf29-i18n:** traduccion de los codigos de error nuevos de RFC-012..016 conservando los datos del mensaje ([b432ec4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b432ec4406610fa5bd8c31632a64bce0d6d15f0c))
* **rf33-mod2:** validar atributos dinamicos contra la configuracion de la especie ([9e8b15f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9e8b15f455322a4c264e7e7d5015fd7d5ed90992)), closes [#194](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/194)
* **rf33-mod2:** validar especie e infraestructura contra el catalogo activo ([#69](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/69)) ([96609cc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/96609cca35a4130295151f8757065f2040f960f5))
* **rf33-rf48-biological-assets:** registro y transferencia multiespecie, fecha de nacimiento opcional y aviso de edad (FE-07) ([6b00c29](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6b00c29b6d471adbbd8a822974aadb82d14868d8))
* **rf37-mod2:** elegir la fase destino del ciclo y validar que sea distinta a la actual ([#73](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/73)) ([6c4d335](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6c4d335f76abf57ba3172737787b9b596a6ec451)), closes [#288](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/288)
* **rf41-mod2:** bloquear tratamiento y vacunacion sin diagnostico previo ([#71](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/71)) ([c99fc5a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c99fc5ad60a6334a2d650522648e578107898e71))
* **rf42-mod2:** campos y etiquetas por categoria reproductiva ([#72](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/72)) ([e99fcbd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e99fcbd83c447a59ff660f48eb11bd971c9ed76c)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf58-telemetry:** dashboard con estado GRIS sin umbral e indicador de anomalia (FE-10) ([13ba5b4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/13ba5b45f825afa4df0d44655445a8e81e60fc67))
* **rf59-telemetry:** historial con aviso de truncado y marca de intervalos vacios (FE-11) ([ef45554](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ef4555491a740570d8c61e5be879612d89f65783))
* **rf60:** etiquetas e i18n de los tipos nuevos de alerta tecnica (FE-03) ([f6021fc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f6021fce8d6b533978e13118ad638c7ac57ace2f))
* **rf65-mod4:** avisar la sincronizacion pendiente y desincronizada del motor con los nodos (FE-02) ([7ad7686](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7ad76862e4bcf6336a055c9b5b85b2da2101e75c))
* **rf65-prediction:** el formulario del motor envia la config_version leida para la concurrencia optimista (DEV-36) ([1d36801](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1d36801a054e21b75560bc5010939380a4264307))
* **rf70-mod4:** DistribucionOtaView con datos reales y estado OTA por version (FE-01a) ([c98598c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c98598cbcdfbc00d4f4909dd60520058b52e67c1))
* **rf70-mod4:** lanzar distribucion OTA y ver el estado por nodo y componente (FE-01b) ([c7255dc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c7255dc38fe77b9fadc883b968434ee9b6dbd7ae))
* **rf70-prediction:** la distribucion OTA lista versiones APROBADO (FE-08) ([6b7a08f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6b7a08f860c694a8441592032befd875a797f0ec))
* **rf74-rf81-supplies:** modulo de suministros (M05) en el frontend contra los endpoints de la integracion ([d1422e1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d1422e1556a9e55198e8f49a807fb0346b754c69))
* **rf75-supplies:** el registro de consumo elige el alimento del catalogo ([184894c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/184894cec01740c0d9aca9f394c0d979962c7e9d)), closes [#667](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/667)
* **rfc012-rf15:** densidad y esperanza de vida opcionales en el formulario de especie (FE-05) ([ec66aff](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ec66affce2ccd3de51d7ab1b032b2042f1571cb9))
* **rfc012-rf20:** areas con varias especies, criticidad y capacidad derivada (FE-06) ([5403879](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5403879a3e9da05d895e26b935b530a6497fbd73))
* **rfc013-rf01:** traduccion del codigo EDAD_FUERA_DE_RANGO (DEV-18) ([6ef0f3c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6ef0f3c41ae0f13dd679c3bdc6df6b43ca9a8dd1))
* **rfc016-rf17:** marcar variables ambientales como criticas, solo Administrador (FE-09) ([4c962c2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4c962c217704a4f976e240dd6935f78a3defd691))

### Bug Fixes

* **configuration:** adaptar parametros RF-18 al contrato DEV-14 ([585d470](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/585d4707a67c5b310730cacfd8170aabd9636393)), closes [#3533](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/3533)
* **deploy:** servir la app bajo una subruta del proxy con VITE_BASE_PATH ([8589b80](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8589b8096e3fa674c2bcbcd04d8925a33ee4133b))
* **rf16-mod9:** campos numericos que no aceptan letras al registrar metricas y demas formularios ([80b939b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/80b939b11a5e6fa80b6eb770fdab608debaddc59))
* **rf18-configuration:** el formulario de parametros muestra los valores cargados desde el primer render y se vacia sin configuracion (FE-04) ([caecb9b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/caecb9ba86b666b8c8bd65804a3e34e8f86b9a71))
* **rf33-mod2:** explicar por que una finca no muestra areas para la especie elegida ([9631a2d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9631a2db564b1b6b748228bfaaa77e7fa3fffd5d))
* **rfc016-rf17:** el interruptor es_critica depende del recurso variables_ambientales_criticas, no de editar umbrales (FE-09) ([6c67120](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6c671200f8ba13893ec8d25dc9b0a6b898da898e))
* **telemetry:** rf-57 fe-12 controlar descarte por permisos y transiciones ([184131b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/184131b75bd5d7e24f1d1fb1426051a0ecdedc9f)), closes [#3694](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/3694) [#3781](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/3781) [#3782](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/3782)

## [1.3.2-rc.2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.2-rc.1...v1.3.2-rc.2) (2026-10-13)

### Bug Fixes

* **rf16-mod9:** campos numericos que no aceptan letras al registrar metricas y demas formularios ([80b939b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/80b939b11a5e6fa80b6eb770fdab608debaddc59))

## [1.3.2-rc.1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.1...v1.3.2-rc.1) (2026-10-13)

### Bug Fixes

* **rf33-mod2:** explicar por que una finca no muestra areas para la especie elegida ([9631a2d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9631a2db564b1b6b748228bfaaa77e7fa3fffd5d))
* **rf33-mod2:** indicar a quien pedir el area cuando la finca no tiene una para la especie ([0ceb441](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/0ceb4413308ff18d6fce3dbfa3b4793016c9095a))

## [1.3.0-rc.2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.0-rc.1...v1.3.0-rc.2) (2026-10-13)

### Bug Fixes

* **rf33-mod2:** explicar por que una finca no muestra areas para la especie elegida ([9631a2d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9631a2db564b1b6b748228bfaaa77e7fa3fffd5d))

## [1.3.3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.2...v1.3.3) (2026-10-13)

### Bug Fixes

* **rf16-mod9:** campos numericos que no aceptan letras al registrar metricas y demas formularios ([65434fe](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/65434fe672749fa2b33bced7942621f2265f882c))

## [1.3.2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.1...v1.3.2) (2026-10-13)

### Bug Fixes

* **rf33-mod2:** indicar a quien pedir el area cuando la finca no tiene una para la especie ([0ceb441](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/0ceb4413308ff18d6fce3dbfa3b4793016c9095a))

## [1.3.1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.3.0...v1.3.1) (2026-10-13)

### Bug Fixes

* **rf33:** mostrar las areas de la finca aunque sean de otra especie al registrar activo ([87f408f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/87f408f62710821dd65e6474714c85aa8445bf82))

## [1.3.0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.2.0...v1.3.0) (2026-10-13)

### Features

* **rf06:** accion desbloquear para cuentas bloqueadas en la gestion de usuarios ([68d660d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/68d660df79c284b9300536247f9031e90fc63bb4)), closes [#568](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/568)
* **rf15-mod9:** grupo de manejo obligatorio en el formulario de especies (RF-15 v1.1) ([7cdb7a5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cdb7a571c62345f1298495938ebd21cfa69a4f3))
* **rf43-mod9:** elegir en que ciclos productivos una metrica es producto ([7cb0b7e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cb0b7e1211ad549594719360685af9310a1821b))

### Bug Fixes

* **auditoria:** alinear los filtros pese al hint del campo usuario ([88c8f58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/88c8f5838b3f8b90a775c6f83697e7b62b6d778d))
* **auth:** mostrar el contador de intentos solo con el conteo real del backend (RF-02) ([69d2500](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/69d25009cf09feffd456b02047b1ed617a3dcfeb))
* **m09:** buscador y paginacion en los listados de configuracion y roles ([3806fde](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3806fdee5aa8485a3a4c5e86eeb6d5088fadf4c7))
* **pwa:** recargar con la version nueva cuando falta un chunk tras un despliegue ([4d7c3b8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4d7c3b8e97dd16cc153a2151e2ef7d1db200f370))
* **rf02:** indicar que se esta cerrando la sesion ([cae3601](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cae360116a1ef2f54ea8fc00cf2fc6446eabeaeb))
* **rf06:** mostrar en solo lectura el detalle de un usuario eliminado ([32ba89a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/32ba89a428ad45f386eb053499b16e30533dc612))
* **rf06:** mostrar que la sesion termino por un cambio de estado de la cuenta ([e1a4cd1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e1a4cd106beb2461dbf4b7c10447ad87a20eecaa)), closes [#569](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/569)
* **rf15:** paginar de 15 en 15 todos los listados de configuracion ([7ae7645](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7ae76458271bf4a1d84d9690604e03b480ad68ba))
* **rf16:** editar ciclos, patologias, metricas y umbrales nunca editados sin falso 412 ([db4bbdf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/db4bbdf0ea4f6155bfa0f4b4369a08a3863e0b37))
* **rf16:** reactivar etapas del ciclo, avisos de exito y buscador con paginacion ([73709e7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/73709e70e6329c5e6138880aa87ab4421605d2f8))
* **rf17-rf16:** borrar el aviso de error del intento anterior al cambiar los datos (CU-M09-03) ([972b768](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/972b7680def76cdbbc31b6f39fd6afb76e0fd3b8))
* **rf18-rf19:** confirmar el guardado de parametros y mostrar el usuario por nombre ([a46dccf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a46dccfad3e93468425c2f3d2050382c7a83dc89))
* **rf41-mod2:** cargar las patologias del evento sanitario con el permiso de activos ([d8a1022](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d8a1022c8f33c9ba3c00d969317e970a10256a0d)), closes [Arekkazu/sgpmp-backend#578](https://github.com/Arekkazu/sgpmp-backend/issues/578)
* **rf43-mod2:** elegir el producto del evento productivo de la lista de la fase activa ([5a816b1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5a816b1856e7fa399e9c6484fd8e8816ec0603d0))
* **sesiones:** coordinar el refresco del token entre pestanas para no disparar el reuso (RF-02) ([a5e77db](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a5e77db07b55785e150cab4e96da640f7a150540))
* **usuarios:** confirmar «Cambios guardados» al editar un usuario como admin (RF-05) ([57af4c6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/57af4c666d488ba108c80b58deac981375eeacd6))
* **usuarios:** no usar la respuesta del PATCH como detalle del usuario ([f8e6301](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f8e6301375b4066221e1d925de94299bd2760ab6))
* **usuarios:** omitir opcionales vacios al guardar y resolver el rol sin id ([5021e23](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5021e23eb65b58e24bda2916ecf079d5fe67dea9)), closes [#undefined](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/undefined)

## [1.3.0-rc.1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.2.0...v1.3.0-rc.1) (2026-10-13)

### Features

* **rf06:** accion desbloquear para cuentas bloqueadas en la gestion de usuarios ([68d660d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/68d660df79c284b9300536247f9031e90fc63bb4)), closes [#568](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/568)
* **rf15-mod9:** grupo de manejo obligatorio en el formulario de especies (RF-15 v1.1) ([7cdb7a5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cdb7a571c62345f1298495938ebd21cfa69a4f3))
* **rf43-mod9:** elegir en que ciclos productivos una metrica es producto ([7cb0b7e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cb0b7e1211ad549594719360685af9310a1821b))

### Bug Fixes

* **auditoria:** alinear los filtros pese al hint del campo usuario ([88c8f58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/88c8f5838b3f8b90a775c6f83697e7b62b6d778d))
* **auth:** mostrar el contador de intentos solo con el conteo real del backend (RF-02) ([69d2500](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/69d25009cf09feffd456b02047b1ed617a3dcfeb))
* **m09:** buscador y paginacion en los listados de configuracion y roles ([3806fde](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3806fdee5aa8485a3a4c5e86eeb6d5088fadf4c7))
* **pwa:** recargar con la version nueva cuando falta un chunk tras un despliegue ([4d7c3b8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4d7c3b8e97dd16cc153a2151e2ef7d1db200f370))
* **rf02:** indicar que se esta cerrando la sesion ([cae3601](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cae360116a1ef2f54ea8fc00cf2fc6446eabeaeb))
* **rf06:** mostrar en solo lectura el detalle de un usuario eliminado ([32ba89a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/32ba89a428ad45f386eb053499b16e30533dc612))
* **rf06:** mostrar que la sesion termino por un cambio de estado de la cuenta ([e1a4cd1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e1a4cd106beb2461dbf4b7c10447ad87a20eecaa)), closes [#569](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/569)
* **rf15:** paginar de 15 en 15 todos los listados de configuracion ([7ae7645](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7ae76458271bf4a1d84d9690604e03b480ad68ba))
* **rf16:** editar ciclos, patologias, metricas y umbrales nunca editados sin falso 412 ([db4bbdf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/db4bbdf0ea4f6155bfa0f4b4369a08a3863e0b37))
* **rf16:** reactivar etapas del ciclo, avisos de exito y buscador con paginacion ([73709e7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/73709e70e6329c5e6138880aa87ab4421605d2f8))
* **rf17-rf16:** borrar el aviso de error del intento anterior al cambiar los datos (CU-M09-03) ([972b768](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/972b7680def76cdbbc31b6f39fd6afb76e0fd3b8))
* **rf18-rf19:** confirmar el guardado de parametros y mostrar el usuario por nombre ([a46dccf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a46dccfad3e93468425c2f3d2050382c7a83dc89))
* **rf41-mod2:** cargar las patologias del evento sanitario con el permiso de activos ([d8a1022](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d8a1022c8f33c9ba3c00d969317e970a10256a0d)), closes [Arekkazu/sgpmp-backend#578](https://github.com/Arekkazu/sgpmp-backend/issues/578)
* **rf43-mod2:** elegir el producto del evento productivo de la lista de la fase activa ([5a816b1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5a816b1856e7fa399e9c6484fd8e8816ec0603d0))
* **sesiones:** coordinar el refresco del token entre pestanas para no disparar el reuso (RF-02) ([a5e77db](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a5e77db07b55785e150cab4e96da640f7a150540))
* **usuarios:** confirmar «Cambios guardados» al editar un usuario como admin (RF-05) ([57af4c6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/57af4c666d488ba108c80b58deac981375eeacd6))
* **usuarios:** no usar la respuesta del PATCH como detalle del usuario ([f8e6301](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f8e6301375b4066221e1d925de94299bd2760ab6))
* **usuarios:** omitir opcionales vacios al guardar y resolver el rol sin id ([5021e23](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5021e23eb65b58e24bda2916ecf079d5fe67dea9)), closes [#undefined](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/undefined)

## [1.0.0-rc.66](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.65...v1.0.0-rc.66) (2026-10-13)

### Features

* **rf43-mod9:** elegir en que ciclos productivos una metrica es producto ([7cb0b7e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cb0b7e1211ad549594719360685af9310a1821b))

### Bug Fixes

* **rf17-rf16:** borrar el aviso de error del intento anterior al cambiar los datos (CU-M09-03) ([972b768](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/972b7680def76cdbbc31b6f39fd6afb76e0fd3b8))
* **rf18-rf19:** confirmar el guardado de parametros y mostrar el usuario por nombre ([a46dccf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a46dccfad3e93468425c2f3d2050382c7a83dc89))
* **rf41-mod2:** cargar las patologias del evento sanitario con el permiso de activos ([d8a1022](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d8a1022c8f33c9ba3c00d969317e970a10256a0d)), closes [Arekkazu/sgpmp-backend#578](https://github.com/Arekkazu/sgpmp-backend/issues/578)
* **rf43-mod2:** elegir el producto del evento productivo de la lista de la fase activa ([5a816b1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5a816b1856e7fa399e9c6484fd8e8816ec0603d0))

## [1.0.0-rc.65](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.64...v1.0.0-rc.65) (2026-10-12)

### Bug Fixes

* **pwa:** recargar con la version nueva cuando falta un chunk tras un despliegue ([4d7c3b8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4d7c3b8e97dd16cc153a2151e2ef7d1db200f370))

## [1.0.0-rc.64](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.63...v1.0.0-rc.64) (2026-10-12)

### Bug Fixes

* **rf15:** paginar de 15 en 15 todos los listados de configuracion ([7ae7645](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7ae76458271bf4a1d84d9690604e03b480ad68ba))

## [1.0.0-rc.63](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.62...v1.0.0-rc.63) (2026-10-12)

### Bug Fixes

* **m09:** buscador y paginacion en los listados de configuracion y roles ([3806fde](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3806fdee5aa8485a3a4c5e86eeb6d5088fadf4c7))
* **rf02:** indicar que se esta cerrando la sesion ([cae3601](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cae360116a1ef2f54ea8fc00cf2fc6446eabeaeb))
* **rf06:** mostrar en solo lectura el detalle de un usuario eliminado ([32ba89a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/32ba89a428ad45f386eb053499b16e30533dc612))
* **rf16:** editar ciclos, patologias, metricas y umbrales nunca editados sin falso 412 ([db4bbdf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/db4bbdf0ea4f6155bfa0f4b4369a08a3863e0b37))
* **rf16:** reactivar etapas del ciclo, avisos de exito y buscador con paginacion ([73709e7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/73709e70e6329c5e6138880aa87ab4421605d2f8))

## [1.0.0-rc.62](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.61...v1.0.0-rc.62) (2026-10-12)

### Bug Fixes

* **sesiones:** coordinar el refresco del token entre pestanas para no disparar el reuso (RF-02) ([a5e77db](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a5e77db07b55785e150cab4e96da640f7a150540))

## [1.0.0-rc.61](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.60...v1.0.0-rc.61) (2026-10-12)

### Bug Fixes

* **usuarios:** confirmar «Cambios guardados» al editar un usuario como admin (RF-05) ([57af4c6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/57af4c666d488ba108c80b58deac981375eeacd6))

## [1.0.0-rc.60](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.59...v1.0.0-rc.60) (2026-10-11)

### Bug Fixes

* **auth:** mostrar el contador de intentos solo con el conteo real del backend (RF-02) ([69d2500](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/69d25009cf09feffd456b02047b1ed617a3dcfeb))

## [1.0.0-rc.59](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.58...v1.0.0-rc.59) (2026-10-11)

### Features

* **rf15-mod9:** grupo de manejo obligatorio en el formulario de especies (RF-15 v1.1) ([7cdb7a5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7cdb7a571c62345f1298495938ebd21cfa69a4f3))

## [1.0.0-rc.58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.57...v1.0.0-rc.58) (2026-10-11)

### Features

* **rf06:** accion desbloquear para cuentas bloqueadas en la gestion de usuarios ([68d660d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/68d660df79c284b9300536247f9031e90fc63bb4)), closes [#568](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/568)

### Bug Fixes

* **rf06:** mostrar que la sesion termino por un cambio de estado de la cuenta ([e1a4cd1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e1a4cd106beb2461dbf4b7c10447ad87a20eecaa)), closes [#569](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/569)

## [1.0.0-rc.57](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.56...v1.0.0-rc.57) (2026-10-11)

### Bug Fixes

* **usuarios:** no usar la respuesta del PATCH como detalle del usuario ([f8e6301](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f8e6301375b4066221e1d925de94299bd2760ab6))

## [1.0.0-rc.56](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.55...v1.0.0-rc.56) (2026-10-11)

### Bug Fixes

* **auditoria:** alinear los filtros pese al hint del campo usuario ([88c8f58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/88c8f5838b3f8b90a775c6f83697e7b62b6d778d))
* **usuarios:** omitir opcionales vacios al guardar y resolver el rol sin id ([5021e23](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5021e23eb65b58e24bda2916ecf079d5fe67dea9)), closes [#undefined](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/undefined)
## [1.2.0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.1.1...v1.2.0) (2026-10-12)

### Features

* **configuration:** gateway edge de los dispositivos IoT y su credencial MQTT (RF-21, RF-23, TC-M09-250/251) ([4d710ab](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4d710abe0d8ade78c469fd277a06146bd93cbe45))
* **configuration:** gestionar la credencial MQTT de cada Raspberry (RF-23, TC-M09-250/251) ([438e487](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/438e487710aa7872934ddb226d5fca1c8f38b89f))
* **configuration:** reintentar o cancelar una configuracion remota PENDIENTE o NO_CONF (RF-23) ([4666b38](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4666b3880d19eea660ccac29afa28d76f21dc7d1))
* **design-system:** alinear tokens y componentes con el Design System v2.0 ([d5d07a7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d5d07a708b42e2b9c02a69a6f07812babc027467)), closes [#2e8634](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/2e8634) [#226a28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/226a28) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00) [#986000](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/986000) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)
* **design-system:** alinear tokens y componentes con el Design System v2.0 ([1f2cd4c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1f2cd4ca846916da8f26cf9a63ca03a0871a9a7a)), closes [#2e8634](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/2e8634) [#226a28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/226a28) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00) [#986000](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/986000) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)
* **i18n:** selector de idioma en las pantallas de acceso ([281f3fb](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/281f3fb38791055181c83fd5e9e52ff9e2c68a1b))
* **marca:** presentar el producto como SIGAB con su isotipo ([d646677](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d64667713774af5478f7278959ed38364adaf783))
* **prediction:** taxonomia por tipo de manejo y paradigma en el motor, modelos y OTA (RFC-009) ([44d04f8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/44d04f8bdc90341566bb95798fa486c68a8497f8))
* **pwa:** service worker que precachea la app para abrir sin red ([abed246](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/abed246b3dda5f43e9c4d2c3ad26a5240901af03))
* **rf05-rf10-mod1:** autocompletado de rol, fincas y usuario sin romper el ID ([da6cfef](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/da6cfefa3caf530fc494df36600be663e8c19831)), closes [#id](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/id)
* **rf14-mod1:** boton para marcar todas las notificaciones como leidas ([02407c8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/02407c810ee050b45780aaab1ae3e8bfb89d6dc2))
* **rf15:** [#115](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/115) permitir creacion offline en el catalogo de especies con sincronizacion diferida ([47306a3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/47306a345d7fdd3d90cc4a73af12a030c6160f71))
* **rf19:** elegir el productor de la finca por nombre o id ([5a62402](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5a62402b27ee564c0cc46d0acdfa8ccacb2b14d5)), closes [#id](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/id)
* **rf20-rf21-mod9:** especie y modelo de IA del area, reactivacion y camaras (RFC-009, RFC-011) ([16a7e6d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/16a7e6d4f1aa7962261f52256d9cdf374288589f))
* **rf22:** avisar qué asociaciones sensor-activo cerró la reasignación de un sensor ([89ee1f3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/89ee1f336433669f19a8017b0d96e9ece9831148)), closes [Arekkazu/sgpmp-backend#290](https://github.com/Arekkazu/sgpmp-backend/issues/290) [Arekkazu/sgpmp-backend#304](https://github.com/Arekkazu/sgpmp-backend/issues/304) [#304](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/304)
* **rf23-mod9:** configurar fps de camaras en la configuracion remota (RF-23 v1.1) ([f01a549](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f01a54930b53d0c4e22ebd3e77fb48f6e37ab108))
* **rf31-mod9:** buscar, paginar y mostrar las plantillas como filas legibles ([a17c198](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a17c198a7dcca1034002a4976be074fdf14584df))
* **rf33-mod2:** elegir especie e infraestructura con lista desplegable o escribiendo nombre o id ([238becd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/238becded3df1f07d94243255e40d4f20584afd1))
* **sync:** sesion offline hasta recuperar la red con reenvio de la cola ([60afde9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/60afde987fa39366b27e11141c7a9b9569868d89))
* **ui:** buscador en las listas largas de fincas y dispositivos ([716acbd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/716acbd5faadb1f2c294d906eb7001a0fa059d10))
* **ui:** combobox con lista desplegable y escritura libre en el sistema de diseno ([eb2dea7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb2dea7a0edc1af80b2906d74458e9192c2ac07e))
* **ui:** confirmar con un aviso las creaciones, ediciones y cambios de estado ([978376c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/978376c07e2e2dffc62da16a6e18cff32607eeb9)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **ui:** sub-pestanas en configuracion para fincas, iot y personalizacion ([6763d47](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6763d47814ff0d99b03fb39b660e0e6d5455be8d))

### Bug Fixes

* **a11y:** [#271](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/271) el enlace saltar al contenido mueve el foco sin navegar a la raiz ([861e087](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/861e087bbbe6681a1e32c0cc6313e91c4e1726cd)), closes [#contenido-principal](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/contenido-principal)
* **a11y:** filas y tarjetas que abren un detalle accesibles por teclado, sin hover por JS ([b7d0607](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b7d0607f7ddbb14e0023e45788fc03af6d76f022))
* **a11y:** gestionar foco y Escape en todos los modales ([#199](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/199)) ([656dac6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/656dac6b1c41021ad0c92b80137d5f2b4b45c9c8))
* **a11y:** habilitar zoom en toda la app quitando restricciones del viewport ([56c46ca](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/56c46ca495b87d9bf554e87fbc29e7466085b109))
* **auditoria:** [#135](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/135) anunciar el estado sin resultados con role=status ([28ea93d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/28ea93d89027404af05ebba99e99727a7523c0d6))
* **auditoria:** [#288](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/288) deshabilitar exportar cuando no hay conexion ([c08a21d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c08a21ddc26b7ea12b94f51663e711a6deb5515a))
* **auth:** #TC-DIS-05 restituir el acceso SSO a AgroFusion en el login ([01b63e8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/01b63e81432106eea5470de8f9516f10070d1d21)), closes [#TC-DIS-05](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/TC-DIS-05) [#132](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/132) [#136](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/136)
* **auth:** detectar la sesion rechazada cuando el refresh devuelve ApiError ([cbb93a8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbb93a8c8b2b3b8d5eecabf5a1a1b3260e1a353a))
* **auth:** mostrar la hora de desbloqueo de la cuenta en la zona horaria del usuario ([bc9348a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/bc9348a8648dd194ece4d4c4105af16add265c06))
* **auth:** ocultar boton de AgroFusion en el login ([9c278e3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9c278e32931735108ade2de3155aeea193b1227b))
* **biological_assets:** [#98](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/98) renderizar paginacion en el listado de activos ([f11b73e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f11b73e9c7dd651132b9864be1a9fa7e6ac529f3))
* **catalogo:** aceptar el ID con # en los campos de autocompletado ([7f57d60](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7f57d608b5939030522e99a1788e5c07aa04f2e8)), closes [#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300) [#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300)
* **ci:** corregir redireccion de reporte de texto en workflow de Bearer ([336dcc3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/336dcc33b043858e5736bad1b364b4679c67a559))
* **deploy:** cachear como immutable solo los assets con hash de /assets/ ([f09af93](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f09af9392b74bcbaf4e872e5783ad143de7dcee5))
* **deps:** [#108](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/108) resolver vulnerabilidades de npm audit en dependencias ([b5be4e5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b5be4e5888083dc38fed4e693095539b8a243af6))
* **design-system:** [#134](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/134) subir contraste del badge de advertencia y el enlace de perfil ([562c848](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/562c848c09a5323872ba845c9974d383f7e4309d)), closes [#c07a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/c07a00) [#fff8e6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/fff8e6) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)
* **design-system:** colapsar las rejillas de contenido en movil ([cbf2e28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbf2e2874fa073029e0905652b4eb8faf001f33b))
* **design-system:** contraste AA en boton primario y accion de peligro en dark ([95edc36](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/95edc360ec8f7c96fbae165d5c04f58793d5ef0b))
* **design-system:** todos los modales como bottom sheet en movil con ancho del DS ([820beae](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/820beaee2b03439220a392f89c75e7c5f04e573e))
* **i18n:** espacio entre el texto traducido y el valor resaltado ([97f1669](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/97f16699144e0be577b90203f648abee89bba779))
* **i18n:** mostrar el nombre del modulo en vez de su codigo ([cd1edab](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cd1edab0d34b80d3777b7f8feca2dc1a6b7d3413))
* **i18n:** selector de idioma compacto en la esquina del acceso ([a778d0f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a778d0f18cf3003d9e27e146fb683199afe15ba5))
* **i18n:** traducir el error REFRESH_TOKEN_REQUERIDO ([2c4a61c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2c4a61c3234daebf6726e454a0a3f2a42fdb4a31))
* **i18n:** traducir los textos fijos que quedaban junto a las frases partidas ([ad8bdd0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ad8bdd082a98c23eb0759b62dff7b9fd38f3cc25))
* **m02-m09:** hallazgos de la tercera evaluacion de accesibilidad y consistencia visual ([2b7b44e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2b7b44ecfbfa3980c4108b1a0c5f7fac68aaf439))
* **m02:** hallazgos de la segunda evaluacion de accesibilidad y consistencia visual ([c494df4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c494df400c100d4db2599b6fa886e841b3eb904b))
* **m09:** asociar los errores de campo del backend a su input ([5123a22](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5123a22ec18ff269da2dc6a223e4edba8b2cd4fa))
* **m09:** formatear superficie como numero, nombre accesible del badge y scroll enfocable ([a9c37a8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a9c37a836397cec0c8b2c443df986cbd30d35f48))
* **m09:** limite de error por pagina para que un fallo no deje la app en blanco ([b10cacf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b10cacf03e0ab99df4918cd8b01dddd395d84522)), closes [#251](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/251)
* **m09:** modales como bottom sheet en movil y con ancho maximo del DS ([fe7d991](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/fe7d9916b7a6f51c9736ff874b346ae3b24dbd4b))
* **m09:** mover el foco al paso nuevo en la asociacion de sensores ([a12a495](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a12a49542bdd7f97f3cc72ea2cf9b1ab6eee1b01))
* **m09:** tablas de configuracion con scroll enfocable por teclado ([db39916](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/db39916dac11302958c481ee6f788f87b53cae0b))
* **mod9:** quitar la barra de scroll nativa de las pestanas de configuracion ([f13c371](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f13c371b91a4ba519c3117c17d88af8794bacb8d))
* **nginx:** [#113](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/113) emitir encabezados de seguridad en el frontend ([ce0a3a4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ce0a3a4997273ee808f88f0f1ad41e60c3dd86b4))
* **perfil:** [#133](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/133) no cerrar sesion cuando la contrasena actual es incorrecta ([c4bda1a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c4bda1a0a7d8edda5f219354c5c0f2b40a49710f))
* **perfil:** [#136](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/136) mostrar el encabezado "Mi Perfil" tambien sin datos cargados ([e0f8290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e0f8290f75fdb1405b07ebbb561455166b425264))
* **perfil:** agregar encabezado en los estados de carga y error de Mi Perfil ([497436b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/497436bab857535756d439374b4ea5637946006d))
* **perfil:** editar perfil y cambiar contrasena como modal ([98f1484](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/98f14842bc85ad1b19012ed97cf8e33d1da93767))
* **pwa:** abrir la app instalada con la sesion vigente u offline ([e137f17](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e137f176871cb47275e440f762a4c6eba9b12a92))
* **rf03-mod1:** validar los permisos del rol al enviar y mostrar recursos legibles ([eb6cd12](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb6cd120959f4379ff4020eab8bccc415ea5f9ab))
* **rf06-mod1:** distinguir inactivar de bloquear una cuenta ([16b60c8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/16b60c8a2928e3f389f150d45abd8ec94bfcbd39))
* **rf10-mod1:** ocultar la simulacion de archivado fuera de desarrollo y mostrar eventos legibles ([ae41782](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ae41782f428dc28b6cf62e10fbb1176225c9e396))
* **rf10:** conservar el ancla fecha_hasta al paginar la auditoria (INC-M01-57-G71) ([c0df51e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c0df51ee8a4e727c6980b1bb81412136c286f693)), closes [Arekkazu/sgpmp-backend#457](https://github.com/Arekkazu/sgpmp-backend/issues/457)
* **rf15:** [#231](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/231) editar una especie nunca editada sin falso conflicto de concurrencia ([f46bafd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f46bafdfab35b7b9295785f81748600cc99f604a))
* **rf15:** mostrar el texto del rf-15 ante un 409 de sincronización y volver a la página 1 al crear (INC-M09-54-G07) ([b1a6f46](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b1a6f46c9e717d5d31d92eeff0cfc995ead5cde8)), closes [Arekkazu/sgpmp-backend#450](https://github.com/Arekkazu/sgpmp-backend/issues/450)
* **rf15:** notificar conflictos tras el replay y mostrar la especie pendiente al inicio (INC-M09-54-G07) ([40ca927](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/40ca927c588f7d9056c7b8cba79cf450fb4503e9)), closes [Arekkazu/sgpmp-backend#450](https://github.com/Arekkazu/sgpmp-backend/issues/450)
* **rf16-mod9:** pedir el tipo de dato al registrar una metrica (Arekkazu/sgpmp-backend[#487](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/487)) ([77b693a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/77b693ae7c4a058e317425f195ecf353c4f9727c))
* **rf16-mod9:** registrar tipo de dato, obligatoriedad y rango de las metricas productivas ([#258](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/258)) ([1200a9c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1200a9cf0cf3da0f0939b810ac94a5d08b3a87d4))
* **rf17-rf30-mod9:** corregir los hallazgos de accesibilidad de la primera evaluación de M09 ([a12843f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a12843f6ae3af19513c8edd5e8300449dfbb0035)), closes [#189](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/189)
* **rf17:** [#116](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/116) corregir contraste invisible en Rango general de Umbrales Ambientales ([bb2c5a0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/bb2c5a0b0ac6cd3c680bc4a601b3e10382bbbbc7))
* **rf17:** semaforizacion con icono y patron, no solo color, y campos de umbral con nombre completo ([26346c9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/26346c9e2db2335e5f4ad83f40a331ef7598895a))
* **rf21-mod9:** enviar el tipo de dispositivo al registrar un dispositivo IoT ([#179](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/179)) ([654db8e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/654db8e190cdece473eaf1544a76ec8bdc74af51))
* **rf21-mod9:** refrescar los dispositivos en todas las secciones de IoT tras crear o cambiar uno ([79034e0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/79034e041048d1fee434143b9f887b12d55daa9d))
* **rf23:** contraste del historial y etiquetas de frecuencia e intervalo en configuracion remota ([c512b16](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c512b16659ec57a15dc0ff956e28d4b478ddb1c7)), closes [#244](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/244) [#116](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/116) [#245](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/245)
* **rf24-mod9:** encabezados, labels asociados y scope de tabla en calibracion de sensores ([#247](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/247)) ([9294af9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9294af9344253254275febfd8fd3045b48c99bcf))
* **rf24-mod9:** enviar modo_calibracion SENSOR al registrar una calibracion ([5d0a4c2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5d0a4c2539e8a8f69982b463322257ef518229af)), closes [#521](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/521) [#510](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/510)
* **rf24:** convertir en el borde los valores de calibracion que el backend envia como texto ([74ed527](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/74ed527a3da10ee09d18faa86a71268780871207)), closes [#251](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/251)
* **rf25-mod9:** no ofrecer 'Ir a Configuracion' a roles que no pueden configurar la finca ([75168d0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/75168d04ba018e341607c387d4b14cbc1a5c720a))
* **rf25:** contexto de interfaz 204 sin cuerpo como finca sin catalogo ([d86f820](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d86f820cc9fa2f1196b4154c8116296593a1772a)), closes [Arekkazu/sgpmp-backend#410](https://github.com/Arekkazu/sgpmp-backend/issues/410)
* **rf27-mod9:** garantizar contraste AA del texto del sidebar sobre la marca (TC-M09-179) ([fe90591](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/fe905916e98fec8950d56d9ef34f7b735a96ee84)), closes [#249453](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/249453) [#97b68f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/97b68f) [#1A6B3C](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1A6B3C) [#249453](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/249453)
* **rf27-mod9:** mapear el tema global para que el badge de origen no muestre la clave cruda ([9f29619](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9f29619955eef9daaed7191945b38534f1c2d4f3))
* **rf27-rf30:** estructura y teclado en tema, dashboard, idioma y plantillas ([2db50f8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2db50f8d08d8102ae8c2508f87ef06ca30928524)), closes [#7c3aed](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7c3aed)
* **rf31:** [#125](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/125) leer items de los listados por especie de configuracion ([9c2ceb1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9c2ceb19b4d5b98e01721e5fda91389844f08d96))
* **rf33-mod2:** elegir especie, finca e infraestructura por nombre al registrar un activo ([4665b58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4665b5856affff6402842910cba89d2efa50e89a)), closes [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290) [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf33-mod2:** leer los listados de especies, fincas e infraestructuras desde items ([e739ad5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e739ad5f10443dc263dff658c820edf3a057b857))
* **rf33-rf35:** pedir los atributos dinámicos de la especie y alinear el sexo con la BD ([1ba5f49](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1ba5f49848181c739b280fc3605f22888fe73e1e)), closes [#194](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/194) [#192](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/192)
* **rf34-rf52:** corregir los hallazgos de accesibilidad de la primera evaluación de M02 ([2df3430](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2df34305027ddebfe0020d590a2f793a3930bb90))
* **rf35-mod2:** buscar activos por numero, aclarar el alcance de la busqueda y unificar el acceso denegado ([51c11da](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/51c11da1be2f02f988d05094f3f5968af48abcc9)), closes [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **rf35:** reenviar fecha_actualizacion en el patch de activo individual (INC-M02-G22) ([f808ebb](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f808ebb68d27408183e364db44ed67bb85d20aca))
* **rf37-mod2:** elegir el ciclo productivo del activo al cambiar de fase ([#288](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/288)) ([85aa3b0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/85aa3b01ef53f7d2767e4bc2a62e18a8c60666e7))
* **rf38-mod2:** advertir sin ambiguedad que el cierre de ciclo no se puede deshacer ([5aeb0ba](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5aeb0ba33200b048b837226de91971366bb238c3)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf38-mod2:** cerrar ciclo despues de las 7 p. m. y mostrar las fechas en hora local ([#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300)) ([388ae9d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/388ae9dd133ab58c52a12a43df704964b6384547)), closes [#130](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/130)
* **rf39-mod2:** avisar antes de registrar eventos que requieren fase activa ([f1d9393](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f1d939321a36c1ef18a9d34eb717990dfa2f885c)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf39-mod2:** enviar la fecha de eventos como instante local y no como medianoche UTC ([#289](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/289)) ([d261d93](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d261d9368b8c9bb5c660711cc105b5c6fda7f46b))
* **rf42-mod2:** mostrar en el evento reproductivo solo los campos de cada categoria ([b1ef96b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b1ef96b997817b21807a6d7686068be83031e58f)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **rf45:** [#130](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/130) enviar el dia utc cuando la baja es de hoy ([8726fa2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8726fa2b62b7f4018cc2093ebff2f6ffff394146))
* **rf46-mod2:** describir cada registro del historial en lenguaje legible ([eb7b7cc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb7b7cc65dc443caa5dc8d62e29e5924b12815b5)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf47-mod2:** mostrar los eventos de la ficha integral como lineas legibles ([cc8f633](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cc8f633d9be7907759d790c926e0ddaa71043bb2)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **rf49:** [#351](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/351) quitar AMBIENTAL del modal de asociar sensor a un activo ([cbcb318](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbcb318c58071572b3019b8d9161e675c6287bf3))
* **rf49:** corregir mensaje de error 403 al asociar sensor ([2e0b462](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2e0b462fc58700f268bcaa780762a856bdf0b967)), closes [#349](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/349)
* **rf53-mod3:** describir las vistas de telemetria en lugar del codigo del requisito ([d97b48e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d97b48e454d33bfcc645cbafd0ab731456f1c1cd))
* **rf59-mod3:** convertir a numero los decimales del historial para que la vista no se caiga ([#317](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/317)) ([be911e4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/be911e482194ba4449eaf095ce8ebacbc8a9d74b))
* **sast:** quitar el createElement con tipo dinamico que Bearer marca como XSS ([5ae3731](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5ae37310b56c538d30c94f2fc0840fa43edd464e))
* **sesiones:** [#126](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/126) no cerrar la sesion cuando el refresh falla por el servidor (RF-02) ([4b64502](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4b6450234ec6dbe7f7d404cf5d1c1429abfdc795))
* **sidebar:** [#132](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/132) marcar items como enlaces y evitar drawer inalcanzable en movil ([2787738](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2787738f706563a5600c335b8da964a66c7e6ba9))
* **ui:** nombrar la seccion bloqueada en el menu y mostrar el nombre completo del usuario ([b14d0c3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b14d0c3ce2ab97a425cbcb292e611afa4bf3c448))
* **ui:** traer a la vista los errores del servidor y mostrar codigos internos como texto legible ([48b8b96](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/48b8b9659583c0c64e5627d4101957579a77d0a3))
* **ui:** usar longhands del borde inferior en las pestanas ([03f1dd3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/03f1dd303f31c4c9d80c79b50cbc55ea0015a45e))
* **usuarios:** [#135](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/135) anunciar el resultado de "gestionar cuenta" con un alert accesible ([b8860ee](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b8860ee0be8b95fde2fc46f2948fe527ccb526fe))
* **usuarios:** [#97](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/97) permitir asignar fincas que ya tienen dueno ([948b226](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/948b226da5fe38e6821c43a7353523fbac771e55)), closes [Arekkazu/sgpmp-backend#445](https://github.com/Arekkazu/sgpmp-backend/issues/445)

### Performance Improvements

* **build:** cargar cada modulo al entrar a su ruta y separar las librerias en chunks ([a7fba0f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a7fba0f700cf2f26e79220d27a4ff46472727870))
* **design-system:** animar la barra de fortaleza de contrasena con transform ([c17b16e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c17b16e6bf3ad0afd6cf7a66e3c747e1cf36c6d6))

## [1.0.0-rc.55](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.54...v1.0.0-rc.55) (2026-10-11)

### Bug Fixes

* **pwa:** abrir la app instalada con la sesion vigente u offline ([e137f17](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e137f176871cb47275e440f762a4c6eba9b12a92))

## [1.0.0-rc.54](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.53...v1.0.0-rc.54) (2026-10-11)

### Features

* **pwa:** service worker que precachea la app para abrir sin red ([abed246](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/abed246b3dda5f43e9c4d2c3ad26a5240901af03))

## [1.0.0-rc.53](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.52...v1.0.0-rc.53) (2026-10-11)

### Features

* **sync:** sesion offline hasta recuperar la red con reenvio de la cola ([60afde9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/60afde987fa39366b27e11141c7a9b9569868d89))

### Bug Fixes

* **auth:** detectar la sesion rechazada cuando el refresh devuelve ApiError ([cbb93a8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbb93a8c8b2b3b8d5eecabf5a1a1b3260e1a353a))

## [1.0.0-rc.52](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.51...v1.0.0-rc.52) (2026-10-11)

### Bug Fixes

* **i18n:** selector de idioma compacto en la esquina del acceso ([a778d0f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a778d0f18cf3003d9e27e146fb683199afe15ba5))

## [1.0.0-rc.51](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.50...v1.0.0-rc.51) (2026-10-11)

### Features

* **i18n:** selector de idioma en las pantallas de acceso ([281f3fb](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/281f3fb38791055181c83fd5e9e52ff9e2c68a1b))
* **rf05-rf10-mod1:** autocompletado de rol, fincas y usuario sin romper el ID ([da6cfef](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/da6cfefa3caf530fc494df36600be663e8c19831)), closes [#id](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/id)

### Bug Fixes

* **auth:** mostrar la hora de desbloqueo de la cuenta en la zona horaria del usuario ([bc9348a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/bc9348a8648dd194ece4d4c4105af16add265c06))
* **catalogo:** aceptar el ID con # en los campos de autocompletado ([7f57d60](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7f57d608b5939030522e99a1788e5c07aa04f2e8)), closes [#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300) [#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300)

## [1.0.0-rc.50](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.49...v1.0.0-rc.50) (2026-10-11)

### Features

* **marca:** presentar el producto como SIGAB con su isotipo ([d646677](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d64667713774af5478f7278959ed38364adaf783))
* **rf19:** elegir el productor de la finca por nombre o id ([5a62402](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5a62402b27ee564c0cc46d0acdfa8ccacb2b14d5)), closes [#id](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/id)

### Bug Fixes

* **deploy:** cachear como immutable solo los assets con hash de /assets/ ([f09af93](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f09af9392b74bcbaf4e872e5783ad143de7dcee5))

## [1.0.0-rc.49](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.48...v1.0.0-rc.49) (2026-10-10)

### Bug Fixes

* **rf27-mod9:** garantizar contraste AA del texto del sidebar sobre la marca (TC-M09-179) ([fe90591](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/fe905916e98fec8950d56d9ef34f7b735a96ee84)), closes [#249453](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/249453) [#97b68f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/97b68f) [#1A6B3C](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1A6B3C) [#249453](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/249453)

## [1.0.0-rc.48](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.47...v1.0.0-rc.48) (2026-10-10)

### Bug Fixes

* **m02-m09:** hallazgos de la tercera evaluacion de accesibilidad y consistencia visual ([2b7b44e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2b7b44ecfbfa3980c4108b1a0c5f7fac68aaf439))

## [1.0.0-rc.47](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.46...v1.0.0-rc.47) (2026-10-10)

### Features

* **rf23-mod9:** configurar fps de camaras en la configuracion remota (RF-23 v1.1) ([f01a549](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f01a54930b53d0c4e22ebd3e77fb48f6e37ab108))

## [1.0.0-rc.46](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.45...v1.0.0-rc.46) (2026-10-09)

### Bug Fixes

* **auth:** ocultar boton de AgroFusion en el login ([9c278e3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9c278e32931735108ade2de3155aeea193b1227b))

## [1.0.0-rc.45](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.44...v1.0.0-rc.45) (2026-10-09)

### Bug Fixes

* **rf59-mod3:** convertir a numero los decimales del historial para que la vista no se caiga ([#317](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/317)) ([be911e4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/be911e482194ba4449eaf095ce8ebacbc8a9d74b))

## [1.0.0-rc.44](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.43...v1.0.0-rc.44) (2026-10-09)

### Features

* **rf31-mod9:** buscar, paginar y mostrar las plantillas como filas legibles ([a17c198](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a17c198a7dcca1034002a4976be074fdf14584df))
* **rf33-mod2:** elegir especie e infraestructura con lista desplegable o escribiendo nombre o id ([238becd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/238becded3df1f07d94243255e40d4f20584afd1))
* **ui:** combobox con lista desplegable y escritura libre en el sistema de diseno ([eb2dea7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb2dea7a0edc1af80b2906d74458e9192c2ac07e))
* **ui:** sub-pestanas en configuracion para fincas, iot y personalizacion ([6763d47](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6763d47814ff0d99b03fb39b660e0e6d5455be8d))

### Bug Fixes

* **i18n:** mostrar el nombre del modulo en vez de su codigo ([cd1edab](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cd1edab0d34b80d3777b7f8feca2dc1a6b7d3413))
* **i18n:** traducir el error REFRESH_TOKEN_REQUERIDO ([2c4a61c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2c4a61c3234daebf6726e454a0a3f2a42fdb4a31))
* **rf27-mod9:** mapear el tema global para que el badge de origen no muestre la clave cruda ([9f29619](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9f29619955eef9daaed7191945b38534f1c2d4f3))
* **rf33-mod2:** leer los listados de especies, fincas e infraestructuras desde items ([e739ad5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e739ad5f10443dc263dff658c820edf3a057b857))
* **rf53-mod3:** describir las vistas de telemetria en lugar del codigo del requisito ([d97b48e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d97b48e454d33bfcc645cbafd0ab731456f1c1cd))
* **ui:** usar longhands del borde inferior en las pestanas ([03f1dd3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/03f1dd303f31c4c9d80c79b50cbc55ea0015a45e))

## [1.0.0-rc.43](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.42...v1.0.0-rc.43) (2026-10-08)

### Features

* **rf14-mod1:** boton para marcar todas las notificaciones como leidas ([02407c8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/02407c810ee050b45780aaab1ae3e8bfb89d6dc2))
* **ui:** buscador en las listas largas de fincas y dispositivos ([716acbd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/716acbd5faadb1f2c294d906eb7001a0fa059d10))
* **ui:** confirmar con un aviso las creaciones, ediciones y cambios de estado ([978376c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/978376c07e2e2dffc62da16a6e18cff32607eeb9)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)

### Bug Fixes

* **mod9:** quitar la barra de scroll nativa de las pestanas de configuracion ([f13c371](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f13c371b91a4ba519c3117c17d88af8794bacb8d))
* **rf03-mod1:** validar los permisos del rol al enviar y mostrar recursos legibles ([eb6cd12](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb6cd120959f4379ff4020eab8bccc415ea5f9ab))
* **rf06-mod1:** distinguir inactivar de bloquear una cuenta ([16b60c8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/16b60c8a2928e3f389f150d45abd8ec94bfcbd39))
* **rf10-mod1:** ocultar la simulacion de archivado fuera de desarrollo y mostrar eventos legibles ([ae41782](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ae41782f428dc28b6cf62e10fbb1176225c9e396))
* **rf16-mod9:** registrar tipo de dato, obligatoriedad y rango de las metricas productivas ([#258](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/258)) ([1200a9c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1200a9cf0cf3da0f0939b810ac94a5d08b3a87d4))
* **rf21-mod9:** refrescar los dispositivos en todas las secciones de IoT tras crear o cambiar uno ([79034e0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/79034e041048d1fee434143b9f887b12d55daa9d))
* **rf24-mod9:** encabezados, labels asociados y scope de tabla en calibracion de sensores ([#247](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/247)) ([9294af9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9294af9344253254275febfd8fd3045b48c99bcf))
* **rf25-mod9:** no ofrecer 'Ir a Configuracion' a roles que no pueden configurar la finca ([75168d0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/75168d04ba018e341607c387d4b14cbc1a5c720a))
* **rf33-mod2:** elegir especie, finca e infraestructura por nombre al registrar un activo ([4665b58](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4665b5856affff6402842910cba89d2efa50e89a)), closes [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290) [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf35-mod2:** buscar activos por numero, aclarar el alcance de la busqueda y unificar el acceso denegado ([51c11da](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/51c11da1be2f02f988d05094f3f5968af48abcc9)), closes [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **rf37-mod2:** elegir el ciclo productivo del activo al cambiar de fase ([#288](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/288)) ([85aa3b0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/85aa3b01ef53f7d2767e4bc2a62e18a8c60666e7))
* **rf38-mod2:** advertir sin ambiguedad que el cierre de ciclo no se puede deshacer ([5aeb0ba](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5aeb0ba33200b048b837226de91971366bb238c3)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf38-mod2:** cerrar ciclo despues de las 7 p. m. y mostrar las fechas en hora local ([#300](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/300)) ([388ae9d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/388ae9dd133ab58c52a12a43df704964b6384547)), closes [#130](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/130)
* **rf39-mod2:** avisar antes de registrar eventos que requieren fase activa ([f1d9393](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f1d939321a36c1ef18a9d34eb717990dfa2f885c)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf39-mod2:** enviar la fecha de eventos como instante local y no como medianoche UTC ([#289](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/289)) ([d261d93](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d261d9368b8c9bb5c660711cc105b5c6fda7f46b))
* **rf42-mod2:** mostrar en el evento reproductivo solo los campos de cada categoria ([b1ef96b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b1ef96b997817b21807a6d7686068be83031e58f)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **rf46-mod2:** describir cada registro del historial en lenguaje legible ([eb7b7cc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/eb7b7cc65dc443caa5dc8d62e29e5924b12815b5)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298)
* **rf47-mod2:** mostrar los eventos de la ficha integral como lineas legibles ([cc8f633](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cc8f633d9be7907759d790c926e0ddaa71043bb2)), closes [#298](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/298) [#290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/290)
* **ui:** nombrar la seccion bloqueada en el menu y mostrar el nombre completo del usuario ([b14d0c3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b14d0c3ce2ab97a425cbcb292e611afa4bf3c448))
* **ui:** traer a la vista los errores del servidor y mostrar codigos internos como texto legible ([48b8b96](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/48b8b9659583c0c64e5627d4101957579a77d0a3))

## [1.0.0-rc.42](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.41...v1.0.0-rc.42) (2026-10-08)

### Bug Fixes

* **rf24-mod9:** enviar modo_calibracion SENSOR al registrar una calibracion ([5d0a4c2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5d0a4c2539e8a8f69982b463322257ef518229af)), closes [#521](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/521) [#510](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/510)

## [1.0.0-rc.41](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.40...v1.0.0-rc.41) (2026-10-08)

### Bug Fixes

* **a11y:** [#271](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/271) el enlace saltar al contenido mueve el foco sin navegar a la raiz ([861e087](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/861e087bbbe6681a1e32c0cc6313e91c4e1726cd)), closes [#contenido-principal](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/contenido-principal)
* **m02:** hallazgos de la segunda evaluacion de accesibilidad y consistencia visual ([c494df4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c494df400c100d4db2599b6fa886e841b3eb904b))
* **rf15:** [#231](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/231) editar una especie nunca editada sin falso conflicto de concurrencia ([f46bafd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f46bafdfab35b7b9295785f81748600cc99f604a))

## [1.0.0-rc.40](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.39...v1.0.0-rc.40) (2026-10-07)

### Bug Fixes

* **a11y:** filas y tarjetas que abren un detalle accesibles por teclado, sin hover por JS ([b7d0607](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b7d0607f7ddbb14e0023e45788fc03af6d76f022))
* **design-system:** todos los modales como bottom sheet en movil con ancho del DS ([820beae](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/820beaee2b03439220a392f89c75e7c5f04e573e))
* **i18n:** espacio entre el texto traducido y el valor resaltado ([97f1669](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/97f16699144e0be577b90203f648abee89bba779))
* **i18n:** traducir los textos fijos que quedaban junto a las frases partidas ([ad8bdd0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ad8bdd082a98c23eb0759b62dff7b9fd38f3cc25))
* **m09:** asociar los errores de campo del backend a su input ([5123a22](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5123a22ec18ff269da2dc6a223e4edba8b2cd4fa))
* **m09:** formatear superficie como numero, nombre accesible del badge y scroll enfocable ([a9c37a8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a9c37a836397cec0c8b2c443df986cbd30d35f48))
* **m09:** limite de error por pagina para que un fallo no deje la app en blanco ([b10cacf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b10cacf03e0ab99df4918cd8b01dddd395d84522)), closes [#251](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/251)
* **m09:** modales como bottom sheet en movil y con ancho maximo del DS ([fe7d991](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/fe7d9916b7a6f51c9736ff874b346ae3b24dbd4b))
* **m09:** mover el foco al paso nuevo en la asociacion de sensores ([a12a495](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a12a49542bdd7f97f3cc72ea2cf9b1ab6eee1b01))
* **m09:** tablas de configuracion con scroll enfocable por teclado ([db39916](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/db39916dac11302958c481ee6f788f87b53cae0b))
* **rf17:** semaforizacion con icono y patron, no solo color, y campos de umbral con nombre completo ([26346c9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/26346c9e2db2335e5f4ad83f40a331ef7598895a))
* **rf23:** contraste del historial y etiquetas de frecuencia e intervalo en configuracion remota ([c512b16](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c512b16659ec57a15dc0ff956e28d4b478ddb1c7)), closes [#244](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/244) [#116](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/116) [#245](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/245)
* **rf24:** convertir en el borde los valores de calibracion que el backend envia como texto ([74ed527](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/74ed527a3da10ee09d18faa86a71268780871207)), closes [#251](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/251)
* **rf27-rf30:** estructura y teclado en tema, dashboard, idioma y plantillas ([2db50f8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2db50f8d08d8102ae8c2508f87ef06ca30928524)), closes [#7c3aed](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7c3aed)
* **sast:** quitar el createElement con tipo dinamico que Bearer marca como XSS ([5ae3731](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5ae37310b56c538d30c94f2fc0840fa43edd464e))

### Performance Improvements

* **build:** cargar cada modulo al entrar a su ruta y separar las librerias en chunks ([a7fba0f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a7fba0f700cf2f26e79220d27a4ff46472727870))
* **design-system:** animar la barra de fortaleza de contrasena con transform ([c17b16e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c17b16e6bf3ad0afd6cf7a66e3c747e1cf36c6d6))

## [1.0.0-rc.39](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.38...v1.0.0-rc.39) (2026-10-06)

### Features

* **prediction:** taxonomia por tipo de manejo y paradigma en el motor, modelos y OTA (RFC-009) ([44d04f8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/44d04f8bdc90341566bb95798fa486c68a8497f8))
* **rf20-rf21-mod9:** especie y modelo de IA del area, reactivacion y camaras (RFC-009, RFC-011) ([16a7e6d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/16a7e6d4f1aa7962261f52256d9cdf374288589f))

### Bug Fixes

* **rf16-mod9:** pedir el tipo de dato al registrar una metrica (Arekkazu/sgpmp-backend[#487](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/487)) ([77b693a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/77b693ae7c4a058e317425f195ecf353c4f9727c))

## [1.0.0-rc.38](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.37...v1.0.0-rc.38) (2026-10-04)

### Features

* **configuration:** reintentar o cancelar una configuracion remota PENDIENTE o NO_CONF (RF-23) ([4666b38](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4666b3880d19eea660ccac29afa28d76f21dc7d1))

## [1.0.0-rc.37](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.36...v1.0.0-rc.37) (2026-10-04)

### Features

* **configuration:** gateway edge de los dispositivos IoT y su credencial MQTT (RF-21, RF-23, TC-M09-250/251) ([4d710ab](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4d710abe0d8ade78c469fd277a06146bd93cbe45))
* **configuration:** gestionar la credencial MQTT de cada Raspberry (RF-23, TC-M09-250/251) ([438e487](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/438e487710aa7872934ddb226d5fca1c8f38b89f))

## [1.0.0-rc.36](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.35...v1.0.0-rc.36) (2026-10-03)

### Bug Fixes

* **a11y:** gestionar foco y Escape en todos los modales ([#199](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/199)) ([656dac6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/656dac6b1c41021ad0c92b80137d5f2b4b45c9c8))
* **rf17-rf30-mod9:** corregir los hallazgos de accesibilidad de la primera evaluación de M09 ([a12843f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a12843f6ae3af19513c8edd5e8300449dfbb0035)), closes [#189](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/189)
* **rf21-mod9:** enviar el tipo de dispositivo al registrar un dispositivo IoT ([#179](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/179)) ([654db8e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/654db8e190cdece473eaf1544a76ec8bdc74af51))
* **rf33-rf35:** pedir los atributos dinámicos de la especie y alinear el sexo con la BD ([1ba5f49](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1ba5f49848181c739b280fc3605f22888fe73e1e)), closes [#194](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/194) [#192](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/192)
* **rf34-rf52:** corregir los hallazgos de accesibilidad de la primera evaluación de M02 ([2df3430](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2df34305027ddebfe0020d590a2f793a3930bb90))

## [1.0.0-rc.35](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.34...v1.0.0-rc.35) (2026-10-03)

### Features

* **rf22:** avisar qué asociaciones sensor-activo cerró la reasignación de un sensor ([89ee1f3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/89ee1f336433669f19a8017b0d96e9ece9831148)), closes [Arekkazu/sgpmp-backend#290](https://github.com/Arekkazu/sgpmp-backend/issues/290) [Arekkazu/sgpmp-backend#304](https://github.com/Arekkazu/sgpmp-backend/issues/304) [#304](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/304)

## [1.0.0-rc.34](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.33...v1.0.0-rc.34) (2026-10-02)

### Bug Fixes

* **rf10:** conservar el ancla fecha_hasta al paginar la auditoria (INC-M01-57-G71) ([c0df51e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c0df51ee8a4e727c6980b1bb81412136c286f693)), closes [Arekkazu/sgpmp-backend#457](https://github.com/Arekkazu/sgpmp-backend/issues/457)
* **rf15:** mostrar el texto del rf-15 ante un 409 de sincronización y volver a la página 1 al crear (INC-M09-54-G07) ([b1a6f46](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b1a6f46c9e717d5d31d92eeff0cfc995ead5cde8)), closes [Arekkazu/sgpmp-backend#450](https://github.com/Arekkazu/sgpmp-backend/issues/450)
* **rf15:** notificar conflictos tras el replay y mostrar la especie pendiente al inicio (INC-M09-54-G07) ([40ca927](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/40ca927c588f7d9056c7b8cba79cf450fb4503e9)), closes [Arekkazu/sgpmp-backend#450](https://github.com/Arekkazu/sgpmp-backend/issues/450)

## [1.0.0-rc.33](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.32...v1.0.0-rc.33) (2026-09-24)

### Bug Fixes

* **ci:** corregir redireccion de reporte de texto en workflow de Bearer ([336dcc3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/336dcc33b043858e5736bad1b364b4679c67a559))

## [1.0.0-rc.32](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.31...v1.0.0-rc.32) (2026-09-24)

### Bug Fixes

* **nginx:** [#113](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/113) emitir encabezados de seguridad en el frontend ([ce0a3a4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ce0a3a4997273ee808f88f0f1ad41e60c3dd86b4))
* **rf25:** contexto de interfaz 204 sin cuerpo como finca sin catalogo ([d86f820](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d86f820cc9fa2f1196b4154c8116296593a1772a)), closes [Arekkazu/sgpmp-backend#410](https://github.com/Arekkazu/sgpmp-backend/issues/410)
* **rf31:** [#125](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/125) leer items de los listados por especie de configuracion ([9c2ceb1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9c2ceb19b4d5b98e01721e5fda91389844f08d96))
* **rf35:** reenviar fecha_actualizacion en el patch de activo individual (INC-M02-G22) ([f808ebb](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f808ebb68d27408183e364db44ed67bb85d20aca))
* **rf45:** [#130](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/130) enviar el dia utc cuando la baja es de hoy ([8726fa2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8726fa2b62b7f4018cc2093ebff2f6ffff394146))
* **usuarios:** [#97](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/97) permitir asignar fincas que ya tienen dueno ([948b226](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/948b226da5fe38e6821c43a7353523fbac771e55)), closes [Arekkazu/sgpmp-backend#445](https://github.com/Arekkazu/sgpmp-backend/issues/445)

## [1.0.0-rc.31](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.30...v1.0.0-rc.31) (2026-09-24)

### Bug Fixes

* **perfil:** editar perfil y cambiar contrasena como modal ([98f1484](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/98f14842bc85ad1b19012ed97cf8e33d1da93767))
* **sesiones:** [#126](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/126) no cerrar la sesion cuando el refresh falla por el servidor (RF-02) ([4b64502](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4b6450234ec6dbe7f7d404cf5d1c1429abfdc795))

## [1.0.0-rc.30](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.29...v1.0.0-rc.30) (2026-09-20)

### Features

* **design-system:** alinear tokens y componentes con el Design System v2.0 ([d5d07a7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d5d07a708b42e2b9c02a69a6f07812babc027467)), closes [#2e8634](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/2e8634) [#226a28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/226a28) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00) [#986000](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/986000) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)
* **design-system:** alinear tokens y componentes con el Design System v2.0 ([1f2cd4c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1f2cd4ca846916da8f26cf9a63ca03a0871a9a7a)), closes [#2e8634](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/2e8634) [#226a28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/226a28) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00) [#986000](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/986000) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)

### Bug Fixes

* **auth:** #TC-DIS-05 restituir el acceso SSO a AgroFusion en el login ([01b63e8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/01b63e81432106eea5470de8f9516f10070d1d21)), closes [#TC-DIS-05](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/TC-DIS-05) [#132](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/132) [#136](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/136)
* **design-system:** colapsar las rejillas de contenido en movil ([cbf2e28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbf2e2874fa073029e0905652b4eb8faf001f33b))

## [1.0.0-rc.29](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.28...v1.0.0-rc.29) (2026-09-20)

### Bug Fixes

* **auditoria:** [#135](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/135) anunciar el estado sin resultados con role=status ([28ea93d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/28ea93d89027404af05ebba99e99727a7523c0d6))
* **design-system:** [#134](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/134) subir contraste del badge de advertencia y el enlace de perfil ([562c848](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/562c848c09a5323872ba845c9974d383f7e4309d)), closes [#c07a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/c07a00) [#fff8e6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/fff8e6) [#7a4a00](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7a4a00)
* **perfil:** [#133](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/133) no cerrar sesion cuando la contrasena actual es incorrecta ([c4bda1a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c4bda1a0a7d8edda5f219354c5c0f2b40a49710f))
* **perfil:** [#136](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/136) mostrar el encabezado "Mi Perfil" tambien sin datos cargados ([e0f8290](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e0f8290f75fdb1405b07ebbb561455166b425264))
* **sidebar:** [#132](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/132) marcar items como enlaces y evitar drawer inalcanzable en movil ([2787738](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2787738f706563a5600c335b8da964a66c7e6ba9))
* **usuarios:** [#135](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/135) anunciar el resultado de "gestionar cuenta" con un alert accesible ([b8860ee](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b8860ee0be8b95fde2fc46f2948fe527ccb526fe))

## [1.0.0-rc.28](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.27...v1.0.0-rc.28) (2026-09-20)

### Bug Fixes

* **auditoria:** [#288](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/288) deshabilitar exportar cuando no hay conexion ([c08a21d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c08a21ddc26b7ea12b94f51663e711a6deb5515a))

## [1.0.0-rc.27](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.26...v1.0.0-rc.27) (2026-09-18)

### Bug Fixes

* **rf49:** corregir mensaje de error 403 al asociar sensor ([2e0b462](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2e0b462fc58700f268bcaa780762a856bdf0b967)), closes [#349](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/349)

## [1.0.0-rc.26](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.25...v1.0.0-rc.26) (2026-09-18)

### Bug Fixes

* **rf49:** [#351](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/351) quitar AMBIENTAL del modal de asociar sensor a un activo ([cbcb318](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/cbcb318c58071572b3019b8d9161e675c6287bf3))

## [1.0.0-rc.25](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.24...v1.0.0-rc.25) (2026-09-14)

### Features

* **rf15:** [#115](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/115) permitir creacion offline en el catalogo de especies con sincronizacion diferida ([47306a3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/47306a345d7fdd3d90cc4a73af12a030c6160f71))

### Bug Fixes

* **rf17:** [#116](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/116) corregir contraste invisible en Rango general de Umbrales Ambientales ([bb2c5a0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/bb2c5a0b0ac6cd3c680bc4a601b3e10382bbbbc7))

## [1.0.0-rc.24](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.23...v1.0.0-rc.24) (2026-09-14)

### Bug Fixes

* **biological_assets:** [#98](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/98) renderizar paginacion en el listado de activos ([f11b73e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f11b73e9c7dd651132b9864be1a9fa7e6ac529f3))

## [1.0.0-rc.23](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.22...v1.0.0-rc.23) (2026-09-13)

### Bug Fixes

* **deps:** [#108](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/108) resolver vulnerabilidades de npm audit en dependencias ([b5be4e5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b5be4e5888083dc38fed4e693095539b8a243af6))

## [1.0.0-rc.22](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.21...v1.0.0-rc.22) (2026-09-13)

### Bug Fixes

* **a11y:** habilitar zoom en toda la app quitando restricciones del viewport ([56c46ca](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/56c46ca495b87d9bf554e87fbc29e7466085b109))
* **design-system:** contraste AA en boton primario y accion de peligro en dark ([95edc36](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/95edc360ec8f7c96fbae165d5c04f58793d5ef0b))
* **perfil:** agregar encabezado en los estados de carga y error de Mi Perfil ([497436b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/497436bab857535756d439374b4ea5637946006d))

## [1.0.0-rc.21](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.20...v1.0.0-rc.21) (2026-09-11)

### Bug Fixes

* **auth:** avisar en login cuando el interceptor cierra la sesion sin mensaje ([c532a11](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c532a11ab98498c11084a386c3bb429230b005f6)), closes [#2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/2)
* **configuration:** cumplir touch target de 48px en pestanas de configuracion ([c07d30b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/c07d30b0dde527c0dd8ecc548c50af251b85b298)), closes [#3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/3)

## [1.0.0-rc.20](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.19...v1.0.0-rc.20) (2026-09-08)

### Features

* **rf25:** cargar roles dinámicos en el modal de usuario en vez de quemados ([16d4fec](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/16d4fec05a90aaef10192352cf6b2fe65df25298))
* **rf25:** selección de fincas asignadas en el detalle de usuario (RF-25) ([3295a89](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3295a896a72a6d7519483e6defa63eab92b22f76))

### Bug Fixes

* **auth:** ocultar el login SSO de AgroFusion ([b0bbc81](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b0bbc819782e390a3608c3e831bfc7535bceec47))

## [1.0.0-rc.19](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.18...v1.0.0-rc.19) (2026-09-08)

### Bug Fixes

* **rf16:** consumir catalogos de especie en activos ([951b76b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/951b76bcd0789763a1b39d0b877ecac552cd0733))

## [1.0.0-rc.18](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.17...v1.0.0-rc.18) (2026-09-08)

### Features

* **rf10:** exportacion CSV de auditoria offline desde cache ([4745ebe](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4745ebe25991edf098112b0940940dd9ae60e38e))

### Bug Fixes

* **rf01:** limpiar token captcha al perder conexion ([610798d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/610798deda1a3e38e14a20c626f3a0481887baf0))
* **rf13:** alinear campo ultima_modificacion en listado de usuarios ([b0972a6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b0972a64b4b3e479058cbb7447fa9edea02d6e76))

## [1.0.0-rc.17](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.16...v1.0.0-rc.17) (2026-09-08)

### Bug Fixes

* **rf26:** conservar identidad visual al navegar ([9c75ba3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9c75ba343e739b7ddc1b99bf2e6e7bf3f1768a35))

## [1.0.0-rc.16](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.15...v1.0.0-rc.16) (2026-09-07)

### Features

* **rf17:** inputs de niveles de alerta usables y responsivos en umbrales ([3246ad7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3246ad7302bf8da0bf07611180cc09fa4d7c7703))

### Bug Fixes

* **rf26:** aplicar la identidad visual por completo, no solo los acentos ([1a86f82](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1a86f82eb02fed829027439076ed525090315657))

## [1.0.0-rc.15](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.14...v1.0.0-rc.15) (2026-09-07)

### Bug Fixes

* **auditoria:** filtro con Select y Enter, tabla scope y modal de integridad accesible ([b6ba750](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b6ba7504ed20d8a346002b3cb7389b3da224e87b))
* **auth:** medidor de fortaleza compartido, selects etiquetados e i18n ([9cced7d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9cced7d880ff00f9baa5843c1b282e020830ec98))
* **design-system:** contraste AA en tokens, foco visible y Select/PasswordStrength ([b3c62fb](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b3c62fb45d1ff5b59104276862c522e746bb0bbe))
* **perfil:** tipografia por tokens, botones del sistema y enmascarado unificado ([1e6ef09](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1e6ef098c3c36436cfb6249525e3b058e7673f22))
* **roles:** tabla y matriz con scope, modales accesibles e i18n ([f9a3913](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f9a3913fbc98a7310eefb5892af58e08fbf9b888))
* **sesiones:** intentar refresh silencioso ante cualquier 401 antes de redirigir ([1110c0d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1110c0d56df60f86ece9ef50dca9ba3f0628c376))
* **shell:** drawer movil por encima de la AppBar, Escape y velo por token ([d7a1124](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d7a112454d67f1b105d6e73193c50916bc6c921a))
* **usuarios:** tablas accesibles, modales con Esc/foco y enmascarado corregido ([67f3515](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/67f3515f6712762bfef71ae6a12c73477416889a))

## [1.0.0-rc.14](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.13...v1.0.0-rc.14) (2026-09-06)

### Bug Fixes

* **biological_assets:** ocultar "Cambiar fase" en estados terminales ([6475d1e](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6475d1e7a02a49b1a30919e5e34c0b0659aab5ef))
* **rf26:** aplicar la identidad guardada a la sesion del Administrador ([66ac846](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/66ac8467032d801f686cba0f55f2179f967a2ec6))
* **rf26:** no forzar Content-Type json por defecto en axios ([31a2492](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/31a2492dc0df3a15a16cb4128b45651d3ba83230))

## [1.0.0-rc.13](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.12...v1.0.0-rc.13) (2026-09-06)

### Features

* **rf15:** [#53](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/53) agregar busqueda por nombre y paginacion al catalogo de especies ([a21016d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/a21016d6f75468bf9b4b32f70d49911564234645))
* **rf16:** [#54](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/54) permitir escritura offline en Ciclos Biologicos con sincronizacion diferida ([88ca728](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/88ca728c2b5d0b64aee177c6bbb58e076c824f8b))

### Bug Fixes

* **rf17:** [#55](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/55) evitar que los niveles de alerta se superpongan en el modal de umbrales ([f4b2d6c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f4b2d6c907f7e1276b6c9e336b16f15cf3406a52))
* **rf31:** [#52](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/52) no bloquear la lectura de configuracion cuando falla una sola categoria ([699c75a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/699c75a171d50f09ad31bb1e55561db411badc71))

## [1.0.0-rc.12](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.11...v1.0.0-rc.12) (2026-09-06)

### Bug Fixes

* **biological_assets:** resolver conflicto de merge en EventoReproductivoForm ([72e3387](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/72e3387b141faf8026e7c6437af488750b36e517))
* **biological_assets:** restringir categoria de evento reproductivo a nacimiento en LOTE ([5be0048](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5be0048868dcee889e64ae8825c7fc8b5f388a5d))

## [1.0.0-rc.11](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.10...v1.0.0-rc.11) (2026-09-06)

### Bug Fixes

* **biological_assets:** propagar error de useFichaIntegral a la vista ([642bccf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/642bccf7cca2e5025386aa783b0cbfe5cd2423bb))
* **rf10:** corregir desborde del contenido cuando el sidebar es fixed ([ff78265](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ff782656c0b2a0fe237484d54970828d35840a40)), closes [#107](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/107) [#107](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/107)

## [1.0.0-rc.10](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.9...v1.0.0-rc.10) (2026-09-04)

### Bug Fixes

* **biological-assets:** excluir BAJA del cambio manual de estado (RF-44) ([7f8fdc9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7f8fdc9c95908e541503be01d7d1ddc46ffe034b))

## [1.0.0-rc.9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.8...v1.0.0-rc.9) (2026-09-04)

### Features

* **configuration:** [#1668](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1668) gestionar tipos de área desde catálogo y usarlo en el formulario de infraestructura (RF-20) ([579d7da](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/579d7da156da366b957673967e12075f01a0bbd4))
* **configuration:** [#1669](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1669) registrar sensores desde la tabla de dispositivos IoT (RF-21) ([4185d1b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4185d1b4de7d68317f6ffa2c689b536a7ed2abaa))

### Bug Fixes

* **api:** eliminar barra final en endpoints base para evitar el 307 detras de proxy con prefijo ([56c4303](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/56c430306688791cb7c47e7dc91cf3e64008385a))
* **configuration:** [#1671](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1671) avisar y confirmar la reasignacion en el wizard de sensores (RF-22) ([6209e9c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6209e9cfbd7b37649990a76cb6decbc09dcd9203))
* **configuration:** [#1672](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1672) validar formato/tamaño de logo y permitir descartar la vista previa (RF-26) ([1753e95](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1753e9592dffe547e9bf72b73b9a21dfb512361a))
* **configuration:** eliminar barra final en tipoAreaApi para evitar el mismo 307 del incidente TEST ([19b0eec](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/19b0eecab01fd9984096bf5c216087daa4301379))

## [1.0.0-rc.8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.7...v1.0.0-rc.8) (2026-09-04)

### Features

* **configuration:** [#1666](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1666) restringir unidad_medida segun tipo_medicion en metricas (RF-16) ([ad121f6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ad121f6ec6f9ef9d84a2eba0d9b314807d3314c6))

## [1.0.0-rc.7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.6...v1.0.0-rc.7) (2026-09-04)

### Features

* **app:** [#1664](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1664) completar flujos alternos de contexto operativo (RF-25) ([ac509bd](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ac509bdf3c9c930d76e8aadae26c37e3eb47297f))

### Bug Fixes

* **configuration:** [#1667](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1667) validar niveles de alerta y catalogo real de variables (RF-17) ([030fc11](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/030fc11c2ac876c4826e560738c892de437395f2))

## [1.0.0-rc.6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.5...v1.0.0-rc.6) (2026-09-04)

### Bug Fixes

* **configuration:** [#1648](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1648) usar accion crear en vez de ejecutar para habilitar calibracion (RF-24) ([60b90cf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/60b90cfa880dc0db6879a670526e644706971521))

## [1.0.0-rc.5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.4...v1.0.0-rc.5) (2026-09-04)

### Bug Fixes

* **app:** limitar el bloqueo de "sin finca" al dashboard ([9bb4847](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9bb48479dd850db1541e5e09827e7a866e12da93))

## [1.0.0-rc.4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.3...v1.0.0-rc.4) (2026-09-04)

### Features

* **configuration:** adaptar la interfaz al rol, la finca activa y las especies (RF-25) ([9f10e76](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9f10e76363b7115a31f7a8bda44b0a0224d67427))
* **configuration:** aplicar la identidad visual institucional a la interfaz (RF-26, RF-25) ([d4236f6](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d4236f608aec2b2299f17f31e8642f3a99065380))
* **configuration:** vista previa real con descarte sobre la interfaz (RF-26) ([21c2705](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/21c27057199d4a5a0200a05150c249a7b64da3b5))

### Bug Fixes

* **configuration:** alinear theme_mode del selector con el contrato del backend (RF-27) ([5e5cda5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5e5cda5108169803abbb0e906b2bc5a3cb8ef092))

## [1.0.0-rc.3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2026-09-03)

### Features

* **configuration:** agregar el flujo de nueva version de plantilla (RF-30, RF-31) ([76b1bb8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/76b1bb85bcba550038b73b5e6b260eeb33a2b7f8))
* **configuration:** capturar la configuracion real de la especie al crear plantillas (RF-31) ([0b87497](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/0b874977beb70540f0ebb173c63fd575432edbd0))
* **i18n:** traducir los codigos de error nuevos de plantillas ([9d883b0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9d883b03dfebaa365be22b90d446c4553bb6c6fd))

## [1.0.0-rc.2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2026-09-03)

### Features

* **i18n:** formatear fechas y numeros segun el idioma activo ([96f785b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/96f785bd4322c2f55fa571205d9cac8084d12498))
* **i18n:** montar el motor de traduccion con fallback a espanol (RF-29) ([40e0c13](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/40e0c13f9d9190b6fc943b1f608fdc13b74e3314))
* **i18n:** traducir la interfaz completa a es-CO y en-US (RF-29) ([9934361](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/99343614c36e3f736b0f3752a7865602e549d21b))
* **i18n:** traducir los mensajes de validacion y de estado de los formularios ([d658ed0](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d658ed0fba05012e7d123b3d49da19da989529b4))
* **rf29:** aplicar el idioma resuelto de forma inmediata sin recargar ([9ff2a07](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/9ff2a07715b5916fbd383f007f265dfe1d8b212a))

### Bug Fixes

* **i18n:** evitar desbordamiento de texto en etiquetas largas ([668bc91](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/668bc91ce0b29284cbbaf4e8926fa0087f5d9011))
* **rf29:** enviar es-CO y en-US en vez de es y en al backend ([b00dc1a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b00dc1aec997743d8d9f6e13aaebcd09312244c4))

## 1.0.0-rc.1 (2026-09-03)

### Features

* **auditoria:** [#1652](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1652) consumir el export del backend y cerrar la deuda de fechas ([ea379d8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ea379d80417d67b5b86486ff10e48833371f5f32))
* **auth:** [#1643](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1643) implementar timeout de inactividad de 30 minutos ([f768042](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f768042f915b4121d739609fd94f2ffad8d22b08))
* **auth:** reemplazar CAPTCHA simulado por reCAPTCHA v2 ([#1650](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1650)) ([ce5332d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ce5332db8b2a84b9e5de959d3bcb9dc35b89c2a6))
* IU telemetria ([3d7626d](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3d7626d80c7d8c53a80c0914fae80545cc9ec272))
* **login:** ofrecer el reenvío de activación cuando la cuenta está pendiente ([e4ca2c2](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e4ca2c2fb556650650939fa112ba483943cef973))
* Modulo Prediccion ([ac0b13a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ac0b13a6fda4fb0826fc007ffa9c9045aa8867cb))
* Modulo roles e identidad trabajado, faltan detalles por pulir ([8d8f81b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8d8f81b92c470965fe9aa242476492421ea78f72))
* **notificaciones:** implementar bandeja interna y push FCM ([#1653](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1653)) ([93b7d96](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/93b7d960e5175e46da23ca22f87bb678e010df83))
* **rf23:** valida intervalo_transmision >= frecuencia_captura en cliente ([2837bb4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2837bb4664f3d6087ae4b32f103cdb817b4fe8d5))
* **rf28:** aplicar el layout guardado en el dashboard y hacerlo responsivo ([da2a14f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/da2a14feaa47c0bae229b7ddeb53b241e63c252d))
* **rf28:** leer el catalogo de widgets del backend en vez de tenerlo quemado ([134cfe3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/134cfe328f0dd291c036ec3b86f9de5e49ecf35d))

### Bug Fixes

* **api:** [#1644](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1644) mapear errores 410 y 429 ([673ccf4](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/673ccf43ded5456f8df9728a9191636c2068f94d))
* **auditoria:** [#1652](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1652) alinear el CSV exportado con el contrato real del backend ([1706b5f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1706b5fb021f7f40c0f6fcefdf23127def70545c))
* **auditoria:** [#1652](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1652) enviar los filtros de fecha como instante UTC ([7019c79](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/7019c792d7b1531f6eff25822084114b66a32f75))
* **auditoria:** [#1652](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1652) exportar resultado completo a CSV ([0d65f2b](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/0d65f2b2536e2499281b29ddea8d3e9d1d3ba82a))
* **auth:** [#1643](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1643) alinear el timeout de inactividad con el plazo del backend ([8eaabac](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8eaabac8bbcf8eaf6cffea344fe9ad44e854dd8e))
* **auth:** [#1827](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1827) no restaurar sesion en rutas publicas ([2df162a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/2df162aa5ed80a0ca79bed9c6c0862236fb36632))
* **auth:** [#53](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/53) mantener el JWT únicamente en memoria R-12 ([fc2b3ab](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/fc2b3ab975f24015dd6024219b84c6e5ef0a62a7))
* **auth:** [#54](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/54) invalidar la sesión remota al cerrar sesión (RF-02) ([3af98d1](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3af98d122d57dbb384bdab4e244dc972c8247f89)), closes [#8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/8) [#10](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/10)
* **auth:** [#54](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/54) invalidar la sesión remota al cerrar sesión (RF-02) ([67b623a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/67b623a82128b0823b2b59b37933afc57cf7a457))
* **auth:** persistir sesion tras recarga con refresh token httponly ([#9](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/9)) ([49238ce](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/49238ce334f7f83fc7812cb994c7b64cf5f370f6)), closes [#7](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/7)
* **ci:** renombrar append_trazabilidad.js a .cjs (package.json tiene type:module) ([ca13b3a](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/ca13b3a002d3e2bc34db322fbcb7a6595946ecc6))
* **ci:** usar GH_TOKEN desde el inicio, dev tiene branch protection ([83091fc](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/83091fc51194bc6a24a4af02c19f7541304909ec))
* desenvolver {total, items} en listarConfiguraciones/Calibraciones/Asociaciones ([6c48ee5](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/6c48ee5e888b2c1f660dc1b27be336082cff698e))
* **errores:** mapear 423 como bloqueo temporal por consistencia del switch ([0e31746](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/0e3174675f706bcfedbde20d080e04f847cf468b))
* **errores:** no repetir la etiqueta del campo cuando duplica el mensaje ([1b96c39](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/1b96c397eb1b404e9485269e703c3c933aedb839))
* no cachear index.html — evita servir bundles JS mezclados tras un rebuild ([8a32712](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/8a32712e88f5a6c1d13400d8d41c9014d43fe72e))
* **notificaciones:** [#1653](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/1653) completar el catálogo de tipos y no perder páginas al refrescar ([b3a3f23](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/b3a3f23acc72bd47690b427125a6f2b881c96c6d))
* **rbac:** [#8](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/8) RF-05/06: unificar autorizacion de perfil y gestion de cuenta ([f826d31](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/f826d3164fc79b7b9dd3a305f3667b28156f5272))
* **registro:** enviar confirmar_contrasena y nombrar los campos en los errores ([4121bb3](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/4121bb3b5a213bcf7c4b6fc7f889038f5a7aa001)), closes [#24](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/issues/24)
* **rf05-rf06:** corregir crash de perfil propio y 400 en gestionar cuenta ([5dc37cf](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/5dc37cf4528351b1a840303a7492401831e5675a))
* **roles:** mostrar el error al fallar la eliminacion de un rol ([e80938c](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/e80938c625c665ddfedfab87c7942b4a18a2bc21))
* Se corrigieron errores de peticiones hacia el backend ([3feb50f](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/3feb50f9da84b93ff61063ec8c31ea18b44e4d17))
* sube el timeout de configurar() a 40s ([d6fa1da](https://github.com/Arekkazu/SGPMP-FRONT-END-PWA/commit/d6fa1dadc1f538166fb7cfa79ef8a95e7f862311))
