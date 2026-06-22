// Demo seed data. Builds fresh timestamps at runtime so "Hoy"/"Ayer" stay meaningful.
import type { DB, Order, OrderStatus } from "../types";

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysAhead = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

// Stable ids so orders can reference seed products/customers.
const P = {
  dior: "seed-product-dior",
  dunk: "seed-product-dunk",
  yankees: "seed-product-yankees",
};
const C = {
  juan: "seed-customer-juan",
  carlos: "seed-customer-carlos",
  luis: "seed-customer-luis",
};

const mkOrder = (o: {
  id: string;
  customerId: string;
  productId?: string;
  productName: string;
  details?: string;
  cost: number;
  price: number;
  deposit: number;
  status: OrderStatus;
  createdDaysAgo: number;
  promisedInDays?: number;
}): Order => ({
  id: o.id,
  customerId: o.customerId,
  productId: o.productId,
  productName: o.productName,
  details: o.details,
  cost: o.cost,
  price: o.price,
  deposit: o.deposit,
  status: o.status,
  promisedDate: o.promisedInDays !== undefined ? daysAhead(o.promisedInDays) : undefined,
  createdAt: daysAgo(o.createdDaysAgo),
  updatedAt: daysAgo(o.createdDaysAgo),
});

export const SEED_DB: DB = {
  version: 1,
  products: [
    {
      id: P.dior,
      name: "Dior Sauvage 100ml",
      category: "perfume",
      referenceCost: 1500,
      referencePrice: 2200,
      isPublic: false,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      id: P.dunk,
      name: "Nike Dunk Panda",
      category: "sneakers",
      referenceCost: 2100,
      referencePrice: 2700,
      isPublic: false,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      id: P.yankees,
      name: "Gorra Yankees",
      category: "cap",
      referenceCost: 450,
      referencePrice: 750,
      isPublic: false,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
  ],
  customers: [
    {
      id: C.juan,
      name: "Juan",
      phone: "55 1234 5678",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      id: C.carlos,
      name: "Carlos",
      phone: "55 8765 4321",
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      id: C.luis,
      name: "Luis",
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
  ],
  orders: [
    // Needs confirmation bucket (asked / confirmed)
    mkOrder({
      id: "seed-order-1", customerId: C.juan, productId: P.dunk,
      productName: "Nike Dunk Panda", details: "Talla 27",
      cost: 2100, price: 2700, deposit: 0, status: "confirmed",
      createdDaysAgo: 1, promisedInDays: 3,
    }),
    mkOrder({
      id: "seed-order-2", customerId: C.luis, productId: P.yankees,
      productName: "Gorra Yankees", details: "Negra",
      cost: 450, price: 750, deposit: 0, status: "asked", createdDaysAgo: 1,
    }),
    // Buy product bucket (to_buy)
    mkOrder({
      id: "seed-order-3", customerId: C.carlos, productId: P.dior,
      productName: "Dior Sauvage 100ml",
      cost: 1500, price: 2200, deposit: 500, status: "to_buy",
      createdDaysAgo: 2, promisedInDays: 5,
    }),
    // Waiting arrival (bought)
    mkOrder({
      id: "seed-order-4", customerId: C.juan, productId: P.dunk,
      productName: "Nike Dunk Panda", details: "Talla 28",
      cost: 2100, price: 2900, deposit: 1000, status: "bought",
      createdDaysAgo: 3, promisedInDays: 2,
    }),
    // Ready to deliver (arrived)
    mkOrder({
      id: "seed-order-5", customerId: C.carlos, productId: P.yankees,
      productName: "Gorra Yankees",
      cost: 450, price: 800, deposit: 300, status: "arrived", createdDaysAgo: 4,
    }),
    // Waiting payment (delivered)
    mkOrder({
      id: "seed-order-6", customerId: C.luis, productId: P.dior,
      productName: "Dior Sauvage 100ml",
      cost: 1500, price: 2300, deposit: 1000, status: "delivered", createdDaysAgo: 5,
    }),
    // Completed (paid) — shows in the Completed section
    mkOrder({
      id: "seed-order-7", customerId: C.juan, productId: P.dunk,
      productName: "Nike Dunk Panda", details: "Talla 26",
      cost: 2100, price: 2700, deposit: 2700, status: "paid", createdDaysAgo: 8,
    }),
  ],
};
