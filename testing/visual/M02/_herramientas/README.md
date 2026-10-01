# Herramientas de consistencia visual M02

Dos scripts de apoyo para los casos `testing/visual/M02/RF-YY/TC-DIS-XX/`. Se ejecutan desde `testing/`.
Ninguno escribe en el backend.

## capturar-fixtures.cjs — guardar fixtures reales

Inicia sesión con `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` de `testing/.env.test` y abre la ficha del activo.
Opcionalmente entra a una pestaña y pulsa un botón. Guarda cada GET pedido como `<nombre>.fixture.json` en la carpeta
del caso. Toda escritura a la API se aborta, salvo el login. La URL base es `TEST_BASE_URL` o, si no está definida, la
de `playwright.config.ts`.

| Argumento | Uso |
|---|---|
| `--caso TC-DIS-XX` | Carpeta destino: la única `visual/M02/RF-*/TC-DIS-XX` (o `--salida <carpeta>`) |
| `--activo <id>` | Activo cuya ficha se abre; `{id}` se reemplaza en rutas y nombres |
| `--endpoint <nombre>=<ruta>` | Repetible. `<ruta>` es el final del path sin `/back-sigab-test` |
| `--pestana <texto>` | Pestaña de "Secciones del activo" que dispara el GET (opcional) |
| `--boton <texto>` | Botón dentro de `<main>` que dispara el GET, p. ej. el de un modal (opcional) |

Ejemplo (ficha, activo y la configuración que carga el modal de eventos de #627):

```bash
MSYS_NO_PATHCONV=1 node visual/M02/_herramientas/capturar-fixtures.cjs --caso TC-DIS-103 --activo 627 \
  --endpoint "ficha-{id}=/activos-biologicos/{id}/ficha-integral" \
  --endpoint "activo-{id}=/activos-biologicos/{id}" \
  --endpoint metricas-especie-4=/configuracion/metricas \
  --endpoint patologias-especie-4=/configuracion/patologias \
  --pestana Eventos --boton Crecimiento
```

`MSYS_NO_PATHCONV=1` solo hace falta en Git Bash, que convierte `/ruta` en `C:/Program Files/Git/ruta`. Si se olvida,
el script lo detecta y lo avisa. Antes de versionar, revisa cada fixture: no debe tener correos, tokens ni datos
personales.

## comparacion-visual.cjs — evidencia de estabilidad

Genera `resultados/visual-TC-DIS-XX-comparacion.md` a partir de 2 corridas del caso **sin** `--update-snapshots`
con `--reporter=json`. El reporte incluye el resultado por estado y viewport, y el tema e idioma registrados por
`registrarEntorno`.

```bash
npx playwright test "TC-DIS-103[\\/]" --workers=1 --retries=0 --reporter=json > corrida1.json
npx playwright test "TC-DIS-103[\\/]" --workers=1 --retries=0 --reporter=json > corrida2.json
node visual/M02/_herramientas/comparacion-visual.cjs TC-DIS-103 visual/M02/RF-39/TC-DIS-103 corrida1.json corrida2.json
```

Los JSON crudos no se versionan. Verificación: con los reportes de las 2 corridas del 30/09, este script regenera
`RF-39/TC-DIS-103/resultados/visual-TC-DIS-103-comparacion.md` idéntico byte a byte al versionado.
