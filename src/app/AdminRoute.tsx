// Admin entry: RequireAdmin gate + AdminApp. Split into its own module so the
// router can lazy-load the heavy Firebase (auth + writes + storage) code.
import { RequireAdmin } from "../components/RequireAdmin";
import AdminApp from "./AdminApp";

export const AdminRoute = () => (
  <RequireAdmin>
    <AdminApp />
  </RequireAdmin>
);
