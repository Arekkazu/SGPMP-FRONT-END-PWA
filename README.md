# SGPMP Frontend

Sistema de Gestión y Planificación para el Mercado Pecuario — cliente multiplataforma (web, iOS, Android).

## Stack

| Componente | Tecnología |
|---|---|
| Framework UI | Ionic Framework 8 + React 19 |
| Build | Vite 5 |
| Native | Capacitor 8 (iOS / Android) |
| Lenguaje | TypeScript 5 (strict) |
| Enrutamiento | React Router 5 |
| HTTP | Axios (interceptor JWT global) |
| Persistencia local | Dexie.js (IndexedDB) |
| Offline | Service Worker + Background Sync |
| Notificaciones | Firebase Cloud Messaging + Capacitor Push |
| Iconos | Lucide React |
| Tipografía | Plus Jakarta Sans (UI) · JetBrains Mono (código) |
| Testing unitario | Vitest |
| Testing E2E | Cypress 13 |

## Arquitectura: Screaming Architecture + Capas de Dominio

Se organiza el código gritando el dominio del negocio (pecuario), no el framework. Cada módulo de negocio es independiente y sigue una arquitectura por capas.

### Regla de dependencia

```
Page → Hook → [API | DB] → Tipos de dominio
```

Nunca invertida: un componente no llama `http.ts` directamente, un hook no importa de otro módulo.

### Capas de cada módulo

| Capa | Responsabilidad | Dependencias |
|---|---|---|
| **Page** | Componente `IonPage`, punto de entrada, composición | Hooks del módulo, componentes de presentación |
| **Hook** | Orquesta lectura/escritura, offline, sincronización | `api/`, `db/`, `syncQueue` |
| **API** | Capa Axios delgada, mapeo a tipos de dominio | Backend FastAPI |
| **DB** | Lectura/escritura Dexie, índices | IndexedDB (navegador) |
| **Component** | Presentación, sin lógica de negocio | Props tipadas, callbacks |

### Módulos de negocio

| Módulo | Carpeta | Responsabilidad |
|---|---|---|
| Autenticación | `auth/` | Login, sesión JWT, refresh token |
| Usuarios (Admin) | `usuarios/` | CRUD de usuarios, roles, permisos |
| Dashboard | `dashboard/` | KPIs, vistas principales, telemetría en tiempo real |
| Activos Biológicos | `biological_assets/` | Ciclo de vida: nacimiento, crecimiento, producción, baja |
| IoT Telemetría | `telemetry/` | Captura DHT22/pH, sincronización, histórico |
| Predicción ML | `prediction/` | Modelos por especie, riesgo de contagio |
| Suministros | `supplies/` | Costos alimento/medicamentos, MANTENIMIENTO/INVERSIÓN |
| NIC 41 Valuación | `nic41_valuation/` | Valor razonable, cierre contable, trazabilidad |
| Business Intelligence | `business_intelligence/` | Reportes, dashboards, análisis NIIF |
| Configuración | `configuration/` | Catálogo especies, fincas, dispositivos IoT |

Cada módulo contiene `api/`, `db/`, `components/`, `pages/`, `hooks/`, `types.ts`.

### Estructura del proyecto

```
src/
├── shared/                        ← Utilidades transversales
│   ├── design-system/             ← Tokens CSS + componentes base (Button, Input, etc.)
│   ├── db/                        ← Instancia Dexie central (AppDB)
│   ├── api/                       ← Instancia Axios + interceptores JWT
│   ├── auth/                      ← AuthContext, tokenStore, useAuth
│   ├── rbac/                      ← Control de acceso visual (usePermission)
│   ├── sync/                      ← Cola de operaciones offline (syncQueue)
│   └── hooks/                     ← useOnlineStatus, useTheme, useToast
│
├── auth/                          ← Módulo: Autenticación
├── usuarios/                      ← Módulo: Gestión de usuarios
├── dashboard/                     ← Módulo: Dashboard
├── biological_assets/             ← Módulo: Activos biológicos
├── telemetry/                     ← Módulo: IoT Telemetría
├── prediction/                    ← Módulo: Predicción ML
├── supplies/                      ← Módulo: Suministros
├── nic41_valuation/               ← Módulo: Valuación contable
├── business_intelligence/         ← Módulo: Business Intelligence
├── configuration/                 ← Módulo: Configuración
│
├── App.tsx                        ← Rutas raíz, IonApp, proveedores
├── main.tsx                       ← Punto de entrada, registro del Service Worker
└── vite-env.d.ts
```

