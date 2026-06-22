import { useMemo, useState } from "react";
import type { Customer, DB } from "../types";
import { STRINGS } from "../lib/strings";
import { isCompleted, pendingPayment, profit } from "../lib/orderStatus";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Money } from "../components/Money";
import { CustomerForm } from "./CustomerForm";
import { useAuth } from "../hooks/useAuth";

type Props = {
  db: DB;
  onAddCustomer: (c: Pick<Customer, "name" | "phone" | "notes">) => void;
  onReset: () => void;
};

type Stats = {
  orderCount: number;
  totalSold: number;
  totalProfit: number;
  pending: number;
};

export const CustomersScreen = ({ db, onAddCustomer, onReset }: Props) => {
  const [adding, setAdding] = useState(false);

  const statsByCustomer = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const c of db.customers) {
      map.set(c.id, { orderCount: 0, totalSold: 0, totalProfit: 0, pending: 0 });
    }
    for (const o of db.orders) {
      const s = map.get(o.customerId);
      if (!s) continue;
      s.orderCount += 1;
      s.totalSold += o.price;
      s.totalProfit += profit(o);
      if (!isCompleted(o)) s.pending += pendingPayment(o);
    }
    return map;
  }, [db.orders, db.customers]);

  if (adding) {
    return (
      <div>
        <CustomerForm
          onSave={(c) => {
            onAddCustomer(c);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{STRINGS.customers.title}</h1>

      <button
        onClick={() => setAdding(true)}
        className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-sm active:scale-[0.99] transition"
      >
        + {STRINGS.customers.addCustomer}
      </button>

      {db.customers.length === 0 ? (
        <EmptyState
          title={STRINGS.customers.emptyTitle}
          body={STRINGS.customers.emptyBody}
          emoji="👥"
        />
      ) : (
        <div className="space-y-3">
          {db.customers.map((c) => {
            const s = statsByCustomer.get(c.id)!;
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900">
                      {c.name}
                    </p>
                    {c.phone && (
                      <p className="truncate text-sm text-gray-500">📞 {c.phone}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {STRINGS.customers.orders(s.orderCount)}
                  </span>
                </div>

                {s.orderCount > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                    <MiniStat label={STRINGS.customers.totalSold} value={<Money value={s.totalSold} />} />
                    <MiniStat label={STRINGS.customers.totalProfit} value={<Money value={s.totalProfit} />} accent="text-emerald-600" />
                    <MiniStat label={STRINGS.customers.pending} value={<Money value={s.pending} />} accent={s.pending > 0 ? "text-amber-600" : "text-gray-400"} />
                  </div>
                ) : (
                  <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-400">
                    {STRINGS.customers.noOrders}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dev/demo area — reset + sign-out are intentionally out of the way. */}
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <button
          onClick={() => {
            if (window.confirm(STRINGS.confirmReset)) onReset();
          }}
          className="text-sm font-medium text-gray-400 underline-offset-2 active:underline"
        >
          {STRINGS.customers.resetData}
        </button>
        <SignOutButton />
      </div>
    </div>
  );
};

const SignOutButton = () => {
  const { signOut, user } = useAuth();
  return (
    <button
      onClick={() => void signOut()}
      className="text-sm font-medium text-gray-400 underline-offset-2 active:underline"
    >
      {STRINGS.auth.signOut}
      {user?.email ? ` (${user.email})` : ""}
    </button>
  );
};

const MiniStat = ({
  label,
  value,
  accent = "text-gray-900",
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className={`text-sm font-semibold ${accent}`}>{value}</p>
  </div>
);
