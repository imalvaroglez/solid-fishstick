import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { STRINGS } from "../lib/strings";
import { LoginScreen } from "./LoginScreen";
import { AccessDenied } from "./AccessDenied";
import { FullScreen } from "./FullScreen";

// Gates the admin app: loading -> Cargando, signedOut -> login,
// denied -> access denied, admin -> children.
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();

  if (status === "loading") return <FullScreen text={STRINGS.loading.app} />;
  if (status === "signedOut") return <LoginScreen />;
  if (status === "denied") return <AccessDenied />;
  return <>{children}</>;
};
