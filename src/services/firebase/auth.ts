import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { getFirebase } from "./app";

let cached: Auth | null = null;

export const auth = (): Auth => {
  if (cached) return cached;
  cached = getAuth(getFirebase());
  return cached;
};

// Admin allowlist, parsed from VITE_ADMIN_EMAILS. Client-side gate; the real
// enforcement is in firestore.rules/storage.rules (same email list).
export const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null): boolean =>
  Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase()));

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  await signInWithEmailAndPassword(auth(), email, password);
};

export const signOutAdmin = async (): Promise<void> => {
  await signOut(auth());
};
