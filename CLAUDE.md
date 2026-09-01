# CLAUDE.md — SGPMP Frontend

---

## Qué cubre este documento

- Stack y versiones instaladas
- Estructura de carpetas (Screaming Architecture)
- Arquitectura por capas y flujo de datos
- Sistema de diseño: tokens, componentes y reglas no negociables
- Estrategia offline: Service Worker + Dexie.js + Background Sync
- Autenticación y ciclo de vida del JWT
- Control de acceso (RBAC) en el cliente
- Convenciones de la capa API (Axios)
- Convenciones de componentes y formularios
- Testing
- Variables de entorno requeridas

## Qué NO cubre

- Estado de implementación de módulos o pantallas (ver el código)
- Instrucciones de despliegue o CI/CD
- Contratos de API del backend (ver el CLAUDE.md del backend y Swagger)
- Historial de cambios (ver `git log`)

---

## Stack

| Componente        | Tecnología                                     |
|-------------------|------------------------------------------------|
| Framework UI      | Ionic Framework 8 + React 19                   |
| Build             | Vite 5                                         |
| Native            | Capacitor 8 (iOS / Android)                    |
| IndexedDB         | Dexie.js                                       |
| HTTP              | Axios (interceptor JWT global)                 |
| Routing           | React Router 5 (vía `@ionic/react-router`)     |
| Iconos            | Lucide React                                   |
| Fuentes           | Plus Jakarta Sans (UI) · JetBrains Mono (mono) |
| Notificaciones    | Firebase Cloud Messaging + Capacitor Push      |
| Testing unitario  | Vitest                                         |
| Testing e2e       | Cypress 13                                     |
| Lenguaje          | TypeScript 5 (strict)                          |

---

## Estructura de carpetas (Screaming Architecture)

La estructura grita el dominio del negocio, no el framework. Un directorio por módulo de negocio, espejando la arquitectura del backend.

```
src/
├── shared/                        # Utilidades transversales a todos los módulos
│   ├── design-system/             # Tokens CSS + componentes base
│   │   ├── tokens.css             # CSS custom properties del sistema de diseño
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   ├── Switch.tsx
│   │   ├── Table.tsx
│   │   ├── Gauge.tsx
│   │   ├── Sidebar.tsx
│   │   └── AppBar.tsx
│   ├── db/                        # Instancia Dexie central
│   │   └── db.ts                  # Clase AppDB — define todas las tablas
│   ├── api/                       # Instancia Axios + interceptores
│   │   ├── http.ts                # Axios instance con baseURL + timeout
│   │   └── errors.ts              # Tipo ApiError y mapeo desde HTTP
│   ├── auth/                      # JWT en memoria + contexto de sesión
│   │   ├── AuthContext.tsx        # React.createContext con token y claims
│   │   ├── useAuth.ts             # Hook para acceder a la sesión
│   │   └── tokenStore.ts          # Módulo singleton — guarda el JWT en variable de módulo
│   ├── rbac/                      # Control de acceso visual
│   │   └── usePermission.ts       # Hook: usePermission(idRecurso, idAccion) → boolean
│   ├── sync/                      # Cola de operaciones offline
│   │   └── syncQueue.ts           # Encolar op en Dexie + registrar BackgroundSync tag
│   └── hooks/                     # Hooks genéricos reutilizables
│       ├── useOnlineStatus.ts     # window.navigator.onLine + eventos online/offline
│       ├── useTheme.ts            # Toggle [data-theme="dark"] en <html>
│       └── useToast.ts            # Cola de alertas tipo toast (máx. 3 visibles)
├── auth/                          # Módulo: autenticación
│   ├── api/
│   │   └── authApi.ts             # POST /auth/login, POST /auth/refresh
│   ├── components/
│   │   └── LoginForm.tsx
│   └── pages/
│       └── LoginPage.tsx
├── usuarios/                      # Módulo: gestión de usuarios (admin)
│   ├── api/
│   │   └── usuariosApi.ts
│   ├── db/
│   │   └── usuariosTable.ts       # Tabla Dexie: usuarios cacheados
│   ├── components/
│   │   ├── UsuariosTable.tsx
│   │   └── UsuarioModal.tsx
│   ├── pages/
│   │   └── UsuariosPage.tsx
│   ├── hooks/
│   │   └── useUsuarios.ts
│   └── types.ts                   # TS interfaces: Usuario, RolUsuario, EstadoUsuario
├── dashboard/                     # Módulo: vista principal / KPIs
│   ├── components/
│   ├── pages/
│   │   └── DashboardPage.tsx
│   └── hooks/
│       └── useDashboard.ts
├── {modulo}/                      # Patrón a seguir para cada módulo de negocio futuro
│   ├── api/
│   ├── db/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── types.ts
├── App.tsx                        # Rutas raíz + IonApp + proveedores globales
├── main.tsx                       # createRoot + registro del Service Worker
└── vite-env.d.ts
```

