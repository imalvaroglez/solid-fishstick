import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getFirebase } from "./app";

let cached: Firestore | null = null;

export const db = (): Firestore => {
  if (cached) return cached;
  cached = initializeFirestore(getFirebase(), {
    ignoreUndefinedProperties: true,
  });
  return cached;
};
