import { defineConfig } from "@playwright/test";

// E2E against the Firebase emulators started by npm run verify.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "store-flow.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5175",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5175",
    url: "http://localhost:5175",
    // Always start fresh: a leftover vite started without VITE_USE_EMULATOR would
    // be reused and the client would connect to production instead of the emulator.
    reuseExistingServer: false,
    timeout: 60_000,
    // Point the firebase JS SDK at the emulator. VITE_USE_EMULATOR flips the
    // app's connectAuthEmulator/connectFirestoreEmulator/connectStorageEmulator.
    env: {
      VITE_USE_EMULATOR: "1",
      VITE_FIREBASE_API_KEY: "fake-key",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-solid-fishstick.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "demo-solid-fishstick",
      VITE_FIREBASE_STORAGE_BUCKET: "demo-solid-fishstick.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789",
      VITE_FIREBASE_APP_ID: "1:123456789:web:test",
      VITE_ADMIN_EMAILS: "admin@mail.com,estebanchavez1709@gmail.com",
      VITE_LEGACY_ADMIN_UIDS: "*",
      VITE_PUBLIC_CATALOG_SELLER_PHONE: "5215512345678",
      VITE_PUBLIC_CATALOG_BUSINESS_NAME: "Tienda existente",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:29096",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:28086",
      FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:29196",
    },
  },
});
