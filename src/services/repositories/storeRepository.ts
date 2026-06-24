// stores + memberships + userMemberships + publicStores.
//
// createStore writes all four in ONE atomic writeBatch; firestore.rules
// validates them via getAfter() (in-flight view). mId is deterministic:
// storeId + "_" + uid, so rules can compute the path without a query.
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { rethrowFirebaseError } from "../firebase/diagnostics";
import { id } from "../../lib/ids";
import type { Store, UserStoreMembership } from "../../types";

// The store the legacy single-tenant data is migrated into. slug is stable so
// /catalogo can alias to it.
export const DEFAULT_STORE_ID = "default";
export const DEFAULT_SLUG = "default";

const now = (): string => new Date().toISOString();

export type CreateStoreInput = {
  name: string;
  slug: string;
  currency?: string;
};

// One atomic batch: store + owner membership + index + public pointer.
// Throws on rules rejection (e.g. duplicate slug, missing auth) — callers surface.
export const createStore = async (
  uid: string,
  input: CreateStoreInput
): Promise<Store> => {
  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 40) {
    throw new Error("Invalid store name or slug");
  }
  const storeId = id();
  const ts = now();
  const store: Store = {
    id: storeId,
    name,
    slug,
    ownerId: uid,
    currency: input.currency ?? "MXN",
    createdAt: ts,
    updatedAt: ts,
  };
  try {
    const batch = writeBatch(db());
    batch.set(doc(db(), "stores", storeId), store);
    batch.set(doc(db(), "memberships", `${storeId}_${uid}`), {
      uid,
      storeId,
      role: "owner",
      status: "active",
      createdAt: ts,
    });
    batch.set(doc(db(), "userMemberships", uid, "stores", storeId), {
      storeId,
      role: "owner",
    });
    batch.set(doc(db(), "publicStores", slug), {
      storeId,
      name,
      currency: input.currency ?? "MXN",
    });
    await batch.commit();
    return store;
  } catch (error) {
    rethrowFirebaseError("createStore", "stores", storeId, error);
    throw error; // rethrowFirebaseError throws, but satisfy the return type
  }
};

// Realtime feed of the stores a user belongs to (via the client-listing index).
type StoresListener = (stores: Store[]) => void;

export const subscribeUserStores = (
  uid: string,
  cb: StoresListener
): Unsubscribe => {
  const q = query(collection(db(), "userMemberships", uid, "stores"));
  let version = 0;
  return onSnapshot(
    q,
    async (snap) => {
      const currentVersion = ++version;
      // The index only carries role; fetch each store doc for full details.
      const ids = snap.docs.map((d) => (d.data() as UserStoreMembership).storeId);
      if (ids.length === 0) return cb([]);
      try {
        const stores = await Promise.all(
          ids.map((storeId) => getDoc(doc(db(), "stores", storeId)))
        );
        if (currentVersion === version) {
          cb(stores.filter((s) => s.exists()).map((s) => s.data() as Store));
        }
      } catch {
        if (currentVersion === version) cb([]);
      }
    },
    () => cb([])
  );
};

// Resolve a public slug to a storeId (one read).
export const resolveStoreIdBySlug = async (
  slug: string
): Promise<string | null> => {
  const snap = await getDoc(doc(db(), "publicStores", slug));
  if (!snap.exists()) return null;
  return (snap.data().storeId as string) ?? null;
};
