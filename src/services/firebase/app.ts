// Firebase app singleton. Lazy: nothing initializes until first use, so the
// app builds and boots even when .env.local is absent (e.g. CI/review).
import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";

export class FirebaseConfigError extends Error {
  constructor() {
    super("No se pudo conectar con el servidor. Configura Firebase.");
    this.name = "FirebaseConfigError";
  }
}

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Boolean(
  config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.storageBucket &&
    config.messagingSenderId &&
    config.appId
);

let cached: FirebaseApp | null = null;

// True when the app should talk to the local Firebase emulator (e2e/dev).
// Set VITE_USE_EMULATOR=1 in the dev environment to connect auth/firestore/storage
// to localhost. Never set in production.
export const useEmulator = env.VITE_USE_EMULATOR === "1";
export const EMULATOR_HOST = "127.0.0.1";

// Returns the initialized app, or throws a friendly Spanish error if unconfigured.
export const getFirebase = (): FirebaseApp => {
  if (cached) return cached;
  if (!isConfigured) throw new FirebaseConfigError();
  cached = getApps().length ? getApp() : initializeApp(config);
  return cached;
};
