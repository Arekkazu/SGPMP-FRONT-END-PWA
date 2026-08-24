# Seguimiento del Ambiente TEST - Frontend SGPMP

## 1. Objetivo

Preparar, validar y dejar listo para entrega a Despliegue un ambiente TEST independiente para el Frontend del proyecto SGPMP, tomando como referencia la configuración de Desarrollo y sin modificar el funcionamiento de la rama `dev`.

El trabajo contempla:

- configuración Docker específica para TEST;
- variables de build propias del ambiente;
- seguridad y control de exposición de puertos;
- integración con Backend TEST;
- validaciones de construcción y ejecución;
- sincronización final con la rama `dev` vigente;
- registro de comandos, resultados, hallazgos, evidencias y pendientes.

## 2. Alcance

Este documento cubre únicamente el trabajo del repositorio Frontend correspondiente al ambiente TEST.

No se realiza configuración de producción.

La rama `dev` se utiliza como referencia funcional y técnica. No se realizan cambios directos, commits ni `push` sobre `dev` desde este trabajo.

El archivo `docker-compose.yml` de Desarrollo se conserva como configuración DEV. La configuración propia de TEST se mantiene separada en:

    docker-compose.test.yml
    .env.test.example

Los archivos locales con valores reales, como `.env.test`, no se versionan.

Implementación no instala, configura ni mantiene el stack de herramientas del equipo de Pruebas. Las herramientas E2E, accesibilidad, carga y seguridad son responsabilidad del equipo de Pruebas sobre el ambiente TEST entregado.

## 3. Repositorio, rama inicial y rama de trabajo

Repositorio:

    Arekkazu/SGPMP-FRONT-END-PWA

Rama base utilizada al iniciar el trabajo:

    origin/integration-v2

Commit base inicial:

    ef30a761a8f9d629d2f909b8671c844cdafa48b3

Rama de trabajo:

    feat/ambiente-test

La rama fue creada inicialmente desde `origin/integration-v2` utilizando `--no-track`.

Posteriormente, una vez Desarrollo avanzó sobre `dev`, la rama TEST fue sincronizada con la rama `origin/dev` vigente, sin modificar `dev`.

Referencia `origin/dev` incorporada durante la sincronización final:

    dc31301

Commit de merge generado en la rama TEST:

    c096ffa merge: incorpora cambios de dev en ambiente test

Después del merge se verificó:

    git rev-list --left-right --count origin/dev...HEAD

Resultado:

    0 6

Interpretación:

- `0`: la rama TEST no tiene commits pendientes por incorporar desde `origin/dev`;
- `6`: la rama TEST conserva cinco commits propios previos de TEST más el commit de merge.

Por tanto, al cierre técnico de esta etapa, `feat/ambiente-test` contiene el `dev` vigente utilizado durante la validación y mantiene sus cambios TEST de forma separada.

## 4. Estado inicial del repositorio

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

La rama `feat/ambiente-test` fue creada desde esa referencia y se validó que `HEAD` y `origin/integration-v2` apuntaran inicialmente al mismo commit.

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

El Compose DEV utiliza:

    expose:
      - "80"

No existe publicación directa del puerto mediante `ports`.

### Configuración Nginx vigente después de sincronizar con DEV

La versión actual de `nginx.conf` incorporada desde `dev` mantiene el fallback SPA hacia `index.html` y agrega una política explícita de caché.

Comportamientos relevantes:

- las rutas que no corresponden a archivos físicos caen a `index.html`;
- `index.html` se sirve con `Cache-Control: no-cache`;
- los assets con hash pueden mantenerse en caché con política `public, immutable`.

Este ajuste evita que un navegador conserve un `index.html` antiguo que apunte a bundles generados con un `VITE_API_BASE_URL` previo después de reconstruir la imagen.

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

## 7. Comunicación con Backend y autenticación

El cliente HTTP se encuentra configurado en:

    src/shared/api/http.ts

Utiliza:

    import.meta.env.VITE_API_BASE_URL

Si la variable no existe utiliza como fallback:

    http://localhost:8000

Para el ambiente TEST desplegado no debe utilizarse `localhost` como URL definitiva.

La URL pública HTTPS definitiva del Backend TEST será configurada por Despliegue mediante:

    VITE_API_BASE_URL

La plantilla de TEST indica que debe incluirse el prefijo `/api` si corresponde a la exposición definitiva.

