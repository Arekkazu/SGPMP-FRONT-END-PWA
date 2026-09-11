/**
 * Tema visual del sistema (RF-27): única fuente de verdad del contrato y del DOM.
 *
 * `theme_mode` lo define el RF y lo valida el backend como **1 = Claro, 2 = Oscuro,
 * 3 = Sistema** (`ThemeMode` en `tema_visual.py`, `GuardarTemaDTO`). El selector de la
 * pantalla de configuración usaba 0/1/2, así que guardar "Claro" enviaba `0` y el DTO
 * respondía 422, "Oscuro" enviaba `1` y se persistía *Claro*, y "Automático" enviaba `2`
 * y se persistía *Oscuro*. Al leer, el mapeo inverso pintaba oscuro sobre el valor que el
 * backend llama Claro: el selector estaba invertido de punta a punta.
 *
 * Los valores viven aquí y no en el componente para que no vuelva a haber dos escalas.
 */
export const THEME_MODE = {
  CLARO: 1,
  OSCURO: 2,
  SISTEMA: 3,
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

export type TemaAplicado = 'light' | 'dark';

export const STORAGE_KEY = 'sgpmp-theme';

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

function consultaSistema(): MediaQueryList | null {
  // El flujo alterno "Error en modo Automático (Dispositivo no compatible)" del RF: si el
  // navegador no expone `prefers-color-scheme`, se cae a claro sin romper nada.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(CONSULTA_OSCURO);
  } catch {
    return null;
  }
}

/** Traduce el `theme_mode` del backend al tema que se pinta ahora mismo. */
export function resolverTema(themeMode: number): TemaAplicado {
  if (themeMode === THEME_MODE.OSCURO) return 'dark';
  if (themeMode === THEME_MODE.SISTEMA) return consultaSistema()?.matches ? 'dark' : 'light';
  return 'light';
}

/** Escribe el tema en el DOM y lo recuerda para que el arranque no parpadee. */
export function aplicarTema(themeMode: number): TemaAplicado {
  const tema = resolverTema(themeMode);
  document.documentElement.setAttribute('data-theme', tema);
  try {
    localStorage.setItem(STORAGE_KEY, tema);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema ya está aplicado en el DOM.
  }
  return tema;
}

/** Tema recordado en el navegador, para pintar antes de que responda el backend. */
export function temaRecordado(): TemaAplicado | null {
  try {
    const valor = localStorage.getItem(STORAGE_KEY);
    return valor === 'dark' || valor === 'light' ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Sigue los cambios de `prefers-color-scheme` mientras el modo sea Sistema.
 *
 * Sin esto, "Automático" se resolvía una sola vez al guardar: si el sistema operativo
 * pasaba a oscuro al anochecer, la aplicación se quedaba en claro hasta que el usuario
 * volviera a guardar la preferencia.
 */
export function suscribirPreferenciaSistema(alCambiar: (tema: TemaAplicado) => void): () => void {
  const consulta = consultaSistema();
  if (!consulta || typeof consulta.addEventListener !== 'function') return () => {};

  const escuchar = (evento: MediaQueryListEvent) => alCambiar(evento.matches ? 'dark' : 'light');
  consulta.addEventListener('change', escuchar);
  return () => consulta.removeEventListener('change', escuchar);
}
