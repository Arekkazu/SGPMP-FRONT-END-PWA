import axios from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { mapToApiError } from './errors';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PUBLIC_AUTH_ENDPOINTS = ['/sesiones/', '/sesiones/sso', '/sesiones/refresh'];

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
    return Promise.reject(mapToApiError(error));
  }
);

export { http };
export default http;
