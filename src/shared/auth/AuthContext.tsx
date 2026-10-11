import React, { createContext, useState, useCallback, useEffect } from 'react';
import { tokenStore } from './tokenStore';
import {
  http,
  refreshAccessToken,
  refrescoRechazoLaSesion,
  esFalloDeRed,
  marcarSesionCerrada,
  PERMISOS_POSIBLEMENTE_DESACTUALIZADOS,
} from '../api/http';
import { sonPermisosIguales } from './compararPermisos';
import { borrarSesionOffline, guardarSesionOffline, leerSesionOffline, type SesionOffline } from './sesionOffline';
import { setUsuarioSync } from '../sync/syncQueue';
import { pushToast } from '../hooks/useToast';
import i18n from '../i18n';

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
  /** El refresh al recargar fallo por el servidor o la red, no porque la sesion muriera. */
  errorRestaurandoSesion: boolean;
  reintentarRestaurarSesion: () => void;
  /**
   * La app abrió sin red: no hay JWT, pero sí la identidad de la última sesión. Las
   * pantallas leen la caché de Dexie y las escrituras van a la cola. Dura hasta que
   * vuelve la red: ahí se renueva la sesión o se pide iniciarla de nuevo.
   */
  sesionOffline: boolean;
  /** Timestamp de la ultima vez que se detecto un cambio real de permisos en sesion (RF-25). */
  permisosActualizadosEn: number | null;
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
  errorRestaurandoSesion: false,
  reintentarRestaurarSesion: () => {},
  sesionOffline: false,
  permisosActualizadosEn: null,
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

