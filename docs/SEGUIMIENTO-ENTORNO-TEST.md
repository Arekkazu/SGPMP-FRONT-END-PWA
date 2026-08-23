# Seguimiento del Ambiente TEST - Frontend SGPMP

## 1. Objetivo

Preparar y validar un ambiente TEST independiente para el Frontend del proyecto SGPMP, tomando como referencia la configuración existente de DEV y sin modificar su funcionamiento.

El trabajo contempla:

- configuración Docker específica para TEST;
- variables de build propias del ambiente;
- seguridad de puertos;
- integración posterior con Backend TEST;
- validaciones de construcción y ejecución;
- documentación de comandos, resultados, hallazgos y pendientes.

## 2. Alcance

Este documento cubre únicamente el trabajo del repositorio Frontend correspondiente al ambiente TEST.

No se realizará configuración de producción.

El archivo `docker-compose.yml` existente se utiliza únicamente como referencia DEV y no debe ser modificado salvo que exista una necesidad explícita y previamente validada.

## 3. Repositorio y ramas

Repositorio:

    Arekkazu/SGPMP-FRONT-END-PWA

Rama base:

    origin/integration-v2

Commit base:

    ef30a761a8f9d629d2f909b8671c844cdafa48b3

Rama de trabajo:

    feat/ambiente-test

La rama fue creada directamente desde `origin/integration-v2` utilizando `--no-track`.

## 4. Estado inicial

Al iniciar el trabajo el repositorio se encontraba en detached HEAD sobre:

    4933042 Add README.md with project documentation

También existía una modificación local en:

    package-lock.json

El cambio correspondía únicamente a eliminaciones de metadatos `libc` dentro del lockfile.

Se confirmó que no existía trabajo local que debiera conservarse, por lo que el cambio fue descartado mediante:

    git restore -- package-lock.json

Después de esta operación el árbol de trabajo quedó limpio.

Posteriormente se actualizaron referencias remotas mediante:

    git fetch origin --prune

Después del `fetch` se confirmó la existencia de:

    origin/integration-v2

La rama `feat/ambiente-test` fue creada desde esa referencia y se validó que `HEAD` y `origin/integration-v2` apuntaran al mismo commit.

## 5. Arquitectura DEV de referencia

El archivo DEV existente es:

    docker-compose.yml

Contiene un único servicio:

    frontend

El servicio se construye utilizando:

    Dockerfile
    target: prod

El Frontend utiliza un build multi-stage.

Etapa de construcción:

    node:22-slim

Proceso:

    corepack enable
    pnpm install --frozen-lockfile
    pnpm build

Etapa final:

    nginx:1.27-alpine

Los archivos generados en `dist` se copian a:

    /usr/share/nginx/html

Nginx escucha internamente en:

    80

El Compose utiliza:

    expose:
      - "80"

No existe publicación del puerto mediante `ports`.

La configuración de Nginx utiliza fallback a `index.html`, permitiendo el funcionamiento de las rutas SPA gestionadas por React.

## 6. Variables DEV de referencia

El Compose DEV pasa las siguientes variables como argumentos de construcción:

- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_VAPID_KEY`

Estas variables son build-time.

Vite las incorpora al bundle durante:

    pnpm build

Por tanto, cambiar sus valores requiere reconstruir la imagen y no solamente reiniciar el contenedor.

## 7. Comunicación con Backend

El cliente HTTP se encuentra configurado en:

    src/shared/api/http.ts

Utiliza:

    import.meta.env.VITE_API_BASE_URL

Si la variable no existe utiliza como fallback:

    http://localhost:8000

Para el ambiente TEST desplegado no deberá utilizarse `localhost` como URL definitiva.

La URL pública HTTPS definitiva del Backend TEST continúa pendiente de la configuración de exposición mediante Dokploy/Traefik.

Para la validación local integrada se utilizó temporalmente:

    VITE_API_BASE_URL=http://127.0.0.1:8000/api

Este valor fue utilizado únicamente para la prueba local y no corresponde a la URL definitiva de TEST.

## 8. Seguridad de archivos de entorno

Existe un archivo local:

    .env

Se comprobó que está ignorado por Git mediante la regla:

    .env

También se comprobó que no está rastreado por Git.

Resultado:

    env-tracked-exit=1

El archivo `.dockerignore` excluye:

    .env
    .env.*

Por tanto, el archivo `.env` local no entra al contexto utilizado durante el build de Docker.

No se mostraron ni documentaron sus valores.

### Protección de `.env.test`

Antes de crear el archivo local del ambiente TEST se comprobó que `.gitignore` no contenía una regla que protegiera:

    .env.test

La validación inicial produjo:

    env-test-ignore-exit=1

Por seguridad se agregó exclusivamente la regla:

    .env.test

Después del cambio se obtuvo:

    env-test-ignore-exit=0

También se comprobó que la plantilla:

    .env.test.example

permanece disponible para versionamiento:

    env-test-example-ignore-exit=1

Por tanto:

- `.env.test` queda protegido de Git;
- `.env.test.example` puede versionarse;
- los valores reales del ambiente TEST no deberán almacenarse en el repositorio.

## 9. Hallazgos iniciales

### `VITE_AGROFUSION_LOGIN_URL`

El código del Frontend consume:

    VITE_AGROFUSION_LOGIN_URL

en:

    src/auth/pages/LoginPage.tsx

La variable controla el botón:

    Continuar con AgroFusion

Si la variable no existe:

- el botón queda deshabilitado;
- la interfaz muestra `Configuración pendiente`.

Sin embargo, actualmente la variable no se encuentra definida en:

- `docker-compose.yml`;
- `Dockerfile`;
- `.env.example`;
- el conjunto de nombres de variables presente en el `.env` local revisado.

Por tanto, actualmente no forma parte del contrato Docker documentado del Frontend.

No será agregada silenciosamente por Implementación.

Debe reportarse o confirmarse con Desarrollo antes de incorporarla a la configuración TEST.

### `VITE_SW`

El archivo `.env` local contiene el nombre:

    VITE_SW

La búsqueda realizada encontró referencias en documentación del repositorio relacionadas con pruebas del Service Worker.

No se encontró uso directo de esta variable en el código fuente inspeccionado durante esta auditoría.

No será agregada al contrato TEST hasta disponer de evidencia de que sea necesaria para el build del ambiente.

### Gestor de paquetes

El `Dockerfile` utiliza `pnpm` mediante Corepack.

El archivo `package.json` no define actualmente el campo:

    packageManager

La construcción Docker utiliza como archivos de lock/workspace:

    pnpm-lock.yaml
    pnpm-workspace.yaml

## 10. Arquitectura TEST propuesta

El ambiente TEST deberá mantenerse separado de DEV.

Se prevé crear:

    docker-compose.test.yml
    .env.test.example

El servicio TEST conservará:

- `target: prod`;
- Nginx como servidor final;
- puerto interno `80`;
- ausencia de `ports`;
- variables Vite inyectadas durante build.

El Frontend TEST no necesita conectarse a PostgreSQL ni pertenecer a la red interna utilizada por Backend y AIoT, ya que su comunicación con Backend se realizará mediante la URL HTTPS pública del Backend TEST.

## 11. Archivos creados

Hasta este punto se crearon:

    docs/SEGUIMIENTO-ENTORNO-TEST.md
    .env.test.example
    docker-compose.test.yml

La plantilla `.env.test.example` contiene únicamente nombres de variables y valores vacíos donde corresponde.

No contiene valores reales del ambiente.

## 12. Archivos modificados

Se modificó:

    .gitignore

El único cambio realizado fue agregar:

    .env.test

para impedir el versionamiento accidental del archivo local TEST.

El archivo DEV:

    docker-compose.yml

permanece sin modificaciones.

## 13. Pruebas y validaciones

### Validación de rama base

Se comprobó que:

    HEAD=ef30a761a8f9d629d2f909b8671c844cdafa48b3
    origin/integration-v2=ef30a761a8f9d629d2f909b8671c844cdafa48b3

Resultado: **Correcto**.

### Validación del estado inicial

Después de descartar el cambio local no requerido de `package-lock.json` se obtuvo:

    nothing to commit, working tree clean

Resultado: **Correcto**.

### Validación de `.env`

Se comprobó que `.env` está ignorado por Git y no se encuentra rastreado.

También se comprobó que `.dockerignore` excluye `.env` y `.env.*`.

Resultado: **Correcto**.

### Auditoría del Compose DEV

Se comprobó que:

- existe únicamente el servicio `frontend`;
- utiliza `target: prod`;
- pasa variables `VITE_*` mediante `build.args`;
- utiliza `expose: 80`;
- no utiliza `ports`.

Resultado: **Correcto**.

### Diseño de `docker-compose.test.yml`

Se creó un Compose independiente para TEST:

    docker-compose.test.yml

El proyecto Compose se identifica como:

    sgpmp-frontend-test

Contiene únicamente el servicio:

    frontend

La configuración conserva la arquitectura validada de DEV:

- mismo `Dockerfile`;
- `target: prod`;
- build de Vite;
- imagen final Nginx;
- `expose: 80`;
- ausencia de `ports`;
- `restart: unless-stopped`.

No se agregó una red compartida con PostgreSQL, Backend o AIoT.

El Frontend se ejecuta en el navegador del usuario, por lo que las solicitudes HTTP hacia Backend deberán realizarse mediante la URL pública HTTPS de Backend TEST definida en:

    VITE_API_BASE_URL

La variable `VITE_API_BASE_URL` fue declarada obligatoria en Compose mediante interpolación de variable requerida.

Las variables Firebase/VAPID conservan el mismo contrato existente en DEV y permiten valor vacío mientras se confirma su configuración definitiva para TEST.

### Validación del contrato de variables TEST

Se creó `.env.test.example` utilizando el contrato de variables actualmente soportado por el Compose DEV.

Variables incluidas:

    VITE_API_BASE_URL
    VITE_FIREBASE_API_KEY
    VITE_FIREBASE_APP_ID
    VITE_FIREBASE_AUTH_DOMAIN
    VITE_FIREBASE_MESSAGING_SENDER_ID
    VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET
    VITE_VAPID_KEY

Se comparó el conjunto de variables de `.env.test.example` contra los `build.args` definidos en `docker-compose.yml`.

Los dos conjuntos coincidieron exactamente.

No se agregaron:

    VITE_AGROFUSION_LOGIN_URL
    VITE_SW

debido a que todavía no forman parte del contrato Docker validado.

Resultado: **Correcto**.

### Validación de protección de archivos TEST

Antes de modificar `.gitignore`:

    env-test-ignore-exit=1

Después de agregar la regla `.env.test`:

    env-test-ignore-exit=0

Para `.env.test.example`:

    env-test-example-ignore-exit=1

Esto confirma que el archivo con valores reales quedará ignorado mientras que la plantilla seguirá siendo versionable.

Resultado: **Correcto**.

### Preparación local de `.env.test`

Se creó localmente:

    .env.test

El archivo se generó a partir de:

    .env.test.example

Para la validación técnica local se configuró únicamente una URL temporal y deliberadamente no válida para Backend:

    https://backend-test.invalid/api

El dominio `.invalid` se utiliza exclusivamente para evitar confundir esta prueba con una integración real.

Las variables Firebase/VAPID permanecen vacías durante esta validación técnica.

Se comprobó que:

    .env.test

está ignorado por Git mediante la regla agregada a `.gitignore`.

También se comprobó que no está rastreado:

    env-test-tracked-exit=1

El estado de variables se verificó sin mostrar sus valores:

    VITE_API_BASE_URL=SET
    VITE_FIREBASE_API_KEY=EMPTY
    VITE_FIREBASE_AUTH_DOMAIN=EMPTY
    VITE_FIREBASE_PROJECT_ID=EMPTY
    VITE_FIREBASE_STORAGE_BUCKET=EMPTY
    VITE_FIREBASE_MESSAGING_SENDER_ID=EMPTY
    VITE_FIREBASE_APP_ID=EMPTY
    VITE_VAPID_KEY=EMPTY

Compose fue validado utilizando directamente `.env.test`.

Resultado:

    compose-env-test-exit=0

Esta configuración se utilizará únicamente para validar:

- construcción de la imagen;
- ejecución del contenedor;
- Nginx;
- navegación SPA básica;
- seguridad del puerto.

No constituye validación de:

- integración Frontend - Backend;
- Firebase;
- Firebase Cloud Messaging;
- notificaciones push.

### Validación estructural de Compose TEST

Se validó la configuración utilizando valores controlados y sin utilizar secretos reales.

Comando equivalente:

    docker compose -f docker-compose.test.yml config --quiet

Resultado:

    compose-test-config-exit=0

Se consultaron los servicios reconocidos por Compose.

Resultado:

    frontend

No se detectaron servicios adicionales.

También se realizó una prueba negativa dejando `VITE_API_BASE_URL` sin valor.

Compose rechazó correctamente la configuración con el mensaje:

    required variable VITE_API_BASE_URL is missing a value

Resultado:

    missing-api-url-exit=1

Esto evita construir accidentalmente un Frontend TEST sin una URL explícita para Backend.

Resultado general: **Correcto**.

### Construcción de la imagen Frontend TEST

Se ejecutó la construcción real del servicio `frontend` utilizando:

    docker compose --env-file .env.test -f docker-compose.test.yml build frontend

Durante el proceso se ejecutaron correctamente:

    pnpm install --frozen-lockfile
    tsc
    vite build

Vite transformó 2957 módulos y generó el directorio de producción `dist`.

La imagen final creada fue:

    sgpmp-frontend-test-frontend:latest

Tamaño observado:

    80MB

Resultado:

    frontend-test-build-exit=0

Resultado general: **Correcto**.

Durante el build Vite emitió una advertencia indicando que algunos chunks superan 500 kB después de minificación.

La advertencia no impidió la construcción y se considera un hallazgo de optimización del Frontend, no un error del ambiente TEST.

La construcción con variables Firebase/VAPID vacías valida únicamente la capacidad de compilación actual. No constituye una validación funcional de Firebase o FCM.

### Ejecución y smoke test del Frontend TEST

Se levantó el servicio mediante:

    docker compose --env-file .env.test -f docker-compose.test.yml up -d frontend

Resultado:

    frontend-test-up-exit=0

El contenedor creado fue:

    sgpmp-frontend-test-frontend-1

Compose reportó:

    Up
    80/tcp

Los logs de Nginx mostraron inicialización completa y arranque de los procesos worker sin errores críticos.

### Validación de seguridad del puerto

Se comprobó la publicación de puertos del contenedor.

`docker port` no devolvió ningún mapeo hacia el host.

Docker inspect reportó:

    PortBindings={}

Por tanto, el puerto 80 permanece únicamente interno al contenedor.

Resultado: **Correcto**.

### Validación HTTP y fallback SPA

Las solicitudes realizadas desde el interior del contenedor produjeron:

    /                         -> HTTP 200, 2358 bytes
    /login                    -> HTTP 200, 2358 bytes
    /dashboard                -> HTTP 200, 2358 bytes
    /ruta-inexistente-test    -> HTTP 200, 2358 bytes

Los cuatro archivos devueltos presentaron el mismo SHA-256:

    e08861a7f64bd5a768ad8835f657adc3da79be0cf1bf1a694f355830e8062e7d

Las comparaciones produjeron:

    root-login-same=0
    root-dashboard-same=0
    root-fake-same=0

Esto confirma que Nginx entrega `index.html` como fallback para rutas gestionadas por React.

Resultado: **Correcto**.

### Validación de `VITE_API_BASE_URL` en el bundle

Se buscó en los assets construidos la URL técnica utilizada para esta prueba:

    https://backend-test.invalid/api

La URL fue encontrada en los bundles principal y legacy.

También se buscó:

    http://localhost:8000

No se encontraron coincidencias en los assets construidos.

Esto confirma que `VITE_API_BASE_URL` fue incorporada correctamente durante el build.

Esta validación utiliza una URL técnica temporal y no constituye todavía integración real con Backend TEST.

Resultado: **Correcto**.

### Validación de integridad de DEV

Se compararon los archivos de configuración compartidos contra la rama base:

    origin/integration-v2

Resultados:

    docker-compose.yml -> dev-compose-diff-exit=0
    Dockerfile         -> dockerfile-diff-exit=0
    nginx.conf         -> nginx-diff-exit=0
    .env.example       -> env-example-diff-exit=0

Por tanto, ninguno de estos archivos fue modificado durante la preparación del ambiente TEST.

Al consultar los archivos rastreados modificados respecto de la rama base se obtuvo únicamente:

    M .gitignore

El cambio en `.gitignore` corresponde exclusivamente a la protección de:

    .env.test

Resultado: **Correcto**.

### Revisión previa al commit

Se realizó una revisión controlada del contenido preparado para versionamiento.

Los archivos incluidos en staging fueron exclusivamente:

    .env.test.example
    .gitignore
    docker-compose.test.yml
    docs/SEGUIMIENTO-ENTORNO-TEST.md

Se comprobó que:

    .env.test

no fue incluido en staging.

Resultado:

    env-test-staged-exit=1

La versión staged de `.env.test.example` fue revisada y no contiene variables con valores configurados.

También se ejecutó:

    git diff --cached --check

Resultado:

    staged-diff-check-exit=0

Se realizó una búsqueda de firmas típicas de secretos sobre las líneas agregadas al staging.

El primer intento produjo código 2 porque `grep` interpretó el patrón que comenzaba por `-----BEGIN` como una opción.

El comando fue corregido utilizando `grep -Eq --`.

Resultado final:

    staged-secret-signature-exit=1

El valor 1 confirma que no se encontraron coincidencias con las firmas de secretos revisadas.

Finalmente se volvió a validar Compose con el archivo local `.env.test`.

Resultado:

    precommit-compose-exit=0

Resultado general de revisión pre-commit: **Correcto**.

### Validación local Frontend TEST - Backend TEST - PostgreSQL TEST

Después de validar Frontend TEST y Backend TEST de manera independiente se realizó una prueba local integrada.

Se utilizaron archivos locales:

    docker-compose.local.yml

ignorados mediante `.git/info/exclude` y no destinados a versionarse.

La publicación temporal fue:

    Frontend TEST: 127.0.0.1:8080 -> 80
    Backend TEST: 127.0.0.1:8000 -> 8000

PostgreSQL TEST permaneció sin publicación de puerto hacia el host.

#### Reconstrucción local del Frontend

Debido a que las variables `VITE_*` se incorporan durante el build, el Frontend fue reconstruido utilizando:

    VITE_API_BASE_URL=http://127.0.0.1:8000/api

La construcción finalizó correctamente.

El contenedor quedó disponible mediante:

    http://127.0.0.1:8080

Se comprobó:

    GET / -> HTTP 200
    GET /login -> HTTP 200

El binding real quedó limitado a:

    127.0.0.1:8080 -> 80

#### Validación del bundle

Dentro de los archivos estáticos servidos por Nginx se comprobó la presencia de:

    http://127.0.0.1:8000/api

También se verificó que no permanecieran:

    https://backend-test.invalid/api
    http://localhost:8000

Por tanto, la imagen utilizada en la prueba local fue construida con la URL esperada.

#### Validación de CORS local

Desde:

    http://127.0.0.1:8080

se comprobó la preflight contra:

    OPTIONS http://127.0.0.1:8000/api/sesiones/

Resultado:

    HTTP 200
    access-control-allow-origin: http://127.0.0.1:8080
    access-control-allow-credentials: true

También:

    GET http://127.0.0.1:8000/health -> HTTP 200

con el mismo origen.

CORS funcionó correctamente para la prueba local.

Esta evidencia no sustituye la futura validación con los dominios HTTPS públicos reales de TEST.

#### Solicitud real desde navegador

El Frontend utiliza:

    POST /sesiones/

sobre `VITE_API_BASE_URL`.

Por tanto, durante la prueba local el navegador realizó:

    POST http://127.0.0.1:8000/api/sesiones/

Se utilizó deliberadamente una cuenta ficticia y una contraseña no real.

Resultado observado mediante DevTools:

    Request Method: POST
    Status Code: 401 Unauthorized
    error_code: CREDENCIALES_INVALIDAS

El resultado era esperado y confirma que la solicitud real del Frontend alcanzó la lógica de autenticación del Backend.

No se utilizó ni modificó una cuenta TEST real.

#### Confirmación del recorrido hasta PostgreSQL

La inspección del Backend confirmó que el endpoint de login utiliza:

    SqlAlchemyUsuarioRepository(db)

y ejecuta una consulta mediante:

    self.db.query(Usuarios)
        .filter(...)
        .first()

La sesión SQLAlchemy utilizada por Backend TEST apunta a:

    driver = postgresql
    host = db
    port = 5432
    database = sgpmp_test

Por tanto, la prueba confirma el recorrido técnico:

    Frontend TEST
        ->
    Backend TEST
        ->
    SQLAlchemy
        ->
    PostgreSQL TEST

Resultado de integración local: **Correcto**.

La prueba no valida un inicio de sesión exitoso con una cuenta TEST real ni la comunicación mediante los futuros dominios HTTPS públicos.

## 14. Errores encontrados

Ninguno durante la preparación inicial de la rama TEST.

## 15. Pendientes

- Determinar la URL pública HTTPS definitiva del Backend TEST para el despliegue.
- Confirmar con Desarrollo el tratamiento de `VITE_AGROFUSION_LOGIN_URL`.
- Confirmar si `VITE_SW` debe formar parte del ambiente TEST.
- Validar las variables Firebase requeridas para TEST.
- Validar nuevamente el bundle con la URL pública HTTPS definitiva del Backend TEST cuando sea definida.
- Validar la integración desplegada Frontend TEST - Backend TEST utilizando las URLs públicas definitivas.
- Comprobar nuevamente CORS con la URL HTTPS pública real del Frontend TEST.
- Documentar progresivamente los resultados.

## 16. Evidencias

Las evidencias se agregarán progresivamente durante la configuración y validación del ambiente.

## 17. Estado actual

**En progreso.**

La rama TEST se encuentra creada correctamente desde `origin/integration-v2`.

Se completó la auditoría inicial de:

- Docker Compose DEV;
- Dockerfile;
- Nginx;
- variables Vite;
- configuración HTTP;
- archivos `.env`;
- `.dockerignore`.

La configuración TEST fue creada y la imagen Frontend TEST fue construida correctamente.

El contenedor Frontend TEST fue levantado y validado de forma independiente.

Posteriormente se realizó una integración local controlada con Backend TEST y PostgreSQL TEST utilizando bindings exclusivos a `127.0.0.1`.

Se comprobó:

- Frontend TEST disponible en `http://127.0.0.1:8080`;
- bundle construido con `http://127.0.0.1:8000/api`;
- CORS local correcto;
- solicitud real `POST /api/sesiones/` desde navegador;
- recorrido técnico Frontend TEST - Backend TEST - PostgreSQL TEST.

Continúan pendientes las URLs HTTPS definitivas, Firebase/AgroFusion según definición de Desarrollo y la validación final una vez desplegado TEST.
