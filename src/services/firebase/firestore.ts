import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebase } from "./app";

let cached: Firestore | null = null;

export const db = (): Firestore => {
  if (cached) return cached;
  cached = getFirestore(getFirebase());
  return cached;
};
