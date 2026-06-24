# RFC-0002 — Store OS: Smallest Working Multi-Store Product

**Status:** Implemented and locally verified  
**Date:** 2026-06-24  
**Supersedes:** RFC-0001 where this document differs

## 1. Outcome

The existing React/Firebase application now supports isolated stores without
Cloud Functions, a custom backend, organizations, or new paid infrastructure.

A user can:

- create an Email/Password account;
- create a store through the UI;
- create additional stores and switch between them;
- operate the existing Products, Customers, and Orders workflows per store;
- publish a store-specific catalog at `/catalogo/{slug}`.

The existing `/catalogo` route and legacy root collections remain available.

## 2. Proven data model

```text
stores/{storeId}
memberships/{storeId}_{uid}
userMemberships/{uid}/stores/{storeId}
publicStores/{slug}

stores/{storeId}/products/{id}
stores/{storeId}/customers/{id}
stores/{storeId}/orders/{id}
stores/{storeId}/publicProducts/{id}
```

`storeId` is an immutable UUID. The public slug is separate, unique, and
immutable in this first product. Slug renaming is deliberately deferred.

Store creation is one atomic four-document batch. Firestore Rules use
`getAfter()` to require the store, owner membership, user index, and public slug
pointer to exist together. Omitting any document rejects the entire batch.

## 3. Security

Private store data and new image paths require an active `owner` or `admin`
membership whose `uid` and `storeId` match the deterministic membership path.
Cross-store reads and writes are denied.

Public product projections are world-readable but may contain only the explicit
safe-field allowlist. Storage Rules authorize
`stores/{storeId}/product-images/...` by reading the same membership document
from Firestore.

The original email allowlist remains only for legacy root collections and
legacy image paths during migration. An allowlisted legacy admin may claim the
default migrated store; other users cannot.

## 4. Non-destructive migration

`copyLegacyToStore("default")` copies, never moves:

- root products;
- root customers;
- root orders;
- the existing public catalog documents verbatim, including image references.

Existing target IDs are skipped. Re-running migration neither duplicates data
nor overwrites store-side edits. No legacy root document or image reference is
deleted or modified.

`backfillDefaultStore(uid)` creates the default store and owner membership once.
Configured legacy admins can subsequently claim an admin membership without an
email-to-UID lookup.

## 5. Verification evidence

The release gate is:

```sh
npm run verify
```

On June 24, 2026 it passed:

- strict TypeScript and production Vite build;
- 37 Vitest checks:
  - 28 Firestore Rules tests;
  - 5 active Storage Rules tests;
  - 3 migration tests;
  - 1 production-bootstrap-shape test;
- 2 Playwright acceptance flows.

The browser flows prove:

- native sign-up and first-store creation through the visible UI;
- legacy data copied into the default store and preserved after a repeated run;
- two additional stores created through the UI;
- product, customer, and order isolation while switching stores;
- store-scoped image upload;
- duplicate-slug rejection;
- anonymous store-specific public catalogs;
- legacy `/catalogo` compatibility;
- no browser console errors.

An additional live localhost pass independently verified account creation,
first-store transition, adding a second store, switcher updates, and a clean
console.

## 6. Deliberately deferred

- organizations;
- invitations and general member management;
- slug renaming;
- pricing tiers and pricing-rule engines;
- inventory;
- reseller channels;
- module/plugin frameworks;
- custom domains;
- destructive legacy retirement.

These remain separate product decisions. They are not scaffolding in this
implementation.
