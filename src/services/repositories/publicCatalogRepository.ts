// Public catalog — public read-only. No write methods here.
// Only safe fields reach the client (cost/profit/notes never stored here).
//
// Two modes:
//   - subscribe(cb)                 → legacy root publicCatalogProducts
//   - subscribe(cb, { slug, storeId }) → store-scoped publicProducts
// A slug is resolved to a storeId via publicStores/{slug}; callers may also
// pass storeId directly to skip the lookup.
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import type { PublicCatalogProduct } from "../../types";

const LEGACY_COL = "publicCatalogProducts";

// Distinguish "loaded empty" from "load failed" so the screen can show an
// error instead of a misleading empty storefront.
export type PublicCatalogState =
  | { status: "loading" }
  | { status: "ready"; products: PublicCatalogProduct[] }
  | { status: "error" };

type Listener = (state: PublicCatalogState) => void;

export type PublicCatalogTarget =
  | { slug: string; storeId?: string }
  | { slug?: undefined; storeId?: string };

// Resolve a slug to a storeId via the publicStores/{slug} pointer doc.
const resolveStoreId = async (
  target: PublicCatalogTarget
): Promise<string | undefined> => {
  if (target.storeId) return target.storeId;
  if (!target.slug) return undefined;
  const snap = await getDoc(doc(db(), "publicStores", target.slug));
  return snap.exists() ? (snap.data().storeId as string) : undefined;
};

// Realtime feed of public products only. Error callback surfaces failure
// rather than masquerading as an empty list.
export const subscribe = (
  cb: Listener,
  target?: PublicCatalogTarget
): Unsubscribe => {
  // Legacy path: no target → root collection.
  if (!target || (!target.slug && !target.storeId)) {
    return onSnapshot(
      query(collection(db(), LEGACY_COL), orderBy("updatedAt", "desc")),
      (snap) => cb({ status: "ready", products: snap.docs.map((d) => d.data() as PublicCatalogProduct) }),
      () => cb({ status: "error" })
    );
  }

  // Store-scoped path: resolve slug→storeId (async), then subscribe.
  let unsub: Unsubscribe | undefined;
  let cancelled = false;
  resolveStoreId(target)
    .then((storeId) => {
      if (cancelled) return;
      if (!storeId) return cb({ status: "error" });
      unsub = onSnapshot(
        query(collection(db(), `stores/${storeId}/publicProducts`), orderBy("updatedAt", "desc")),
        (snap) => cb({ status: "ready", products: snap.docs.map((d) => d.data() as PublicCatalogProduct) }),
        (error) => {
          if (import.meta.env.DEV) {
            console.error("[Firebase public catalog failed]", error.code, error.message);
          }
          cb({ status: "error" });
        }
      );
    })
    .catch(() => cb({ status: "error" }));

  // Return a teardown that also covers the async subscribe window.
  return () => {
    cancelled = true;
    unsub?.();
  };
};