---

## Arquitectura por capas

El flujo de datos sigue esta dirección en todo momento:

```
Page → Hook → [API | DB] → tipos de dominio
```

Nunca al revés: un componente no llama `http.ts` directamente, y un hook de módulo no importa desde otro módulo.

### Page (`{modulo}/pages/`)
Componente `IonPage`. Su responsabilidad es:
- Recibir parámetros de ruta
- Invocar hooks del módulo
- Componer componentes de presentación
- No tiene lógica de negocio ni llamadas directas a `api/` o `db/`

### Hook (`{modulo}/hooks/`)
Orquesta el flujo de datos de un caso de uso. Es la única capa que:
- Decide si servir desde Dexie o desde la red
- Encola operaciones en `syncQueue` cuando hay fallo de red
- Maneja estados de carga, error y éxito
- Retorna datos tipados y callbacks al componente

### API (`{modulo}/api/`)
Capa delgada sobre Axios. Un archivo por recurso backend. Responsabilidades:
- Construir la URL y el body de la petición
- Mapear la respuesta HTTP al tipo de dominio del módulo
- Capturar errores Axios y lanzar `ApiError` antes de devolver al hook
- No contiene lógica de negocio ni llamadas a Dexie

### DB (`{modulo}/db/`)
Capa Dexie del módulo. Responsabilidades:
- Definir los índices de la tabla en `shared/db/db.ts`
- Exponer funciones de lectura/escritura que reciben y devuelven tipos de dominio
- Mapear la fila IndexedDB al tipo de dominio (y viceversa) si difieren
- No conoce Axios, no hace peticiones de red

### Component (`{modulo}/components/`)
Componentes React de presentación. Reciben props tipadas y emiten callbacks. No acceden directamente a la red ni a IndexedDB.

### Design System (`shared/design-system/`)
Componentes base con estilos de tokens y atributos ARIA completos. Son los únicos elementos que implementan los estados visuales del sistema de diseño (focus-visible, error, disabled…). Los módulos los consumen tal cual; no los sobreescriben con estilos propios.

---

## Sistema de diseño

### Tokens CSS (`shared/design-system/tokens.css`)

Todos los valores visuales son variables CSS definidas en `:root` y sobreescritas en `[data-theme="dark"]`. Nunca usar valores fijos en los componentes.

**Paleta de color**

| Grupo     | Variables                                     | Uso                                    |
|-----------|-----------------------------------------------|----------------------------------------|
| Brand     | `--brand-50` … `--brand-900`                  | Acciones primarias, foco               |
| Neutral   | `--neutral-0` … `--neutral-900`               | Texto, fondos, bordes                  |
| Semántico | `--sem-success/warning/error/info`            | Indicadores de estado                  |
| Sem BG    | `--sem-success-bg` … `--sem-info-bg`          | Fondo de alertas y badges              |
| Sem Borde | `--sem-success-border` … `--sem-info-border`  | Borde de alertas y badges              |
| Superficie| `--surface-bg`, `--surface-card`              | Página y tarjetas                      |
| Superficie| `--surface-border`, `--surface-hover`         | Divisores y hover                      |
| Texto     | `--text-primary`, `--text-secondary`          | Texto principal y secundario           |
| Texto     | `--text-muted`, `--text-inverse`              | Ayuda/deshabilitado y texto sobre oscuro|