## Sistema de Diseño

### Tokens CSS

Todos los colores, espaciados, tipografía y sombras son variables CSS definidas en `:root` y sobreescritas en `[data-theme="dark"]`. **Nunca hardcodear valores.**

**Paleta** — Brand (azul), Neutral (grises), Semántica (success/warning/error/info), Superficie, Texto

**Espaciado** — `--s1` (4px) a `--s10` (64px), múltiplos de 4

**Border radius** — `--r-sm` (4px) a `--r-full` (9999px)

**Tipografía** — display-xl, heading-md, body-md, label-md, mono-md (incluye weights y responsive móvil)

### Componentes del sistema

| Componente | Variantes | Estados |
|---|---|---|
| `Button` | primary, secondary, danger, ghost | sm, md, lg; hover, focus, active, disabled |
| `Input` | default, focus, error, success, disabled | icono leading/trailing, toggle contraseña |
| `Badge` | por rol admin/productor/vet/etc. | activo, inactivo, bloqueado, pendiente |
| `Alert` | error, warning, success, info | persistente o auto-dismiss (4s/6s) |
| `Switch` | checked/unchecked | animación 0.2s |
| `Table` | sticky header, paginación 50/página | collapse responsive en móvil |
| `Gauge` | ok, warning, critical, placeholder | visualización de estado |
| `Sidebar` | fixed 240px (lg+), collapsible icons (md), drawer (xs/sm) | navegación principal |
| `AppBar` | 64px mínimo | logo, toggle tema, badge notificaciones |

### Reglas no negociables

-  Variables CSS + tokens: punto único de cambio light/dark
-  Componentes `shared/design-system/` en lugar de `<IonButton>` crudo
-  Lucide React para iconos (20px UI, 24px navegación, stroke 1.5px)
-  Todo icono interactivo lleva `aria-label` (WCAG 2.1)
-  Validar formularios en `blur`, no en cada keystroke
-  Touch target mínimo 48px (`--s9`) — WCAG 2.5.5
-  Dark mode vía `[data-theme="dark"]` en `<html>`
-  Nunca usar color como único indicador de estado
-  Máximo 3 toasts simultáneos

### Grid y breakpoints

| Breakpoint | Rango | Columnas | Gutter |
|---|---|---|---|
| xs | 0–639px | 4 | 16px |
| sm | 640–767px | 8 | 16px |
| md | 768–1023px | 8 | 20px |
| lg | 1024–1279px | 12 | 24px |
| xl | ≥1280px | 12 | 24px |

## Estrategia Offline (Service Worker + Dexie.js + Background Sync)

### Con red

```
Hook → api/ (Axios) → backend FastAPI
                          ↓
                    db/ (Dexie)
```

### Sin red

```
Hook → api/ falla → db/ (Dexie)
              ↓
        syncQueue → persiste operación
              ↓
        Service Worker registra BackgroundSync
```

### Al recuperar conectividad

Service Worker dispara `sync` event → `syncQueue.replay()` → reintentos → caché actualizado

### Campo `version` en registros

Evita sobrescrituras. Si `version` difiere entre cliente y servidor → HTTP 412 → marcar para revisión manual (especialmente en eventos sanitarios de trazabilidad legal).

## Autenticación

```
Login → POST /auth/login → { access_token, expires_in }
              ↓
        tokenStore.set(access_token)  ← variable de módulo (no localStorage)
              ↓
        refresh_token  ← httpOnly cookie (automático)
              ↓
        AuthContext emite usuario + permisos
```

### Interceptor Axios (`shared/api/http.ts`)

