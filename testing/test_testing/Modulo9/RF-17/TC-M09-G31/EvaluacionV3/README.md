# TC-M09-G31 — Evaluación V3 (TC-M09-66/67/68, semáforo RF-17)

Tercera evaluación de la clasificación semafórica de mediciones contra los niveles RF-17
(NORMAL/VERDE, PRECAUCIÓN/AMARILLO, CRÍTICO/ROJO). Coexiste con V1 (`RF-17/TC-M09-G31/RESULTADOS`,
BLOCKED) y con `EvaluacionV2/`, ambas de solo lectura e inmutables.

## Adaptación mínima respecto de V2

`EvaluacionV2/run-newman.cjs` es deliberadamente de **solo lectura**: el checklist previo determinó
que no existía clasificador RF-17, así que planificaba los valores interiores de cada banda y no los
enviaba. Tras PR #382/#383 el clasificador sí existe (`ReclasificarSemaforoUseCase` +
`SemaforoCalculator.calcular_por_niveles`), de modo que el flujo que antes estaba bloqueado ya se
puede ejecutar.

La única adaptación es habilitar ese flujo:

- ingesta real por caso (`POST /iot/telemetria`), con compensación de la calibración RF-24 para que el
  valor efectivamente clasificado (`COALESCE(valor_ajustado, valor_crudo)`) caiga dentro de la banda;
- precondición técnica de vinculación RF-61-C (`resolver` / `corregir`) cuando exista una fila sobre la
  que actuar — **no es el oráculo** del grupo;
- oráculo por medición en la colección: dashboard e historial de Monitoreo.

Se conserva de V2: selección del umbral, aritmética decimal exacta en centésimas con `BigInt`,
sanitizado de secretos, cuentas suministradas, estructura de evidencia y las assertions funcionales.
Las clases esperadas no cambian.

## Un solo runner, un solo RUN_ID

`run-newman.cjs` es la fuente única de ejecución, por fases. Los pasos previos no crean carpeta de
resultados:

```bash
# 1-6: rama, health, credenciales TEST y DEV, discovery, fixture  (no crea RESULTADOS)
G31_FASE=preflight \
  TEST_ADMIN_PASSWORD=… DEV_ADMIN_PASSWORD=… \
  G31_PREFLIGHT_OUT=<ruta temporal> \
  NODE_PATH="$(npm root -g)" node run-newman.cjs

# 7-8: crear el RUN_ID una única vez y ejecutar la prueba oficial
G31_FASE=oficial G31_V3_RUN_ID=G31-REEVAL-V3-YYYYMMDD-HHMMSS \
  TEST_ADMIN_PASSWORD=… DEV_ADMIN_PASSWORD=… \
  NODE_PATH="$(npm root -g)" node run-newman.cjs

# Evidencia de interfaz, dentro del MISMO RUN_ID
G31_FASE=ui G31_V3_RUN_ID=… TEST_ADMIN_EMAIL=… TEST_ADMIN_PASSWORD=… node run-newman.cjs

# Complemento de solo lectura (censo de vinculaciones TEST vs DEV), mismo RUN_ID
G31_FASE=complemento G31_V3_RUN_ID=… TEST_ADMIN_PASSWORD=… DEV_ADMIN_PASSWORD=… node run-newman.cjs

# Cierre: escaneo de seguridad y estado final de Git
G31_FASE=cierre G31_V3_RUN_ID=… node run-newman.cjs
```

Las contraseñas se pasan **solo** como variables de proceso: nunca en archivos, colecciones,
evidencias ni logs. El script no sobrescribe un RUN_ID existente.

Notas de entorno: el `access_key` de la ingesta es el serial del dispositivo, se obtiene por API
autorizada y se redacta en toda la evidencia. La fase `ui` elimina `ELECTRON_RUN_AS_NODE` del proceso
porque el entorno del editor lo define en 1 y eso impide arrancar Cypress.

## Resultado

`G31-REEVAL-V3-20260927-051628`: **TC-M09-66/67/68 NO APROBADOS**; INC-M09-106-G31 (#297)
**PARCIALMENTE CORREGIDO**. Ver `RESULTADOS/G31-REEVAL-V3-20260927-051628/TC-M09-G31_reevaluacion_V3.md`.
