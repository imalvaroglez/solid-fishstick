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
import type { Product, PublicCatalogProduct } from "../../types";

const COL = "products";
const PUBLIC_COL = "publicCatalogProducts";

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
export const subscribe = (cb: ProductListener): Unsubscribe =>
  onSnapshot(
    query(collection(db(), COL), orderBy("updatedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => d.data() as Product)),
    () => cb([])
  );

// Batched: write private doc + upsert/delete the public projection.
export const save = async (product: Product): Promise<void> => {
  const batch = writeBatch(db());
  batch.set(doc(db(), COL, product.id), product);
  const publicRef = doc(db(), PUBLIC_COL, product.id);
  if (product.isPublic) {
    batch.set(publicRef, toPublic(product));
  } else {
    batch.delete(publicRef);
  }
  await batch.commit();
};

// Non-destructive import: skip ids that already exist. Firestore `in` is capped
// at 30 values per query, so chunk it.
export const importProducts = async (items: Product[]): Promise<void> => {
  if (items.length === 0) return;
  const existing = new Set<string>();
  for (let i = 0; i < items.length; i += 30) {
    const chunk = items.slice(i, i + 30);
    const snap = await getDocs(
      query(collection(db(), COL), where(documentId(), "in", chunk.map((p) => p.id)))
    );
    snap.forEach((d) => existing.add(d.id));
  }
  const batch = writeBatch(db());
  for (const p of items) {
    if (existing.has(p.id)) continue;
    batch.set(doc(db(), COL, p.id), p);
    if (p.isPublic) {
      batch.set(doc(db(), PUBLIC_COL, p.id), toPublic(p));
    }
  }
  await batch.commit();
};
