// publicCatalogProducts — public read-only. No write methods here.
// Only safe fields reach the client (cost/profit/notes never stored here).
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import type { PublicCatalogProduct } from "../../types";

const COL = "publicCatalogProducts";

// Distinguish "loaded empty" from "load failed" so the screen can show an
// error instead of a misleading empty storefront.
export type PublicCatalogState =
  | { status: "loading" }
  | { status: "ready"; products: PublicCatalogProduct[] }
  | { status: "error" };

type Listener = (state: PublicCatalogState) => void;

// Realtime feed of public products only. Error callback surfaces failure
// rather than masquerading as an empty list.
export const subscribe = (cb: Listener): Unsubscribe =>
  onSnapshot(
    query(collection(db(), COL), orderBy("updatedAt", "desc")),
    (snap) => cb({ status: "ready", products: snap.docs.map((d) => d.data() as PublicCatalogProduct) }),
    (error) => {
      if (import.meta.env.DEV) {
        console.error("[Firebase public catalog failed]", error.code, error.message);
      }
      cb({ status: "error" });
    }
  );
