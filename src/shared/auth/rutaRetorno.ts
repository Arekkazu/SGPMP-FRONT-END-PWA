// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-16: volver a la pantalla donde se estaba después del login |

// Rutas públicas (ver AppRoutes en App.tsx): no tiene sentido volver a ellas.
export const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/activar',
  '/reenviar-activacion',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/sso/callback',
];

const RUTA_RETORNO_KEY = 'sgpmp:ruta-retorno';

/**
 * Lo que está fuera del router (AuthProvider, interceptor) ve la URL con la subruta
 * del proxy (VITE_BASE_PATH, p. ej. /sigab-dev/login): se quita para comparar.
 */
export function rutaSinBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
}

function esRutaDeRetorno(ruta: string): boolean {
  // Solo rutas internas: "//otro.sitio" sería una redirección abierta.
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false;
  const path = ruta.split(/[?#]/)[0];
  return path !== '/' && !RUTAS_PUBLICAS.includes(path);
}

/** T-16: al reingresar se vuelve aquí, no al Panel principal. Sin argumento, la URL actual. */
export function guardarRutaRetorno(ruta?: string): void {
  // Nunca debe impedir el cierre de sesión que la llama: ante cualquier fallo se
  // entra al Panel principal, como antes.
  try {
    const destino = ruta ?? rutaSinBase(window.location.pathname) + (window.location.search ?? '');
    if (esRutaDeRetorno(destino)) sessionStorage.setItem(RUTA_RETORNO_KEY, destino);
  } catch {
    // sin ruta de retorno
  }
}

/** La ruta guardada (una sola vez). */
export function tomarRutaRetorno(): string | null {
  try {
    const ruta = sessionStorage.getItem(RUTA_RETORNO_KEY);
    sessionStorage.removeItem(RUTA_RETORNO_KEY);
    return ruta && esRutaDeRetorno(ruta) ? ruta : null;
  } catch {
    return null;
  }
}

/** Un logout voluntario no deja ruta: quien entre después empieza en el Panel. */
export function olvidarRutaRetorno(): void {
  try {
    sessionStorage.removeItem(RUTA_RETORNO_KEY);
  } catch {
    // nada que olvidar
  }
}
