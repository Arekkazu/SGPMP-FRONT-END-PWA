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
