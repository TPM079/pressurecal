import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase-browser";
import FeedbackWidget from "./FeedbackWidget";

type PressureCalLayoutProps = {
  children: ReactNode;
};

const navLinks = [
  { to: "/calculator", label: "Full Setup Calculator" },
  { to: "/psi-bar-calculator", label: "PSI ↔ BAR Converter" },
  { to: "/lpm-gpm-calculator", label: "LPM ↔ GPM Converter" },
  { to: "/nozzle-size-calculator", label: "Nozzle Size Calculator" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Pressure Loss Calculator" },
  { to: "/nozzle-size-chart", label: "Nozzle Size Chart" },
];

const legalLinks = [
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

export default function PressureCalLayout({ children }: PressureCalLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setIsAuthenticated(Boolean(data.session?.user));
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        window.alert(error.message);
        return;
      }

      window.location.assign("/");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center"
            aria-label="PressureCal home"
            onClick={() => {
              if (window.location.pathname === "/") {
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
              }
            }}
          >
            <img
              src="/PressureCal_primary_logo.png"
              alt="PressureCal"
              className="h-12 w-auto sm:h-14"
            />
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/about"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              About
            </Link>

            <Link
              to="/calculator"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Full Setup Calculator
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/about"
              className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              About
            </Link>

            <Link
              to="/account"
              className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {isAuthenticated ? "Account" : "Sign in"}
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="px-4 py-8 pb-24 sm:py-10 sm:pb-10">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="text-base font-semibold text-slate-900">PressureCal</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Practical pressure washer setup modelling for nozzle sizing, hose pressure
                loss, and at-gun performance.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                © {new Date().getFullYear()} PressureCal
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Tools</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="transition hover:text-slate-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Company</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                  {legalLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="transition hover:text-slate-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <FeedbackWidget />
    </div>
  );
}
