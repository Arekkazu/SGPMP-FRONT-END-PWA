/**
 * Alternador rápido de tema del `AppBar` (RF-27).
 *
 * Antes escribía `data-theme` y `localStorage` por su cuenta, sin pasar por el backend:
 * eran **dos escritores** sobre la misma clave. El botón pisaba en silencio la
 * preferencia guardada, y si el usuario tenía "Automático" seleccionado, un clic la
 * degradaba a claro/oscuro sin forma de volver desde ahí.
 *
 * Ahora es un atajo a la misma preferencia personal que guarda la pantalla de
 * configuración, así que el estado es uno solo y persiste entre dispositivos.
 */
import { useCallback, useEffect, useState } from 'react';

import { temaVisualApi } from '../../configuration/api/personalizacionApi';
import { THEME_MODE, aplicarTema, temaRecordado } from '../tema/tema';

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => temaRecordado() === 'dark');

  // El tema lo aplica `useTemaSesion` al arrancar; aquí solo se refleja lo que quedó en
  // el DOM, para que el icono no contradiga a la interfaz.
  useEffect(() => {
    const observador = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observador.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    return () => observador.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const siguiente = dark ? THEME_MODE.CLARO : THEME_MODE.OSCURO;
    setDark(!dark);
    aplicarTema(siguiente);
    // Se persiste sin bloquear el cambio visual: el botón es un atajo, no un formulario.
    void temaVisualApi.guardar({ theme_mode: siguiente }).catch(() => {});
  }, [dark]);

  return { dark, toggle };
}