### Cambios de autenticación incorporados desde DEV

La sincronización con `dev` incorporó cambios relevantes en el flujo HTTP y de autenticación:

- Axios utiliza `withCredentials: true`;
- existe manejo de refresh mediante `/sesiones/refresh`;
- las solicitudes 401 por token expirado pueden disparar refresh y reintento;
- existe recuperación silenciosa de sesión al recargar la aplicación;
- el refresh token se maneja mediante cookie HTTP-only desde Backend;
- el logout y el manejo de sesión fueron actualizados en Desarrollo.

Esto implica que en TEST desplegado debe existir coherencia entre:

    Frontend TEST HTTPS
        ->
    Backend TEST HTTPS

junto con la configuración correspondiente de CORS y cookies del Backend.

Para la validación local integrada se utilizó:

    VITE_API_BASE_URL=http://127.0.0.1:8000/api

Este valor fue utilizado únicamente para la prueba local y no corresponde a la URL definitiva de TEST.

## 8. Seguridad de archivos de entorno

Existe un archivo local:

    .env

Se comprobó que está ignorado por Git mediante la regla:

    .env

También se comprobó que no está rastreado por Git.

Resultado histórico:

    env-tracked-exit=1

El archivo `.dockerignore` excluye:

    .env
    .env.*

Por tanto, los archivos locales de entorno no entran al contexto utilizado durante el build de Docker.

No se mostraron ni documentaron sus valores reales.

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

permanece disponible para versionamiento.

En la validación final, Git confirmó nuevamente:

    .gitignore:17:.env.test .env.test

Por tanto:

- `.env.test` queda protegido de Git;
- `.env.test.example` puede versionarse;
- los valores reales del ambiente TEST no se almacenan en el repositorio.

## 9. Hallazgos de variables y configuración

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

Sin embargo, durante la auditoría inicial la variable no formaba parte del contrato Docker documentado en:

- `docker-compose.yml`;
- `Dockerfile`;
- `.env.example`.

Implementación no la agregó silenciosamente al contrato TEST.

Pendiente: confirmar con Desarrollo si debe incorporarse formalmente.

### `VITE_SW`

El archivo `.env` local contenía el nombre:

    VITE_SW

La búsqueda inicial encontró referencias relacionadas con pruebas del Service Worker, pero no se encontró uso directo en el código fuente inspeccionado durante esa auditoría.

No fue agregada al contrato TEST.

### Gestor de paquetes

El `Dockerfile` utiliza `pnpm` mediante Corepack.

El proyecto utiliza:

    pnpm-lock.yaml
    pnpm-workspace.yaml

## 10. Arquitectura TEST implementada

El ambiente TEST se mantiene separado de DEV.

Archivos principales:

    docker-compose.test.yml
    .env.test.example

El servicio TEST conserva:

- `target: prod`;
- Nginx como servidor final;
- puerto interno `80`;
- ausencia de `ports` en el Compose TEST base;
- variables Vite inyectadas durante build;
- `restart: unless-stopped`.

El Frontend TEST no se conecta directamente a PostgreSQL.

La comunicación con Backend se realiza desde el navegador del usuario mediante la URL HTTPS pública del Backend TEST configurada en:

    VITE_API_BASE_URL

No se agregó una red Docker compartida entre Frontend, Backend, PostgreSQL o AIoT para el Compose TEST del Frontend.

## 11. Archivos propios del ambiente TEST

Se crearon:

    docs/SEGUIMIENTO-ENTORNO-TEST.md
    .env.test.example
    docker-compose.test.yml

Se modificó:

    .gitignore

El cambio en `.gitignore` corresponde a la protección de:

    .env.test

Después de sincronizar con `dev`, se verificó:

    git diff --name-status origin/dev..HEAD

Resultado:

    A  .env.test.example
    M  .gitignore
    A  docker-compose.test.yml
    A  docs/SEGUIMIENTO-ENTORNO-TEST.md

Esto confirma que, respecto al `dev` incorporado, los cambios propios de la rama corresponden exclusivamente al ambiente TEST y su documentación.

## 12. Seguridad y exposición de puertos

El Compose TEST entregable contiene:

    expose:
      - "80"

No contiene publicación directa mediante `ports`.

Por tanto, el puerto 80 queda disponible únicamente dentro del entorno Docker y está preparado para ser expuesto externamente por la capa de proxy/reverse proxy administrada por Despliegue.

