import { useState, type FormEvent } from "react";
import { Field, TextInput } from "../forms/formFields";
import { useAuth } from "../hooks/useAuth";
import { STRINGS } from "../lib/strings";

export const LoginScreen = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const onSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError(STRINGS.auth.signInError);
    } finally {
      setSigningIn(false);
    }
  };

  const onSignUp = async () => {
    setError("");
    setSigningIn(true);
    try {
      await signUp(email.trim(), password);
    } catch {
      setError("No se pudo crear la cuenta. Revisa los datos.");
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

      <form onSubmit={onSignIn} className="mt-8 w-full max-w-xs space-y-4 text-left">
        <Field label={STRINGS.auth.email}>
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={STRINGS.auth.password}>
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <button
          type="submit"
          disabled={signingIn}
          className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-semibold text-white active:scale-[0.99] active:bg-emerald-700 transition disabled:opacity-60"
        >
          {signingIn ? STRINGS.auth.signingIn : STRINGS.auth.signIn}
        </button>
        <button
          type="button"
          onClick={() => void onSignUp()}
          disabled={signingIn || !email.trim() || password.length < 6}
          className="flex w-full items-center justify-center rounded-2xl border border-emerald-600 bg-white px-5 py-3.5 text-base font-semibold text-emerald-700 disabled:opacity-50"
        >
          Crear cuenta
        </button>
        {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
      </form>
    </div>
  );
};
