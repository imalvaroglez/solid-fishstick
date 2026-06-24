import { useState } from "react";
import type { DB, Product } from "../types";
import { STRINGS } from "../lib/strings";
import { profit } from "../lib/orderStatus";
import { publicCatalogUrl } from "../lib/whatsapp";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Money } from "../components/Money";
import { Toast } from "../components/Toast";
import { ProductForm } from "./ProductForm";

type Props = {
  db: DB;
  storeId: string;
  publicSlug: string;
  onSaveProduct: (product: Product) => void | Promise<void>;
};

export const CatalogScreen = ({
  db,
  storeId,
  publicSlug,
  onSaveProduct,
}: Props) => {
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);

  const sellerPhoneConfigured = !!import.meta.env
    .VITE_PUBLIC_CATALOG_SELLER_PHONE;

  const shareCatalog = async () => {
    if (!sellerPhoneConfigured) {
      setToast(STRINGS.share.noPhone);
      return;
    }
    try {
      await navigator.clipboard.writeText(publicCatalogUrl(publicSlug));
      setCopied(true);
      setToast(STRINGS.share.copied);
    } catch {
      // Clipboard blocked (insecure context) — surface a selectable link the
      // user can long-press to copy, not a false success.
      setCopied(false);
      setToast(STRINGS.share.copyFailed);
    }
  };

  if (adding || editing) {
    return (
      <div>
        <ProductForm
          initial={editing}
          storeId={storeId}
          onSave={async (p) => {
            await onSaveProduct(p);
            setAdding(false);
            setEditing(null);
          }}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  if (db.products.length === 0) {
    return (
      <div className="space-y-5">
        <AddButton onClick={() => setAdding(true)} />
        <EmptyState
          title={STRINGS.catalog.emptyTitle}
          body={STRINGS.catalog.emptyBody}
          emoji="🏷️"
        />
        <ToastEffect toast={toast} onDone={() => setToast("")} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{STRINGS.catalog.title}</h1>
        <button
          onClick={() => void shareCatalog()}
          className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 active:scale-[0.99] transition"
        >
          🔗 {STRINGS.share.catalog}
        </button>
      </div>
      {!copied && toast === STRINGS.share.copyFailed && (
        <input
          readOnly
          value={publicCatalogUrl(publicSlug)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-gray-800"
        />
      )}
      <AddButton onClick={() => setAdding(true)} />

      <div className="space-y-3">
        {db.products.map((p) => {
          const earned = profit({ price: p.referencePrice, cost: p.referenceCost });
          return (
            <Card
              key={p.id}
              onClick={() => setEditing(p)}
              className="active:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                    🖼️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-base font-semibold text-gray-900">
                      {p.name}
                    </p>
                    <span
                      className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        p.isPublic
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500",
                      ].join(" ")}
                    >
                      {p.isPublic ? STRINGS.catalog.public : STRINGS.catalog.private}
                    </span>
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {STRINGS.categories[p.category]}
                  </span>
                  <p className="mt-1 text-sm text-gray-500">
                    {STRINGS.catalog.referencePrice}:{" "}
                    <Money value={p.referencePrice} />
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                <span className="text-gray-500">
                  {STRINGS.catalog.referenceCost}: <Money value={p.referenceCost} />
                </span>
                <span className="font-semibold text-emerald-600">
                  {STRINGS.catalog.estimatedProfit}: <Money value={earned} />
                </span>
              </div>
              <label
                className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={p.isPublic}
                  onChange={(e) =>
                    onSaveProduct({ ...p, isPublic: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-emerald-600"
                />
                {STRINGS.catalog.showInPublic}
              </label>
            </Card>
          );
        })}
      </div>

      <ToastEffect toast={toast} onDone={() => setToast("")} />
    </div>
  );
};

const ToastEffect = ({
  toast,
  onDone,
}: {
  toast: string;
  onDone: () => void;
}) => (toast ? <Toast message={toast} onDone={onDone} /> : null);

const AddButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-sm active:scale-[0.99] transition"
  >
    + {STRINGS.catalog.addProduct}
  </button>
);
