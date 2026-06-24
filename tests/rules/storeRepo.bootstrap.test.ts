import { assertSucceeds } from "@firebase/rules-unit-testing";
import { beforeAll, beforeEach, describe, test } from "vitest";
import type { Firestore } from "firebase/firestore";
import { getTestEnv, type RulesTestEnvironment } from "./testEnv";
import { id } from "../../src/lib/ids";

let env: RulesTestEnvironment;
beforeAll(async () => { env = await getTestEnv(); });
beforeEach(async () => { await env.clearFirestore(); });

// Mirror storeRepository.createStore EXACTLY.
function createStoreBatch(db: Firestore, uid: string, name: string, slug: string) {
  const storeId = id();
  const ts = new Date().toISOString();
  const batch = db.batch();
  batch.set(db.doc(`stores/${storeId}`), { id: storeId, name, slug, ownerId: uid, currency: "MXN", createdAt: ts, updatedAt: ts });
  batch.set(db.doc(`memberships/${storeId}_${uid}`), { uid, storeId, role: "owner", status: "active", createdAt: ts });
  batch.set(db.doc(`userMemberships/${uid}/stores/${storeId}`), { storeId, role: "owner" });
  batch.set(db.doc(`publicStores/${slug}`), { storeId, name, currency: "MXN" });
  return batch;
}

describe("storeRepository.createStore shape vs rules", () => {
  test("the exact 4-doc batch succeeds", async () => {
    const db = env.authenticatedContext("alice").firestore() as unknown as Firestore;
    await assertSucceeds(createStoreBatch(db, "alice", "Alice Store", "alice-store").commit());
  });
});
