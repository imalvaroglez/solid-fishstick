# RFC-0001 — Store OS: Evolving the MVP into a Multi-Store Platform

**Status:** Proposed
**Author:** Principal Software Architect
**Date:** 2026-06-23
**Horizon:** ~2 years
**Constraints:** Keep Vercel + Firebase (Auth, Firestore, Storage). No new paid infra, no Cloud Functions, no microservices, no backend rewrite, no Postgres. Existing stores must keep working; data must be migratable; no destructive migrations; no additional recurring cost.

> Ponytail operating principle for this RFC: every proposal must justify its existence against the rung "does this need to exist at all?" We resist multi-tenant sharding, queues, and worker layers until a concrete workload forces them. The default answer is "a field on a document."

---

## 0. TL;DR

Store OS is this single-tenant MVP grown into a multi-tenant platform on the **same** Firebase project, **same** Firestore database, **same** Storage bucket. The entire multi-store transformation reduces to one structural decision: **scope every existing root collection under a `stores/{storeId}` document.** Auth, security, the repository layer, the React app, and Vercel all stay. We add an `organizations` layer, a `memberships` join, a store-switcher in the chrome, and a pricing/inventory data model — none of which require new infrastructure. The migration is **additive and backward-compatible**: legacy root-collection documents gain a `storeId` field, a one-time backfill pins them to a "default" store, and old code paths keep working until each is individually migrated, then deleted.

---

## 1. Current Architecture Assessment

### 1.1 Stack (as observed in the repo)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 7 | Single SPA, `react-router-dom` v7 |
| Styling | Tailwind 4 (via `@tailwindcss/vite`) | |
| Auth | Firebase Auth (Email/Password) | |
| DB | Cloud Firestore | `initializeFirestore({ ignoreUndefinedProperties: true })` |
| Files | Firebase Storage | Images resized client-side to ≤1600px JPEG q0.8 |
| Hosting | Vercel | `vercel.json` present |
| Deploy of rules | `firebase deploy` (CLI) | `firebase.json` only declares rules, no indexes |

### 1.2 Topology — strictly single-tenant

- **One Firebase project** (`solid-fishstick`), one Firestore DB, one Storage bucket.
- **Root-level collections**, no tenant scoping:
  - `products/{id}` — private, admin-only.
  - `customers/{id}` — private, admin-only.
  - `orders/{id}` — private, admin-only.
  - `publicCatalogProducts/{id}` — **world-readable** public projection (safe fields only).
  - `settings/{id}` — public read, admin write (currently carries only `businessName`).
- **Storage path**: `product-images/{productId}/{id}.jpg`.

### 1.3 Data access pattern

`useFirestoreStore` is the single data hook. It subscribes (`onSnapshot`) to all three private collections in parallel and exposes a `DB` shape plus write methods that delegate to thin **repository** modules (`productRepository`, `customerRepository`, `orderRepository`, `publicCatalogRepository`). Writes are fire-and-forget-with-error-surfacing; realtime listeners reconcile local state. This is a clean, narrow seam — ideal for the migration, see §7 and §15.

### 1.4 Security model — the load-bearing constraint

This is the single most important fact for the whole RFC:

> **Authorization is an email allowlist hard-coded into `firestore.rules` and `storage.rules`.**

- `isAdmin()` returns true iff `request.auth.token.email in ["admin@mail.com", "estebanchavez1709@gmail.com"]`.
- Rules **cannot read Vite env vars**, so the client-side `VITE_ADMIN_EMAILS` and the server-side `isAdmin()` list must be **manually mirrored** (the comments in both rule files explicitly warn about this).
- There is no per-user, per-store, or role-based access control. Any "admin" is a global admin over **all** data in the project.

**Implication:** The number one cost of going multi-store is replacing this global allowlist with a data-driven membership model. Everything else is a refactor; this is the architectural pivot. It must be solved *inside Firestore rules only* (no Functions), so it must be expressible with `get()` reads against membership documents.

### 1.5 Strengths we exploit

- **Repository seam already exists.** Every Firestore call funnels through 4 repository files. Changing the collection path is a 1-line-per-module edit.
- **Batched private/public writes already atomic.** `productRepository.save` writes `products` + `publicCatalogProducts` in one `writeBatch`. We extend this, not replace it.
- **Non-destructive imports already implemented.** `importProducts/importCustomers/importOrders` skip existing IDs in chunks of 30. This is literally the pattern we need for migration backfill.
- **Public catalog is a clean projection**, not a join — safe fields copied at write time. Easy to scope per-store.

### 1.6 Weaknesses / risks

