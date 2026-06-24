// Storage security rules tests — legacy admin allowlist + Store OS cross-service
// membership auth (firestore.get()).
//
// Shares the cached env with the firestore suite (tests/rules/testEnv.ts) so
// both services are configured in one initializeTestEnvironment. Memberships are
// seeded via the legitimate bootstrapStore() batch (the rules allow it) — never
// via a fake admin context, which the rules correctly deny.
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { beforeAll, beforeEach, describe, test } from "vitest";
import { ref, uploadBytes, type FirebaseStorage } from "firebase/storage";
import type { Firestore } from "firebase/firestore";
import { getTestEnv, type RulesTestEnvironment } from "./testEnv";
import { bootstrapStore } from "./bootstrap";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await getTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});


const ADMIN_EMAIL = "admin@mail.com";
const BLOB = new Uint8Array([1, 2, 3]);
// firebase@12 needs the bucket explicitly or uploads resolve to an empty bucket
// string ("permission to access ''"). The emulator bucket is gs://<project>.
const BUCKET = "gs://demo-solid-fishstick.appspot.com";
const storageFor = (uid: string, claims: Record<string, unknown> = {}) =>
  env.authenticatedContext(uid, claims).storage(BUCKET) as unknown as FirebaseStorage;

// Legitimate owner bootstrap: alice creates her own store A (the 4-doc batch
// firestore.rules allows), so memberships/A_alice exists for the storage rule's
// firestore.get() to read.
async function seedOwnerOf(storeId: string, uid: string, slug: string) {
  const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
  await bootstrapStore(db, uid, { storeId, slug }).commit();
}

describe("storage rules", () => {
  test("admin email can upload legacy product-images", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageFor("admin-uid", { email: ADMIN_EMAIL }), "product-images/p1/a.jpg"), BLOB)
    );
  });

  test("non-admin cannot upload legacy product-images", async () => {
    await assertFails(
      uploadBytes(ref(storageFor("rando", { email: "nope@mail.com" }), "product-images/p1/a.jpg"), BLOB)
    );
  });

  test("owner can upload to their store's image path", async () => {
    await seedOwnerOf("A", "alice", "alice-store");
    await assertSucceeds(
      uploadBytes(ref(storageFor("alice"), "stores/A/product-images/p1/a.jpg"), BLOB)
    );
  });

  test("non-member (no membership doc) cannot upload", async () => {
    await assertFails(
      uploadBytes(ref(storageFor("mallory"), "stores/A/product-images/p1/a.jpg"), BLOB)
    );
  });

  test("owner of store A cannot upload under store B", async () => {
    await seedOwnerOf("A", "alice", "alice-store");
    await assertFails(
      uploadBytes(ref(storageFor("alice"), "stores/B/product-images/p1/a.jpg"), BLOB)
    );
  });
});