- Request: añade `Authorization: Bearer {token}`
- Response 401: limpia sesión + redirect `/login`
- Response 5xx: envuelve en `ApiError`

**Reglas:**

- JWT en memoria, nunca en `localStorage` — se vacía al cerrar tab
- Refresh token en httpOnly cookie — no accesible desde JS
- Login deshabilitado offline — no se puede verificar credenciales sin red

## RBAC (Control de Acceso Visual)

El backend es la fuente de verdad. El frontend solo oculta/deshabilita elementos.

```typescript
const puedeCrear = usePermission(idRecurso, idAccion); // → boolean

<Button disabled={!puedeCrear} onClick={handleCrear}>
  Nuevo
</Button>
```

**Reglas:**

- Nunca bloquear navegación — el servidor rechaza la petición
- Si falta permiso → renderizar `<PermissionDenied>` inline
- Nunca hardcodear IDs de rol — son datos de DB
- JWT es fuente de verdad de permisos

## Desarrollo

### Requisitos

- Node.js 18+ (recomendado 20 LTS)
- npm 9+ o pnpm 8+

### Setup

```bash
# Clonar y entrar
git clone <repo>
cd sgpmp-frontend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con valores locales
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173. Vite recarga al cambiar archivos.

### Build para producción

```bash
npm run build
```

Genera `dist/` listo para deploy.

### Preview de production

```bash
npm run preview
```

Simula el comportamiento de producción localmente (incluye Service Worker si `VITE_SW=true`).

## Testing

### Unitario (Vitest)

```bash
npm run test
npm run test:ui        # interfaz web
npm run test:cov       # reporte de cobertura
```

Prueba hooks (`hooks/`), utilidades (`shared/`), mocks de `api/` y `db/`.

### E2E (Cypress)

```bash
npm run cypress:open   # interfaz interactiva
npm run cypress:run    # headless
```

Prueba happy paths por módulo: login, CRUD, flujos offline. Requiere que el backend esté corriendo.

## Variables de entorno requeridas

Ver `.env.example`. Las obligatorias:

```env
# Backend
VITE_API_BASE_URL=http://localhost:8000

# Firebase Cloud Messaging
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_VAPID_KEY=

# Service Worker (desarrollo offline)
VITE_SW=false
```

Todas comienzan con `VITE_` — son expuestas por Vite al bundle JS. **Nunca secretos del servidor aquí.**

## Convenciones

| Aspecto | Regla |
|---|---|
| **Carpetas** | `snake_case`, nombre del módulo de negocio en inglés |
| **Clases/Componentes** | `PascalCase` |
| **Funciones/variables** | `snake_case` |
| **Constantes** | `UPPER_SNAKE_CASE` |
| **Commits** | Convencional: `feat:`, `fix:`, `refactor:`, `docs:`, etc. |
| **Estilos** | CSS Modules (`.module.css`) junto al componente |
| **Props** | Interfaz explícita, nunca `any` |
| **Sin** | `console.log` en producción, valores hardcodeados de color/espaciado, importes cruzados entre módulos |

## Integración con Capacitor (PWA + iOS/Android)

El mismo código se ejecuta en navegador, iOS y Android. Las APIs nativas (push, haptics, status bar) se acceden vía plugins Capacitor que degradan gracefully en web.

```bash
# Build para iOS/Android
npm run build
npx cap copy
npx cap open ios    # Xcode
npx cap open android # Android Studio
```

Nunca importar Capacitor en `shared/design-system/` o lógica de negocio — solo en adaptadores específicos.

## Estructura de commits y PRs

- Rama de desarrollo: `feature/<nombre>`
- Base para PR: `main`
- Mensaje: descriptivo, referencia a módulos (`feat: supplies module — cost breakdown`)
- Descripción PR: incluye testing manual, screenshots de UI, notas de offline/RBAC si aplica

## Recursos

- **CLAUDE.md** — Documentación detallada de arquitectura, sistema de diseño, offline, testing
- **Cypress Tests** — `cypress/e2e/` para flujos end-to-end
- **Design System** — `src/shared/design-system/tokens.css` y componentes base
