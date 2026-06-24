// Firestore-backed data store. Drop-in surface for useLocalStore plus a
// dataStatus. Reads via onSnapshot (realtime); writes fire-and-forget through
// repositories, and the listeners update local state.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Customer, DB, NewOrderInput, Order, OrderStatus, Product } from "../types";
import { id } from "../lib/ids";
import * as productRepo from "../services/repositories/productRepository";
import * as customerRepo from "../services/repositories/customerRepository";
import * as orderRepo from "../services/repositories/orderRepository";
import * as storage from "../lib/storage";
import { SEED_DB } from "../lib/seed";

export type DataStatus = "loading" | "ready" | "empty" | "error";

const now = (): string => new Date().toISOString();

export const useFirestoreStore = (storeId: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Track whether each collection has emitted at least once.
  const seen = useRef({ products: false, customers: false, orders: false });

  useEffect(() => {
    // Reset seen flags on store switch so dataStatus reflects the new store.
    seen.current = { products: false, customers: false, orders: false };
    const unsubP = productRepo.subscribe((data) => {
      setProducts(data);
      seen.current.products = true;
    }, storeId);
    const unsubC = customerRepo.subscribe((data) => {
      setCustomers(data);
      seen.current.customers = true;
    }, storeId);
    const unsubO = orderRepo.subscribe((data) => {
      setOrders(data);
      seen.current.orders = true;
    }, storeId);
    return () => {
      unsubP();
      unsubC();
      unsubO();
    };
  }, [storeId]);

  const allLoaded = seen.current.products && seen.current.customers && seen.current.orders;

  const dataStatus: DataStatus = !allLoaded
    ? "loading"
    : products.length === 0 && customers.length === 0 && orders.length === 0
    ? "empty"
    : "ready";

  const db: DB = useMemo(
    () => ({ version: 1, products, customers, orders }),
    [products, customers, orders]
  );

  // --- writes (all return promises so callers can surface failures) ---

  const addOrder = (input: NewOrderInput) => {
    // Resolve/create customer inline, mirroring useLocalStore.
    const trimmed = input.customerName.trim();
    const existing = customers.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    const ts = now();
    const customerId = existing?.id ?? id();
    const order: Order = {
      id: id(),
      customerId,
      productId: input.productId,
      productName: input.productName.trim(),
      details: input.details?.trim() || undefined,
      cost: input.cost,
      price: input.price,
      deposit: input.deposit,
      status: "asked",
      promisedDate: input.promisedDate || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: ts,
      updatedAt: ts,
    };
    // Write customer first (if new), then the order that references it.
    const customerWrite = existing
      ? Promise.resolve()
      : customerRepo.save({
          id: customerId,
          name: trimmed,
          phone: input.customerPhone?.trim() || undefined,
          createdAt: ts,
          updatedAt: ts,
        }, storeId);
    return customerWrite.then(() => orderRepo.save(order, storeId));
  };

  const advanceOrder = (orderId: string, nextStatus: OrderStatus) =>
    orderRepo.advance(orderId, nextStatus, storeId);

  const saveProduct = (product: Product) => productRepo.save(product, storeId);

  const addCustomer = (
    customer: Pick<Customer, "name" | "phone" | "notes">
  ) => {
    const ts = now();
    return customerRepo.save({
      id: id(),
      name: customer.name.trim(),
      phone: customer.phone,
      notes: customer.notes,
      createdAt: ts,
      updatedAt: ts,
    }, storeId);
  };

  // --- migration ---

  // localStorage has user data that differs from the seed.
  const hasLocalData = useMemo(() => {
    try {
      const local = storage.load();
      const same = JSON.stringify(local) === JSON.stringify(SEED_DB);
      return !same;
    } catch {
      return false;
    }
  }, []);

  const importLocalData = async () => {
    const local = storage.load();
    await Promise.all([
      productRepo.importProducts(local.products, storeId),
      customerRepo.importCustomers(local.customers, storeId),
      orderRepo.importOrders(local.orders, storeId),
    ]);
  };

  const importSampleData = async () => {
    await Promise.all([
      productRepo.importProducts(SEED_DB.products, storeId),
      customerRepo.importCustomers(SEED_DB.customers, storeId),
      orderRepo.importOrders(SEED_DB.orders, storeId),
    ]);
  };

  return {
    db,
    dataStatus,
    addOrder,
    advanceOrder,
    saveProduct,
    addCustomer,
    hasLocalData,
    importLocalData,
    importSampleData,
  };
};
