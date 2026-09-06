# TC-M09-G28 — RF17, precisión numérica y persistencia entre sesiones

Responsable Juan Esteban. Solo TEST real. No ejecutar G22–G27 desde aquí. No iniciar
G29.

Ejecución `run-20260906` concluida. Decisión general: **DESAPROBADO**, con la causa
exclusivamente en TC-M09-60.
TC-M09-60 DESAPROBADO por defecto del producto (creación válida → HTTP 500, sin
persistencia; a reportar a Desarrollo) · TC-M09-61 **APROBADO** (persistencia entre
sesiones demostrada en UI y API; la comprobación de PostgreSQL, definida por el caso
como complementaria, quedó documentada como no ejecutada).
Consultar `RESULTADOS/run-20260906/TC-M09-G28_resultado.md`.

| Caso | GIVEN | WHEN | THEN |
|---|---|---|---|
| TC-M09-60 | Admin autorizado, especie y variable activas, combinación libre, valores de dos decimales dentro del rango físico | POST de creación válido | 201, y `enviado == API == PostgreSQL` comparado con `Decimal` |
| TC-M09-61 | Una configuración persistida (la de TC-M09-60 o, en su defecto, una preexistente) | Sesión A la muestra → logout real → sesión B nueva | Mismo registro y mismos valores en UI, API y PostgreSQL |

## Estrategia de mínimas escrituras

**Una sola escritura funcional en todo el grupo**: el umbral que crea TC-M09-60 se
reutiliza en TC-M09-61. El estado vive en `RESULTADOS/<run>/estado-registro.json`; si
ya hay un ID creado, no se crea otro. El presupuesto de **2 POST por original** es un
tope duro: la propia prueba falla con `Presupuesto agotado` antes de intentar un
tercero, y nunca se crea un registro alternativo para conseguir un PASS verde.

Si TC-M09-60 no logra crear el registro, TC-M09-61 **no se declara fallido por
arrastre**: descubre por GET una configuración preexistente apta —prefiriendo una
variable de Temperatura— y trabaja sobre ella sin escribir nada. Solo crearía una
configuración por UI si no existiera ninguna, cosa que no ocurrió.

## Precisión: `Decimal`, nunca `float`

- Los valores se comparan con `decimal.Decimal` normalizados con
  `quantize(Decimal("0.01"))`. No se usan tolerancias de coma flotante.
- El JSON de respuesta se parsea con `parse_float=Decimal`: ningún valor pasa por un
  binario inexacto antes de compararse.
- El payload se serializa con un escritor propio que emite los `Decimal` como
  literales numéricos exactos, porque `json.dumps` obligaría a degradarlos a `float`.
- Un cero final que desaparece en el JSON **no es un defecto**:
  `Decimal("35.5") == Decimal("35.50")`, y así está comprobado en la propia prueba.

## PostgreSQL — estrictamente de solo lectura

Conexión con `-c default_transaction_read_only=on -c statement_timeout=15000`, y la
prueba verifica `current_setting('transaction_read_only') = 'on'` y
`current_database() = 'sgpmp_test'` antes de leer. Solo `SELECT`, y siempre por ID
exacto. La contraseña llega **únicamente** por `G28_DB_PASSWORD`: no se codifica en
el repositorio ni se escribe en disco. Sin esa variable, los tests de BD se omiten
con motivo explícito en lugar de fingir un resultado.

## Requisitos y ejecución

Ya instalados, no se instala nada: Python 3.13.13, pytest 9.0.3, psycopg2 2.9.12,
Cypress 13.17.0, TypeScript 5.9.3.

Variables de proceso: `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `G28_RUN_ID`,
`G28_RECORRIDO` (Cypress) y, para la parte de BD, `G28_DB_PASSWORD` (opcionalmente
`G28_DB_HOST`, `G28_DB_PORT`, `G28_DB_NAME`, `G28_DB_USER`).

```
# TC-M09-60 y comprobaciones de precision
python -m pytest -m "not persistencia" --junitxml=RESULTADOS/<run>/pytest-TC-M09-60-intentoN.xml

# Seleccion del registro de TC-M09-61 (sin escrituras)
python -c "import helpers_g28 as h; h.seleccionar_registro_tc61(h.login())"

# Recorrido Cypress de TC-M09-61, desde la raiz del frontend
node_modules/.bin/cypress.cmd run --project testing/test_testing/Modulo9/RF-17/TC-M09-G28 \
  --config-file cypress.config.cjs --browser electron

# Cierre de persistencia (API + PostgreSQL)
python -m pytest -m persistencia --junitxml=RESULTADOS/<run>/pytest-TC-M09-61-persistencia.xml

# Saneo y auditoria de secretos
python sanitizar_evidencias.py
```

`NODE_PATH` debe apuntar al `node_modules` del frontend (cypress + typescript) y
`ELECTRON_RUN_AS_NODE` debe estar **ausente**: con esa variable el binario arranca
como Node y Cypress rechaza su propio bytecode (`cachedDataRejected`).

Máximo **2 POST de creación** para TC-M09-60 y **2 recorridos Cypress** para
TC-M09-61; ambos topes están implementados, no solo documentados. No se reintenta un
PASS. Si un registro persistiera de forma inesperada: detener sin limpiar.

## Higiene de secretos

`helpers_g28.Token` existe porque pytest imprime los fixtures en el traceback de un
fallo: sin él, un JWT real acabaría escrito en el log de evidencia. Su `repr`
devuelve `[JWT REDACTED]` y el valor sigue siendo utilizable en las cabeceras.
`sanitizar_evidencias.py` sanea los artefactos y audita el resultado buscando
**valores** de secreto, no vocabulario.

Estado inicial: ambas ramas en `qa/juan-esteban-m09`. SHAs locales: frontend
`966621df4e2c6a1f2c9233ea5ebefbb9e3bc2f56`, backend
`adc3932b9f0293a76ebec7e89ed877274791b6a1`. SHA desplegado no confirmado.