- **Hardcoded global admin allowlist** — non-extensible, the blocker.
- **No composite indexes declared** (`firebase.json` has no `firestore.indexes.json`). Currently fine because queries are `orderBy("updatedAt")` only. Multi-store `where("storeId","==",X)` + `orderBy` will **require indexes** — but indexes are free, declarable in a JSON file, and not "infrastructure" in the prohibited sense. Flagged in §15.
- **No soft delete, no audit log.** Acceptable for MVP; flagged as future debt, not a blocker.
- **`DB.version = 1`** is a leftover from the localStorage era; harmless but should be retired or repurposed.

---

## 2. Domain Model Analysis

### 2.1 Current entities

| Entity | Role | Key fields | Owner |
|---|---|---|---|
| `Product` | Catalog item w/ cost & price | `referenceCost`, `referencePrice`, `isPublic`, `imagePath`, `publicDescription`, `privateNotes` | admin |
| `PublicCatalogProduct` | Denormalized **safe projection** of Product | `price`, no cost/notes | world |
| `Customer` | Buyer | `name`, `phone`, `notes` | admin |
| `Order` | A purchase intent flowing through a status pipeline | `customerId`, `productId`, `cost`, `price`, `deposit`, `status`, `promisedDate` | admin |
| `PublicCatalogSettings` | Storefront name | `businessName` | public-read |

The `Order.status` lifecycle is a fixed state machine: `asked → confirmed → to_buy → bought → arrived → delivered → paid` (see `lib/orderStatus.ts`).

### 2.2 Implicit concepts surfaced for Store OS

These are **already present in the domain but unmodeled** — adding them as first-class entities is the substance of the migration:

1. **Store (the tenant).** Today there is exactly one, implicit. It owns products, customers, orders, and a storefront. Must become explicit.
2. **Pricing rule.** Today `cost`/`price`/`referencePrice` are flat fields on Product/Order. Store OS separates a product's *cost basis* from its *price* — prices become derived via rules (channel markup, reseller discount, sale). The fields already encode the seed of this; we formalize it (§10).
3. **Inventory / stock.** Orders currently carry a *promise* (`promisedDate`) but no quantity or stock count. The concept of "how many do I have" is absent. We add it minimally (§11).
4. **Channel / reseller.** The public catalog is one channel. Store OS introduces *resellers* as additional storefronts fed from the same product catalog at different prices (§12). Today there's exactly one channel (the WhatsApp-CTA storefront); generalizing it costs one field.
5. **Organization.** A reseller network operator may run several stores. The org is the billing/ownership umbrella above stores (§4).
6. **Membership.** Maps a user (Auth account) to a store/org with a role (§5) — this is what replaces the email allowlist.

### 2.3 Boundaries we will NOT cross

- **No accounting/ledger.** `deposit` and `paid` status are enough; we are not building double-entry books. (Ponytail rung 1: does this need to exist? No.)
- **No shipping/carrier integration.** `arrived → delivered` stays a manual status bump.
- **No multi-currency in v1.** Money stays a number + an assumed currency per store, surfaced in §7 but not converted.

---

## 3. Multi-Store Migration Strategy

### 3.1 The one structural decision

> **Scope collections under `stores/{storeId}/...` subcollections**, and carry a redundant `storeId` field on each document for cheap `where()` filtering without cross-collection reads.

Two storage shapes were considered:

**Option A — Subcollections (CHOSEN):** `stores/{storeId}/products/{id}`, `stores/{storeId}/orders/{id}`, etc.
**Option B — Flat root collections with a `storeId` field:** `products/{id}` + `where("storeId","==",X)`.

| Criterion | A: subcollections | B: flat + field |
|---|---|---|
| Security rule scoping | Natural: `get(/databases/.../stores/$(storeId))` reads the store doc, membership check follows | Same, via the field |
| Queries without index | Needs `storeId+updatedAt` composite | Same |
| Public catalog scope | Clean: `stores/{slug}/public` | Needs field filters |
| Mental model / data isolation | Strong — a store's data is *visually* grouped | Weak — all tenants intermixed |
| Rules complexity | `match /stores/{storeId}/{doc=**}` blanket | Per-collection match with field checks |

