// First-run flow for a signed-in user with no stores. Creates a store via the
// atomic bootstrap batch. Shown by AdminApp when the store list is empty.
import { useState } from "react";
import { STRINGS } from "../lib/strings";
import { useStore } from "../app/StoreProvider";
import { resolveStoreIdBySlug } from "../services/repositories/storeRepository";

// Slug: lowercase letters, digits, hyphens. ponytail: one regex, no lib.
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export const CreateStoreScreen = () => {
  const { createStore, migrateLegacyStore, canMigrateLegacy } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"" | "create" | "migrate">("");
  const [error, setError] = useState<string | null>(null);

  const slug = slugify(name) || "mi-tienda";

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy("create");
    setError(null);
    try {
      if (await resolveStoreIdBySlug(slug)) {
        setError("Ese nombre público ya está ocupado");
        return;
      }
      await createStore({ name: name.trim(), slug });
    } catch {
      setError(STRINGS.errors?.save ?? "No se pudo crear la tienda");
    } finally {
      setBusy("");
    }
  };

  const migrate = async () => {
    if (busy) return;
    setBusy("migrate");
    setError(null);
    try {
      await migrateLegacyStore();
    } catch {
      setError("No se pudo migrar la tienda actual");
      setBusy("");
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-4xl">🏪</div>
      <h1 className="text-xl font-bold text-gray-900">Crea tu tienda</h1>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        Dale un nombre. Podrás cambiarlo después.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la tienda"
        className="mt-5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
      />
      <p className="mt-2 w-full text-left text-xs text-gray-400">
        /catalogo/{slug}
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {canMigrateLegacy && (
        <button
          onClick={() => void migrate()}
          disabled={busy !== ""}
          className="mt-5 w-full rounded-xl border border-emerald-600 bg-white py-3 text-base font-semibold text-emerald-700 disabled:opacity-50"
        >
          {busy === "migrate" ? "Migrando…" : "Migrar tienda actual"}
        </button>
      )}
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || busy !== ""}
        className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {busy === "create" ? "Creando…" : "Crear tienda nueva"}
      </button>
    </div>
  );
};
