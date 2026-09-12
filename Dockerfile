FROM node:22-slim AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Los nueve valores de abajo son PUBLICOS por diseno, no secretos.
#
# Hadolint marca DL3064 ("potentially sensitive data in ARG or ENV") por los
# nombres: contienen API_KEY, SECRET-like, VAPID_KEY. Es un falso positivo
# aqui, y la razon es estructural, no una opinion: el prefijo `VITE_` es
# precisamente el mecanismo con el que Vite EXPONE una variable al bundle del
# cliente. Cualquier valor con ese prefijo termina incrustado en el JavaScript
# que se sirve al navegador y es legible por cualquiera que abra las
# herramientas de desarrollo. Si alguno de estos fuera un secreto real, el
# problema no seria este Dockerfile: seria que esta declarado como `VITE_`.
#
# Cada uno, y por que es publico:
#   - VITE_FIREBASE_*: la configuracion web de Firebase es un identificador de
#     proyecto, no una credencial. Google la documenta como segura de exponer
#     en codigo cliente; el control de acceso real vive en las reglas de
#     seguridad de Firebase, no en ocultar estos valores.
#   - VITE_RECAPTCHA_SITE_KEY: la *site key* es publica por definicion, va en
#     el HTML del widget. La contraparte secreta es RECAPTCHA_SECRET_KEY, que
#     vive en el backend y nunca pasa por aqui.
#   - VITE_VAPID_KEY: es la clave PUBLICA del par VAPID. La privada se queda
#     en el servidor de notificaciones.
#   - VITE_API_BASE_URL: una URL.
#
# Se silencia el aviso en vez de reestructurar el Dockerfile porque no hay nada
# que corregir: la alternativa (leerlos en tiempo de ejecucion) es imposible,
# Vite los resuelve al compilar. Lo que SI debe seguir cumpliendose es la regla
# implicita: no agregar aqui ninguna variable que no sea publica. Si alguna vez
# hace falta un secreto en el frontend, la respuesta correcta es moverlo al
# backend, no pasarlo por un ARG.
#
# El `ignore` va puntual sobre la unica linea que dispara el aviso, no global
# al archivo: asi, si alguien agrega mas adelante un ARG con nombre de
# credencial, Hadolint lo marca en vez de quedar silenciado por herencia.
ARG VITE_API_BASE_URL
ARG VITE_RECAPTCHA_SITE_KEY
# hadolint ignore=DL3064
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_VAPID_KEY

# Mismo motivo que el bloque ARG de arriba: valores publicos por diseno.
# hadolint ignore=DL3064
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_VAPID_KEY=$VITE_VAPID_KEY

RUN pnpm build

FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
