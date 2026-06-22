// LocalStorage abstraction. Components never touch localStorage directly —
// this is the single swap point for a future Firebase/Firestore backend.
import type { DB } from "../types";
import { SEED_DB } from "./seed";

const KEY = "first_orders:v1";

export const load = (): DB => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // ponytail: absence = first run. Seed and persist so it survives reload.
      localStorage.setItem(KEY, JSON.stringify(SEED_DB));
      return structuredClone(SEED_DB);
    }
    const parsed = JSON.parse(raw) as DB;
    // Defensive: ensure shape (forward-compat if fields are added later).
    return {
      version: 1,
      products: parsed.products ?? [],
      customers: parsed.customers ?? [],
      orders: parsed.orders ?? [],
    };
  } catch {
    // Corrupted storage — fall back to seed rather than crash.
    return structuredClone(SEED_DB);
  }
};

export const save = (db: DB): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Storage full / disabled — app keeps working in-memory for the session.
  }
};
