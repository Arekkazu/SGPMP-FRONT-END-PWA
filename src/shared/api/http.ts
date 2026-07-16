import axios from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { mapToApiError } from './errors';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginEndpoint = error.config?.url === '/sesiones/';
    if (error.response?.status === 401 && !isLoginEndpoint) {
      tokenStore.clear();
      window.location.replace('/login');
    }
    return Promise.reject(mapToApiError(error));
  }
);

export { http };
export default http;
