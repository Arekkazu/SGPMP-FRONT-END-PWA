# Corrección de automatización — TC-M09-G31

Los JSON y HTML de Newman `intento1` se conservan como evidencia de ejecución, pero su lectura de los niveles de alerta era incorrecta: buscaba `valor_min` y `valor_max` dentro de cada nivel.

El contrato real de `NivelAlertaResponse` usa `limite_inferior` y `limite_superior`. La corrección se aplicó exclusivamente a `run-newman.cjs`, dentro del directorio QA G31, antes de `intento2`.

Los tres `intento2` terminaron con autenticación administrativa HTTP 200, dashboard HTTP 200, nueve aserciones aprobadas y diez configuraciones semafóricas utilizables. Son consultas de descubrimiento; no ejecutaron `POST /iot/telemetria` ni generaron datos de negocio.

La corrección elimina la conclusión errónea de que no existían umbrales completos. No resuelve el bloqueo posterior: la API disponible no demuestra la asociación vigente especie–activo–sensor–variable requerida para construir un payload válido.
