import { initializeFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFirebase, useEmulator, EMULATOR_HOST } from "./app";

let cached: Firestore | null = null;

export const db = (): Firestore => {
  if (cached) return cached;
  cached = initializeFirestore(getFirebase(), {
    ignoreUndefinedProperties: true,
  });
  if (useEmulator) {
    connectFirestoreEmulator(cached, EMULATOR_HOST, 28086);
  }
  return cached;
};