Arquitectura esperada en despliegue:

    Internet
        -> HTTPS :443
        -> Traefik / Dokploy
        -> Frontend Nginx :80 interno

Para validaciones locales se utilizó un override no versionado:

    docker-compose.local.yml

con:

    127.0.0.1:8080:80

Este binding limita el acceso local a loopback y evita publicar el servicio en `0.0.0.0`.

El override local está excluido mediante `.git/info/exclude` y no forma parte de la entrega.

## 13. Pruebas y validaciones realizadas

### 13.1 Validaciones iniciales de rama y configuración

Se comprobó inicialmente:

    HEAD=ef30a761a8f9d629d2f909b8671c844cdafa48b3
    origin/integration-v2=ef30a761a8f9d629d2f909b8671c844cdafa48b3

Resultado: **Correcto**.

Después de descartar el cambio local no requerido de `package-lock.json` se obtuvo árbol limpio.

Resultado: **Correcto**.

### 13.2 Auditoría del Compose DEV

Se comprobó que:

- existe únicamente el servicio `frontend`;
- utiliza `target: prod`;
- pasa variables `VITE_*` mediante `build.args`;
- utiliza `expose: 80`;
- no utiliza `ports`.

Resultado: **Correcto**.

### 13.3 Diseño y validación de `docker-compose.test.yml`

Se creó un Compose independiente para TEST:

    docker-compose.test.yml

El proyecto Compose se identifica como:

    sgpmp-frontend-test

Contiene únicamente el servicio:

    frontend

La variable `VITE_API_BASE_URL` fue declarada obligatoria mediante interpolación requerida.

Las variables Firebase/VAPID conservan el contrato existente y permiten valor vacío mientras se define su configuración definitiva.

Se validó:

    docker compose --env-file .env.test -f docker-compose.test.yml config --quiet

Resultado final observado:

    compose-check=0

También se había realizado una prueba negativa dejando `VITE_API_BASE_URL` sin valor.

Resultado histórico:

    required variable VITE_API_BASE_URL is missing a value

Esto evita construir accidentalmente un Frontend TEST sin URL explícita del Backend.

Resultado general: **Correcto**.

### 13.4 Validación del contrato de variables TEST

`.env.test.example` contiene:

    VITE_API_BASE_URL
    VITE_FIREBASE_API_KEY
    VITE_FIREBASE_APP_ID
    VITE_FIREBASE_AUTH_DOMAIN
    VITE_FIREBASE_MESSAGING_SENDER_ID
    VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET
    VITE_VAPID_KEY

Durante la validación final se comprobó la presencia de todos esos nombres en `.env.test` sin mostrar sus valores.

No se agregaron al contrato:

    VITE_AGROFUSION_LOGIN_URL
    VITE_SW

por no contar con confirmación formal dentro del contrato Docker revisado.

Resultado: **Correcto**.

### 13.5 Construcción inicial de la imagen Frontend TEST

Durante la etapa inicial se ejecutó la construcción real del servicio `frontend` y finalizaron correctamente:

    pnpm install --frozen-lockfile
    tsc
    vite build

En esa validación inicial Vite transformó 2957 módulos.

Resultado:

    frontend-test-build-exit=0

La advertencia de chunks superiores a 500 kB no bloqueó el build y se clasificó como observación de optimización del Frontend.

### 13.6 Validación inicial de ejecución, Nginx y SPA

Se levantó el contenedor Frontend TEST y se comprobó:

- Nginx inició sin errores críticos;
- el servicio quedó `Up`;
- el puerto 80 no fue publicado por el Compose TEST base;
- las rutas SPA devolvieron `index.html` correctamente.

También se comprobó durante la validación inicial la presencia en el bundle de la URL técnica usada para la prueba y la ausencia del fallback `http://localhost:8000`.

Resultado: **Correcto**.

### 13.7 Integración local Frontend TEST - Backend TEST - PostgreSQL TEST

Para una prueba local integrada se utilizaron archivos `docker-compose.local.yml` no versionados.

Publicación temporal:

    Frontend TEST: 127.0.0.1:8080 -> 80
    Backend TEST: 127.0.0.1:8000 -> 8000

PostgreSQL TEST permaneció sin publicación hacia el host.