**Decision: A (subcollections).** Better isolation, simpler mental model, and security rules collapse to one `match /stores/{storeId}/{document=**}` block that resolves membership once. The redundant `storeId` field is kept **only** where it buys a cheaper query than the implicit subcollection path already provides (it usually won't — the path *is* the partition). Ponytail: we do **not** add the redundant field preemptively; add per-query only if Firestore demands it for an index.

### 3.2 Non-destructive by construction

- We **never delete** legacy root collections until §15 Phase 4 (and only after a verified cutover).
- Legacy documents gain a `storeId` (or are copied into the new path) — reads and writes are dual-pathed during the transition.
- The public catalog `publicCatalogProducts` keeps its world-readable contract; it gains a `storeSlug` so a single bucket can host many storefronts at `/catalogo/{slug}`.

### 3.3 What does NOT change

- Firebase project, Firestore database, Storage bucket.
- Auth provider, the `onAuthStateChanged` subscription, the `useAuth` hook surface.
- Vercel hosting, the router, the lazy admin bundle split.
- The repository-module seam and `useFirestoreStore`'s public surface (it gains a `storeId` param, nothing else).

---

## 4. Organization Model

### 4.1 Hierarchy

```
Organization (owns billing, brand)
  ├── Store(s)         (a catalog + customers + orders + one storefront)
  │     └── memberships (users who may operate THIS store)
  ├── Memberships      (org-level: owners/admins of the whole org)
  └── Reseller links   (org-level agreements feeding reseller storefronts)
```

### 4.2 Why an Organization at all?

Ponytail rung 1 applies hard here. An org is justified **only** because the brief explicitly calls out a **reseller network** (§12): a network operator runs many stores and must own them under one identity, share a product source across stores, and see network-wide economics. For a single independent store, the org and the store are the same entity — we still create the org row so the model is uniform and we never do a second migration for this concept.

**Decision:** Org always exists. For solo stores it is a 1:1 org↔store; for networks it is 1:org→N stores. No special-casing in code.

### 4.3 Document shape (`organizations/{orgId}`)

```
{
  id, name, slug,            // slug for URLs/namespacing
  ownerId,                  // Auth uid of creator (first owner)
  plan,                     // "free" only for now (see §6)
  createdAt, updatedAt
}
```

### 4.4 What we do NOT build

- No org-level billing integration (constraints forbid new paid infra; "plan" is a placeholder string, free tier only).
- No org switching UI beyond the store switcher (§9) — if you're an owner of multiple orgs, your stores from all orgs appear in one switcher list.

---

## 5. Membership Model

This section **replaces the email allowlist** (the project's core blocker, §1.4) entirely with data-driven rules. No Cloud Functions are used; all logic lives in Firestore rules via `get()`.

### 5.1 The join

Membership is a **join collection**, not a field on the user. This allows one user to belong to many stores/orgs and supports per-membership roles.

```
memberships/{membershipId} = {
  uid,                      // Auth uid
  orgId, storeId,           // exactly one of (orgId for org-level, storeId for store-level) — or both
  role,                     // "owner" | "admin" | "staff" | "reseller"
  status,                   // "active" | "invited" | "revoked"
  createdAt
}
```

We key the **client** lookup by a denormalized index so the switcher can list a user's stores with one query:

```
userMemberships/{uid}/stores/{storeId} = { role, orgId, status }   // client-listing index
```

### 5.2 Roles (minimal)

| Role | Can read store | Can write store | Can manage members | Notes |
|---|---|---|---|---|
| `owner` | ✅ | ✅ | ✅ | Created the store/org; at least one per org. |
| `admin` | ✅ | ✅ | ❌ | Full store operator. |
| `staff` | ✅ | partial (orders/customers only, no product cost) | ❌ | Useful in networks; enforced via field-level rules. |
| `reseller` | ✅ (their channel's catalog) | ✅ (their orders only) | ❌ | See §12. |

Ponytail: `staff` and `reseller` roles are **declared in the model now** but the rules that distinguish their write scope are **added only when a real store needs them**. We ship `owner`/`admin` first; the enum has room to grow without a schema migration.

### 5.3 Rules encoding (no Functions)

The heart of the new security model — membership resolved via two `get()` reads, which is cheap and rule-safe:

```js
// Resolve the acting user's role for a store. Two get() reads worst case.
function storeRole(storeId) {
  let m = get(/databases/$(db)/documents/memberships/$(storeId + "_" + request.auth.uid));
  if (m.exists) return m.data.role;
  return null;
}
function isStoreMember(storeId) {
  return request.auth != null && storeRole(storeId) in ["owner","admin","staff","reseller"];
}
function canWriteStore(storeId) {
  return request.auth != null && storeRole(storeId) in ["owner","admin"];
}
```

> Membership doc id is derived deterministically (`storeId + "_" + uid`) so the rule can compute the path without a query (rules can't query). This is the standard pattern and works without Functions.

### 5.4 Bootstrap problem (and its cheap solution)

A brand-new user has no membership and therefore cannot create their first store/org (chicken-and-egg). Three options:

1. **Free public write to create one's own org/store + self-membership** under a rule that constrains the doc ids and the self-membership. *(CHOSEN)*
2. An existing owner invites them (no bootstrap path for true newcomers).
3. Cloud Functions to mint membership. *(Forbidden by constraints.)*

Chosen rule (illustrative):

```js
match /organizations/{orgId} {
  allow create: if request.auth != null
    && request.resource.data.ownerId == request.auth.uid;   // you can only create your own
}
match /memberships/{mId} {
  // self-create your OWN membership only, when status active, for your own org/store
  allow create: if request.auth != null
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.role == "owner";
  allow update, delete: if request.auth != null
    && ( // existing owner/admin of the relevant org/store
       );
}
```

This is the **only** place the "no new infra" constraint bites hard, and it resolves cleanly inside rules. Field-level validation (`role`, `status`, `uid`) prevents privilege escalation. This is explicitly listed as a risk to adversarially test in §16.

### 5.5 Migration of the existing two admins

The current `admin@mail.com` / `estebanchavez1709@gmail.com` accounts are backfilled as **owners** of a synthetic organization + the legacy "default" store, with membership docs written by the one-time migration script (§15). They keep full access; nothing is lost.

---

## 6. Store Module Architecture

### 6.1 A "store module" = the set of capabilities a store owns

Each store is a self-contained bundle:

```
Store module
├── Catalog        (products + public projection)
├── Customers
├── Orders         (status pipeline)
├── Storefront     (public catalog at /catalogo/{slug})
├── Pricing rules  (§10)
├── Inventory      (§11)
└── Channels       (own storefront + reseller links, §12)
```

### 6.2 Frontend module boundaries

Today the app is `Home/Orders/Catalog/Customers` tabs under one `useFirestoreStore`. Store OS keeps that shape **per selected store**:

- A **Store Context** (`StoreProvider`) holds the currently-selected `storeId` (§9).
- `useFirestoreStore(storeId)` subscribes to `stores/{storeId}/...` instead of root.
- The existing 4 tabs render against the active store's data. **No new navigation paradigm.** The store switcher sits *above* the tabs, not inside them.

Ponytail: we do **not** build a plugin/registry system for modules. The module list is a fixed enum in code. A registry exists only when a third party can add modules — YAGNI for two years.

### 6.3 Cross-store operations

Two places need cross-store reads, both satisfied with a simple extra query (no infra):

1. **Store switcher list** — query `userMemberships/{uid}/stores`.
2. **Org/network dashboard** — for an org owner, fan out over the org's stores. Capped to N stores per org; reads scale linearly with store count, which is fine for years. If it ever isn't, a denormalized org rollup doc is one write away — but we don't build it now.

---

## 7. Firestore Collection Design

### 7.1 Target layout

```
organizations/{orgId}
memberships/{mId}                          // mId = storeId|orgId + "_" + uid
userMemberships/{uid}/stores/{storeId}     // client-listing index

stores/{storeId}                           // the store doc (name, slug, currency, ...)
stores/{storeId}/products/{id}
stores/{storeId}/customers/{id}
stores/{storeId}/orders/{id}
stores/{storeId}/pricingRules/{id}         // §10
stores/{storeId}/inventory/{productId}     // §11, keyed by productId
stores/{storeId}/channels/{channelId}      // §12 (own storefront + resellers)

stores/{storeId}/publicProducts/{id}       // world-readable projection (renamed from publicCatalogProducts)
publicStores/{slug}                        // world-readable storefront meta (name, currency, channel config)
```

### 7.2 Field changes (additive only)

| Doc | Field added | Purpose | Backward-compat |
|---|---|---|---|
| Product | none new (path scopes it) | — | legacy `products` untouched |
| Order | none new | — | legacy `orders` untouched |
| PublicCatalogProduct | `storeSlug`, `currency` | multi-storefront routing | legacy docs keep working (default slug) |
| Settings | → folded into `publicStores/{slug}` + `stores/{storeId}` | single source of truth | old `settings` read continues until removed |

### 7.3 Indexes (free, declarable, not "new infrastructure")

`firebase.json` gains a `firestore.indexes.json` reference. Required composites (all single-field `storeId` is implicit via subcollection path, so most aren't even needed):

- `stores/{storeId}/orders`: `status` asc + `updatedAt` desc (per-status work queues).
- `stores/{storeId}/products`: `category` + `updatedAt` (catalog filtering).
- Org dashboard fan-out: none (client-side merge).

Indexes are **config files committed to git and deployed with `firebase deploy --only firestore:indexes`** — no console clicks, no cost, satisfies "no infrastructure changes."

### 7.4 Naming: keep `publicCatalogProducts` or rename?

Ponytail: **don't rename during migration.** Add the new name `publicProducts` under the store path; leave the legacy `publicCatalogProducts` collection serving the old `/catalogo` route until Phase 4. Renaming is churn; dual-serve is safer.

---

## 8. Security Model

### 8.1 Rule structure (full sketch)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // --- membership resolution ---
    function storeRole(storeId) { ... }        // see §5.3
    function orgRole(orgId)    { ... }
    function isStoreMember(s)  { return request.auth != null && storeRole(s) in [...]; }
    function canWriteStore(s)  { return request.auth != null && storeRole(s) in ["owner","admin"]; }

    // --- tenant store data: one blanket block ---
    match /stores/{storeId}/{document=**} {
      allow read, write: if canWriteStore(storeId);          // private admin data
    }
    match /stores/{storeId}/publicProducts/{id} {
      allow read:  if true;                                   // world reads the projection
      allow write: if canWriteStore(storeId);
    }

    // --- world-readable storefront meta ---
    match /publicStores/{slug} {
      allow read:  if true;
      allow write: if canWriteStore( slugToStoreId(slug) );   // see note
    }

    // --- membership self-service + owner mgmt (§5.4) ---
    match /memberships/{mId}     { ... }
    match /organizations/{orgId} { ... }

    // --- LEGACY (kept alive through the migration, removed in §15 Phase 4) ---
    function isAdmin() { return request.auth.token.email in ["admin@mail.com","estebanchavez1709@gmail.com"]; }
    match /products/{id}   { allow read, write: if isAdmin(); }
    match /customers/{id}  { allow read, write: if isAdmin(); }
    match /orders/{id}     { allow read, write: if isAdmin(); }
    match /publicCatalogProducts/{id} { allow read: if true; allow write: if isAdmin(); }
    match /settings/{id}   { allow read: if true; allow write: if isAdmin(); }
    match /{document=**}   { allow read, write: if false; }
  }
}
```

> Note on `slugToStoreId`: rules can't query slug→storeId. Two cheap options: (a) make the **storeId equal the slug** (store ids are arbitrary strings, slugs are arbitrary strings — unify them), or (b) store `storeId` redundantly inside `publicStores/{slug}` and read it with `get()`. **(a) is chosen:** a store's id *is* its public slug. One source of truth, zero extra reads. (Store id is already an arbitrary `id()` string, so collision risk is the only cost — mitigated by slug-uniqueness validation on create.)

### 8.2 Field-level projection safety

The existing discipline is preserved and strengthened: `publicProducts` (and `publicStores`) documents **must never contain cost/profit/privateNotes**. `productRepository.toPublic()` already does this; we keep it and add a rule guard where feasible:

```js
// optional hardening on publicProducts writes: reject if doc contains forbidden keys
allow write: if canWriteStore(storeId)
  && !( "referenceCost" in request.resource.data
        || "privateNotes" in request.resource.data );
```

This is defense-in-depth on top of the application-level projection.

### 8.3 Storage rules (parallel evolution)

```js
match /b/{bucket}/o {
  match /stores/{storeId}/product-images/{productId}/{allPaths=**} {
    allow read:  if isStoreMember(storeId);   // or true for public-bucket images
    allow write: if canWriteStore(storeId);
  }
  // legacy
  match /product-images/{productId}/{allPaths=**} { allow read, write: if isAdmin(); }
  match /{allPaths=**} { allow read, write: if false; }
}
```

Public-catalog image rendering continues to rely on **token-bearing download URLs** (unchanged mechanism, see current `storage.rules` comment) — anonymous visitors never satisfy the read rule; they use the token. No change to that clever pattern.

### 8.4 No Functions, ever

Every access decision is resolved with at most **two `get()` reads** (membership + optionally the store doc). Firestore bills these trivially on the free tier. This is the design's central concession to "no new infrastructure."

---

## 9. Store Switcher Design

### 9.1 State

- `StoreProvider` at the top of the admin tree holds `{ activeStoreId, stores[], loading }`.
- On auth, load `userMemberships/{uid}/stores` once → `stores[]`.
- `activeStoreId` persisted in `localStorage` (`storeos:activeStore`), defaulting to the first membership.
- `useFirestoreStore(activeStoreId)` re-subscribes when the id changes (existing `onSnapshot` cleanup already handles this).

### 9.2 UI

- A **store switcher in the app header** (new thin component, sits above the existing tabs).
- Dropdown lists the user's stores (name + role chip). Selecting swaps `activeStoreId`; all data swaps with it.
- If the user has **exactly one** store, the switcher renders as a static label (Ponytail: don't show a dropdown for the N=1 case).
- "New store" entry at the bottom of the dropdown → org/store creation flow (§5.4 bootstrap).

### 9.3 URL strategy

- Admin app: keep at `/` (already a catch-all). Selected store is session state, not URL state — simpler, and the admin app is single-user-session. *(Revisit if deep-linking to a specific store becomes a real need — YAGNI now.)*
- **Public storefront moves to `/catalogo/{slug}`** (the only store in v1 can alias `/catalogo` → `/catalogo/{defaultSlug}` for backward compatibility).

### 9.4 No global admin

There is deliberately **no "all stores" superuser view** in the UI for the two legacy admins beyond their membership in the default org/store. Global platform access (if ever needed for support) would be a custom-claim role — but that requires Admin SDK/Functions to mint, which is out of scope. Ponytail: skip it until a support ticket forces it.

---

## 10. Pricing Engine Design

### 10.1 The problem

Today `cost`/`price`/`referencePrice` are flat numbers on Product/Order. Store OS must separate **cost basis** (what the store paid) from **price** (what a buyer pays), and let price vary by **channel** (own storefront vs. reseller vs. wholesale) without duplicating the product.

### 10.2 Model

- A `Product` keeps `referenceCost` (private, what it cost the store) and a `listPrice`.
- A **PricingRule** is a small document describing how to derive a price for a channel:

```
stores/{storeId}/pricingRules/{id} = {
  channelId,                // which channel this applies to (null = own storefront)
  type,                     // "markup" | "discount" | "fixed" | "multiplier"
  value,                    // e.g. 1.3 for +30% markup, 0.85 for 15% reseller discount
  applyTo,                  // "all" | "category:perfume" | "productId:X"
  currency,
  updatedAt
}
```

### 10.3 Derivation (pure client function)

`computePrice(product, channel, rules) -> number` is a **pure function** in `lib/pricing.ts`. No server. The public catalog screen calls it; the order form pre-fills from it. Because it's pure and the rules are just documents, this needs zero infrastructure.

### 10.4 Why not a real pricing service?

Ponytail rung 1: **does this need to exist as infra?** No. Pricing is a handful of documents and a pure function. A rule engine service would be pure over-engineering. We keep the rules set tiny (one or two per channel) and the function trivial.

### 10.5 What stays manual

An operator can always override the computed price on an Order (the `price` field already exists). Pricing rules are defaults, not constraints. This matches current behavior (`price` is editable) and avoids locking anyone in.

### 10.6 Auditing prices later

If we ever need price-change history, it's a `priceHistory` subcollection written by the same `productRepository.save` batch. **Not built now.** Flagged debt, one batch away.

---

## 11. Inventory Design

### 11.1 Minimal model

A separate `inventory` subcollection keyed by `productId` (not embedded on Product, so writes to stock don't churn the product doc or its public projection):

```
stores/{storeId}/inventory/{productId} = {
  productId,
  onHand,             // units physically available
  reserved,           // units promised to open orders (derived/optional)
  reorderPoint,       // low-stock alert threshold
  updatedAt
}
```

### 11.2 How orders interact with stock (lazy, not enforced)

- When an Order moves to `bought`/`arrived`, **the operator decrements `onHand` manually** (a stepper on the product/order screen).
- We do **not** build automatic decrement-on-order in v1. Automatic stock mutation across concurrent orders is the classic place you reach for a transaction/Function — and we're forbidden Functions. Manual keeps it correct and simple. Ponytail: one button, no concurrency headaches.
- `reserved` is **derived client-side** (count of open orders for that product), not stored — avoids a second source of truth. If it needs to be queryable later, we denormalize then.

### 11.3 Low-stock surfacing

A computed flag on the Home screen: products where `onHand <= reorderPoint`. Pure read + pure filter. No infra.

### 11.4 What we explicitly avoid

- No barcode/SKU scanning (YAGNI).
- No warehouse/bin locations (YAGNI).
- No variant matrix (a Product is a Product; sizes/variants are a future `variants` subcollection, not now).

---

## 12. Reseller Network Design

### 12.1 Concept

A **reseller** is a person/storefront that sells **the operator's catalog** under their own brand and price, with orders flowing back to the operator for fulfillment. This is the network play.

### 12.2 Data model

- A **Channel** document represents a storefront:

```
stores/{storeId}/channels/{channelId} = {
  type,                 // "own" | "reseller"
  name, slug,
  ownerId,              // the reseller's uid (for reseller type)
  pricingRuleId,        // which PricingRule prices this channel (§10)
  status                // "active" | "paused"
}
```

- The reseller is a **member** of the operator's store with role `reseller` (§5.2), scoped via rules so they can **read the catalog** and **write only their own orders**.
- The reseller's storefront is just `publicStores/{resellerSlug}` reading from the operator's `publicProducts`, priced by the channel's pricing rule.

### 12.3 Order attribution

An Order gains optional `channelId` and `resellerUid`. This lets the operator's dashboard split orders by channel and settle commissions later. Field is additive; old orders have `channelId = own`.

### 12.4 Commission / settlement

- **v1: none automated.** The operator sees per-channel order counts and computes settlement manually (a spreadsheet export from the dashboard). Ponytail: don't build a ledger until money movement is real and frequent.
- **Future:** a `settlements` collection with period rollups, written by a manual action. Still no Functions — a batch write from the admin UI.

### 12.5 Constraints honored

No new infra: the reseller network is just (a) more membership docs, (b) more channel docs, (c) a pricing rule, (d) one optional field on orders. All expressible with rules + repositories.

---

## 13. Public Catalog Evolution

### 13.1 From single storefront to many

- Today: `/catalogo` reads root `publicCatalogProducts` + `settings`.
- Store OS: `/catalogo/{slug}` reads `publicStores/{slug}` for meta + `stores/{storeId}/publicProducts` for items, priced by the channel's rule.

### 13.2 Backward compatibility

- `/catalogo` (no slug) **301/aliases** to `/catalogo/{defaultSlug}` — the legacy store's slug.
- Legacy `publicCatalogProducts` collection keeps serving until Phase 4 cutover, so the existing deployed `/catalogo` never breaks mid-migration.
- The WhatsApp CTA (current `VITE_PUBLIC_CATALOG_SELLER_PHONE`) becomes per-store: stored on `publicStores/{slug}`. The env var seeds the default store at migration time.

### 13.3 Performance

Each storefront is one `onSnapshot` over its `publicProducts` (scoped by subcollection path = free partition). No cross-store reads on the hot public path. Same realtime, same projection discipline.

### 13.4 SEO / custom domains

Ponytail: **out of scope for the roadmap.** Custom domains would need DNS + Vercel rewrite config per store — that *is* infrastructure churn. Subpaths (`/catalogo/{slug}`) are the answer for two years; custom domains are a deliberate non-goal unless a paying customer demands it (and paying customers are explicitly out of scope under the cost constraints).

---

## 14. Backward Compatibility Strategy

The four hard requirements — existing stores keep working, data migratable, no destructive migrations, no infra changes — are met by **dual-pathing every change**:

| Concern | Strategy |
|---|---|
| Legacy root collections | Kept read/write by the legacy `isAdmin()` rule block through Phase 3. |
| Legacy public catalog | `/catalogo` route unchanged until Phase 4 alias. |
| Existing two admin accounts | Backfilled as owners of the default org/store; identical or greater access. |
| Old client builds | Continue to function against root collections; no forced upgrade. |
| New client builds | Read/write the new `stores/{id}/...` path; can optionally also read legacy for migration. |
| Data migration | One-time **copy** (not move) from root → `stores/{defaultStoreId}/...`, non-destructive, idempotent (skip-existing, reusing the existing `importX` chunked pattern). |
| Rule safety | The legacy `isAdmin()` block and the new membership block **coexist**; both grant access to their respective paths. |
| Rollback | Until Phase 4, the legacy path is fully intact — rollback = redeploy old client + rules. |

The only **point of no return** is Phase 4: deleting the legacy collections after verified cutover. Everything before it is reversible.

---

## 15. Incremental Migration Plan (Phased Roadmap)

Each phase is **independently deployable and independently reversible**. No big-bang. Phases are sized so each ships value and leaves the system working.

### Phase 0 — Foundations & Indexes (no behavior change)
- Add `firestore.indexes.json`; declare the composites in §7.3. Deploy indexes (free).
- Add `organizations`, `memberships`, `userMemberships`, `stores`, `publicStores` **empty** collections + their rule blocks (membership-based), **alongside** the legacy `isAdmin()` blocks.
- Add the Store/StoreProvider context scaffolding but force `activeStoreId = "default"`; switcher hidden (N=1).
- **Exit criteria:** rules deploy green; existing app behavior 100% unchanged; new collections exist but empty.

### Phase 1 — Membership replaces the allowlist (the pivot)
- Backfill: migration script creates the default org, default store (`slug = default`), and `owner` memberships for the two legacy admin uids.
- New `useAuth` resolves memberships; `isAdmin()` becomes **derived from membership of the default store** rather than the email list.
- Legacy `isAdmin()` rule block kept as a **second** grant (belt-and-suspenders) until Phase 4.
- **Exit criteria:** admins log in, see the default store, all data present, email allowlist no longer the sole gate. **Existing data untouched.**

### Phase 2 — Repository seam moves under `stores/{id}`
- Repositories read/write `stores/{storeId}/...`; `useFirestoreStore(storeId)` parametrized.
- **Data migration (copy, not move):** run the idempotent chunked copy root→store. Existing `importX`-style logic already exists; reuse it. Legacy root collections remain.
- Admin app operates on the new path; reads are dual-sourced during a verification window then legacy reads removed.
- **Exit criteria:** all admin reads/writes against store-scoped path; legacy data confirmed redundant via diff.

### Phase 3 — Multi-store + Store switcher + Storefront routing
- Store switcher live (still N=1 for the legacy operator, but the plumbing is real).
- `/catalogo/{slug}` route; `/catalogo` aliases to default.
- `publicStores/{slug}` + `stores/{id}/publicProducts` serve the storefront; legacy `publicCatalogProducts` still mirrored (write path writes both during this phase).
- Org/store creation flow + self-membership bootstrap (§5.4) — the operator can now create their second store.
- **Exit criteria:** a second store can be created, switched to, and publish its own storefront. First real multi-tenant day.

### Phase 4 — Pricing + Inventory + Channels (feature lift)
- `pricingRules` + `computePrice` (§10); order form + catalog use it.
- `inventory` subcollection + manual stock UI (§11).
- `channels` + reseller role + channel-scoped orders (§12).
- Commission reporting = manual/dashboard only.
- **Exit criteria:** a reseller can be onboarded, see a priced storefront, and place orders attributed to their channel.

### Phase 5 — Legacy retirement (the only destructive step)
- After a monitoring window confirming zero reads/writes on legacy collections: delete `isAdmin()` rule block, remove legacy collections (archive export first), remove `/catalogo` legacy route, retire `DB.version`.
- **Exit criteria:** single-path system; clean rules.

### Sequencing rationale
Phases 0→1 unlock the security model (the real blocker). Phase 2 is the data move. Phase 3 delivers visible multi-store value. Phase 4 layers the business features. Phase 5 pays down the compat debt only once everything is proven. No phase requires the next to ship value, and any phase before 5 is independently rollback-able.

---

## 16. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| **Self-membership bootstrap rule** (§5.4) is the trickiest rules logic and a privilege-escalation surface. | Adversarially test before Phase 1: enumerate every way a crafted write could mint a role it shouldn't. Field-level rule guards (`uid == request.auth.uid`, `role == "owner"`, owner-of-org checks on updates). |
| Two `get()` reads per write could approach free-tier read quota under heavy write load. | Monitor; reads are cheap and the free tier is generous. Denormalize `role` onto the store doc as a fallback if a hot path emerges. |
| `storeId == slug` choice (§8.2) means slug changes are costly. | Make slugs immutable after creation (allow rename of *display name*, not slug). |
| No Functions means no server-side validation beyond rules. | Lean on field-level rules; keep repository-layer validation thorough (already a project strength). |
| Reseller concurrent writes to shared inventory | Explicitly avoided by manual stock (§11.2). |
| Org/network dashboard fan-out read cost | Capped by store count per org; add rollup doc only if measured. |

### Open questions for the operator (non-blocking, decide at the relevant phase)
1. Currency per store — assume MXN for the legacy store; confirm before Phase 3.
2. Should `staff` role (no-cost-access) be built in Phase 1 or deferred? (Default: defer.)
3. Reseller settlement — manual export acceptable through Phase 4? (Default: yes.)

---

## Appendix A — What we deliberately did NOT build (and why)

- **No Cloud Functions.** Membership, pricing, inventory, channels all expressible in rules + client. Constraint-bound.
- **No microservices / no backend split.** One SPA, one Firebase project.
- **No Postgres.** Firestore subcollections partition tenants natively.
- **No module plugin registry.** Fixed module enum; add when a third-party module is real.
- **No custom domains.** Subpaths suffice; DNS churn is out of scope.
- **No automated inventory/ledger.** Manual until volume forces it; both are one write-batch away if it does.
- **No pricing service.** A pure function over rule documents.
- **No big-bang migration.** Five reversible phases.

This is the ponytail architecture: the smallest model that becomes a multi-store platform without a single new moving part in the infrastructure.

---

*End of RFC-0001.*
