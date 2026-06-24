// products (private) + publicCatalogProducts (public, safe fields) sync.
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
import type { Product, PublicCatalogProduct } from "../../types";

// Legacy root collection (single-tenant) vs store-scoped subcollection (Store OS).
// No storeId = legacy path, so the app keeps working during the transition.
const privateCol = (storeId?: string) =>
  storeId ? `stores/${storeId}/products` : "products";
const publicCol = (storeId?: string) =>
  storeId ? `stores/${storeId}/publicProducts` : "publicCatalogProducts";

// Project private Product -> public-safe shape. Never copy cost/profit/notes.
const toPublic = (p: Product): PublicCatalogProduct => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.referencePrice,
  imageUrl: p.imageUrl,
  imagePath: p.imagePath,
  description: p.publicDescription,
  isPublic: true,
  updatedAt: p.updatedAt,
});

type ProductListener = (products: Product[]) => void;

// Realtime feed of all products, newest first.
export const subscribe = (
  cb: ProductListener,
  storeId?: string
): Unsubscribe =>
  onSnapshot(
    query(collection(db(), privateCol(storeId)), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Product)),
    () => cb([])
  );

// Batched: write private doc + upsert/delete the public projection.
export const save = async (product: Product, storeId?: string): Promise<void> => {
  try {
    const batch = writeBatch(db());
    batch.set(doc(db(), privateCol(storeId), product.id), product);
    const publicRef = doc(db(), publicCol(storeId), product.id);
    if (product.isPublic) {
      batch.set(publicRef, toPublic(product));
    } else {
      batch.delete(publicRef);
    }
    await batch.commit();
  } catch (error) {
    rethrowFirebaseError(
      "save private/public projection",
      `${privateCol(storeId)},${publicCol(storeId)}`,
      product.id,
      error
    );
  }
};

// Non-destructive import: skip ids that already exist. Firestore `in` is capped
// at 30 values per query, so chunk it.
export const importProducts = async (
  items: Product[],
  storeId?: string,
  includePublic = true
): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), privateCol(storeId)), where(documentId(), "in", chunk.map((p) => p.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const pending = items.filter((p) => !existing.has(p.id));
  // At most two writes per product (private + public), safely below Firestore's
  // 500-write batch cap.
  for (let i = 0; i < pending.length; i += 200) {
    const batch = writeBatch(db());
    for (const p of pending.slice(i, i + 200)) {
      batch.set(doc(db(), privateCol(storeId), p.id), p);
      if (includePublic && p.isPublic) {
        batch.set(doc(db(), publicCol(storeId), p.id), toPublic(p));
      }
    }
    await batch.commit();
  }
};
