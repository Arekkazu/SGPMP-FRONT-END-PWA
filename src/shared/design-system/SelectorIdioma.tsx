import React from 'react';
import { Globe } from 'lucide-react';
import { aplicarLocale, LOCALES, useT, type Locale } from '../i18n/useT';
import './SelectorIdioma.css';

// En su propio idioma, sin traducir: quien no entiende la interfaz actual
// reconoce la opción que busca. `Record<Locale>` obliga a nombrar cada idioma nuevo.
const NOMBRE: Record<Locale, string> = { 'es-CO': 'Español', 'en-US': 'English' };

/**
 * Idioma antes de iniciar sesión (RF-29): sin JWT no hay preferencia del
 * backend, así que solo se aplica y se guarda en localStorage. Al entrar,
 * `useIdiomaSesion` aplica la preferencia guardada en el servidor.
 */
export function SelectorIdioma() {
  const { t, i18n } = useT('common');
  return (
    <div className="ds-idioma">
      <span className="ds-idioma__campo">
        <Globe size={20} strokeWidth={1.5} aria-hidden className="ds-idioma__icono" />
        <select
          className="ds-field__input ds-idioma__select"
          aria-label={t('idioma.selector')}
          value={i18n.language}
          onChange={(e) => aplicarLocale(e.target.value)}
        >
          {LOCALES.map((l) => <option key={l} value={l} lang={l}>{NOMBRE[l]}</option>)}
        </select>
      </span>
    </div>
  );
}
