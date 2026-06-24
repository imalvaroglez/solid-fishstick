// Per-worker emulator hosts. firebase@12 reads the Storage host at upload time;
// Firestore/Auth test contexts also receive explicit hosts in testEnv.ts.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:28086";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:29096";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:29196";
