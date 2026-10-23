// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: envía la zona horaria del navegador en X-Zona-Horaria |
import axios, { type AxiosError } from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { mapToApiError } from './errors';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  withCredentials: true,
  // Zona IANA del navegador: el backend la usa para "hoy" y los días calendario.
  // Sin ella trabaja en UTC (src/shared/fechas.py del backend).
  headers: { 'X-Zona-Horaria': Intl.DateTimeFormat().resolvedOptions().timeZone },
});

// El backend mide el timeout de inactividad de 30 min sobre `cuenta.ultimo_acceso`,
// que solo avanza cuando llega una petición autenticada (`get_current_user`).
// `useSessionTimeout` lo consulta para saber si hace falta un keepalive.
let lastAuthenticatedRequestAt = 0;

export function getLastAuthenticatedRequestAt(): number {
  return lastAuthenticatedRequestAt;
}

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    lastAuthenticatedRequestAt = Date.now();
  }
  return config;
});

const PUBLIC_AUTH_ENDPOINTS = ['/sesiones/', '/sesiones/sso', '/sesiones/refresh'];

// #133: un 401 con este error_code es una regla de negocio del endpoint
// (la contrasena actual no coincide), no una sesion muerta — viene de una
// peticion ya autenticada donde el JWT sigue siendo valido. Tratarlo como
// cualquier otro 401 dispara un refresh silencioso (que reautentica bien) y
// luego, al reintentar, el backend vuelve a rechazar por la misma razon de
// negocio; con `_retry` ya en true eso caia directo en forzarLogout() y el
// usuario perdia la sesion en vez de ver el mensaje de error del formulario.
const CODIGOS_401_DE_NEGOCIO = new Set(['CONTRASENA_ACTUAL_INCORRECTA']);

function es401DeNegocio(error: { response?: { data?: unknown } }): boolean {
  const data = error.response?.data as Record<string, unknown> | undefined;
  const code = data?.error_code as string | undefined;
  return !!code && CODIGOS_401_DE_NEGOCIO.has(code);
}

export const PERMISOS_POSIBLEMENTE_DESACTUALIZADOS = 'sgpmp:permisos-posiblemente-desactualizados';

// QA M09 (hallazgo #2): un 401 no recuperable redirigia a /login sin dejar
// ningun rastro de por que se cerro la sesion (p.ej. el backend solo permite
// una sesion activa por cuenta, asi que un segundo login en otro dispositivo
// invalida esta). LoginPage lee esta bandera una sola vez para explicarlo.
const SESION_CERRADA_KEY = 'sgpmp:sesion-cerrada';

/** Por qué se cerró la sesión: `cambio_estado` es el aviso propio de RF-06. */
export type MotivoSesionCerrada = 'generica' | 'cambio_estado';

// RF-06: "Su sesión ha sido finalizada debido a un cambio en el estado de su
// cuenta." El backend lo señala con este código cuando la cuenta pasó a
// INACTIVO, BLOQUEADO o ELIMINADO. No se intenta refresh: la sesión ya no vuelve.
const CODIGO_SESION_FINALIZADA_POR_ESTADO = 'SESION_FINALIZADA_CAMBIO_ESTADO';

export function consumirAvisoSesionCerrada(): MotivoSesionCerrada | null {
  const valor = sessionStorage.getItem(SESION_CERRADA_KEY);
  if (valor === null) return null;
  sessionStorage.removeItem(SESION_CERRADA_KEY);
  return valor === 'cambio_estado' ? 'cambio_estado' : 'generica';
}

function esSesionFinalizadaPorEstado(error: { response?: { data?: unknown } }): boolean {
  const data = error.response?.data as Record<string, unknown> | undefined;
  return data?.error_code === CODIGO_SESION_FINALIZADA_POR_ESTADO;
}

function statusDe(error: unknown): number | undefined {
  // El interceptor entrega `ApiError` (`status`); un error crudo de Axios trae `response`.
  const e = error as { response?: { status?: number }; status?: number } | undefined;
  return e?.response?.status ?? e?.status;
}

// INC-M02-51-G44: solo un 401/410 del refresh significa que la sesion murio.
// Ante un 5xx o un fallo de red el backend hace rollback y la cookie sigue
// vigente: cerrar la sesion ahi la pierde sin motivo.
export function refrescoRechazoLaSesion(error: unknown): boolean {
  const status = statusDe(error);
  return status === 401 || status === 410;
}

/** No hubo respuesta del servidor (sin red, timeout): `mapToApiError` deja status 0. */
export function esFalloDeRed(error: unknown): boolean {
  return !statusDe(error);
}

export function marcarSesionCerrada(motivo: MotivoSesionCerrada = 'generica'): void {
  sessionStorage.setItem(SESION_CERRADA_KEY, motivo);
}

