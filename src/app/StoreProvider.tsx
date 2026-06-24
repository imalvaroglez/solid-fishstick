// Holds the active store + the signed-in user's store list. Persists the active
// store in localStorage so a reload keeps you in the same store.
//
// N=0 → create/migrate flow. N>=1 → active store + switcher.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Store } from "../types";
import {
  createStore as createStoreDocument,
  DEFAULT_STORE_ID,
  subscribeUserStores,
  type CreateStoreInput,
} from "../services/repositories/storeRepository";
import {
  backfillDefaultStore,
  copyLegacyToStore,
} from "../services/migration/copyLegacyToStore";

const STORAGE_KEY = "storeos:activeStore";

type StoreContextValue = {
  stores: Store[];
  activeStoreId: string | null;
  setActiveStoreId: (id: string) => void;
  createStore: (input: CreateStoreInput) => Promise<Store>;
  migrateLegacyStore: () => Promise<void>;
  canMigrateLegacy: boolean;
  loading: boolean;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider = ({
  uid,
  canMigrateLegacy,
  children,
}: {
  uid: string;
  canMigrateLegacy: boolean;
  children: ReactNode;
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  // Subscribe to the user's store list.
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserStores(uid, (next) => {
      // Store deletion is not supported in this product, so preserve any
      // just-created optimistic store while an older async snapshot resolves.
      setStores((current) => [
        ...next,
        ...current.filter(
          (item) => !next.some((nextItem) => nextItem.id === item.id)
        ),
      ]);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  // Reconcile the active store with the available list: if the persisted id is
  // gone (or unset), fall back to the first available store, or DEFAULT if the
  // legacy migration created it.
  useEffect(() => {
    if (loading || stores.length === 0) return;
    const valid =
      activeStoreId && stores.some((s) => s.id === activeStoreId)
        ? activeStoreId
        : stores[0]?.id ?? DEFAULT_STORE_ID;
    if (valid !== activeStoreId) setActiveStoreId(valid);
  }, [stores, activeStoreId, loading]);

  const setActiveStoreId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveStoreIdState(id);
  };

  const registerStore = (store: Store) => {
    setStores((current) =>
      current.some((item) => item.id === store.id)
        ? current
        : [...current, store]
    );
    setActiveStoreId(store.id);
  };

  const createStore = async (input: CreateStoreInput) => {
    const store = await createStoreDocument(uid, input);
    registerStore(store);
    return store;
  };

  const migrateLegacyStore = async () => {
    const store = await backfillDefaultStore(uid);
    await copyLegacyToStore(store.id);
    registerStore(store);
  };

  const value = useMemo<StoreContextValue>(
    () => ({
      stores,
      activeStoreId,
      setActiveStoreId,
      createStore,
      migrateLegacyStore,
      canMigrateLegacy,
      loading,
    }),
    [stores, activeStoreId, canMigrateLegacy, loading]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextValue => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
