import { useState } from "react";
import type { Customer, Order } from "../types";
import {
  FRIENDLY_LABEL,
  STATUS_HINT,
  isCompleted,
  nextAction,
  pendingPayment,
  profit,
  statusChipClass,
} from "../lib/orderStatus";
import { STRINGS } from "../lib/strings";
import { formatDate } from "../lib/format";
import { Card } from "./Card";
import { Money } from "./Money";

type Props = {
  order: Order;
  customer?: Customer;
  onAdvance?: (orderId: string, nextStatus: Order["status"]) => boolean | void;
  compact?: boolean;
};

// Today at 00:00 local, as ms. Kept outside render so it's stable per mount.
const todayMs = () => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export const OrderCard = ({ order, customer, onAdvance, compact }: Props) => {
  const action = nextAction(order.status);
  const done = isCompleted(order);
  const pending = pendingPayment(order);
  const earned = profit(order);

  // Transient "Guardando…" on the advance button until the realtime listener
  // confirms the new status. Clears if the status actually advances.
  const [advancing, setAdvancing] = useState(false);

  const handleAdvance = () => {
    if (!action || !onAdvance || advancing) return;
    // Only commit to "Guardando…" if the handler actually proceeded; a false
    // return means the user cancelled a confirm and we must not wedge the button.
    const proceeded = onAdvance(order.id, action.nextStatus);
    if (proceeded === false) return;
    setAdvancing(true);
    // ponytail: safety net — clear the pending state even if the write fails
    // (AdminApp toasts on error) and the status prop never updates.
    setTimeout(() => setAdvancing(false), 3000);
  };

  // Show overdue label only for active orders past their promised date.
  const overdue =
    !done && !!order.promisedDate && new Date(order.promisedDate).getTime() < todayMs();

  return (
    <Card className={done ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900">
            {customer?.name ?? "—"}
          </p>
          <p className="truncate text-sm text-gray-600">{order.productName}</p>
          {order.details && (
            <p className="truncate text-xs text-gray-400">{order.details}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass(
            order.status
          )}`}
        >
          {FRIENDLY_LABEL[order.status]}
        </span>
      </div>

      {!compact && (
        <p className="mt-2 text-sm text-gray-500">
          {done ? STRINGS.order.completed : STATUS_HINT[order.status]}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label={STRINGS.order.sale} value={<Money value={order.price} />} />
        <Stat
          label={STRINGS.order.profit}
          value={<Money value={earned} />}
          accent="text-emerald-600"
        />
        <Stat
          label={STRINGS.order.pending}
          value={<Money value={pending} />}
          accent={pending > 0 ? "text-amber-600" : "text-gray-400"}
        />
      </div>

      {order.promisedDate && !done && (
        <p className={`mt-2 text-xs ${overdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
          🗓️{" "}
          {overdue
            ? `${STRINGS.order.overdue} · `
            : `${STRINGS.order.promised} `}
          {formatDate(order.promisedDate)}
        </p>
      )}

      {action && onAdvance && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:scale-[0.99] active:bg-emerald-700 transition disabled:opacity-60"
        >
          {advancing ? STRINGS.order.saving : action.label}
        </button>
      )}
    </Card>
  );
};

const Stat = ({
  label,
  value,
  accent = "text-gray-900",
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) => (
  <div className="rounded-xl bg-gray-50 py-2">
    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className={`text-sm font-semibold ${accent}`}>{value}</p>
  </div>
);
