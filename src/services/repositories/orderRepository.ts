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
import type { Order, OrderStatus } from "../../types";

const COL = "orders";

type Listener = (orders: Order[]) => void;

export const subscribe = (cb: Listener): Unsubscribe =>
  onSnapshot(
    query(collection(db(), COL), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Order)),
    () => cb([])
  );

// Upsert a full order doc.
export const save = async (order: Order): Promise<void> => {
  await setDoc(doc(db(), COL, order.id), order);
};

// Advance an order's status (the single forward action).
export const advance = async (orderId: string, nextStatus: OrderStatus): Promise<void> => {
  await setDoc(
    doc(db(), COL, orderId),
    { status: nextStatus, updatedAt: new Date().toISOString() },
    { merge: true }
  );
};

// Non-destructive import: skip ids that already exist.
export const importOrders = async (items: Order[]): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), COL), where(documentId(), "in", chunk.map((o) => o.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const batch = writeBatch(db());
  for (const o of items) {
    if (existing.has(o.id)) continue;
    batch.set(doc(db(), COL, o.id), o);
  }
  await batch.commit();
};