El Frontend fue reconstruido con:

    VITE_API_BASE_URL=http://127.0.0.1:8000/api

Se comprobó:

    GET http://127.0.0.1:8080/ -> HTTP 200
    GET http://127.0.0.1:8080/login -> HTTP 200

El bundle contenía:

    http://127.0.0.1:8000/api

Durante la prueba integrada inicial también se verificó una solicitud real del navegador:

    POST http://127.0.0.1:8000/api/sesiones/

utilizando una cuenta ficticia.

Resultado observado:

    HTTP 401 Unauthorized
    error_code: CREDENCIALES_INVALIDAS

El resultado era esperado y confirmó que la solicitud del Frontend alcanzó la lógica de autenticación del Backend.

La inspección del Backend confirmó el recorrido técnico hasta PostgreSQL mediante SQLAlchemy.

Resultado de integración local: **Correcto**.

### 13.8 Sincronización final con `origin/dev`

Antes de incorporar los cambios recientes de Desarrollo se comprobó:

    HEAD local = 87e27d7
    origin/feat/ambiente-test = 87e27d7
    origin/dev = dc31301

La divergencia era:

    origin/dev...HEAD = 19 5

Interpretación:

- `dev` tenía 19 commits que todavía no estaban en TEST;
- TEST tenía 5 commits propios que no estaban en `dev`.

Se creó una rama local de respaldo:

    backup/ambiente-test-pre-dev-sync

apuntando a:

    87e27d7

Se compararon los archivos modificados por ambas ramas.

Cambios propios TEST:

    .env.test.example
    .gitignore
    docker-compose.test.yml
    docs/SEGUIMIENTO-ENTORNO-TEST.md

Cambios provenientes de DEV:

    nginx.conf
    src/App.test.tsx
    src/App.tsx
    src/auth/hooks/useLogout.ts
    src/configuration/api/iotApi.ts
    src/configuration/components/AplicarPlantillaWizard.tsx
    src/configuration/components/ConfiguracionRemotaSection.tsx
    src/configuration/components/PlantillasTable.tsx
    src/configuration/types.ts
    src/shared/api/http.test.ts
    src/shared/api/http.ts
    src/shared/auth/AuthContext.tsx
    src/shared/auth/tokenStore.ts

No existían archivos modificados por ambos lados.

Se ejecutó:

    git merge origin/dev --no-commit --no-ff

Resultado:

    Automatic merge went well; stopped before committing as requested

No se presentaron conflictos.

Se verificó:

    git diff --name-only --diff-filter=U

Resultado: sin salida.

También:

    git diff --cached --check

Resultado:

    staged-check=0

Resultado general: **Merge limpio y controlado**.

### 13.9 Verificación de integridad de los archivos TEST después del merge

Se compararon los archivos propios de TEST contra el respaldo previo a la sincronización:

    .env.test.example
    docker-compose.test.yml
    .gitignore
    docs/SEGUIMIENTO-ENTORNO-TEST.md

Resultado: sin diferencias.

Esto confirmó que los cambios de Desarrollo no sobrescribieron ni alteraron la configuración específica de TEST.

Resultado: **Correcto**.

### 13.10 Rebuild del Frontend TEST con el `dev` actualizado

Con el merge aún pendiente de commit se volvió a construir la imagen mediante:

    docker compose \
      --env-file .env.test \
      -f docker-compose.test.yml \
      -f docker-compose.local.yml \
      build frontend

Durante el proceso se ejecutó:

    tsc && vite build

Resultado observado:

    2958 modules transformed
    built successfully
    frontend-build-exit=0

Se creó correctamente la imagen:

    sgpmp-frontend-test-frontend:latest

La advertencia de chunks superiores a 500 kB se mantuvo como advertencia de optimización y no bloqueó el build.

Resultado: **Correcto**.

### 13.11 Runtime final de Nginx y seguridad de puerto local

Se levantó el Frontend mediante el override local:

    docker compose \
      --env-file .env.test \
      -f docker-compose.test.yml \
      -f docker-compose.local.yml \
      up -d frontend

Resultado:

    frontend-up-exit=0

Compose mostró:

    sgpmp-frontend-test-frontend-1
    Up
    127.0.0.1:8080->80/tcp

Esta publicación corresponde únicamente a la prueba local.

El Compose TEST base sigue sin publicar puertos al host.

Resultado: **Correcto**.

