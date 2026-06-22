import { STRINGS } from "../lib/strings";
import { useAuth } from "../hooks/useAuth";

export const AccessDenied = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 text-5xl">🚫</div>
      <h1 className="text-xl font-bold text-gray-900">{STRINGS.auth.denied}</h1>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        {STRINGS.auth.deniedHint}
      </p>
      {user?.email && (
        <p className="mt-3 text-xs text-gray-400">{user.email}</p>
      )}
      <button
        onClick={() => void signOut()}
        className="mt-8 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 active:scale-[0.99] transition"
      >
        {STRINGS.auth.signOut}
      </button>
    </div>
  );
};
