/**
 * Aplica al arrancar la sesión el tema y la identidad visual guardados (RF-26 + RF-27).
 *
 * Gemelo de `useIdiomaSesion` (RF-29), que resolvió este mismo problema para el idioma.
 * Antes de esto, el tema solo se escribía en el DOM cuando montaba el `AppBar` (leyendo
 * `localStorage`) o cuando el usuario pulsaba Guardar en la pantalla de configuración:
 * **la preferencia guardada en el backend no se aplicaba nunca al iniciar sesión**, así
 * que no viajaba entre navegadores ni dispositivos, que es justo lo que RF-27 exige al
 * pedir que la preferencia se almacene en base de datos y no en la sesión del navegador.
 *
 * También sigue `prefers-color-scheme` mientras el modo sea Sistema, y repinta la marca
 * institucional con la variante WCAG del tema resultante: el color accesible en claro no
 * es el mismo que en oscuro, así que un cambio de tema tiene que arrastrar el color.
 */
import { useEffect, useState } from 'react';

import { temaVisualApi } from '../../configuration/api/personalizacionApi';
import { useContexto } from '../contexto/useContexto';
import { aplicarIdentidad, limpiarIdentidad } from '../identidad/identidad';
import {
  THEME_MODE,
  aplicarTema,
  resolverTema,
  suscribirPreferenciaSistema,
  temaRecordado,
  type TemaAplicado,
} from './tema';

export function useTemaSesion(token: string | null): TemaAplicado {
  const [themeMode, setThemeMode] = useState<number>(THEME_MODE.CLARO);
  const [tema, setTema] = useState<TemaAplicado>(() => temaRecordado() ?? 'light');
  const { contexto } = useContexto();

  // 1. Preferencia resuelta del backend (personal -> global -> claro).
  useEffect(() => {
    if (!token) return;
    let cancelado = false;

    void (async () => {
      try {
        const { theme_mode } = await temaVisualApi.obtener();
        if (cancelado) return;
        setThemeMode(theme_mode);
        setTema(aplicarTema(theme_mode));
      } catch {
        // Sin permiso (24, R), sin red o sin fila: se queda el tema de localStorage.
        // Nunca es motivo para romper el arranque de la sesión.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  // 2. Modo Sistema: seguir al sistema operativo mientras dure la sesión.
  useEffect(() => {
    if (themeMode !== THEME_MODE.SISTEMA) return undefined;
    return suscribirPreferenciaSistema(() => setTema(aplicarTema(THEME_MODE.SISTEMA)));
  }, [themeMode]);

  // 3. La marca institucional se repinta con la variante accesible del tema activo.
  useEffect(() => {
    if (!contexto) {
      limpiarIdentidad();
      return;
    }
    aplicarIdentidad(
      { identidad: contexto.identidad_visual, accesibilidad: contexto.accesibilidad },
      tema,
    );
  }, [contexto, tema]);

  // 4. Al cerrar sesión, la interfaz vuelve a su paleta propia.
  useEffect(() => {
    if (token) return;
    limpiarIdentidad();
  }, [token]);

  return tema;
}

/** Tema efectivo actual, para componentes que necesitan elegir una variante de color. */
export function temaActivo(): TemaAplicado {
  const atributo = document.documentElement.getAttribute('data-theme');
  return atributo === 'dark' ? 'dark' : resolverTema(THEME_MODE.CLARO);
}
