/**
 * Motor de internacionalizacion (RF-29).
 *
 * Dos idiomas: `es-CO` (predeterminado) y `en-US`. Los codigos son los mismos
 * que acepta el backend en `locale_code`; enviar `'es'` o `'en'` produce un
 * `400 IDIOMA_NO_DISPONIBLE`.
 *
 * Tres decisiones que conviene tener presentes:
 *
 * 1. **Un namespace por modulo**, no un catalogo unico. Agregar una pantalla es
 *    agregar claves a dos JSON; agregar un idioma es agregar una carpeta bajo
 *    `locales/` y una entrada en `RECURSOS`. Es el criterio de mantenibilidad
 *    que exige el RF: incorporar idiomas sin cambios estructurales.
 *
 * 2. **El idioma inicial sale de `localStorage`, no de la API.** El `GET` del
 *    idioma resuelto necesita JWT y permiso (26, R), asi que no esta disponible
 *    en el login ni en el primer render. Guardar el ultimo locale conocido
 *    evita el parpadeo de "todo en espanol y de golpe en ingles".
 *
 * 3. **El fallback es `es-CO`**, y una clave sin traducir avisa en consola solo
 *    en DEV — el FA de "ausencia de traduccion" del RF pide exactamente eso:
 *    renderizar el espanol sin mostrar error al usuario, y dejar rastro para el
 *    equipo.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esCommon from './locales/es-CO/common.json';
import esNav from './locales/es-CO/nav.json';
import enCommon from './locales/en-US/common.json';
import enNav from './locales/en-US/nav.json';

export const LOCALES = ['es-CO', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_DEFAULT: Locale = 'es-CO';
const CLAVE_STORAGE = 'sgpmp-locale';

export const RECURSOS = {
  'es-CO': { common: esCommon, nav: esNav },
  'en-US': { common: enCommon, nav: enNav },
} as const;

export function esLocaleValido(valor: unknown): valor is Locale {
  return typeof valor === 'string' && (LOCALES as readonly string[]).includes(valor);
}

/** Ultimo locale conocido, o el predeterminado. Tolera storage bloqueado. */
export function localeGuardado(): Locale {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    return esLocaleValido(guardado) ? guardado : LOCALE_DEFAULT;
  } catch {
    return LOCALE_DEFAULT;
  }
}

i18n.use(initReactI18next).init({
  resources: RECURSOS,
  lng: localeGuardado(),
  fallbackLng: LOCALE_DEFAULT,
  supportedLngs: LOCALES,
  defaultNS: 'common',
  ns: ['common', 'nav'],
  // React ya escapa todo lo que renderiza; volver a escapar aqui produce
  // entidades HTML visibles en pantalla.
  interpolation: { escapeValue: false },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lngs, ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] falta la clave "${ns}:${key}" en ${lngs.join(', ')} — se muestra el espanol`);
    }
  },
  react: { useSuspense: false },
});

/**
 * Aplica un locale a toda la interfaz, sin recargar.
 *
 * `changeLanguage` re-renderiza a los consumidores de `useTranslation`, que es
 * lo que el RF pide con "el cambio se aplica de forma inmediata, sin necesidad
 * de recargar la sesion activa". El `lang` del documento se actualiza para los
 * lectores de pantalla y para `Intl` en `formato.ts`.
 */
export function aplicarLocale(locale: string): void {
  const destino: Locale = esLocaleValido(locale) ? locale : LOCALE_DEFAULT;
  void i18n.changeLanguage(destino);
  document.documentElement.lang = destino;
  try {
    localStorage.setItem(CLAVE_STORAGE, destino);
  } catch {
    // Storage bloqueado (modo privado): el idioma sigue aplicado en esta sesion,
    // solo no sobrevive al refresco. No es motivo para romper el cambio.
  }
}

export default i18n;
