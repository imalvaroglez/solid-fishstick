// One-time, idempotent migration of legacy single-tenant data into a store.
//
// copyLegacyToStore: reads the legacy root collections and writes them into
// stores/{storeId}/... via the (already store-aware) importers, which skip
// existing ids. Non-destructive: the legacy docs are never deleted or modified.
// Re-running is a no-op (every write is gated on skip-existing).
//
// backfillDefaultStore: ensures the synthetic DEFAULT store + owner memberships
// exist for the legacy admin UIDs (env-provided — there is no client API to
// resolve email→uid). Idempotent.
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { DEFAULT_STORE_ID, DEFAULT_SLUG } from "../repositories/storeRepository";
import { importProducts } from "../repositories/productRepository";
import { importCustomers } from "../repositories/customerRepository";
import { importOrders } from "../repositories/orderRepository";
import type {
  Customer,
  Order,
  Product,
  PublicCatalogProduct,
  Store,
} from "../../types";

const now = (): string => new Date().toISOString();
const legacyStoreName =
  import.meta.env.VITE_PUBLIC_CATALOG_BUSINESS_NAME?.trim() || "Tienda";

const readAll = async <T>(col: string): Promise<T[]> =>
  (await getDocs(collection(db(), col))).docs.map((d) => d.data() as T);

export const copyLegacyToStore = async (storeId: string): Promise<void> => {
  // Read from the LEGACY root collections, write into the store-scoped path.
  // The importers' chunked skip-existing check targets the store-scoped path
  // (storeId arg), so re-runs are no-ops.
  const [products, publicProducts, customers, orders] = await Promise.all([
    readAll<Product>("products"),
    readAll<PublicCatalogProduct>("publicCatalogProducts"),
    readAll<Customer>("customers"),
    readAll<Order>("orders"),
  ]);
  await Promise.all([
    // Copy the public collection itself rather than rebuilding it, so every
    // currently published item and image reference survives exactly.
    importProducts(products, storeId, false),
    importPublicProducts(publicProducts, storeId),
    importCustomers(customers, storeId),
    importOrders(orders, storeId),
  ]);
};

const importPublicProducts = async (
  items: PublicCatalogProduct[],
  storeId: string
): Promise<void> => {
  if (items.length === 0) return;
  const target = `stores/${storeId}/publicProducts`;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(
        collection(db(), target),
        where(documentId(), "in", chunk.map((item) => item.id))
      )
    );
    snap.forEach((item) => existing.add(item.id));
  }
  const pending = items.filter((item) => !existing.has(item.id));
  for (let i = 0; i < pending.length; i += 400) {
    const batch = writeBatch(db());
    for (const item of pending.slice(i, i + 400)) {
      batch.set(doc(db(), target, item.id), item);
    }
    await batch.commit();
  }
};

// Creates the synthetic DEFAULT store + the acting admin's owner membership +
// the publicStores pointer, in one batch the rules allow (store.ownerId == uid,
// membership self-owner, all validated via getAfter). Idempotent.
//
// NOTE: only the acting admin gets a membership here — the memberships create
// rule permits self-owner only (the multi-admin invite path is deferred). The
// SECOND legacy admin keeps full access via the legacy isAdmin() allowlist,
// which stays active through the transition. They'll get a membership when the
// invite-by-code flow ships.
export const backfillDefaultStore = async (uid: string): Promise<Store> => {
  // The store doc is private and cannot be read before its membership exists.
  // The public pointer is readable, so use it as the idempotency preflight.
  const pointer = await getDoc(doc(db(), "publicStores", DEFAULT_SLUG));
  if (pointer.exists()) {
    const index = await getDoc(
      doc(db(), "userMemberships", uid, "stores", DEFAULT_STORE_ID)
    );
    if (!index.exists()) {
      const ts = now();
      const batch = writeBatch(db());
      batch.set(doc(db(), "memberships", `${DEFAULT_STORE_ID}_${uid}`), {
        uid,
        storeId: DEFAULT_STORE_ID,
        role: "admin",
        status: "active",
        createdAt: ts,
      });
      batch.set(doc(db(), "userMemberships", uid, "stores", DEFAULT_STORE_ID), {
        storeId: DEFAULT_STORE_ID,
        role: "admin",
      });
      await batch.commit();
    }
    const existing = await getDoc(doc(db(), "stores", DEFAULT_STORE_ID));
    if (existing.exists()) return existing.data() as Store;
  }

  const ts = now();
  const store: Store = {
    id: DEFAULT_STORE_ID,
    name: legacyStoreName,
    slug: DEFAULT_SLUG,
    ownerId: uid,
    currency: "MXN",
    createdAt: ts,
    updatedAt: ts,
  };
  const batch = writeBatch(db());
  batch.set(doc(db(), "stores", DEFAULT_STORE_ID), store);
  batch.set(doc(db(), "memberships", `${DEFAULT_STORE_ID}_${uid}`), {
    uid,
    storeId: DEFAULT_STORE_ID,
    role: "owner",
    status: "active",
    createdAt: ts,
  });
  batch.set(doc(db(), "userMemberships", uid, "stores", DEFAULT_STORE_ID), {
    storeId: DEFAULT_STORE_ID,
    role: "owner",
  });
  batch.set(doc(db(), "publicStores", DEFAULT_SLUG), {
    storeId: DEFAULT_STORE_ID,
    name: legacyStoreName,
    currency: "MXN",
  });
  await batch.commit();
  return store;
};