### 13.12 HTTP, SPA y política de caché de Nginx

Se verificó:

    GET / -> HTTP 200

Para `index.html`:

    HTTP/1.1 200 OK
    Content-Type: text/html
    Cache-Control: no-cache

También se comprobó una ruta SPA inexistente:

    /ruta-test-no-existe -> HTTP 200

Esto confirma que el `nginx.conf` actualizado desde `dev` funciona correctamente dentro de TEST.

Resultado: **Correcto**.

### 13.13 Verificación final de `VITE_API_BASE_URL` en el bundle

Dentro del contenedor se buscó:

    http://127.0.0.1:8000/api

La URL fue encontrada en:

    /usr/share/nginx/html/assets/index-legacy-6xpa2Zz7.js
    /usr/share/nginx/html/assets/index-DoreKSeF.js

Esto confirma que la URL configurada durante el build fue incorporada realmente al bundle.

Resultado: **Correcto**.

### 13.14 Validación final Frontend - Backend

Se verificó el Backend local en:

    http://127.0.0.1:8000/health

Resultado:

    HTTP 200

También:

    http://127.0.0.1:8000/api/health

Resultado:

    HTTP 200

Esto confirma que el prefijo `/api` utilizado por el Frontend local es válido con el Backend TEST actual.

Resultado: **Correcto**.

### 13.15 CORS con credenciales

Desde el origen real utilizado por el Frontend local:

    http://127.0.0.1:8080

se ejecutó un preflight hacia Backend.

Respuesta relevante:

    HTTP/1.1 200 OK
    access-control-allow-origin: http://127.0.0.1:8080
    access-control-allow-credentials: true
    access-control-allow-headers: authorization,content-type

La misma validación sobre la variante con `/api` respondió correctamente.

Esto es especialmente relevante porque el cliente HTTP actual utiliza:

    withCredentials: true

Resultado: **Correcto**.

Esta evidencia es local y no sustituye la futura validación con los dominios HTTPS públicos definitivos.

### 13.16 Pruebas unitarias existentes de Desarrollo

Sin instalar ni configurar nuevas herramientas de QA se ejecutó el script ya presente en el repositorio:

    pnpm test.unit --run

Resultado:

    Test Files  2 passed (2)
    Tests       3 passed (3)
    unit-tests-exit=0

Archivos ejecutados:

    src/shared/api/http.test.ts
    src/App.test.tsx

Estas pruebas se utilizaron exclusivamente como validación técnica de que la sincronización con `dev` no rompió el Frontend.

Implementación no asumió la configuración ni mantenimiento de Vitest como herramienta del equipo de Pruebas.

Resultado: **Correcto**.

### 13.17 Validación de lint y hallazgo heredado de DEV

Se ejecutó el script existente:

    pnpm lint

ESLint respondió:

    ESLint couldn't find an eslint.config.(js|mjs|cjs) file.

El comando falló realmente con código de salida 2.

Posteriormente se validó directamente `origin/dev`:

    git ls-tree -r --name-only origin/dev \
      | grep -E '(^|/)(eslint\.config\.(js|mjs|cjs)|\.eslintrc(\..*)?)$'

Resultado:

    SIN_CONFIG_ESLINT_EN_DEV

También se verificó en `origin/dev:package.json`:

    "lint": "eslint"
    "eslint": "^9.20.1"

Conclusión:

- el script `lint` existe;
- ESLint 9 está declarado;
- la configuración requerida por ESLint 9 no existe en `origin/dev`;
- el problema no fue introducido por la rama TEST.

Se clasifica como **hallazgo heredado de Desarrollo**.

Implementación no modificó ESLint ni agregó una configuración propia para ocultar o corregir el problema.

Resultado: **Hallazgo no bloqueante para el ambiente TEST**.

### 13.18 Validación final del merge y comparación con DEV

Antes de cerrar el merge se ejecutó:

    git diff --cached --check

Resultado:

    staged-check=0

Luego se creó el commit:

    c096ffa merge: incorpora cambios de dev en ambiente test

Después se verificó:

    git rev-list --left-right --count origin/dev...HEAD

Resultado:

    0 6

También:

    git diff --name-status origin/dev..HEAD

Resultado:

    A  .env.test.example
    M  .gitignore
    A  docker-compose.test.yml
    A  docs/SEGUIMIENTO-ENTORNO-TEST.md

