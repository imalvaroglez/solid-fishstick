// Store switcher + the smallest possible "add another store" flow.
import { useState } from "react";
import { useStore } from "../app/StoreProvider";
import { resolveStoreIdBySlug } from "../services/repositories/storeRepository";

export const StoreSwitcher = () => {
  const {
    stores,
    activeStoreId,
    setActiveStoreId,
    createStore,
    loading,
  } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading || stores.length === 0) return null;

  const addStore = async () => {
    if (!name.trim()) return;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "mi-tienda";
    setBusy(true);
    setError("");
    try {
      if (await resolveStoreIdBySlug(slug)) {
        setError("Ese nombre público ya está ocupado");
        return;
      }
      await createStore({ name: name.trim(), slug });
      setName("");
      setAdding(false);
    } catch {
      setError("No se pudo crear la tienda");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-3">
      <div className="flex gap-2">
        <select
          aria-label="Tienda activa"
          value={activeStoreId ?? ""}
          onChange={(e) => setActiveStoreId(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAdding(true)}
          disabled={busy}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
        >
          {busy ? "…" : "+ Tienda"}
        </button>
      </div>
      {adding && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la nueva tienda"
            autoFocus
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setName("");
                setError("");
              }}
              disabled={busy}
              className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold text-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={() => void addStore()}
              disabled={busy || !name.trim()}
              className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};
