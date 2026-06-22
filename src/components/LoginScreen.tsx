import { useState } from "react";
import { STRINGS } from "../lib/strings";
import { signInWithGoogle } from "../services/firebase/auth";
import { FirebaseConfigError } from "../services/firebase/app";

export const LoginScreen = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const onSignIn = async () => {
    setError("");
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(
        e instanceof FirebaseConfigError
          ? e.message
          : "No se pudo iniciar sesión. Intenta de nuevo."
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 text-5xl">🛍️</div>
      <h1 className="text-2xl font-bold text-gray-900">{STRINGS.appName}</h1>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Inicia sesión para administrar tu catálogo y tus pedidos.
      </p>

      <button
        onClick={onSignIn}
        disabled={signingIn}
        className="mt-8 flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-base font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 active:scale-[0.99] active:bg-gray-50 transition disabled:opacity-60"
      >
        {signingIn ? STRINGS.auth.signingIn : STRINGS.auth.signIn}
      </button>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
};
