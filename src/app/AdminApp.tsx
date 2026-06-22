import { useCallback, useState } from "react";
import type { Order, OrderStatus, Tab } from "../types";
import { useFirestoreStore } from "../hooks/useFirestoreStore";
import { BottomNav } from "../components/BottomNav";
import { FullScreen } from "../components/FullScreen";
import { MigrationBanner } from "../components/MigrationBanner";
import { Toast } from "../components/Toast";
import { HomeScreen } from "../screens/HomeScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { CatalogScreen } from "../screens/CatalogScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { STRINGS } from "../lib/strings";

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
} | null;

export default function AdminApp() {
  const store = useFirestoreStore();
  const [tab, setTab] = useState<Tab>("home");
  // Lets Home's "Nuevo pedido" jump straight into the order form.
  const [ordersFormOpen, setOrdersFormOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const notify = useCallback((t: ToastState) => setToast(t), []);

  const fail = useCallback(
    (message: string) => notify({ message }),
    [notify]
  );

  if (store.dataStatus === "loading") {
    return <FullScreen text={STRINGS.loading.app} />;
  }

  // Advance with confirm on the terminal step + one-step undo. Writes are
  // awaited so failures surface instead of silently dropping the change.
  // Returns whether the advance actually proceeded (so the card can gate its
  // "Guardando…" state on it and not wedge if the user cancels the confirm).
  const onAdvance = (
    orderId: string,
    nextStatus: OrderStatus
  ): boolean => {
    if (nextStatus === "paid" && !window.confirm(STRINGS.confirmPaid)) {
      return false;
    }

    const order = store.db.orders.find((o) => o.id === orderId);
    const prev = order?.status;

    store.advanceOrder(orderId, nextStatus).catch(() =>
      fail(STRINGS.errors.advance)
    );

    if (nextStatus === "paid") {
      notify({
        message: STRINGS.order.markedPaid,
        actionLabel: STRINGS.order.undo,
        onAction: () => {
          if (prev && prev !== "paid") {
            store.advanceOrder(orderId, prev).catch(() =>
              fail(STRINGS.errors.advance)
            );
          }
        },
      });
    }
    return true;
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-gray-50">
      {store.dataStatus === "empty" && <MigrationBanner store={store} />}
      <main className="flex-1 px-4 pb-28 pt-6">
        {tab === "home" && (
          <HomeScreen
            db={store.db}
            onNewOrder={() => {
              setTab("orders");
              setOrdersFormOpen(true);
            }}
            onAdvance={onAdvance}
          />
        )}
        {tab === "orders" && (
          <OrdersScreen
            db={store.db}
            onSaveOrder={(input) => store.addOrder(input)}
            onAdvance={onAdvance}
            openFormOnMount={ordersFormOpen}
            onFormConsumed={() => setOrdersFormOpen(false)}
          />
        )}
        {tab === "catalog" && (
          <CatalogScreen
            db={store.db}
            onSaveProduct={(p) => {
              store.saveProduct(p).catch(() => fail(STRINGS.errors.save));
            }}
          />
        )}
        {tab === "customers" && (
          <CustomersScreen
            db={store.db}
            onAddCustomer={(c) => {
              store.addCustomer(c).catch(() => fail(STRINGS.errors.save));
            }}
            onReset={() => void store.importSampleData()}
          />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={() => {
            toast.onAction?.();
            setToast(null);
          }}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