**Espaciado (múltiplos de 4px)**

| Token  | Valor | Uso frecuente                       |
|--------|-------|-------------------------------------|
| `--s1` | 4px   | Gap icono-etiqueta                  |
| `--s2` | 8px   | Padding badge, gap inline           |
| `--s3` | 12px  | Padding vertical input              |
| `--s4` | 16px  | Padding tarjeta, gap grilla estrecha|
| `--s5` | 20px  | Padding tarjeta md                  |
| `--s6` | 24px  | Padding modal, gap formulario       |
| `--s7` | 32px  | Padding sección                     |
| `--s8` | 40px  | Padding página desktop              |
| `--s9` | 48px  | Altura mínima de touch target       |
| `--s10`| 64px  | Altura App Bar                      |

**Border radius**

`--r-sm` 4px · `--r-md` 8px · `--r-lg` 12px · `--r-xl` 16px · `--r-2xl` 20px · `--r-full` 9999px

**Sombras**

`--shadow-sm` · `--shadow-md` · `--shadow-lg`

**Tipografía**

| Token           | Desktop | Móvil  | Peso    | Uso                     |
|-----------------|---------|--------|---------|-------------------------|
| `display-xl`    | 32px    | 24px   | 800     | Splash / Error 404      |
| `display-lg`    | 26px    | 20px   | 800     | Encabezado de sección   |
| `heading-md`    | 20px    | 17px   | 700     | Título de tarjeta/modal |
| `heading-sm`    | 17px    | 15px   | 700     | Encabezado de tabla     |
| `body-lg`       | 15px    | 15px   | 400/500 | Texto largo, etiquetas  |
| `body-md`       | 14px    | 14px   | 400     | Texto UI por defecto    |
| `body-sm`       | 12px    | 12px   | 400     | Texto de ayuda          |
| `label-md`      | 13px    | 13px   | 600     | Labels de formulario    |
| `label-sm`      | 11px    | 11px   | 600/700 | Badges, microcopia      |
| `mono-md`       | 12px    | 11px   | 400/500 | Código, tokens, IDs     |

### Componentes del sistema de diseño

| Componente | Variantes / Estados                                                     |
|------------|-------------------------------------------------------------------------|
| `Button`   | primary · secondary · danger · ghost; sm · md · lg; hover/focus/active/disabled |
| `Input`    | default · focus · error · success · disabled; icono leading/trailing; toggle contraseña |
| `Badge`    | Rol: admin/productor/vet/contador/ingeniero; Estado: activo/inactivo/bloqueado/pendiente/eliminado |
| `Alert`    | error (persistente) · warning (persistente) · success (4s) · info (6s) |
| `Switch`   | checked/unchecked, 40×22px, animación 0.2s                             |
| `Table`    | sticky header, paginación 50 filas/página, collapse responsive          |
| `Gauge`    | ok · warning · critical · placeholder                                   |
| `Sidebar`  | 240px fixed (lg+) · collapsible icons (md) · drawer overlay (xs/sm)   |
| `AppBar`   | 64px mínimo; logo, toggle de tema, badge de notificaciones              |

### Reglas no negociables del sistema de diseño

