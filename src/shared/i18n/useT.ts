/**
 * Acceso tipado a los catalogos (RF-29).
 *
 * Existe para que los componentes importen de un solo sitio y no de
 * `react-i18next` directo: si algun dia hace falta cambiar de motor, el cambio
 * queda contenido en `shared/i18n/`.
 */
export { useTranslation as useT, Trans } from 'react-i18next';
export { aplicarLocale, localeGuardado, esLocaleValido, LOCALES, LOCALE_DEFAULT } from './index';
export type { Locale } from './index';
export { formatearFecha, formatearFechaHora, formatearHora, formatearNumero } from './formato';
