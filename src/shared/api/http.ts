import axios, { type AxiosError } from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { mapToApiError } from './errors';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  withCredentials: true,
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

export function consumirAvisoSesionCerrada(): boolean {
  const avisar = sessionStorage.getItem(SESION_CERRADA_KEY) === '1';
  if (avisar) sessionStorage.removeItem(SESION_CERRADA_KEY);
  return avisar;
}

// INC-M02-51-G44: solo un 401/410 del refresh significa que la sesion murio.
// Ante un 5xx o un fallo de red el backend hace rollback y la cookie sigue
// vigente: cerrar la sesion ahi la pierde sin motivo.
export function refrescoRechazoLaSesion(error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status;
  return status === 401 || status === 410;
}

function forzarLogout(): void {
  sessionStorage.setItem(SESION_CERRADA_KEY, '1');
  tokenStore.clear();
  window.location.replace('/login');
}

// Refrescos concurrentes (varias peticiones 401 a la vez) comparten esta misma
// promesa: el backend rota el refresh token en cada uso, así que dos llamadas
// reales a /sesiones/refresh en paralelo harían que la segunda reutilice un
// token ya rotado por la primera y el backend lo trate como robo (mata la sesión).
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = http
      .post<{ token: string }>('/sesiones/refresh')
      .then((res) => {
        tokenStore.set(res.data.token);
        return res.data.token;
      })
      .finally(() => {
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
        const newToken = await refreshAccessToken();
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
