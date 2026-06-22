import { useEffect, useMemo, useState } from "react";
import type { DB, NewOrderInput, Order } from "../types";
import { STRINGS } from "../lib/strings";
import { isCompleted } from "../lib/orderStatus";
import { EmptyState } from "../components/EmptyState";
import { OrderCard } from "../components/OrderCard";
import { OrderForm } from "./OrderForm";

type Props = {
  db: DB;
  onSaveOrder: (input: NewOrderInput) => void | Promise<void>;
  onAdvance: (orderId: string, nextStatus: Order["status"]) => boolean | void;
  openFormOnMount?: boolean;
  onFormConsumed?: () => void;
};

export const OrdersScreen = ({
  db,
  onSaveOrder,
  onAdvance,
  openFormOnMount,
  onFormConsumed,
}: Props) => {
  const [showForm, setShowForm] = useState(openFormOnMount ?? false);

  // If opened from Home's "Nuevo pedido", consume the flag once — in an effect,
  // not during render, to avoid updating the parent while rendering.
  useEffect(() => {
    if (openFormOnMount && onFormConsumed) onFormConsumed();
  }, [openFormOnMount, onFormConsumed]);

  const sorted = useMemo(
    () =>
      [...db.orders].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [db.orders]
  );
  const active = sorted.filter((o) => !isCompleted(o));
  const completed = sorted.filter(isCompleted);

  if (showForm) {
    return (
      <div>
        <OrderForm
          customers={db.customers}
          products={db.products}
          onSave={async (input) => {
            // Only close on a successful save — on failure the form keeps
            // the entered values and shows an inline error.
            await onSaveOrder(input);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="space-y-5">
        <NewOrderButton onClick={() => setShowForm(true)} />
        <EmptyState
          title={STRINGS.orders.emptyTitle}
          body={STRINGS.orders.emptyBody}
          emoji="📋"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{STRINGS.orders.title}</h1>
      </div>

      <NewOrderButton onClick={() => setShowForm(true)} />

      <div className="space-y-3">
        {active.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            customer={db.customers.find((c) => c.id === o.customerId)}
            onAdvance={onAdvance}
          />
        ))}
      </div>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-gray-400">
            {STRINGS.orders.completedSection}
          </h2>
          <div className="space-y-3">
            {completed.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                customer={db.customers.find((c) => c.id === o.customerId)}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const NewOrderButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-sm active:scale-[0.99] transition"
  >
    + {STRINGS.orders.newOrder}
  </button>
);
