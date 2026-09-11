import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseVapidKey = import.meta.env.VITE_VAPID_KEY ?? '';

const camposRequeridos = [
  firebaseConfig.apiKey,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
  firebaseVapidKey,
];

export const firebaseConfigured = camposRequeridos.every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

let firebaseApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!firebaseApp) firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  return firebaseApp;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}
