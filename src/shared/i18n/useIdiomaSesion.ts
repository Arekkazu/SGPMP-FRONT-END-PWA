/**
 * Aplica al arrancar la sesión el idioma que el usuario tiene guardado (RF-29).
 *
 * `localStorage` cubre el caso común (mismo navegador), pero el RF pide que "el
 * idioma configurado se aplique automáticamente en futuras sesiones" — también
 * desde otro equipo o después de limpiar el navegador. La fuente de verdad es
 * la fila de `modulo9.preferencias_idiomas`, así que al aparecer el token se
 * consulta una vez y se aplica.
 *
 * Vive en `shared/` y no en `configuration/` porque lo consume el shell de la
 * app, no una pantalla del módulo de configuración.
 */
import { useEffect } from 'react';

import http from '../api/http';
import { aplicarLocale } from './index';

interface IdiomaResuelto {
  locale_code: string;
}

export function useIdiomaSesion(token: string | null): void {
  useEffect(() => {
    if (!token) return;
    let cancelado = false;

    void (async () => {
      try {
        const res = await http.get<IdiomaResuelto>('/configuracion/personalizacion/idioma/');
        if (!cancelado) aplicarLocale(res.data.locale_code);
      } catch {
        // Sin permiso (26, R), sin red o sin fila: se queda el locale de
        // localStorage. Nunca es motivo para romper el arranque de la sesión.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);
}
