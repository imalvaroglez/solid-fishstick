// Wraps AdminApp in StoreProvider. Branches to the create-store flow when the
// user has no stores yet. Keying AdminApp by store prevents one store's data
// from flashing while the next store's listeners connect.
import { useAuth } from "../hooks/useAuth";
import { FullScreen } from "../components/FullScreen";
import { STRINGS } from "../lib/strings";
import { StoreProvider, useStore } from "./StoreProvider";
import { CreateStoreScreen } from "../screens/CreateStoreScreen";
import AdminApp from "./AdminApp";
import {
  isAdminEmail,
  LEGACY_ADMIN_UIDS,
} from "../services/firebase/auth";

const StoreShell = () => {
  const { stores, activeStoreId, loading } = useStore();
  if (loading) return <FullScreen text={STRINGS.loading.app} />;
  if (stores.length === 0) return <CreateStoreScreen />;
  if (!activeStoreId) return <FullScreen text={STRINGS.loading.app} />;
  return <AdminApp key={activeStoreId} />;
};

export const StoreApp = () => {
  const { user } = useAuth();
  if (!user) return <FullScreen text={STRINGS.loading.app} />;
  return (
    <StoreProvider
      uid={user.uid}
      canMigrateLegacy={
        isAdminEmail(user.email)
        || LEGACY_ADMIN_UIDS.includes(user.uid)
      }
    >
      <StoreShell />
    </StoreProvider>
  );
};
