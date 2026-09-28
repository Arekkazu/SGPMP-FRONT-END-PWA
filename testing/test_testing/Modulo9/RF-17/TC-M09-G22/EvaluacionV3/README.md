# TC-M09-G22 — Evaluación V3 (tercera evaluación RF-17)

Tercera ejecución de TC-M09-46/47/48/49: configuraciones ambientales válidas por especie
activa. Reproduce **la misma prueba de V2** —mismo actor, mismo endpoint, mismas variables,
mismos rangos, mismos tres niveles, mismo expected 201, mismas validaciones de persistencia
y de interfaz—. Lo único que cambia es el **fixture de especie**, porque las combinaciones
de V2 quedaron persistidas (ids 38–41) y la unicidad es por `(especie, variable)`.

Coexiste con la evaluación V1 (`RF-17/TC-M09-G22/`) y con `EvaluacionV2/`, ambas de **solo
lectura**. Entorno decisorio: **TEST**. Actor: Administrador `administador.dev@gmail.com`.
Sin MQTT y sin acceso directo a base de datos.

## Fixture de QA preprovisionado

TC-M09-46 y TC-M09-47 usan la especie **61 — «Especie Acuatica Prueba»**, creada antes de
esta evaluación por el flujo oficial `POST /configuracion/especies` (HTTP 201, un único
POST, sin SQL). Esa provisión es externa a G22 V3 y no consume su presupuesto de escritura.
La automatización **no la recrea, no la edita y no la desactiva**: solo la revalida por GET.

## Archivos

| Archivo | Función |
| --- | --- |
| `helpers.cjs` | Login, validación del actor, catálogo, referencia V2 fijada, resolución de variables por nombre, revalidación del fixture 61, detección de escrituras de una V3 anterior y saneamiento |
| `plan.cjs` | Preflight, gate OpenAPI, discovery y plan global de los cuatro casos (sin POST) |
| `run-newman.cjs` | Un original por invocación: revalida, ejecuta **un** POST real con Newman y verifica por GET (snapshots PRE y POST) |
| `TC-M09-G22-reevaluacion-v3.postman_collection.json` | Copia de la colección V2 con sus 87 aserciones funcionales + 4 de equivalencia V2↔V3 + 4 de conservación de los registros de V2 (95) |
| `cypress.config.cjs` / `tc-m09-g22-reevaluacion-v3.cy.ts` | Verificación en la UI del umbral real creado por Newman, con la medición de contraste de «Rango general»; nunca crea datos |
| `verificar-cierre.cjs` | Verificación final de solo lectura (V3, fixture 61 y conservación de V2) |
| `seguridad.cjs` | Escaneo de secretos sobre `EvaluacionV3/` |
| `git-final.cjs` | Gate y cierre Git de solo lectura en ambos repositorios |
| `Resultados/<RUN_ID>/` | Evidencia de la ejecución |
| `Resultados/TC-M09-G22_reevaluacion_V3.md` | Informe final |

## Ejecución

```bash
export G22_REEVAL_V3_RUN_ID=G22-REEVAL-V3-<fecha>-<hora>
export TEST_ADMIN_EMAIL='administador.dev@gmail.com'
export TEST_ADMIN_PASSWORD=...          # nunca en archivos ni en pantalla

node plan.cjs                           # checklist previo al primer POST; debe cerrar los CUATRO casos

NODE_PATH="$(npm root -g)" G22_CASE=TC-M09-46 G22_INTENTO=1 node run-newman.cjs   # repetir para 47, 48, 49

# Cypress, desde la raíz del frontend; ELECTRON_RUN_AS_NODE debe estar ausente
env -u ELECTRON_RUN_AS_NODE NODE_PATH="$(pwd)/node_modules" G22_CASE=TC-M09-46 G22_RECORRIDO=recorrido1 \
  npx --no-install cypress run --project testing/test_testing/Modulo9/RF-17/TC-M09-G22/EvaluacionV3 \
  --config-file cypress.config.cjs --browser electron

node verificar-cierre.cjs
node seguridad.cjs
node git-final.cjs
```

Límites implementados: **1 POST por original** (4 en total), sin POST exploratorios, sin
cleanup, sin DELETE, sin PATCH y sin SQL; no se sobrescribe evidencia; la especie de V2 queda
excluida por construcción; el rango y los niveles de V2 se verifican antes de cada envío y,
si no coinciden, el runner se detiene en lugar de recalcular.