| Regla | Por qué |
|-------|---------|
| Nunca valores de color/espaciado hardcodeados en componentes | Un único punto de cambio de tema; los tokens garantizan coherencia en light/dark |
| Nunca `<button>` crudo ni `<IonButton>` directamente en módulos | Los estados de foco, activo y disabled del sistema requieren la lógica del componente `Button` |
| Iconos: Lucide React exclusivamente, 20px UI / 24px navegación | Biblioteca acordada por diseño; stroke 1.5px; nunca usar la biblioteca de iconos de Ionic |
| Todo icono interactivo lleva `aria-label` | WCAG 2.1 SC 1.1.1 — los lectores de pantalla no interpretan iconos SVG sin texto alternativo |
| Validar formularios en `blur`, no en cada keystroke | Evitar ansiedad de validación; excepción: medidor de fortaleza de contraseña |
| Touch target mínimo 48px de altura (`--s9`) | WCAG 2.5.5 — cumplimiento en dispositivos táctiles usados en campo |
| Dark mode vía `[data-theme="dark"]` en `<html>` | Selector único controlado por `useTheme`; nunca media query `prefers-color-scheme` sin respetar la preferencia del usuario guardada |
| Nunca usar color como único indicador de estado | Añadir siempre icono + texto + patrón junto al color (WCAG 1.4.1) |
| Máximo 3 toasts simultáneos | Límite de carga cognitiva definido por diseño |
| Errores de campo van debajo del input con `role="alert"` | Anuncio inmediato para lectores de pantalla; nunca en alerta global |

### Grid y breakpoints

| Breakpoint | Rango         | Columnas | Gutter  |
|------------|---------------|----------|---------|
| xs         | 0 – 639px     | 4        | 16px    |
| sm         | 640 – 767px   | 8        | 16px    |
| md         | 768 – 1023px  | 8        | 20px    |
| lg         | 1024 – 1279px | 12       | 24px    |
| xl         | ≥ 1280px      | 12       | 24px    |

Sidebar fijo 240px en lg+. En xs/sm se convierte en drawer off-canvas. Modales: full-screen bottom sheet en xs/sm, 90% en md, max 600px en lg+.

---

## Estrategia offline (Service Worker + Dexie.js + Background Sync)

### Flujo cuando hay red

```
Hook → api/ (Axios) → backend FastAPI → respuesta
                ↓
           db/ (Dexie) ← guardar respuesta en caché local
```

### Flujo cuando no hay red

```
Hook → api/ (Axios) falla
         ↓
    db/ (Dexie) → devolver dato cacheado
         ↓
    syncQueue → persistir operación pendiente en Dexie
         ↓
    SW registra tag BackgroundSync
```

### Al recuperar conectividad

```
SW dispara BackgroundSync →
    syncQueue.replay() →
        api/ (Axios) reintenta operación →
            backend FastAPI recibe y persiste →
                db/ actualiza caché local
```

### Tabla de comportamiento por módulo en modo offline

| Módulo / Vista     | Lectura offline         | Escritura offline                            |
|--------------------|-------------------------|----------------------------------------------|
| Login              | Deshabilitado           | N/A — no se puede autenticar sin red          |
| Dashboard          | Caché con badge de fecha| N/A                                          |
| Usuarios           | Lista cacheada (read-only)| Acciones deshabilitadas, alerta-warning     |
| Módulos de dominio | Datos del último sync   | Encolar en syncQueue; confirmar al usuario   |

### Resolución de conflictos

Cada registro sincronizable lleva un campo `version: number`. Al sincronizar:

- Si `version` del cliente coincide con el servidor → escritura aceptada
- Si `version` difiere → el servidor devuelve `412 Precondition Failed` → el hook lo interpreta como `CONFLICTO_CONCURRENCIA` y lo marca para revisión manual en lugar de sobreescribir
- **Eventos sanitarios**: nunca sobreescribir, solo acumular (implicaciones de trazabilidad legal y NIC 41)

### `syncQueue` (`shared/sync/syncQueue.ts`)

```typescript
interface SyncOperation {
  id?: number;           // autoincrement Dexie
  modulo: string;        // ej. "usuarios"
  accion: string;        // ej. "crear" | "actualizar" | "eliminar"
  payload: unknown;      // datos serializables
  intentos: number;      // reintentos realizados
  creadoEn: number;      // Date.now()
}
```

El Service Worker escucha el evento `sync` con el tag `"sgpmp-sync"` y llama `syncQueue.replay()`. El hook que genera la operación la persiste en Dexie y luego llama `registration.sync.register("sgpmp-sync")`.

---

## Autenticación y ciclo de vida del JWT

