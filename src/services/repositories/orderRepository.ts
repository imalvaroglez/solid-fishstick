// orders — private admin collection.
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  where,
  documentId,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { rethrowFirebaseError } from "../firebase/diagnostics";
import type { Order, OrderStatus } from "../../types";

// Legacy root collection (single-tenant) vs store-scoped subcollection (Store OS).
// No storeId = legacy path, so the app keeps working during the transition.
const col = (storeId?: string) =>
  storeId ? `stores/${storeId}/orders` : "orders";

type Listener = (orders: Order[]) => void;

export const subscribe = (cb: Listener, storeId?: string): Unsubscribe =>
  onSnapshot(
    query(collection(db(), col(storeId)), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Order)),
    () => cb([])
  );

// Upsert a full order doc.
export const save = async (order: Order, storeId?: string): Promise<void> => {
  try {
    await setDoc(doc(db(), col(storeId), order.id), order);
  } catch (error) {
    rethrowFirebaseError("save", col(storeId), order.id, error);
  }
};

// Advance an order's status (the single forward action).
export const advance = async (
  orderId: string,
  nextStatus: OrderStatus,
  storeId?: string
): Promise<void> => {
  try {
    await setDoc(
      doc(db(), col(storeId), orderId),
      { status: nextStatus, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    rethrowFirebaseError("advance", col(storeId), orderId, error);
  }
};

// Non-destructive import: skip ids that already exist.
export const importOrders = async (
  items: Order[],
  storeId?: string
): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), col(storeId)), where(documentId(), "in", chunk.map((o) => o.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const pending = items.filter((o) => !existing.has(o.id));
  for (let i = 0; i < pending.length; i += 400) {
    const batch = writeBatch(db());
    for (const o of pending.slice(i, i + 400)) {
      batch.set(doc(db(), col(storeId), o.id), o);
    }
    await batch.commit();
  }
};
