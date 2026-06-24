// Shared test helpers: the legitimate self-service store bootstrap (4-doc batch
// the firestore rules allow). Reused by both rules suites so tests seed
// memberships the SAME way production does — never via a fake admin context
// (which the rules correctly deny).
import type { Firestore } from "firebase/firestore";

const now = () => new Date().toISOString();

export function bootstrapStore(
  db: Firestore,
  uid: string,
  opts: { storeId: string; slug: string; ownerId?: string; role?: string }
) {
  const { storeId, slug, ownerId = uid, role = "owner" } = opts;
  const batch = db.batch();
  batch.set(db.doc(`stores/${storeId}`), {
    id: storeId,
    name: "My Store",
    slug,
    ownerId,
    currency: "MXN",
    createdAt: now(),
    updatedAt: now(),
  });
  batch.set(db.doc(`memberships/${storeId}_${uid}`), {
    uid,
    storeId,
    role,
    status: "active",
    createdAt: now(),
  });
  batch.set(db.doc(`userMemberships/${uid}/stores/${storeId}`), {
    role,
    storeId,
  });
  batch.set(db.doc(`publicStores/${slug}`), {
    storeId,
    name: "My Store",
    currency: "MXN",
  });
  return batch;
}
