import { useMemo } from "react";
import type { DB, Order } from "../types";
import { STRINGS } from "../lib/strings";
import {
  HOME_GROUP_ORDER,
  homeGroup,
  isCompleted,
  pendingPayment,
  profit,
} from "../lib/orderStatus";
import { Card } from "../components/Card";
import { Money } from "../components/Money";
import { EmptyState } from "../components/EmptyState";
import { OrderCard } from "../components/OrderCard";

type Props = {
  db: DB;
  onNewOrder: () => void;
  onAdvance: (orderId: string, nextStatus: Order["status"]) => boolean | void;
};

export const HomeScreen = ({ db, onNewOrder, onAdvance }: Props) => {
  const active = useMemo(
    () => db.orders.filter((o) => !isCompleted(o)),
    [db.orders]
  );

  const totalPending = active.reduce((sum, o) => sum + pendingPayment(o), 0);
  const totalProfit = active.reduce((sum, o) => sum + profit(o), 0);

  // Orders grouped by next action bucket.
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of active) {
      const g = homeGroup(o.status);
      if (!g) continue;
      const arr = map.get(g) ?? [];
      arr.push(o);
      map.set(g, arr);
    }
    return map;
  }, [active]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{STRINGS.home.greeting}</h1>
        <p className="text-sm text-gray-500">{STRINGS.home.subtitle}</p>
      </header>

      <button
        onClick={onNewOrder}
        className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-sm active:scale-[0.99] transition"
      >
        + {STRINGS.home.newOrder}
      </button>

      {active.length === 0 ? (
        <EmptyState
          title={STRINGS.home.emptyTitle}
          body={STRINGS.home.emptyBody}
          emoji="🌱"
        />
      ) : (
        <>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white">
            <p className="text-sm font-medium text-emerald-50">
              {STRINGS.home.activeOrders(active.length)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-emerald-100">{STRINGS.home.pendingPayment}</p>
                <p className="text-xl font-bold">
                  <Money value={totalPending} />
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-100">{STRINGS.home.expectedProfit}</p>
                <p className="text-xl font-bold">
                  <Money value={totalProfit} />
                </p>
              </div>
            </div>
          </Card>

          {HOME_GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => (
            <section key={g}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-gray-500">
                {STRINGS.groups[g]}
              </h2>
              <div className="space-y-3">
                {grouped.get(g)!.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    customer={db.customers.find((c) => c.id === o.customerId)}
                    onAdvance={onAdvance}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};
