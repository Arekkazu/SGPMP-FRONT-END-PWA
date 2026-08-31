import React, { createContext, useState, useCallback, useEffect } from 'react';
import { tokenStore } from './tokenStore';
import { http, refreshAccessToken } from '../api/http';

export interface JwtClaims {
  sub: string;
  jti: string;
  rol: number;
  exp: number;
  iat: number;
  nombre?: string;
  permisos?: Array<{ id_recurso: number; id_accion: number }>;
}

export interface UserInfo {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  correo_electronico: string;
  nombre_rol: string;
  estado_cuenta: string;
}

export interface PermisoUsuario {
  id_recurso: number;
  id_accion: number;
}

interface AuthContextValue {
  token: string | null;
  claims: JwtClaims | null;
  userInfo: UserInfo | null;
  permisos: PermisoUsuario[] | null;
  perfilIncompleto: boolean | null;
  isBootstrapping: boolean;
  setSession: (token: string) => void;
  clearSession: () => void;
  refreshUserInfo: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  claims: null,
  userInfo: null,
  permisos: null,
  perfilIncompleto: null,
  isBootstrapping: true,
  setSession: () => {},
  clearSession: () => {},
  refreshUserInfo: async () => {},
});

function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split('.');
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}

function isTokenValid(claims: JwtClaims | null): boolean {
  if (!claims) return false;
  return claims.exp > Date.now() / 1000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedToken = tokenStore.get();
  const storedClaims = storedToken ? decodeJwtPayload(storedToken) : null;
  const validStored = isTokenValid(storedClaims) ? storedToken : null;
  if (!validStored) tokenStore.clear();

  const [token, setToken] = useState<string | null>(validStored);
  const [claims, setClaims] = useState<JwtClaims | null>(validStored ? storedClaims : null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [permisos, setPermisos] = useState<PermisoUsuario[] | null>(null);
  const [perfilIncompleto, setPerfilIncompleto] = useState<boolean | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(!validStored);

  // Mantiene el contexto sincronizado cuando el interceptor renueva o limpia
  // el JWT fuera de los hooks de login/logout.
  useEffect(() => tokenStore.subscribe((nextToken) => {
    const nextClaims = nextToken ? decodeJwtPayload(nextToken) : null;
    if (nextToken && !isTokenValid(nextClaims)) {
      tokenStore.clear();
      return;
    }
    setToken(nextToken);
    setClaims(nextClaims);
  }), []);

  // Recarga de página (F5, pestaña nueva): el JWT solo vive en memoria
  // (tokenStore) por diseño (R-12), así que se pierde. Antes de decidir "no
  // autenticado", intenta un refresh silencioso con la cookie httpOnly.
  useEffect(() => {
    if (validStored) return;
    // `refreshAccessToken` guarda el token en tokenStore; el listener de arriba
    // sincroniza el contexto.
    refreshAccessToken()
      .catch(() => {
        // Sin sesión que recuperar — comportamiento normal en /login, /registro, etc.
      })
      .finally(() => setIsBootstrapping(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await http.get<UserInfo>('/usuarios/me');
      setUserInfo(res.data);
      setPerfilIncompleto(res.data.estado_cuenta === 'Pendiente Datos');
    } catch {
      // Fallar abierto: un error de red transitorio no debe bloquear a un usuario activo legítimo.
      setPerfilIncompleto(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUserInfo(null);
      setPermisos(null);
      setPerfilIncompleto(null);
      return;
    }
    fetchUserInfo();
    http.get<{ permisos: PermisoUsuario[] }>('/sesiones/me/permisos')
      .then((res) => setPermisos(res.data.permisos))
      .catch(() => setPermisos([]));
  }, [token, fetchUserInfo]);

  const setSession = useCallback((newToken: string) => {
    tokenStore.set(newToken);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setClaims(null);
    setUserInfo(null);
    setPermisos(null);
    setPerfilIncompleto(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        claims,
        userInfo,
        permisos,
        perfilIncompleto,
        isBootstrapping,
        setSession,
        clearSession,
        refreshUserInfo: fetchUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
