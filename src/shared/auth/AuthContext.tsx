import React, { createContext, useState, useCallback, useEffect } from 'react';
import { tokenStore } from './tokenStore';
import { http } from '../api/http';

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
  setSession: (token: string) => void;
  clearSession: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  claims: null,
  userInfo: null,
  permisos: null,
  setSession: () => {},
  clearSession: () => {},
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

  useEffect(() => {
    if (!token) {
      setUserInfo(null);
      setPermisos(null);
      return;
    }
    http.get<UserInfo>('/usuarios/me')
      .then((res) => setUserInfo(res.data))
      .catch(() => {});
    http.get<{ permisos: PermisoUsuario[] }>('/sesiones/me/permisos')
      .then((res) => setPermisos(res.data.permisos))
      .catch(() => setPermisos([]));
  }, [token]);

  const setSession = useCallback((newToken: string) => {
    tokenStore.set(newToken);
    setToken(newToken);
    setClaims(decodeJwtPayload(newToken));
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setClaims(null);
    setUserInfo(null);
    setPermisos(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, claims, userInfo, permisos, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}
