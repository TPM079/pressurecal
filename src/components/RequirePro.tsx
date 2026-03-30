import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useProAccess } from "../hooks/useProAccess";

type RequireProProps = {
  children: ReactNode;
  loadingFallback?: ReactNode;
  signedOutFallback?: ReactNode;
  nonProFallback?: ReactNode;
  errorFallback?: ReactNode;
};

export default function RequirePro({
  children,
  loadingFallback = <p>Checking your subscription…</p>,
  signedOutFallback = <p>Please sign in to access PressureCal Pro.</p>,
  nonProFallback = <p>This feature is available on PressureCal Pro.</p>,
  errorFallback,
}: RequireProProps) {
  const { loading, isAuthenticated, isPro, error } = useProAccess();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    return (
      <>
        {errorFallback ?? (
          <section className="bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">
                  We could not verify your subscription
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{error}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Refresh page
                  </button>
                  <Link
                    to="/account"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Open account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  if (!isAuthenticated) {
    return <>{signedOutFallback}</>;
  }

  if (!isPro) {
    return <>{nonProFallback}</>;
  }

  return <>{children}</>;
}
