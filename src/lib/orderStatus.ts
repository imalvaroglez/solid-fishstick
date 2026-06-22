// Order status pipeline — the single source of truth.
// Spanish labels per the style guide. UI text centralized; status keys stay English.

import type { Order, OrderStatus } from "../types";

// Strict linear flow. Index-based advance; no skips/reversals.
export const STATUS_FLOW: OrderStatus[] = [
  "asked",
  "confirmed",
  "to_buy",
  "bought",
  "arrived",
  "delivered",
  "paid",
];

// Friendly Spanish labels (from the style guide vocabulary).
export const FRIENDLY_LABEL: Record<OrderStatus, string> = {
  asked: "Preguntó",
  confirmed: "Confirmado",
  to_buy: "Comprar",
  bought: "Comprado",
  arrived: "Llegó",
  delivered: "Entregado",
  paid: "Cobrado",
};

// Per-status helper message shown on the card (style guide).
export const STATUS_HINT: Record<OrderStatus, string> = {
  asked: "El cliente preguntó por este producto.",
  confirmed: "El cliente confirmó que lo quiere.",
  to_buy: "Compra el producto para continuar.",
  bought: "Ya compraste el producto.",
  arrived: "El producto ya llegó.",
  delivered: "Entrégalo al cliente.",
  paid: "Pedido terminado.",
};

// Verb-style primary button per status; `paid` is terminal (no button).
export const NEXT_BUTTON: Partial<Record<OrderStatus, string>> = {
  asked: "Lo confirmó",
  confirmed: "A comprar",
  to_buy: "Ya lo compré",
  bought: "Ya llegó",
  arrived: "Lo entregué",
  delivered: "Ya me pagó",
};

export type NextAction = { label: string; nextStatus: OrderStatus };

export const nextAction = (status: OrderStatus): NextAction | null => {
  const label = NEXT_BUTTON[status];
  if (!label) return null; // terminal
  const idx = STATUS_FLOW.indexOf(status);
  return { label, nextStatus: STATUS_FLOW[idx + 1] };
};

// --- Home grouping: 7 statuses -> 5 action buckets; `paid` hidden ---

export type HomeGroup =
  | "Needs confirmation"
  | "Buy product"
  | "Waiting arrival"
  | "Ready to deliver"
  | "Waiting payment";

export const HOME_GROUP_ORDER: HomeGroup[] = [
  "Needs confirmation",
  "Buy product",
  "Waiting arrival",
  "Ready to deliver",
  "Waiting payment",
];

const STATUS_TO_GROUP: Record<OrderStatus, HomeGroup | null> = {
  asked: "Needs confirmation",
  confirmed: "Needs confirmation",
  to_buy: "Buy product",
  bought: "Waiting arrival",
  arrived: "Ready to deliver",
  delivered: "Waiting payment",
  paid: null,
};

export const homeGroup = (status: OrderStatus): HomeGroup | null =>
  STATUS_TO_GROUP[status];

// --- Computed values (derived, never stored) ---

export const profit = (o: Pick<Order, "price" | "cost">): number =>
  o.price - o.cost;

export const pendingPayment = (o: Pick<Order, "price" | "deposit">): number =>
  Math.max(0, o.price - o.deposit);

export const isCompleted = (o: Pick<Order, "status">): boolean =>
  o.status === "paid";

// Status chip color: soft orange early, green when completed, neutral mid-flow.
export const statusChipClass = (status: OrderStatus): string => {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "delivered") return "bg-amber-100 text-amber-700";
  if (status === "arrived" || status === "bought")
    return "bg-sky-100 text-sky-700";
  return "bg-gray-100 text-gray-600";
};
