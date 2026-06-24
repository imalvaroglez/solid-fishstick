// Firestore security rules tests — legacy allowlist + Store OS membership model.
//
// The env is shared with the storage suite via tests/rules/testEnv.ts; npm run
// verify boots the emulator suite once around Vitest and Playwright.
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import type { Firestore } from "firebase/firestore";
import { getTestEnv, type RulesTestEnvironment } from "./testEnv";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await getTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
});


const ADMIN_EMAIL = "admin@mail.com";
const SECOND_ADMIN_EMAIL = "estebanchavez1709@gmail.com";
const OTHER_EMAIL = "someone-else@mail.com";

const adminCtx = () => env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL });
const otherCtx = () => env.authenticatedContext("other-uid", { email: OTHER_EMAIL });

// ---- Legacy allowlist (must not regress) -----------------------------------
describe("legacy allowlist", () => {
  test("allowlisted admin email can write products", async () => {
    const db = adminCtx().firestore();
    await assertSucceeds(db.collection("products").doc("p1").set({ name: "x" }));
  });

  test("non-allowlisted email cannot read products", async () => {
    const db = otherCtx().firestore();
    await assertFails(db.collection("products").get());
  });

  test("anonymous cannot read products", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(db.collection("products").get());
  });

  test("publicCatalogProducts is world-readable", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection("publicCatalogProducts").get());
  });
});

// ---- Store OS bootstrap + membership --------------------------------------
// Helper: the 4-doc self-service store-creation batch.
function bootstrapBatch(
  db: Firestore,
  uid: string,
  opts: {
    storeId: string;
    slug: string;
    ownerId?: string;
    omit?: "store" | "membership" | "index" | "public";
  }
) {
  const { storeId, slug, ownerId = uid, omit } = opts;
  const now = new Date().toISOString();
  const batch = db.batch();
  if (omit !== "store") {
    batch.set(db.doc(`stores/${storeId}`), {
      id: storeId, name: "My Store", slug, ownerId, currency: "MXN",
      createdAt: now, updatedAt: now,
    });
  }
  if (omit !== "membership") {
    batch.set(db.doc(`memberships/${storeId}_${uid}`), {
      uid, storeId, role: "owner", status: "active", createdAt: now,
    });
  }
  if (omit !== "index") {
    batch.set(db.doc(`userMemberships/${uid}/stores/${storeId}`), {
      role: "owner", storeId,
    });
  }
  if (omit !== "public") {
    batch.set(db.doc(`publicStores/${slug}`), {
      storeId, name: "My Store", currency: "MXN",
    });
  }
  return batch;
}

describe("store bootstrap", () => {
  test("owner can create a store (full 4-doc batch)", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      bootstrapBatch(db, "alice", { storeId: "s1", slug: "alice-store" }).commit()
    );
    // After commit, the owner can read their private data and the public pointer.
    await assertSucceeds(db.collection("stores/s1/products").get());
    await assertSucceeds(db.doc("publicStores/alice-store").get());
  });

  test.each(["store", "membership", "index", "public"] as const)(
    "batch fails if the %s document is missing",
    async (omit) => {
    const db = env.authenticatedContext("alice").firestore();
      await assertFails(
        bootstrapBatch(db, "alice", {
          storeId: "s1",
          slug: "alice-store",
          omit,
        }).commit()
      );
    }
  );

  test("self-grant owner on a store you do NOT own is denied", async () => {
    // Bob owns s2 legitimately.
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(
      bootstrapBatch(bob, "bob", { storeId: "s2", slug: "bob-store" }).commit()
    );
    // Mallory tries to grant herself owner on bob's store s2. The memberships
    // create rule requires getAfter(stores/s2).ownerId == mallory — it's bob.
    const mallory = env.authenticatedContext("mallory").firestore();
    await assertFails(
      mallory.doc("memberships/s2_mallory").set({
        uid: "mallory", storeId: "s2", role: "owner", status: "active",
        createdAt: new Date().toISOString(),
      })
    );
  });

  test("forge another user's uid is denied", async () => {
    const mallory = env.authenticatedContext("mallory").firestore();
    // Mallory writes a membership claiming uid == "bob" (not herself).
    await assertFails(
      mallory.doc("memberships/s3_bob").set({
        uid: "bob", storeId: "s3", role: "owner", status: "active",
        createdAt: new Date().toISOString(),
      })
    );
  });

  test("anonymous cannot bootstrap", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(
      db.doc("stores/s4").set({ id: "s4", ownerId: "nobody", slug: "x" })
    );
  });

  test("a duplicate public slug cannot be overwritten", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(
      bootstrapBatch(alice, "alice", { storeId: "A", slug: "shared" }).commit()
    );
    await assertFails(
      bootstrapBatch(bob, "bob", { storeId: "B", slug: "shared" }).commit()
    );
  });

  test("invalid public slugs are denied", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertFails(
      bootstrapBatch(alice, "alice", {
        storeId: "A",
        slug: "Bad_Slug",
      }).commit()
    );
  });

  test("only a legacy allowlisted admin can claim the default store", async () => {
    const stranger = env.authenticatedContext("stranger", { email: OTHER_EMAIL }).firestore();
    await assertFails(
      bootstrapBatch(stranger, "stranger", {
        storeId: "default",
        slug: "default",
      }).commit()
    );
    const admin = adminCtx().firestore();
    await assertSucceeds(
      bootstrapBatch(admin, "admin-uid", {
        storeId: "default",
        slug: "default",
      }).commit()
    );
  });

  test("the second legacy admin can claim the migrated default store", async () => {
    const owner = adminCtx().firestore();
    await assertSucceeds(
      bootstrapBatch(owner, "admin-uid", {
        storeId: "default",
        slug: "default",
      }).commit()
    );

    const second = env.authenticatedContext("second-admin", {
      email: SECOND_ADMIN_EMAIL,
    }).firestore();
    const batch = second.batch();
    batch.set(second.doc("memberships/default_second-admin"), {
      uid: "second-admin",
      storeId: "default",
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
    });
    batch.set(second.doc("userMemberships/second-admin/stores/default"), {
      storeId: "default",
      role: "admin",
    });
    await assertSucceeds(batch.commit());
    await assertSucceeds(second.collection("stores/default/products").get());
  });
});

