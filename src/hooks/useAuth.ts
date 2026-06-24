// Auth state. Store authorization is enforced by Firestore/Storage membership
// rules rather than a client-side email gate.
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  auth,
  signInWithEmail,
  signOutAdmin,
  signUpWithEmail,
} from "../services/firebase/auth";
import { FirebaseConfigError } from "../services/firebase/app";

export type AuthStatus = "loading" | "signedOut" | "authenticated";

export const useAuth = (): {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
        setStatus("authenticated");
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
    signUp: signUpWithEmail,
    signOut: signOutAdmin,
  };
};
