# TC-M09-G22 — Evaluación V2 (reevaluación RF-17)

Reevaluación de TC-M09-46/47/48/49: configuraciones ambientales válidas por
especie activa (base, Temperatura, Humedad y pH). Coexiste con la evaluación V1
de `RF-17/TC-M09-G22/`, que es de solo lectura. Entorno: **TEST**. Actor:
Administrador `administador.dev@gmail.com`.

## Archivos

| Archivo | Función |
| --- | --- |
| `helpers.cjs` | Login, validación de actor, catálogo, planificador de combinaciones libres, rangos exactos y saneamiento |
| `plan.cjs` | Preflight y plan global de cuatro combinaciones libres y distintas (sin POST) |
| `run-newman.cjs` | Un original por invocación: redescubre, ejecuta un POST real con Newman y verifica por GET |
| `TC-M09-G22-reevaluacion-v2.postman_collection.json` | Colección copiada de V1 (mismas aserciones) |
| `cypress.config.cjs` / `tc-m09-g22-reevaluacion-v2.cy.ts` | Verificación UI del umbral real creado por Newman, legibilidad del rango incluida; nunca crea datos |
| `verificar-cierre.cjs` | Verificación final de solo lectura |
| `RESULTADOS/<RUN_ID>/` | Evidencia y `TC-M09-G22_reevaluacion_V2.md` |

## Ejecución

```bash
export G22_REEVAL_V2_RUN_ID=G22-REEVAL-V2-<fecha>-<hora>
export TEST_ADMIN_PASSWORD=...          # nunca en archivos

node plan.cjs                           # checklist previo al primer POST
NODE_PATH="$(npm root -g)" G22_CASE=TC-M09-46 G22_INTENTO=1 node run-newman.cjs   # repetir para 47, 48, 49

# Cypress, desde la raíz del frontend; ELECTRON_RUN_AS_NODE debe estar ausente
env -u ELECTRON_RUN_AS_NODE NODE_PATH="$(pwd)/node_modules" G22_CASE=TC-M09-46 G22_RECORRIDO=recorrido1 \
  npx --no-install cypress run --project testing/test_testing/Modulo9/RF-17/TC-M09-G22/EvaluacionV2 \
  --config-file cypress.config.cjs --browser electron

node verificar-cierre.cjs
```

Límites implementados: 2 POST por original como máximo, sin reintentar un PASS
ni un POST que persistió; no se sobrescribe evidencia; recorridos Cypress
`recorrido1`/`recorrido2` únicos por caso. Toda la salida de Cypress va a
`RESULTADOS/<RUN_ID>/cypress/`. Los umbrales creados se conservan (sin cleanup).