function forzarLogout(motivo: MotivoSesionCerrada = 'generica'): void {
  marcarSesionCerrada(motivo);
  tokenStore.clear();
  window.location.replace(`${import.meta.env.BASE_URL}login`);
}

// Refrescos concurrentes (varias peticiones 401 a la vez) comparten esta misma
// promesa: el backend rota el refresh token en cada uso, así que dos llamadas
// reales a /sesiones/refresh en paralelo harían que la segunda reutilice un
// token ya rotado por la primera y el backend lo trate como robo (mata la sesión).
let refreshPromise: Promise<string> | null = null;

// La promesa solo cubre una pestaña, pero la cookie del refresh token es de todas:
// al abrir o recargar varias a la vez cada una refrescaba con la misma cookie y el
// backend registraba REUSO_TOKEN_REFRESCO_DETECTADO. El candado del navegador
// serializa el refresco entre pestañas y el canal reparte el access token nuevo,
// para que las demás no roten otra vez (cada rotación revoca el access anterior).
const CANDADO_REFRESH = 'sigab-refresh-token';
const canalSesion = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sigab-sesion') : null;
canalSesion?.addEventListener('message', (e: MessageEvent<unknown>) => {
  if (typeof e.data === 'string') tokenStore.set(e.data);
});

/** Ejecuta `fn` con el candado de refresco compartido por todas las pestañas (sin Web Locks, directo). */
async function entrePestanas<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(CANDADO_REFRESH, fn);
  return fn();
}

/** `tokenRechazado`: el access token del 401; si otra pestaña ya lo reemplazó, se usa el vigente. */
export function refreshAccessToken(tokenRechazado?: string | null): Promise<string> {
  const vigente = tokenStore.get();
  if (tokenRechazado && vigente && vigente !== tokenRechazado) return Promise.resolve(vigente);
  if (!refreshPromise) {
    refreshPromise = entrePestanas(async () => {
      // Mientras se esperaba el candado otra pestaña pudo refrescar y repartir su token.
      const actual = tokenStore.get();
      if (actual && actual !== vigente) return actual;
      const res = await http.post<{ token: string }>('/sesiones/refresh');
      tokenStore.set(res.data.token);
      canalSesion?.postMessage(res.data.token);
      return res.data.token;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const isPublicAuthEndpoint = PUBLIC_AUTH_ENDPOINTS.includes(originalRequest?.url ?? '');

    if (error.response?.status === 401 && !isPublicAuthEndpoint && esSesionFinalizadaPorEstado(error)) {
      forzarLogout('cambio_estado');
      return Promise.reject(mapToApiError(error));
    }

    // QA TC-DIS-22/24/27: ante CUALQUIER 401 no-público se intenta el refresh
    // silencioso una vez antes de decidir. Antes solo se refrescaba con
    // TOKEN_EXPIRADO: otros códigos legítimos (SESION_EXPIRADA_INACTIVIDAD,
    // TOKEN_REVOCADO…) forzaban redirección inmediata a /login. Si el refresh
    // rechaza la sesión (401/410) es porque de verdad murió — ahí sí se limpia
    // y redirige; un 5xx o un fallo de red solo hace fallar esta petición.
    if (
      error.response?.status === 401 &&
      !isPublicAuthEndpoint &&
      !originalRequest?._retry &&
      !es401DeNegocio(error)
    ) {
      originalRequest._retry = true;
      try {
        const rechazado = String(originalRequest.headers?.Authorization ?? '').replace(/^Bearer /, '');
        const newToken = await refreshAccessToken(rechazado || null);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        if (!refrescoRechazoLaSesion(refreshError)) {
          return Promise.reject(mapToApiError(refreshError as AxiosError));
        }
        forzarLogout();
        return Promise.reject(mapToApiError(error));
      }
    }

    if (error.response?.status === 401 && !isPublicAuthEndpoint && !es401DeNegocio(error)) {
      forzarLogout();
    }

    // RF-25, flujo alterno "cambio de permisos en sesion activa": el backend siempre
    // reevalua permisos en vivo (nunca confia en el JWT), asi que un 403 inesperado
    // puede significar que el rol/permisos cambiaron desde que se cargo `permisos` en
    // AuthContext. No hay forma de distinguirlo de un 403 "normal" por el codigo de
    // error (ambos son ACCESO_DENEGADO), asi que se dispara un evento y quien escucha
    // decide si de verdad cambio algo antes de avisar al usuario.
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent(PERMISOS_POSIBLEMENTE_DESACTUALIZADOS));
    }

    return Promise.reject(mapToApiError(error));
  }
);

export { http };
export default http;
