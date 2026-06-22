import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PublicCatalogScreen } from "./screens/PublicCatalogScreen";
import { FullScreen } from "./components/FullScreen";
import { STRINGS } from "./lib/strings";

// The admin path (Auth + Firestore writes + Storage upload) is heavy; load it
// on demand so the public /catalogo page stays small.
const AdminRoute = lazy(() =>
  import("./app/AdminRoute").then((m) => ({ default: m.AdminRoute }))
);

export const router = createBrowserRouter([
  {
    path: "/catalogo",
    element: <PublicCatalogScreen />,
  },
  {
    path: "/*",
    element: (
      <Suspense fallback={<FullScreen text={STRINGS.loading.app} />}>
        <AdminRoute />
      </Suspense>
    ),
  },
]);
