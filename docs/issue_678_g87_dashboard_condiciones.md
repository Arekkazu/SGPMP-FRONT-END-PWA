# #678 · G87 · RF-58 — Estado posterior y referencia válida

La API separa la última lectura válida de la condición actual. SensorCard y SensorDetalleModal reutilizan EstadoSensorPills de FE-10 y añaden la leyenda Última lectura válida cuando hay una anomalía posterior y el valor mostrado sigue siendo operativo.

El tipo EstadoSensorSchema admite estado_calidad nulo, estado_calidad_valor_operativo y timestamp_estado_actual. El permiso datos_tecnicos_dashboard del backend reserva el diagnóstico ERROR_CALIBRACION y batería/RSSI/SNR. La vista del Productor utiliza En revisión técnica, sin inferir un diagnóstico a partir del valor conservado.

Regresiones: 25 seguido de FUERA_DE_RANGO; calibración para Ingeniero; aviso genérico para Productor; sin referencia válida; recuperación con 26. Se verifica tarjeta y detalle, además de paridad es-CO/en-US. Los colores, iconos, semáforo y modal mantienen sus componentes y tokens canónicos.

Las respuestas de la comprobación visual provienen de GET autenticados con PostgreSQL 18 local aislado. Reproducirlas en componentes reales acredita presentación, no un E2E desplegado ni la corrida oficial de QA.

- Componentes reales (EstadoLecturaPill.test.tsx): 15 aprobadas, 0 fallidas, 0 omitidas en la corrida individual final; incluye los 5 escenarios nuevos de G87. Se utiliza el paquete Vitest instalado, un lanzador mínimo temporal con jsdom/setupTests y pool forks. No se modifica la configuración de producción ni se desactivan aserciones.
- Catálogos telemetry: paridad de 781 claves en es-CO y en-US, incluida Última lectura válida / Last valid reading. La corrida conjunta del archivo global i18n no terminó por timeout de arranque del worker de Windows; no se cuenta como aprobada. La paridad del catálogo afectado se verificó por comparación independiente de las claves JSON.
- Presentación en Edge headless: 4 combinaciones aprobadas (390/1280 px × claro/oscuro), con las respuestas HTTP reales capturadas del entorno PostgreSQL aislado. Verifica 25 más anomalía roja, diagnóstico del Ingeniero, privacidad del Productor, recuperación con 26, detalle, teclado/Escape y ausencia de desbordamiento horizontal. Sin errores JavaScript. Se inspeccionaron visualmente las capturas. Es una reproducción de respuestas en componentes reales, no un E2E desplegado ni una conexión continua navegador→API.
- TypeScript de los tipos y componentes de producción modificados: aprobado (exit 0) con tsconfig temporal que conserva las opciones del proyecto. El TypeScript global no pasa por errores en App.tsx (IonApp/IonReactRouter) y LineChartTelemetria.tsx (ReferenceArea/fill), archivos sin cambios frente a origin/dev. No se declara el build global aprobado.
- El script lint del repositorio usa ESLint 9 y no dispone de eslint.config.*; no se declara lint global aprobado. La auditoría premium strict detectó 135 hallazgos en otros archivos, ninguno en los componentes, tipos o CSS del alcance. No se amplía #678 para corregirlos.
- Se agregó DESIGN.md al worktree tomando el contexto y tokens existentes. El linter externo designmd no estaba en la caché npm offline; esa comprobación documental queda pendiente.

Evidencias: backend .pytest_cache/g87_ui_resultado.json, g87-ui-*.png, g87_i18n_paridad.json; frontend do-it/g87/vitest-componentes.log y tsconfig temporal. Las pruebas iniciales con lanzadores bloqueados no se suman a las aprobadas finales. Los artefactos do-it/g87 son temporales e ignorados por Git; no forman parte de la entrega.

La API online y el hook useMonitoreo mantienen todos los campos de la respuesta antes de renderizar. No se cambia la caché offline Dexie; la reproducción visual no valida su fallback. Tampoco se prueban cambios de rol sin reconectar. Estas comprobaciones no se sustituyen por las pruebas de componentes.


Base de esta rama: origin/dev 28c2171. Se usa .worktrees/g87-rf58 para preservar UX-CONTRACT.md y los cambios FE-12 del checkout principal. No modificar esos archivos para integrar esta corrección.
