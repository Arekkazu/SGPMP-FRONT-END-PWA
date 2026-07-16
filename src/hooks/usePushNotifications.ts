import { useEffect, useState } from "react";
import { messaging } from "../lib/firabase";
import { getToken, onMessage } from "firebase/messaging";

export interface PushNotificationState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  requestingPermission: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isLoading: false,
    error: null,
    requestingPermission: false,
  });

  // Función para pedir permisos
  const requestNotificationPermission = async () => {
    setState((prev) => ({
      ...prev,
      requestingPermission: true,
      error: null,
    }));

    try {
      // Pedir permiso (esto funciona en web y PWA)
      const permission = await Notification.requestPermission();
      console.log("Permiso de notificación:", permission);

      if (permission === "granted") {
        // Registrar el Service Worker
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.register(
              "/firebase-messaging-sw.js",
            );
            console.log("Service Worker registrado:", registration);
          } catch (swError) {
            console.warn("Error registrando Service Worker:", swError);
          }
        }

        // Obtener el token de FCM
        try {
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY,
          });

          console.log("Token FCM obtenido:", token);
          setState((prev) => ({
            ...prev,
            token: token,
            isLoading: false,
            requestingPermission: false,
          }));
        } catch (tokenError) {
          console.error("Error obteniendo token FCM:", tokenError);
          setState((prev) => ({
            ...prev,
            error:
              tokenError instanceof Error
                ? tokenError.message
                : "Error obteniendo token",
            isLoading: false,
            requestingPermission: false,
          }));
        }

        // Escuchar notificaciones en foreground
        onMessage(messaging, (payload) => {
          console.log("Notificación recibida (foreground):", payload);
          if (payload.notification) {
            new Notification(payload.notification.title || "Notificación", {
              body: payload.notification.body,
              icon: payload.notification.icon,
            });
          }
        });
      } else {
        setState((prev) => ({
          ...prev,
          error: "Permisos de notificación denegados",
          isLoading: false,
          requestingPermission: false,
        }));
      }
    } catch (error) {
      console.error("Error solicitando permisos:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
        requestingPermission: false,
      }));
    }
  };

  // Verificar si ya tenemos permisos al cargar
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if ("Notification" in window) {
        const permission = Notification.permission;
        console.log("Permiso actual de notificación:", permission);

        if (permission === "granted") {
          try {
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_VAPID_KEY,
            });

            console.log("Token FCM obtenido (permisos previos):", token);
            setState((prev) => ({
              ...prev,
              token: token,
            }));
          } catch (error) {
            console.error("Error obteniendo token:", error);
          }
        }
      }
    };

    checkNotificationPermission();
  }, []);

  return {
    ...state,
    requestNotificationPermission,
  };
};