```
Login → POST /auth/login
         ↓
     { access_token, expires_in }  +  refresh_token (httpOnly cookie)
         ↓
     tokenStore.set(access_token)   ← módulo singleton en memoria (no localStorage)
         ↓
     AuthContext emite el usuario decodificado (claims: id, rol, permisos)
```

### Interceptor Axios (`shared/api/http.ts`)

```typescript
http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      window.location.replace("/login");
    }
    return Promise.reject(mapToApiError(error));
  }
);
```

### Reglas

| Regla | Por qué |
|-------|---------|
| JWT en variable de módulo, nunca en `localStorage` ni `IndexedDB` | Evita XSS; la memoria se vacía al cerrar el tab |
| Refresh token en httpOnly cookie (gestionado por el backend) | No accesible desde JS; el browser lo envía automáticamente |
| 401 → limpiar estado + redirect `/login` | No acumular tokens inválidos; el usuario debe reautenticarse |
| Login deshabilitado offline | Imposible verificar credenciales sin red; mostrar `alert-warning` con opción de reintento al recuperar conexión |

---

## RBAC en el cliente (visual gating)

El control de acceso real ocurre en el backend. El frontend solo oculta o deshabilita elementos para mejorar la UX.

```typescript
// shared/rbac/usePermission.ts
function usePermission(idRecurso: number, idAccion: number): boolean {
  const { claims } = useAuth();
  return claims?.permisos?.some(
    (p) => p.id_recurso === idRecurso && p.id_accion === idAccion
  ) ?? false;
}
```

### Uso en componentes

```tsx
const puedeCrear = usePermission(8, 1); // C sobre recurso 8

<Button disabled={!puedeCrear} onClick={handleCrear}>
  Nuevo usuario
</Button>
```

### Reglas RBAC

| Regla | Por qué |
|-------|---------|
| Nunca bloquear navegación de ruta por permiso | El servidor rechaza la petición; la UI no debe mentir sobre rutas que existen |
| Si falta permiso en una sección → renderizar `<PermissionDenied>` inline | Mensaje claro al usuario sin redirigir innecesariamente |
| Nunca hardcodear IDs de rol (`ROL_ADMIN = 1`) | Los IDs son datos de DB; un cambio de datos no debe requerir cambio de código |
| El JWT es la fuente de verdad de permisos en cliente | Se reemite en cada refresh cuando cambian permisos en backend |

### Tabla de acciones estándar (espeja `modulo1.acciones` del backend)

| id_accion | Código | Descripción   |
|-----------|--------|---------------|
| 1         | C      | Crear         |
| 2         | R      | Leer          |
| 3         | U      | Actualizar    |
| 4         | D      | Eliminar      |
| 5         | E      | Ejecutar      |

---

## Capa API (Axios)

### Convenciones

- Un archivo por grupo de endpoints: `{modulo}/api/{modulo}Api.ts`
- Las funciones reciben tipos de dominio y devuelven tipos de dominio (nunca `AxiosResponse` crudo)
- Timeout global: 15 segundos en la instancia Axios
- Todos los errores HTTP se convierten a `ApiError` antes de salir de `api/`
- Durante petición pendiente: deshabilitar el botón disparador y mostrar spinner

### Tipo `ApiError` (`shared/api/errors.ts`)

```typescript
interface ApiError {
  code: string;         // código de negocio del backend (ej. "CONFLICTO_CONCURRENCIA")
  message: string;      // mensaje legible para el usuario
  field?: string;       // campo afectado si aplica
  status: number;       // HTTP status code
}
```

### Mapeo de errores HTTP a `ApiError`

| HTTP | Comportamiento en el hook |
|------|---------------------------|
| 400  | Mostrar mensaje del campo afectado debajo del input |
| 401  | Interceptor global → redirect `/login` |
| 403  | Mostrar `alert-warning` inline |
| 404  | Mostrar estado vacío en la UI |
| 409  | Mostrar `alert-error` persistente con el campo duplicado |
| 412  | Marcar conflicto de concurrencia; solicitar recarga |
| 422  | Mostrar `alert-warning` con regla de negocio violada |
| 5xx  | Mostrar `alert-error` genérico (nunca detalles técnicos al usuario) |