// Rutas públicas (ver AppRoutes en App.tsx): ninguna lee `token`/`isBootstrapping`
// de este contexto, así que un restauro de sesión ahí no tiene efecto útil —
// y si el usuario cae en /login con una cookie de refresco vieja (pestaña
// anterior, sesión previa) todavía vigente, ese refresh silencioso compite
// sin coordinación con el login explícito que está a punto de enviar. El
// backend solo permite una sesión activa por cuenta: quien "pierda" esa
// carrera puede terminar con el JWT/cookie de una sesión que el otro flujo
// ya invalidó, y la siguiente petición autenticada cae en 401 (bug #1827).
const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/activar',
  '/reenviar-activacion',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/sso/callback',
];

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
  const [errorRestaurandoSesion, setErrorRestaurandoSesion] = useState(false);
  const [permisosActualizadosEn, setPermisosActualizadosEn] = useState<number | null>(null);
  const [sesionOffline, setSesionOffline] = useState(false);

  // Mantiene el contexto sincronizado cuando el interceptor renueva o limpia
  // el JWT fuera de los hooks de login/logout.
  useEffect(() => tokenStore.subscribe((nextToken) => {
    // `clear()` solo avisa si había token: la sesión terminó (logout, 401 sin
    // refresco posible), así que su copia offline ya no debe abrir la app.
    if (!nextToken) void borrarSesionOffline();
    const nextClaims = nextToken ? decodeJwtPayload(nextToken) : null;
    if (nextToken && !isTokenValid(nextClaims)) {
      tokenStore.clear();
      return;
    }
    setToken(nextToken);
    setClaims(nextClaims);
  }), []);

  // `refreshAccessToken` guarda el token en tokenStore; el listener de arriba
  // sincroniza el contexto.
  const entrarOffline = useCallback((copia: SesionOffline) => {
    setClaims(copia.claims);
    setUserInfo(copia.userInfo);
    setPermisos(copia.permisos);
    setPerfilIncompleto(copia.userInfo.estado_cuenta === 'Pendiente Datos');
    setSesionOffline(true);
  }, []);

  const salirOffline = useCallback(() => {
    setSesionOffline(false);
    setClaims(null);
    setUserInfo(null);
    setPermisos(null);
    setPerfilIncompleto(null);
  }, []);

  const restaurarSesion = useCallback(() => {
    setErrorRestaurandoSesion(false);
    setIsBootstrapping(true);
    refreshAccessToken()
      .catch(async (error) => {
        // 401/410: sin sesión que recuperar, la ruta protegida redirige a /login.
        if (refrescoRechazoLaSesion(error)) {
          void borrarSesionOffline();
          return;
        }
        // Sin red y con una sesión previa: se trabaja con la caché hasta reconectar.
        const copia = esFalloDeRed(error) ? await leerSesionOffline() : undefined;
        if (copia) {
          entrarOffline(copia);
          return;
        }
        // INC-M02-51-G44: un 5xx o un fallo de red no dice nada de la sesión (la
        // cookie sigue vigente), así que se ofrece reintentar en vez de mandar
        // al usuario al login sin explicación.
        setErrorRestaurandoSesion(true);
      })
      .finally(() => setIsBootstrapping(false));
  }, [entrarOffline]);

  // Al volver la red se renueva la sesión con la cookie httpOnly. Si sigue viva, el
  // token nuevo dispara la cola (useSyncOnReconnect). Si el servidor ya la cerró, a
  // /login: la cola queda en Dexie y se envía al iniciar sesión otra vez. El intervalo
  // cubre el servidor caído con el dispositivo en línea, donde no llega `online`.
  useEffect(() => {
    if (!sesionOffline) return;
    const reintentar = () => {
      if (!navigator.onLine) return;
      refreshAccessToken()
        .then(() => {
          setSesionOffline(false);
          pushToast(
            'success',
            i18n.t('sesion_offline.conexion_recuperada', { ns: 'common' }),
            i18n.t('sesion_offline.sincronizando', { ns: 'common' }),
          );
        })
        .catch((error) => {
          if (!refrescoRechazoLaSesion(error)) return;
          marcarSesionCerrada();
          void borrarSesionOffline();
          salirOffline();
        });
    };
    window.addEventListener('online', reintentar);
    const intervalo = window.setInterval(reintentar, 30_000);
    return () => {
      window.removeEventListener('online', reintentar);
      window.clearInterval(intervalo);
    };
  }, [sesionOffline, salirOffline]);

  // Recarga de página (F5, pestaña nueva): el JWT solo vive en memoria
  // (tokenStore) por diseño (R-12), así que se pierde. Antes de decidir "no
  // autenticado", intenta un refresh silencioso con la cookie httpOnly.
  useEffect(() => {
    if (validStored) return;
    if (RUTAS_PUBLICAS.includes(window.location.pathname)) {
      setIsBootstrapping(false);
      return;
    }
    restaurarSesion();
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

  useEffect(() => {
    if (token && claims && userInfo && permisos) void guardarSesionOffline({ claims, userInfo, permisos });
  }, [token, claims, userInfo, permisos]);

  useEffect(() => setUsuarioSync(claims?.sub ?? null), [claims]);

  // RF-25, flujo alterno "cambio de permisos en sesion activa": el interceptor de
  // http.ts dispara este evento en cualquier 403. Se reconsulta `permisos` y solo se
  // avisa si de verdad cambio, para no mostrar un aviso enganoso en un 403 normal de
  // un usuario que nunca tuvo ese permiso.
  useEffect(() => {
    if (!token) return;
    const handler = () => {
      http.get<{ permisos: PermisoUsuario[] }>('/sesiones/me/permisos')
        .then((res) => {
          if (!sonPermisosIguales(permisos, res.data.permisos)) {
            setPermisos(res.data.permisos);
            setPermisosActualizadosEn(Date.now());
          }
        })
        .catch(() => {
          // Fallar en silencio: si el token ya no es valido, el propio 401 del
          // interceptor se encarga de cerrar la sesion.
        });
    };
    window.addEventListener(PERMISOS_POSIBLEMENTE_DESACTUALIZADOS, handler);
    return () => window.removeEventListener(PERMISOS_POSIBLEMENTE_DESACTUALIZADOS, handler);
  }, [token, permisos]);

  const setSession = useCallback((newToken: string) => {
    tokenStore.set(newToken);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    void borrarSesionOffline();
    setToken(null);
    salirOffline();
  }, [salirOffline]);

  return (
    <AuthContext.Provider
      value={{
        token,
        claims,
        userInfo,
        permisos,
        perfilIncompleto,
        isBootstrapping,
        errorRestaurandoSesion,
        reintentarRestaurarSesion: restaurarSesion,
        sesionOffline,
        permisosActualizadosEn,
        setSession,
        clearSession,
        refreshUserInfo: fetchUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