describe("tenant isolation", () => {
  test("member of store A cannot write into store B", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit()
    );
    // Alice (owner of A) tries to write into B (which she has no membership in).
    await assertFails(
      alice.doc("stores/B/products/x").set({ name: "stolen" })
    );
  });

  test("member of store A cannot read store B", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    await assertSucceeds(bootstrapBatch(bob, "bob", { storeId: "B", slug: "b" }).commit());
    await assertFails(alice.collection("stores/B/products").get());
    await assertSucceeds(bob.collection("stores/B/products").get());
  });

  test("publicStores write by non-owner is denied", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    // Mallory tries to overwrite the pointer for a store she doesn't own.
    const mallory = env.authenticatedContext("mallory").firestore();
    await assertFails(
      mallory.doc("publicStores/a").set({ storeId: "A", name: "hijack" })
    );
  });

  test("publicStores hijack (point a slug at another owner's store) is denied", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    // Mallory owns M, but tries to point her slug at alice's store A.
    const mallory = env.authenticatedContext("mallory").firestore();
    await assertSucceeds(bootstrapBatch(mallory, "mallory", { storeId: "M", slug: "m" }).commit());
    await assertFails(
      mallory.doc("publicStores/m").set({ storeId: "A", name: "hijack" })
    );
  });

  test("private fields cannot leak into publicProducts", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    await assertFails(
      alice.doc("stores/A/publicProducts/x").set({
        name: "p", price: 10, referenceCost: 5,
      })
    );
    await assertFails(
      alice.doc("stores/A/publicProducts/x").set({
        name: "p", price: 10, privateNotes: "secret",
      })
    );
    await assertFails(
      alice.doc("stores/A/publicProducts/x").set({
        name: "p", price: 10, notes: "also secret",
      })
    );
  });

  test("publicProducts is world-readable", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    await assertSucceeds(
      alice.doc("stores/A/publicProducts/x").set({ name: "p", price: 10 })
    );
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(anon.doc("stores/A/publicProducts/x").get());
  });

  test("owner can remove a product from the public projection", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    const ref = alice.doc("stores/A/publicProducts/x");
    await assertSucceeds(ref.set({ name: "p", price: 10 }));
    await assertSucceeds(ref.delete());
  });

  test("inactive membership cannot read or write store data", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("memberships/A_alice").update({ status: "revoked" });
    });
    await assertFails(alice.collection("stores/A/products").get());
    await assertFails(alice.doc("stores/A/products/x").set({ name: "blocked" }));
  });

  test("a colliding membership id cannot authorize mismatched data", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("memberships/A_alice").set({
        uid: "mallory",
        storeId: "B",
        role: "owner",
        status: "active",
      });
    });
    const alice = env.authenticatedContext("alice").firestore();
    await assertFails(alice.collection("stores/A/products").get());
    await assertFails(alice.doc("stores/A/products/x").set({ name: "blocked" }));
  });

  test("cannot tamper with another user's membership index", async () => {
    const mallory = env.authenticatedContext("mallory").firestore();
    // Mallory writes into bob's index namespace.
    await assertFails(
      mallory.doc("userMemberships/bob/stores/A").set({ role: "owner", storeId: "A" })
    );
  });

  test("role escalation on update as non-owner is denied", async () => {
    // Alice owns A. She invites no one; a stranger cannot become admin.
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(bootstrapBatch(alice, "alice", { storeId: "A", slug: "a" }).commit());
    const stranger = env.authenticatedContext("stranger").firestore();
    // Stranger tries to create a membership for themselves as admin.
    await assertFails(
      stranger.doc("memberships/A_stranger").set({
        uid: "stranger", storeId: "A", role: "admin", status: "active",
        createdAt: new Date().toISOString(),
      })
    );
  });

  test("bootstrapBatch helper round-trips (sanity)", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await bootstrapBatch(db, "alice", { storeId: "S", slug: "s" }).commit();
    const snap = await db.doc("stores/S").get();
    expect(snap.exists).toBe(true);
    expect(snap.data()?.ownerId).toBe("alice");
  });
});
