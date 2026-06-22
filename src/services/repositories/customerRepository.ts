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

const COL = "customers";

type Listener = (customers: Customer[]) => void;

export const subscribe = (cb: Listener): Unsubscribe =>
  onSnapshot(
    query(collection(db(), COL), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Customer)),
    () => cb([])
  );

export const save = async (customer: Customer): Promise<void> => {
  try {
    await importCustomers([customer]);
  } catch (error) {
    rethrowFirebaseError("save", COL, customer.id, error);
  }
};

// Non-destructive: skip ids that already exist.
export const importCustomers = async (items: Customer[]): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), COL), where(documentId(), "in", chunk.map((c) => c.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const batch = writeBatch(db());
  for (const c of items) {
    if (existing.has(c.id)) continue;
    batch.set(doc(db(), COL, c.id), c);
  }
  await batch.commit();
};