El árbol de trabajo quedó limpio.

Resultado: **Sincronización con DEV correcta**.

### 13.19 Publicación final de la rama Frontend TEST

Se publicó exclusivamente la rama de trabajo:

    git push origin feat/ambiente-test

Resultado:

    87e27d7..c096ffa  feat/ambiente-test -> feat/ambiente-test

Después se verificó:

    local = c096ffa
    remoto = c096ffa
    local vs remoto = 0 0
    DEV vs feature = 0 6
    working tree = limpio

La publicación no realizó merge ni push hacia:

    dev
    main
    integration-v2

Resultado: **Publicación final correcta**.

## 14. Errores y hallazgos encontrados

### 14.1 Etapa inicial

No se presentaron errores críticos durante la preparación inicial del ambiente TEST.

### 14.2 Advertencia de tamaño de chunks

Vite reportó que algunos chunks superan 500 kB después de minificación.

La advertencia no impide el build y corresponde a optimización del Frontend, no a la configuración del ambiente TEST.

### 14.3 ESLint 9 sin archivo de configuración

Durante la validación final se detectó que:

    pnpm lint

no puede ejecutarse correctamente porque `origin/dev` contiene ESLint 9 pero no incluye `eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs` ni una configuración equivalente compatible.

Se registró como hallazgo heredado de Desarrollo.

No fue corregido por Implementación.

## 15. Ajuste de alcance respecto a herramientas del equipo de Pruebas

Se revisó el documento `Ambiente_Implementación (2).xlsx`, específicamente la hoja `Aprobacion de Ambientes`, con el fin de aclarar las responsabilidades entre Implementación y Pruebas.

La evaluación corregida establece que Implementación no debe instalar, configurar ni mantener herramientas como:

    Cypress
    Playwright
    cypress-axe

De manera general, las herramientas de E2E, accesibilidad, carga y seguridad son operadas por el equipo de Pruebas contra el ambiente TEST entregado por Implementación.

La responsabilidad de Implementación consiste en:

- construir y mantener disponible Frontend TEST;
- preparar su exposición mediante una URL HTTPS estable;
- configurar correctamente la comunicación con Backend TEST;
- comunicar al equipo de Pruebas las URLs y restricciones necesarias;
- mantener el ambiente accesible para que Pruebas ejecute sus propias herramientas.

### Corrección de trabajo realizado por interpretación anterior

Antes de revisar esta aclaración se inició una preparación adicional de herramientas de prueba dentro del repositorio Frontend.

Al identificar la discrepancia se detuvo ese trabajo y se realizó una limpieza controlada.

Se realizó:

- eliminación del `cypress.config.ts` creado por Implementación;
- restauración de `cypress/e2e/test.cy.ts` a su contenido original de Desarrollo;
- retiro de documentación añadida específicamente para validaciones de Cypress y Vitest;
- eliminación de screenshots generados durante ejecución local de Cypress;
- eliminación de caché local `node_modules/.vitest`;
- restauración de la rama al último commit correspondiente al trabajo válido del ambiente TEST.

No se eliminaron Cypress, Vitest ni los archivos de pruebas que ya pertenecían al repositorio de Desarrollo.

Tampoco se instalaron Playwright ni `cypress-axe`.

No se realizó `push` del commit descartado.

Resultado: **Alcance corregido**.

La ejecución posterior de `pnpm test.unit --run` se utilizó únicamente como verificación técnica de los tests unitarios ya incluidos por Desarrollo y no representa adopción, instalación ni mantenimiento del stack de QA por Implementación.

## 16. Pendientes para Despliegue y validación posterior

La configuración técnica del Frontend TEST quedó preparada y publicada.

Continúan pendientes acciones que requieren el ambiente real de Despliegue:

- definir la URL pública HTTPS definitiva del Backend TEST;
- configurar `VITE_API_BASE_URL` con esa URL, incluyendo `/api` según corresponda;
- reconstruir la imagen Frontend después de establecer la URL definitiva, ya que las variables `VITE_*` son build-time;
- definir y cargar las variables Firebase/VAPID requeridas para TEST;
- confirmar con Desarrollo el tratamiento de `VITE_AGROFUSION_LOGIN_URL`;
- confirmar si `VITE_SW` debe formar parte del contrato TEST;
- configurar dominio y HTTPS del Frontend mediante Dokploy/Traefik;
- validar la integración desplegada Frontend TEST - Backend TEST con las URLs públicas reales;
- comprobar CORS con la URL HTTPS pública real del Frontend TEST;
- comprobar el flujo de cookies/refresh en HTTPS real;
- entregar al equipo de Pruebas la URL HTTPS estable y la información necesaria para consumir Backend TEST;
- reportar a Desarrollo el hallazgo de ESLint 9 sin archivo de configuración, si aún permanece vigente.