---

## Convenciones de componentes

| Regla | Por qué |
|-------|---------|
| Un componente por archivo | Facilita búsqueda, testing y revisión |
| Props con interfaz explícita (sin `any`) | TypeScript strict captura errores en tiempo de compilación |
| Sin `style={}` inline en JSX | Los tokens CSS son la API de estilo; los inline styles rompen dark mode y el sistema de tokens |
| CSS Modules para estilos propios del módulo | Scope local sin colisiones; `.module.css` junto al componente |
| Listas/tablas: skeleton loaders mientras carga | Mejor UX que spinner; evita layout shift |
| Sin `console.log` en componentes de producción | Usar el sistema de logging o eliminar antes de merge |

---

## Convenciones de formularios

- Librería: `react-hook-form` (recomendado) o validación manual con estado local
- Validar en `onBlur`, nunca en `onChange` (excepción: medidor de fortaleza de contraseña en `onChange`)
- El error de cada campo va inmediatamente debajo del `<Input>` correspondiente con `role="alert"`
- El botón de envío se deshabilita durante la petición y muestra spinner
- Al recibir error 400/409 del backend, mapear el campo `field` de `ApiError` al error del campo en `react-hook-form`
- Requeridos: asterisco (*) + `aria-required="true"` en el input

---

## Testing

| Tipo        | Herramienta | Qué cubre                                      |
|-------------|-------------|------------------------------------------------|
| Unitario    | Vitest      | Hooks (`hooks/`), utilidades (`shared/`)       |
| E2E         | Cypress     | Happy path por módulo (login, CRUD principal)  |

### Reglas de testing

| Regla | Por qué |
|-------|---------|
| Los tests unitarios nunca importan de `api/` ni `db/` directamente | Testear a través del hook; las capas de red/persistencia se mockean |
| Los tests e2e prueban flujos, no implementación | Resilientes a refactors internos; sensibles solo a la UX |
| No crear archivos `*.test.ts` para cada componente presentacional | Solo lógica con bifurcaciones vale la pena testear unitariamente |

---

## Variables de entorno requeridas

Ver `.env.example`. Las obligatorias para levantar el sistema:

```env
# Backend
VITE_API_BASE_URL=http://localhost:8000

# Google reCAPTCHA v2 (site key pública; la clave secreta solo va en el backend)
VITE_RECAPTCHA_SITE_KEY=

# Firebase Cloud Messaging
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_VAPID_KEY=
```

Todas las variables comienzan con `VITE_` para ser expuestas por Vite al bundle. Nunca poner secretos del servidor aquí (son visibles en el bundle JS).

---

## Notas de infraestructura

**Capacitor vs PWA**
El mismo código se despliega como PWA (navegador) y como app nativa (Capacitor). Las APIs nativas (push notifications, haptics, status bar) se acceden vía plugins de Capacitor que degradan gracefully en web. Nunca usar `import ... from '@capacitor/...'` en `shared/design-system/` ni en lógica de negocio; solo en adaptadores dedicados dentro de `shared/hooks/` o `shared/sync/`.

**Service Worker y Vite**
El SW se registra en `main.tsx`. En desarrollo (`vite dev`) el SW está desactivado por defecto; usar `vite preview` o build con `VITE_SW=true` para testear comportamiento offline.

**`root_path="/api"` del backend**
En producción, el proxy inverso agrega el prefijo `/api`. `VITE_API_BASE_URL` en producción apuntará a la URL con ese prefijo ya incluido. Localmente, apunta directamente al puerto de uvicorn.

**Credenciales Firebase**
Las credenciales de FCM en `.env` son de cliente (seguras para exponer en bundle). El VAPID key es público por diseño. Nunca poner la Service Account key del servidor en variables `VITE_`.

**`audit_sdk` del backend**
La auditoría la genera el backend. El frontend no registra eventos de auditoría directamente; solo hace las peticiones que el backend audita.
