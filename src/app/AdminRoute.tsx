// Admin entry: RequireAdmin gate + StoreApp. Split into its own module so the
// router can lazy-load the heavy Firebase (auth + writes + storage) code.
import { RequireAdmin } from "../components/RequireAdmin";
import { StoreApp } from "./StoreApp";

export const AdminRoute = () => (
  <RequireAdmin>
    <StoreApp />
  </RequireAdmin>
);