## 17. Evidencias consolidadas

Evidencias técnicas obtenidas durante el trabajo:

- rama TEST creada y protegida de cambios accidentales en DEV;
- `.env.test` ignorado por Git;
- `.env.test.example` versionable y sin secretos reales;
- Compose TEST validado con `config --quiet`;
- prueba negativa de `VITE_API_BASE_URL` obligatoria;
- build inicial de producción correcto;
- build posterior a sincronización con DEV correcto;
- 2958 módulos transformados en el build final;
- imagen `sgpmp-frontend-test-frontend:latest` creada;
- contenedor Frontend `Up`;
- `GET /` = HTTP 200;
- fallback SPA = HTTP 200;
- `index.html` con `Cache-Control: no-cache`;
- `VITE_API_BASE_URL` encontrada en el bundle generado;
- Backend `/health` = HTTP 200;
- Backend `/api/health` = HTTP 200;
- CORS desde `http://127.0.0.1:8080` = HTTP 200;
- `Access-Control-Allow-Origin` correcto;
- `Access-Control-Allow-Credentials: true`;
- pruebas unitarias = 3/3 aprobadas;
- merge de `origin/dev` sin conflictos;
- `origin/dev...HEAD = 0 6`;
- diferencias respecto de DEV limitadas a archivos TEST;
- publicación final local/remoto = `c096ffa`;
- divergencia local/remoto = `0 0`;
- árbol de trabajo limpio al cierre.

## 18. Estado final

**Configuración técnica del Frontend TEST completada y lista para entrega a Despliegue.**

La rama final es:

    feat/ambiente-test

Commit publicado:

    c096ffa

Estado frente al remoto:

    local = c096ffa
    origin/feat/ambiente-test = c096ffa
    local vs remoto = 0 0

Estado frente a DEV:

    origin/dev...HEAD = 0 6

Esto confirma que la rama TEST contiene el `dev` incorporado durante esta etapa y conserva únicamente sus cambios propios de ambiente TEST por encima de él.

La rama `dev` no fue modificada por este trabajo.

El Frontend TEST fue validado en construcción, ejecución, Nginx, SPA, caché, integración local con Backend, CORS con credenciales y pruebas unitarias existentes.

La seguridad de exposición del servicio quedó preparada mediante `expose: 80` sin publicación directa en el Compose TEST entregable.

El acceso local `127.0.0.1:8080` corresponde únicamente a un override local ignorado y no forma parte de la entrega.

El hallazgo de ESLint se considera heredado de Desarrollo y no bloquea la preparación del ambiente TEST, dado que el build real `tsc && vite build` finalizó correctamente.

La siguiente etapa corresponde a Despliegue: configurar las variables reales, dominios y HTTPS, reconstruir el Frontend con la URL definitiva del Backend TEST y realizar la validación final sobre el ambiente publicado.

## 19. Resumen de cumplimiento

    Configuración Docker TEST                     COMPLETADA
    Separación respecto a DEV                     COMPLETADA
    Protección de .env.test                       COMPLETADA
    Seguridad de exposición del puerto            COMPLETADA
    Build de producción                           COMPLETADO
    Nginx / SPA                                   VALIDADO
    Cache-Control index.html                      VALIDADO
    VITE_API_BASE_URL en bundle                   VALIDADO
    Integración local Frontend -> Backend         VALIDADA
    CORS con credentials                          VALIDADO
    Pruebas unitarias existentes                  3/3 APROBADAS
    Sincronización con origin/dev                 COMPLETADA
    Afectación directa de dev                     NINGUNA
    Publicación feat/ambiente-test                COMPLETADA
    Configuración HTTPS/Dokploy real              PENDIENTE DE DESPLIEGUE
    Variables definitivas del ambiente            PENDIENTE DE DESPLIEGUE
    Validación con URLs públicas reales           PENDIENTE
    ESLint                                         HALLAZGO HEREDADO DE DEV
