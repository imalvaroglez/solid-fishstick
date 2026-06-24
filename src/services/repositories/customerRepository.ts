// customers — private admin collection.
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
  where,
  documentId,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { rethrowFirebaseError } from "../firebase/diagnostics";
import type { Customer } from "../../types";

// Legacy root collection (single-tenant) vs store-scoped subcollection (Store OS).
// No storeId = legacy path, so the app keeps working during the transition.
const col = (storeId?: string) =>
  storeId ? `stores/${storeId}/customers` : "customers";

type Listener = (customers: Customer[]) => void;

export const subscribe = (cb: Listener, storeId?: string): Unsubscribe =>
  onSnapshot(
    query(collection(db(), col(storeId)), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Customer)),
    () => cb([])
  );

export const save = async (
  customer: Customer,
  storeId?: string
): Promise<void> => {
  try {
    await importCustomers([customer], storeId);
  } catch (error) {
    rethrowFirebaseError("save", col(storeId), customer.id, error);
  }
};

// Non-destructive: skip ids that already exist.
export const importCustomers = async (
  items: Customer[],
  storeId?: string
): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), col(storeId)), where(documentId(), "in", chunk.map((c) => c.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const pending = items.filter((c) => !existing.has(c.id));
  for (let i = 0; i < pending.length; i += 400) {
    const batch = writeBatch(db());
    for (const c of pending.slice(i, i + 400)) {
      batch.set(doc(db(), col(storeId), c.id), c);
    }
    await batch.commit();
  }
};
