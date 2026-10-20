# FE-04 — RF-18: parámetros AIoT de M09

Historia #3533; subtareas #3636, #3637 y #3638; dependencia DEV-14 #3520.

## 1. Diagnóstico inicial y viabilidad

Se actualizó el checkout frontend desde `e8a59ba` hasta `origin/dev` en `7e87bfb` mediante fast-forward, sin crear un commit de merge. La implementación se preparó en `fix/fe04-parametros-aiot-m09`. El usuario autorizó posteriormente el commit y push de esta entrega parcial; no se abre un PR automáticamente.

**La historia completa permanece parcialmente bloqueada por el contrato HTTP de Backend.** DEV-14 está disponible en el [PR Backend #609](https://github.com/Arekkazu/sgpmp-backend/pull/609), commit `648d45f2`, abierto y no fusionado en la consulta realizada. Se inspeccionaron DTOs, schema, router, casos de uso, adaptadores y la herramienta administrativa; no se presupuso que todos los parámetros de la ficha estuvieran expuestos.

### Frontend encontrado

- Pantalla: `src/configuration/components/ParametrosSection.tsx`, pestaña Sistema de `src/configuration/pages/ConfigurationPage.tsx`.
- Flujo: componente → `useParametrosGlobales` → `parametrosApi` → Axios compartido.
- Tipos: `src/configuration/types.ts`; formulario react-hook-form.
- i18n: i18next mediante `shared/i18n/useT.ts`, namespace `configuration`, JSON `es-CO` y `en-US`.
- Diseño: componentes compartidos `Input`, `Button`, `Alert`, `ModalShell`; tokens y DS v2.0 existentes.
- Pruebas: Vitest/Testing Library y Cypress declarados. La sección de parámetros no tenía pruebas específicas.

Había textos literales pendientes de traducción, validación entera incompleta para heartbeat, guardado sin protección sincrónica contra doble activación y recarga que podía descartar un borrador. El formulario podía aparecer tras fallar la consulta, confundiendo error con ausencia de configuración.

### Matriz contrastada con Backend

| Parámetro | Campo HTTP / fuente real | Tipo | Unidad | Validación confirmada | Estado para FE-04 |
|---|---|---|---|---|---|
| Frecuencia de muestreo | `frecuencia_muestreo` | Entero | Minutos | Positivo | Existente, conservado |
| Tiempo máximo sin datos | `umbral_sin_senal`, alias `heartbeat` | Entero | Minutos | Positivo; >= frecuencia de muestreo | Nombre canónico disponible en DEV-14; compatibilidad implementada |
| Batería baja/crítica | Sin campos HTTP incorporados en DEV-14 inspeccionado | No publicado | No se crea control | No publicada como contrato HTTP nuevo | Bloqueado |
| Señal RSSI | Sin campo HTTP incorporado | No publicado | No se crea control | No publicada | Bloqueado |
| Latencia alta | Sin campo HTTP incorporado | No publicado | No se crea control | Semántica/esquema operativos pendientes | Bloqueado |
| Deduplicación | Sin campo HTTP incorporado | No publicado | No se crea control | No publicada | Bloqueado |
| Confianza Edge/IA | M04 `parametros_mlops`, `umbral_confianza_edge_ia`; administración por CLI | Número | Probabilidad | 0.70–0.95 en consumidor Backend | Persistencia disponible; no API web de consulta/edición |
| Calidad k | M04, `rf62_k`; CLI | Número finito | Desviaciones estándar | >0 | Sin API web |
| Calidad M | M04, `rf62_m`; CLI | Entero | Lecturas | 1 <= M <= N | Sin API web |
| Calidad N | M04, `rf62_n`; CLI | Entero | Lecturas | N >=2 | Sin API web |
| Drift | M04, `rf62_umbral_drift`; CLI | Número finito | Porcentaje | >=0 | Sin API web |
| Calidad P | M04, `rf62_p`; CLI | Entero | Lecturas | 1 <= P <= N | Sin API web |
| Ventana RF-72 | M04, `ventana_retroalimentacion_dias`; CLI | Entero | Días | 7–365 | Sin API web |

Los nombres persistidos MLOps no son campos de `/configuracion/parametros`. No se envían a ese endpoint ni se inventa un servicio para editarlos. `umbral_sin_senal` tampoco es un parámetro adicional independiente: representa el mismo valor que el alias anterior, y es distinto de la cadencia `intervalo_heartbeat`.

## 2. Contrato HTTP conservado

| Operación | Endpoint | Contrato |
|---|---|---|
| Consultar | `GET /configuracion/parametros` | Configuración activa o null; error no equivale a null |
| Crear | `POST /configuracion/parametros` | Frecuencia y umbral, ambos obligatorios |
| Actualizar | `PATCH /configuracion/parametros/{id}` | Ambos valores y `fecha_actualizacion` leído; 412 si hubo edición concurrente |

Se mantiene `heartbeat` en el payload por compatibilidad: Backend DEV-14 y servidores anteriores lo aceptan. La lectura normaliza el nombre canónico y el alias; si están ambos deben coincidir. Respuestas sin un valor válido, fraccionarias, contradictorias o con relación inválida se rechazan como error de contrato del cliente, sin defaults.

Se conserva recurso 21 y acciones de lectura/creación/actualización 2/1/3. El servidor sigue autorizando; el frontend no cambia permisos. Un usuario sin lectura no dispara la consulta. Crear y editar se muestran según la acción aplicable.

## 3. Cambios implementados

| Archivo | Cambio | Tarea |
|---|---|---|
| `src/configuration/types.ts` | Nombre canónico opcional para compatibilidad con respuestas anteriores | #3636 |
| `src/configuration/api/parametrosApi.ts` | Normalización y verificación de aliases sin modificar endpoints/payload público anterior | #3636 |
| `src/configuration/hooks/useParametrosGlobales.ts` | Guardado sin doble activación, protección frente a GET anterior y confirmación solo tras respuesta | #3636 |
| `src/configuration/components/ParametrosSection.tsx` | Validación de ambos enteros y relación, permisos, errores, borrador y recarga confirmada | #3636/#3637 |
| `src/configuration/components/ParametrosSection.module.css` | Misma estructura de tarjetas/formulario con tokens, layout móvil y reduced motion | #3636 |
| `src/configuration/pages/ConfigurationPage.tsx` | Confirmación antes de abandonar la pestaña Sistema con cambios; navegación de pestañas bloqueada durante guardado | #3636 |
| `src/shared/design-system/Input.tsx` | `aria-describedby` referencia únicamente la ayuda o el error efectivamente renderizado | #3636 |
| `src/shared/i18n/locales/{es-CO,en-US}/configuration.json` | Etiquetas, ayuda y estados faltantes del formulario | #3637 |
| `src/configuration/api/parametrosApi.test.ts` | Alias anterior/canónico, respuestas incompletas y payload completo | #3638 |
| `src/configuration/hooks/useParametrosGlobales.test.tsx` | Peticiones simultáneas, errores, creación y confirmación | #3638 |
| `src/configuration/components/ParametrosSection.test.tsx` | Formulario con API/hook reales y transporte HTTP simulado; recarga sin configuración y cambio de idioma | #3638 |
| `src/configuration/pages/ConfigurationPage.fe04.test.tsx` | Borrador al navegar entre pestañas M09 | #3638 |
| `src/shared/design-system/Input.test.tsx` | Regresión de asociación accesible entre campo y mensaje | #3638 |
| `DESIGN.md`, `UX-CONTRACT.md`, `premium-ui.json` | Propietarios compartidos, tokens, comportamiento de la sección y alcance de auditoría | Documentación |
| `docs/fe04/` | Evidencia de verificaciones y script de lint acotado que utiliza dependencias existentes | #3638 |

No se agregan dependencias de producto, campos AIoT ficticios, pantallas nuevas, valores iniciales de reemplazo ni cambios al repositorio Backend.

## 4. Parámetros incorporados

La sección conserva dos controles: frecuencia de muestreo y tiempo máximo sin datos. La incorporación verificable consiste en reconocer el nombre canónico de DEV-14 y mantener compatibilidad con el alias anterior. Los demás parámetros de la ficha no pueden declararse incorporados mientras no tengan API.

La representación usa números/fechas localizados. Los inputs requieren enteros positivos sin pérdida de precisión JavaScript; el umbral debe ser mayor o igual a frecuencia. PATCH conserva el valor no modificado y el token de concurrencia, sin suponer edición parcial.

## 5. Internacionalización y recuperación

Se amplía únicamente `parametrossection` en ambos JSON, con 21 claves nuevas y paridad entre idiomas. Se reutilizan `useT`, los adaptadores de formato y el sistema global de confirmación de éxito.

Claves incorporadas dentro de `configuration:parametrossection`:

```text
actualizar_parametros, cambios_pendientes, cambios_sin_guardar,
campo_obligatorio, cargando, conexion_fallida, conflicto_descripcion,
crear_configuracion, descartar_continuar, descartar_descripcion,
descartar_recargar, entero_positivo, frecuencia_label,
guardar_configuracion, respuesta_invalida, seguir_editando,
servicio_no_disponible, umbral_descripcion, umbral_label,
umbral_sin_senal, unidad_minutos
```

Los mensajes de validación del cliente se almacenan como claves para que un error visible cambie de idioma sin perder el valor. Los mensajes de Backend utilizan el mecanismo existente de errores/campos. Errores de conectividad, servicio y contrato tienen recuperación localizada.

Un fallo de guardado conserva el borrador; un 412 requiere recarga antes de otro intento. Recargar con cambios y cambiar de pestaña M09 requiere confirmar descarte con diálogos propios de la aplicación. El cierre/recarga del documento usa `beforeunload`. No se cambia la navegación global del resto de módulos.

## 6. Verificación

### Resultados ejecutados

| Prueba | Resultado | Evidencia |
|---|---|---|
| Instalación congelada | Completada: 895 paquetes reutilizados, sin cambiar `package.json` ni `pnpm-lock.yaml` | `pnpm install --frozen-lockfile --offline --ignore-scripts --virtual-store-dir=...`; terminó con código 0 |
| API de parámetros, unitarias con HTTP simulado | **16 aprobadas, 0 fallidas** | `docs/fe04/node-runtime-check.json` |
| Tanda focalizada de 5 archivos con workers normales | No inició casos: 5 errores de arranque por timeout; no son 5 assertions fallidas | `docs/fe04/unit-results.json` |
| Lint acotado de 11 archivos | **0 errores, 0 advertencias** | `node docs/fe04/lint_changed_files.mjs`; `docs/fe04/lint-targeted.json` |
| Lint global | Falló: falta `eslint.config.*` en el repositorio | `npm run lint`; `docs/fe04/lint-global.log` |
| Tipos | Falló con 3 diagnósticos en `src/App.tsx`, sobre `IonApp` / `IonReactRouter` | `node node_modules/typescript/bin/tsc --noEmit`; `docs/fe04/types.log` |
| Build completo | Falló en la etapa TypeScript por los mismos diagnósticos; no se acredita build de producción | `npm run build`; `docs/fe04/build.log` |
| Comprobación adicional de enlaces de tipos | `--preserveSymlinks` tampoco obtuvo código 0; no se modificó tsconfig | `docs/fe04/types-preserve-symlinks.log` |
| Cypress | No ejecutó escenarios: falta el binario de Cypress 13.17.0 | `node node_modules/cypress/bin/cypress run`; `docs/fe04/e2e.log` |
| Traducciones y contexto visual | Paridad es-CO/en-US, 21 claves nuevas y 6 colores contrastados con tokens | `docs/fe04/validacion_contexto.json` |
| Auditoría UI global estricta | Falló con 98 hallazgos en archivos ajenos al cambio; 0 en archivos modificados o nuevos contrastados | `docs/fe04/premium-audit.json` y `validacion_contexto.json` |
| Integración real DEV-14 / BD | **No verificada** | No se realizaron escrituras en APIs ni bases compartidas |
| Regresión general | No ejecutada satisfactoriamente; el runner normal no pudo iniciar la tanda focalizada | No se certifica ausencia de regresiones |
| Integridad del diff | Aprobada | `git diff --check` |

Las 16 pruebas aprobadas corresponden únicamente a `parametrosApi.test.ts`. Los otros cuatro archivos focalizados —hook, formulario, navegación M09 e Input compartido— conservan pruebas escritas sin ejecución acreditada. Los intentos repetidos de arranque no se contabilizan como casos distintos. El número de casos sin ejecutar de esos archivos no fue recolectado por el runner.

La ejecución aprobada utilizó Node 24.19.0 del runtime incluido y el pool `vmThreads`. El comando ejecutado fue:

```powershell
& 'C:/Users/leand/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/vitest/vitest.mjs run --config docs/fe04/vitest.config.ts src/configuration/api/parametrosApi.test.ts --pool=vmThreads --maxWorkers=1 --reporter=default --reporter=json --outputFile=docs/fe04/node-runtime-check.json
```

`docs/fe04/vitest.config.ts` conserva globals, jsdom y `src/setupTests.ts` del proyecto; omite únicamente los plugins de compilación PWA/legacy. No se modificaron assertions ni pruebas existentes para obtener un resultado favorable.

Los errores de Ionic también se reprodujeron en un archivo mínimo que solo importaba `IonApp` y `IonReactRouter`, sin FE-04 (`docs/fe04/ionic-baseline.log`). `App.tsx` no fue modificado. Este resultado demuestra que el diagnóstico no requiere los componentes nuevos; no determina por sí solo si la causa es la instalación local o la compatibilidad de los tipos Ionic/React.

### Comprobación rápida en navegador: HTTP simulado

Se utilizó temporalmente el componente, hook, API y primitivas reales con un adaptador Axios en memoria y permisos de prueba. Se observaron estos seis escenarios:

1. Carga de frecuencia 5 y umbral 15 desde el response simulado.
2. Rechazo de frecuencia 8 / umbral 4 con el mensaje de relación inválida.
3. Cambio es-CO → en-US conservando los valores editados y traduciendo el error ya visible.
4. Recarga con cambios: diálogo de descarte y opción de seguir editando conservando 8 / 20.
5. Guardado confirmado: tarjetas e inputs pasan a 8 / 20, desaparece el estado sucio y aparece el aviso de éxito.
6. Nueva consulta mediante el botón de recarga: mantiene los valores confirmados por el servidor simulado.

Se inspeccionó además la disposición en una columna a 390 px. Es una revisión parcial del fixture, no una certificación visual de toda la aplicación. El fixture, su servidor y su pestaña temporal se retiraron al terminar; no se incorporan pantallas de prueba al producto.

Estos resultados manuales se separan de las 16 pruebas automatizadas y **no demuestran persistencia real, autorización real ni consumo dinámico desde BD**.

### Límites del entorno

La preparación de dependencias presentó permisos de enlaces y reconstrucción lenta del almacén. Se repitieron las verificaciones finales tras completar la instalación. Se omitió el binario de Cypress; no se cambiaron versiones de dependencias.

El validador externo `@google/design.md` fue rechazado por la revisión automática de aprobación porque implicaba ejecutar un paquete no verificado con acceso al repositorio y posible red. No se ejecutó por otra vía. Se sustituyó por comprobaciones locales de estructura, traducciones y tokens; no se afirma que ese validador externo haya aprobado.

## 7. Estado de las tareas

| Tarea | Descripción | Estado funcional |
|---|---|---|
| #3636 | Campos y validaciones | Parcial: compatibilidad real y formulario existente; campos AIoT sin API bloqueados |
| #3637 | Textos es-CO/en-US | Parcial respecto de toda FE-04: sección disponible traducida; nuevos campos esperan contrato |
| #3638 | Pruebas contra Backend | Parcial/bloqueada para integración real: pruebas aisladas implementadas; resultados en sección 6; endpoints nuevos no disponibles |

## 8. Dependencia mínima para completar FE-04

Backend/DEV-14 debe proporcionar un contrato HTTP de consulta y actualización para los parámetros efectivamente editables, con tipos, unidades, restricciones, correlaciones, permisos, errores y concurrencia. Aclarar cuáles pertenecen a configuración global M09 y cuáles conservan responsabilidad M04; no agruparlos en el mismo PATCH por suposición.

Para batería/RSSI/latencia/deduplicación, el PR DEV-14 inspeccionado identifica pendientes de persistencia y consumo: Backend debe contrastarlos con las migraciones efectivamente aplicadas y exponer el contrato correspondiente. Esta revisión frontend no inspecciona nuevamente la BD ni afirma que DB-03 siga sin aplicar; tampoco solicita migraciones por suposición. Una columna desplegada no implica que exista un endpoint que permita gestionarla.

Para calidad/confianza/ventana, la persistencia MLOps ya está implementada en DEV-14: lo que falta para esta pantalla es la interfaz HTTP autorizada, no recrear la tabla.

Después: ampliar tipos y formulario con ese contrato, ejecutar GET → cambio autorizado → PATCH → GET y verificar el consumidor dinámico en un entorno seguro. No se realizaron escrituras en bases o APIs compartidas ni se utilizaron datos ficticios para afirmar esa integración.

## 9. Conclusión

FE-04 no puede cerrarse integralmente con el Backend inspeccionado. Se entrega la parte compatible, 16 pruebas unitarias aprobadas de la API cliente y una comprobación manual con HTTP simulado. Quedan pendientes el contrato web de los parámetros restantes, la integración real y completar las verificaciones automatizadas del formulario y regresión.

La historia #3533 no está lista para aceptación final QA. El código queda disponible para revisión de una entrega parcial, con las limitaciones anteriores; no se presenta como una historia completa ni como una compilación aprobada. Commit y push autorizados expresamente por el usuario después de la comprobación; no se abre un PR automáticamente. Rama: `fix/fe04-parametros-aiot-m09`; HEAD base: `7e87bfba7946088c8e3d5156b84e4d3a20acc742`.
