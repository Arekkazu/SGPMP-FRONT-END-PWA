import { useEffect, useRef, useState } from 'react';
import {
  calculateSessionTiming,
  SESSION_WARNING_SECONDS,
  type SessionTimeoutReason,
} from '../lib/sessionTiming';

interface SessionTimeoutOptions {
  token: string | null;
  expiresAt: number | null;
  onTimeout: (reason: SessionTimeoutReason) => Promise<void> | void;
}

export interface SessionTimeoutState {
  showWarning: boolean;
  remainingSeconds: number;
  reason: SessionTimeoutReason | null;
}

const EMPTY_STATE: SessionTimeoutState = {
  showWarning: false,
  remainingSeconds: 0,
  reason: null,
};

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'pointermove',
  'keydown',
  'scroll',
  'touchstart',
];

export function useSessionTimeout({
  token,
  expiresAt,
  onTimeout,
}: SessionTimeoutOptions): SessionTimeoutState {
  const [state, setState] = useState<SessionTimeoutState>(EMPTY_STATE);
  const lastActivityAtRef = useRef(Date.now());
  const timedOutTokenRef = useRef<string | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!token) {
      timedOutTokenRef.current = null;
      setState(EMPTY_STATE);
      return;
    }

    lastActivityAtRef.current = Date.now();
    timedOutTokenRef.current = null;

    const triggerTimeout = (reason: SessionTimeoutReason) => {
      setState(EMPTY_STATE);
      if (timedOutTokenRef.current !== token) {
        timedOutTokenRef.current = token;
        void onTimeoutRef.current(reason);
      }
    };

    const evaluateSession = (now = Date.now()) => {
      const timing = calculateSessionTiming(now, lastActivityAtRef.current, expiresAt);

      if (timing.remainingSeconds === 0) {
        triggerTimeout(timing.reason);
        return;
      }

      if (timing.remainingSeconds <= SESSION_WARNING_SECONDS) {
        setState({
          showWarning: true,
          remainingSeconds: timing.remainingSeconds,
          reason: timing.reason,
        });
      } else {
        setState((current) => current.showWarning ? EMPTY_STATE : current);
      }
    };

    const recordActivity = () => {
      const now = Date.now();
      const currentTiming = calculateSessionTiming(now, lastActivityAtRef.current, expiresAt);

      // Una pestaña suspendida no puede reactivar una sesión que ya agotó su plazo.
      if (currentTiming.remainingSeconds === 0) {
        triggerTimeout(currentTiming.reason);
        return;
      }

      if (now - lastActivityAtRef.current < 1000) return;
      lastActivityAtRef.current = now;
      evaluateSession(now);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') evaluateSession();
    };

    const listenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, listenerOptions);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(() => evaluateSession(), 1000);
    evaluateSession();

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity, listenerOptions);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expiresAt, token]);

  return state;
}
