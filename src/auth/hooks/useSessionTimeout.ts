import { useEffect, useRef, useState } from 'react';
import { getLastAuthenticatedRequestAt } from '../../shared/api/http';
import { authApi } from '../api/authApi';

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const WARNING_BEFORE_MS = 5 * 60 * 1000;

// El keepalive solo se envía si la última petición autenticada ya es más vieja
// que esto: un usuario que está navegando la app ya refresca `ultimo_acceso`
// con sus propias peticiones y no genera tráfico extra.
const KEEPALIVE_AFTER_MS = 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'pointermove',
  'keydown',
  'scroll',
  'touchstart',
];

interface SessionTimeoutOptions {
  hasSession: boolean;
  onTimeout: () => void;
}

/**
 * Cierra la sesión tras 30 min sin interacción y expone los segundos restantes
 * durante los últimos 5 min (RF-02).
 *
 * El backend aplica el mismo plazo, pero medido sobre `cuenta.ultimo_acceso`,
 * que solo se actualiza en peticiones autenticadas (`get_current_user`). Leer
 * una pantalla sin disparar peticiones es actividad para el usuario y silencio
 * para el servidor, así que la actividad del DOM se traduce en un keepalive
 * para que ambos plazos venzan a la vez.
 */
export function useSessionTimeout({ hasSession, onTimeout }: SessionTimeoutOptions): number | null {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!hasSession) {
      setRemainingSeconds(null);
      return;
    }

    // No se reinicia al rotar el JWT: para el backend un refresh tampoco cuenta
    // como actividad (ver refresh_token_use_case.py).
    let lastActivityAt = Date.now();
    let timedOut = false;

    const evaluate = () => {
      if (timedOut) return;
      const remainingMs = lastActivityAt + INACTIVITY_TIMEOUT_MS - Date.now();

      if (remainingMs <= 0) {
        timedOut = true;
        setRemainingSeconds(null);
        onTimeoutRef.current();
        return;
      }

      setRemainingSeconds(remainingMs <= WARNING_BEFORE_MS ? Math.ceil(remainingMs / 1000) : null);
    };

    const handleActivity = () => {
      const now = Date.now();

      // Una pestaña suspendida no revive una sesión cuyo plazo ya venció.
      if (now - lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
        evaluate();
        return;
      }
      if (now - lastActivityAt < 1000) return;

      lastActivityAt = now;
      if (now - getLastAuthenticatedRequestAt() > KEEPALIVE_AFTER_MS) {
        void authApi.mantenerSesion().catch(() => {
          // Si la sesión ya murió en el servidor, el interceptor 401 redirige.
        });
      }
      evaluate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') evaluate();
    };

    const listenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, listenerOptions);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(evaluate, 1000);
    evaluate();

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, listenerOptions);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasSession]);

  return remainingSeconds;
}
