import { useEffect, useState } from "react";
import type { PublicCatalogState } from "../services/repositories/publicCatalogRepository";
import { STRINGS } from "../lib/strings";
import { formatMoney } from "../lib/format";
import { createWhatsAppProductUrl } from "../lib/whatsapp";
import * as publicCatalogRepo from "../services/repositories/publicCatalogRepository";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { FullScreen } from "../components/FullScreen";

const CATEGORY_LABEL = {
  perfume: STRINGS.categories.perfume,
  sneakers: STRINGS.categories.sneakers,
  cap: STRINGS.categories.cap,
  other: STRINGS.categories.other,
} as const;

const SELLER_PHONE = import.meta.env.VITE_PUBLIC_CATALOG_SELLER_PHONE ?? "";
const BUSINESS_NAME = import.meta.env.VITE_PUBLIC_CATALOG_BUSINESS_NAME ?? STRINGS.appName;

export const PublicCatalogScreen = () => {
  const [state, setState] = useState<PublicCatalogState>({ status: "loading" });

  useEffect(() => {
    const unsub = publicCatalogRepo.subscribe(setState);
    return unsub;
  }, []);

  // tri-state: loading / error (don't pretend it's empty) / ready
  if (state.status === "loading") {
    return <FullScreen text={STRINGS.loading.catalog} />;
  }
  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 text-3xl">😵‍💫</div>
        <h1 className="text-base font-bold text-gray-900">
          {STRINGS.errorCatalog.title}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          {STRINGS.errorCatalog.body}
        </p>
      </div>
    );
  }

  const products = state.products;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 px-5 pb-5 pt-8 text-center text-white">
        <h1 className="text-2xl font-bold">{BUSINESS_NAME}</h1>
        <p className="mt-1 text-sm text-emerald-50">
          {STRINGS.publicCatalog.title}
        </p>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        {products.length === 0 ? (
          <EmptyState
            title={STRINGS.publicCatalog.emptyTitle}
            body={STRINGS.publicCatalog.emptyBody}
            emoji="🛍️"
          />
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden p-0">
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                    // ponytail: hide instead of retry — a 403 means the Storage
                    // object is gone/stale; the real fix is clean data, not resilience.
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div className="p-4">
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {CATEGORY_LABEL[p.category]}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-gray-900">{p.name}</h2>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatMoney(p.price)}
                  </p>
                  {p.description && (
                    <p className="mt-1 text-sm text-gray-600">{p.description}</p>
                  )}
                  <a
                    href={createWhatsAppProductUrl(p, SELLER_PHONE, BUSINESS_NAME)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:scale-[0.99] transition"
                  >
                    <span>💬</span>
                    {STRINGS.publicCatalog.cta}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
