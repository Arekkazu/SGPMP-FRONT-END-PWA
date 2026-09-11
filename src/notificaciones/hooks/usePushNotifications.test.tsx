import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, onMessage } from 'firebase/messaging';
import { notificacionesApi } from '../api/notificacionesApi';
import { obtenerRegistroFcm } from '../db/notificacionesTable';
import { usePushNotifications } from './usePushNotifications';

vi.mock('firebase/messaging', () => ({
  getToken: vi.fn(),
  onMessage: vi.fn(() => vi.fn()),
}));

vi.mock('../../lib/firabase', () => ({
  firebaseConfigured: true,
  firebaseVapidKey: 'vapid-publica',
  getFirebaseMessaging: vi.fn().mockResolvedValue({}),
}));

vi.mock('../api/notificacionesApi', () => ({
  notificacionesApi: {
    registrarTokenFcm: vi.fn(),
  },
}));

vi.mock('../db/notificacionesTable', () => ({
  obtenerRegistroFcm: vi.fn(),
  guardarRegistroFcm: vi.fn(),
}));

const getTokenMock = vi.mocked(getToken);
const onMessageMock = vi.mocked(onMessage);
const registrarTokenMock = vi.mocked(notificacionesApi.registrarTokenFcm);
const obtenerRegistroMock = vi.mocked(obtenerRegistroFcm);
const originalNotification = globalThis.Notification;
const originalServiceWorker = navigator.serviceWorker;

describe('usePushNotifications', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    onMessageMock.mockClear();
    onMessageMock.mockReturnValue(vi.fn());
    registrarTokenMock.mockReset();
    obtenerRegistroMock.mockReset();
    getTokenMock.mockResolvedValue('token-fcm');
    registrarTokenMock.mockResolvedValue({ message: 'Token registrado.' });
    obtenerRegistroMock.mockResolvedValue(undefined);

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({ scope: '/' }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: originalNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it('solicita permiso, obtiene el token con el Service Worker y lo registra', async () => {
    const { result } = renderHook(() => usePushNotifications({ idUsuario: 12 }));

    await act(async () => {
      await result.current.requestNotificationPermission();
    });

    await waitFor(() => expect(result.current.token).toBe('token-fcm'));
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/firebase-messaging-sw.js');
    expect(getTokenMock).toHaveBeenCalledWith({}, {
      vapidKey: 'vapid-publica',
      serviceWorkerRegistration: { scope: '/' },
    });
    expect(registrarTokenMock).toHaveBeenCalledWith({ token: 'token-fcm' });
  });
});
