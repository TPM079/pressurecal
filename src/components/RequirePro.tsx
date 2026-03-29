import type { ReactNode } from "react";
import { useProAccess } from "../hooks/useProAccess";

type RequireProProps = {
  children: ReactNode;
  loadingFallback?: ReactNode;
  signedOutFallback?: ReactNode;
  nonProFallback?: ReactNode;
};

export default function RequirePro({
  children,
  loadingFallback = <p>Checking your subscription…</p>,
  signedOutFallback = <p>Please sign in to access PressureCal Pro.</p>,
  nonProFallback = <p>This feature is available on PressureCal Pro.</p>,
}: RequireProProps) {
  const { loading, isAuthenticated, isPro } = useProAccess();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    return <>{signedOutFallback}</>;
  }

  if (!isPro) {
    return <>{nonProFallback}</>;
  }

  return <>{children}</>;
}
