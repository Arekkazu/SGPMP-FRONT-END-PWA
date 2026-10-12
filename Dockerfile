FROM node:22-slim AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_VAPID_KEY

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

# La CSP de nginx.conf necesita el origen de la API. Sale del mismo build arg que
# Vite hornea en el bundle; con un valor vacío o relativo queda en blanco y la
# API cae bajo 'self'. Solo se sustituye ${API_ORIGIN}: $uri y demás son de nginx.
ARG VITE_API_BASE_URL

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /tmp/default.conf.template
RUN API_ORIGIN="$(printf '%s' "$VITE_API_BASE_URL" | sed -nE 's#^(https?://[^/]+).*#\1#p')" \
    envsubst '${API_ORIGIN}' < /tmp/default.conf.template > /etc/nginx/conf.d/default.conf \
 && rm /tmp/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
