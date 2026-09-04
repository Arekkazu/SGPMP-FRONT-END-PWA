import axios from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { mapToApiError } from './errors';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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

export const PERMISOS_POSIBLEMENTE_DESACTUALIZADOS = 'sgpmp:permisos-posiblemente-desactualizados';

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
    const errorCode = error.response?.data?.error_code;

    if (
      error.response?.status === 401 &&
      errorCode === 'TOKEN_EXPIRADO' &&
      !isPublicAuthEndpoint &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch {
        tokenStore.clear();
        window.location.replace('/login');
        return Promise.reject(mapToApiError(error));
      }
    }

    if (error.response?.status === 401 && !isPublicAuthEndpoint) {
      tokenStore.clear();
      window.location.replace('/login');
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
