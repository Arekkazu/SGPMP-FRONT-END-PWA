import { useCallback, useEffect, useState } from 'react';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import {
  firebaseConfigured,
  firebaseVapidKey,
  getFirebaseMessaging,
} from '../../lib/firabase';
import { notificacionesApi } from '../api/notificacionesApi';
import { guardarRegistroFcm, obtenerRegistroFcm } from '../db/notificacionesTable';

export type PushPermission = NotificationPermission | 'unsupported' | 'unconfigured';

export interface PushNotificationState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  requestingPermission: boolean;
  permission: PushPermission;
}

interface UsePushNotificationsOptions {
  idUsuario: number | null;
  onNotification?: (payload?: MessagePayload) => void;
}

const registrosEnCurso = new Map<string, Promise<void>>();
const registrosConfirmados = new Set<string>();

function permisoInicial(): PushPermission {
  if (!firebaseConfigured) return 'unconfigured';
  if (
    typeof window === 'undefined'
    || typeof navigator === 'undefined'
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
  ) return 'unsupported';
  return Notification.permission;
}

async function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

async function registrarTokenSiCambio(idUsuario: number, token: string): Promise<void> {
  const clave = `${idUsuario}:${token}`;
  if (registrosConfirmados.has(clave)) return;
  const registroExistente = registrosEnCurso.get(clave);
  if (registroExistente) return registroExistente;

  const registro = (async () => {
    try {
      const cache = await obtenerRegistroFcm(idUsuario);
      if (cache?.token === token) return;
    } catch {
      // IndexedDB es una optimización; el registro remoto sigue siendo prioritario.
    }

    await notificacionesApi.registrarTokenFcm({ token });
    registrosConfirmados.add(clave);
    try {
      await guardarRegistroFcm(idUsuario, token);
    } catch {
      // El backend ya confirmó el token; se reintentará si la caché no está disponible.
    }
  })();
  registrosEnCurso.set(clave, registro);

  try {
    await registro;
  } finally {
    if (registrosEnCurso.get(clave) === registro) registrosEnCurso.delete(clave);
  }
}

export function usePushNotifications({
  idUsuario,
  onNotification,
}: UsePushNotificationsOptions = { idUsuario: null }): PushNotificationState & {
  requestNotificationPermission: () => Promise<void>;
} {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isLoading: false,
    error: null,
    requestingPermission: false,
    permission: permisoInicial(),
  });

  const conectar = useCallback(async (solicitarPermiso: boolean): Promise<void> => {
    if (!firebaseConfigured) {
      setState((previous) => ({ ...previous, permission: 'unconfigured' }));
      return;
    }
    if (
      typeof window === 'undefined'
      || !('Notification' in window)
      || !('serviceWorker' in navigator)
    ) {
      setState((previous) => ({ ...previous, permission: 'unsupported' }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: true,
      requestingPermission: solicitarPermiso,
      error: null,
    }));

    try {
      const permission = solicitarPermiso
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') {
        setState((previous) => ({
          ...previous,
          permission,
          isLoading: false,
          requestingPermission: false,
        }));
        return;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setState((previous) => ({
          ...previous,
          permission: 'unsupported',
          isLoading: false,
          requestingPermission: false,
        }));
        return;
      }

      const serviceWorkerRegistration = await registrarServiceWorker();
      const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration,
      });
      if (!token) throw new Error('FCM_TOKEN_VACIO');
      if (idUsuario != null) await registrarTokenSiCambio(idUsuario, token);

      setState({
        token,
        permission: 'granted',
        isLoading: false,
        requestingPermission: false,
        error: null,
      });
    } catch {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        requestingPermission: false,
        error: 'No fue posible activar las notificaciones push en este dispositivo.',
      }));
    }
  }, [idUsuario]);

  useEffect(() => {
    if (state.permission === 'granted' && !state.token) void conectar(false);
  }, [conectar, state.permission, state.token]);

  useEffect(() => {
    if (idUsuario == null || !state.token) return;
    let active = true;
    void registrarTokenSiCambio(idUsuario, state.token).catch(() => {
      if (active) {
        setState((previous) => ({
          ...previous,
          error: 'El dispositivo no pudo registrarse para recibir notificaciones push.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [idUsuario, state.token]);

  useEffect(() => {
    if (!firebaseConfigured || typeof navigator === 'undefined') return;
    let unsubscribe: (() => void) | undefined;
    let active = true;

    void getFirebaseMessaging().then((messaging) => {
      if (!active || !messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        onNotification?.(payload);
        if (Notification.permission === 'granted' && payload.notification) {
          try {
            new Notification(payload.notification.title ?? 'Notificación', {
              body: payload.notification.body,
              icon: payload.notification.icon,
            });
          } catch {
            // En algunos móviles el aviso visible solo puede originarse en el Service Worker.
          }
        }
      });
    });

    const recibirDesdeServiceWorker = (event: MessageEvent) => {
      if (event.data?.type === 'SGPMP_FCM_NOTIFICATION') onNotification?.();
    };
    navigator.serviceWorker?.addEventListener('message', recibirDesdeServiceWorker);

    return () => {
      active = false;
      unsubscribe?.();
      navigator.serviceWorker?.removeEventListener('message', recibirDesdeServiceWorker);
    };
  }, [onNotification]);

  return {
    ...state,
    requestNotificationPermission: () => conectar(true),
  };
}
