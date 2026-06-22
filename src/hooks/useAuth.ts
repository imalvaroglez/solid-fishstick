// Admin auth state. One onAuthStateChanged subscription; admin check is atomic
// to each emission so status never flickers between denied/admin.
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInWithEmail, signOutAdmin, isAdminEmail } from "../services/firebase/auth";
import { FirebaseConfigError } from "../services/firebase/app";

export type AuthStatus = "loading" | "signedOut" | "denied" | "admin";

export const useAuth = (): {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
} => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // If Firebase isn't configured, surface as signed-out (login screen will
    // show the friendly error when sign-in is attempted).
    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(auth(), (u) => {
        setUser(u);
        if (!u) return setStatus("signedOut");
        setStatus(isAdminEmail(u.email) ? "admin" : "denied");
      });
    } catch (e) {
      if (e instanceof FirebaseConfigError) setStatus("signedOut");
      else throw e;
    }
    return () => unsub?.();
  }, []);

  return {
    status,
    user,
    signIn: signInWithEmail,
    signOut: signOutAdmin,
  };
};
