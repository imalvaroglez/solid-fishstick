// Migration test: legacy → store-scoped copy + default-store backfill.
//
// Rules-level contract test for the legacy copy: non-destruction, projections,
// and idempotency. Playwright runs the shipped copyLegacyToStore module itself.
import { assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { getTestEnv } from "../rules/testEnv";
import { bootstrapStore } from "../rules/bootstrap";

const ADMIN_EMAIL = "admin@mail.com";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await getTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
});


// The legacy allowlist lets admin@mail.com write the root collections.
const adminDb = () => env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();

async function seedLegacy() {
  const db = adminDb();
  const c = db.batch();
  c.set(db.doc("products/p1"), {
    id: "p1", name: "Perfume", category: "perfume",
    referenceCost: 100, referencePrice: 200, isPublic: true,
    imagePath: "product-images/p1/original.jpg",
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  c.set(db.doc("products/p2"), {
    id: "p2", name: "Cap", category: "cap",
    referenceCost: 10, referencePrice: 30, isPublic: false,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  c.set(db.doc("publicCatalogProducts/p1"), {
    id: "p1", name: "Perfume público", category: "perfume",
    price: 200, imagePath: "product-images/p1/original.jpg",
    isPublic: true, updatedAt: "2026-01-01",
  });
  c.set(db.doc("publicCatalogProducts/orphan"), {
    id: "orphan", name: "Publicación heredada", category: "other",
    price: 50, isPublic: true, updatedAt: "2026-01-01",
  });
  c.set(db.doc("customers/c1"), {
    id: "c1", name: "Juan", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  c.set(db.doc("orders/o1"), {
    id: "o1", customerId: "c1", productName: "Perfume",
    cost: 100, price: 200, deposit: 50, status: "asked",
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  await assertSucceeds(c.commit());
}

// Inline copy mirroring copyLegacyToStore, but using the rules-test context so
// it runs under the same auth + rules as the seed/assert. The production module
// is structurally identical (it just uses the app's db() singleton).
async function copyLegacyToStore(storeId: string) {
  const db = adminDb();
  const products = (await db.collection("products").get()).docs.map((d) => d.data());
  const publicProducts = (await db.collection("publicCatalogProducts").get()).docs.map((d) => d.data());
  const customers = (await db.collection("customers").get()).docs.map((d) => d.data());
  const orders = (await db.collection("orders").get()).docs.map((d) => d.data());

  const batch = db.batch();
  for (const p of products) {
    const target = db.doc(`stores/${storeId}/products/${p.id}`);
    if (!(await target.get()).exists) batch.set(target, p);
  }
  for (const p of publicProducts) {
    const target = db.doc(`stores/${storeId}/publicProducts/${p.id}`);
    if (!(await target.get()).exists) batch.set(target, p);
  }
  for (const c of customers) {
    const target = db.doc(`stores/${storeId}/customers/${c.id}`);
    if (!(await target.get()).exists) batch.set(target, c);
  }
  for (const o of orders) {
    const target = db.doc(`stores/${storeId}/orders/${o.id}`);
    if (!(await target.get()).exists) batch.set(target, o);
  }
  await batch.commit();
}

describe("migration: legacy → store-scoped", () => {
  test("copy is non-destructive and populates the store", async () => {
    await seedLegacy();
    // The acting admin creates + owns store S, then copies legacy into it.
    const db = env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
    await assertSucceeds(bootstrapStore(db, "admin-uid", { storeId: "S", slug: "s" }).commit());

    await copyLegacyToStore("S");

    // Legacy intact.
    expect((await adminDb().doc("products/p1").get()).exists).toBe(true);
    expect((await adminDb().doc("customers/c1").get()).exists).toBe(true);
    expect((await adminDb().doc("orders/o1").get()).exists).toBe(true);
    expect((await adminDb().doc("publicCatalogProducts/orphan").get()).exists).toBe(true);
    // Store-scoped populated.
    expect((await adminDb().doc("stores/S/products/p1").get()).exists).toBe(true);
    expect((await adminDb().doc("stores/S/products/p2").get()).exists).toBe(true);
    expect((await adminDb().doc("stores/S/customers/c1").get()).exists).toBe(true);
    expect((await adminDb().doc("stores/S/orders/o1").get()).exists).toBe(true);
    // Public projection only for isPublic products.
    expect((await adminDb().doc("stores/S/publicProducts/p1").get()).exists).toBe(true);
    expect((await adminDb().doc("stores/S/publicProducts/orphan").get()).exists).toBe(true);
    expect((await adminDb().doc("stores/S/publicProducts/p2").get()).exists).toBe(false);
    expect(
      (await adminDb().doc("stores/S/publicProducts/p1").get()).data()?.name
    ).toBe("Perfume público");
    expect(
      (await adminDb().doc("stores/S/publicProducts/p1").get()).data()?.imagePath
    ).toBe("product-images/p1/original.jpg");
  });

  test("copy is idempotent (re-run does not duplicate or error)", async () => {
    await seedLegacy();
    const db = env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
    await bootstrapStore(db, "admin-uid", { storeId: "S", slug: "s" }).commit();
    await copyLegacyToStore("S");

    await adminDb().doc("stores/S/products/p1").update({ name: "Store edit" });
    await adminDb().doc("stores/S/publicProducts/p1").update({
      name: "Store public edit",
    });

    // Re-run must neither duplicate nor overwrite store-side changes.
    const before = (await adminDb().collection("stores/S/products").get()).size;
    await copyLegacyToStore("S");
    const after = (await adminDb().collection("stores/S/products").get()).size;
    expect(after).toBe(before);
    expect((await adminDb().doc("stores/S/products/p1").get()).data()?.name)
      .toBe("Store edit");
    expect((await adminDb().doc("stores/S/publicProducts/p1").get()).data()?.name)
      .toBe("Store public edit");
  });

  test("backfill creates the default store + owner membership (idempotent)", async () => {
    // The default store is created exactly like createStore — admin owns it.
    const db = env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
    // First run: creates store + membership.
    await assertSucceeds(
      bootstrapStore(db, "admin-uid", { storeId: "default", slug: "default" }).commit()
    );
    expect((await adminDb().doc("stores/default").get()).exists).toBe(true);
    expect((await adminDb().doc("memberships/default_admin-uid").get()).exists).toBe(true);
    // memberships list is intentionally not allowed (no storeId in the path to
    // scope a list); the app lists via userMemberships, so we assert via get.
  });

  // Regression guard: backfillDefaultStore's REAL production batch shape — the
  // default store claimed by a legacy admin with role "admin" (not "owner"),
  // in one atomic writeBatch. This is the shape that shipped broken (role
  // deadlock + a get() that couldn't see the in-flight store doc). The earlier
  // test above substitutes bootstrapStore (role owner) and so never exercised
  // the default-claim rules branch; this one writes the real shape.
  test("real backfillDefaultStore batch (role admin) validates under rules", async () => {
    const db = env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
    const ts = "2026-06-24T00:00:00.000Z";
    const batch = db.batch();
    batch.set(db.doc("stores/default"), {
      id: "default", name: "Tienda", slug: "default",
      ownerId: "admin-uid", currency: "MXN",
      createdAt: ts, updatedAt: ts,
    });
    batch.set(db.doc("memberships/default_admin-uid"), {
      uid: "admin-uid", storeId: "default",
      role: "admin", status: "active", createdAt: ts,
    });
    batch.set(db.doc("userMemberships/admin-uid/stores/default"), {
      storeId: "default", role: "admin",
    });
    batch.set(db.doc("publicStores/default"), {
      storeId: "default", name: "Tienda", currency: "MXN",
    });
    await assertSucceeds(batch.commit());

    // The admin membership grants full access to the migrated store's data.
    expect((await adminDb().doc("stores/default").get()).exists).toBe(true);
    await assertSucceeds(adminDb().collection("stores/default/products").get());
    await assertSucceeds(adminDb().collection("stores/default/orders").get());
  });
});
