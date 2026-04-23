import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase-browser";
import FeedbackWidget from "./FeedbackWidget";


type PressureCalLayoutProps = {
  children: ReactNode;
  hideFeedbackWidget?: boolean;
};

const toolLinks = [
  { to: "/nozzle-size-calculator", label: "Nozzle Size Calculator" },
  { to: "/target-pressure-nozzle-calculator", label: "Target Pressure Nozzle Calculator" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Pressure Loss Calculator" },
  { to: "/nozzle-size-chart", label: "Nozzle Size Chart" },
  { to: "/psi-bar-calculator", label: "PSI ↔ BAR Converter" },
  { to: "/lpm-gpm-calculator", label: "LPM ↔ GPM Converter" },
];

const footerQuickLinks = [
  { to: "/calculator", label: "Full Setup Calculator" },
  { to: "/nozzle-size-calculator", label: "Nozzle Size Calculator" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Pressure Loss Calculator" },
  { to: "/pricing", label: "PressureCal Pro" },
];

const companyLinks = [
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

function navLinkClass(isActive: boolean) {
  return [
    "text-sm font-medium transition",
    isActive ? "text-slate-950" : "text-slate-600 hover:text-slate-900",
  ].join(" ");
}

export default function PressureCalLayout({
  children,
  hideFeedbackWidget = false,
}: PressureCalLayoutProps) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCalculatorPage = location.pathname === "/calculator";

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;
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

  useEffect(() => {
    setToolsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
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
  src="/pressurecal-logo.png"
  alt="PressureCal"
  className="block w-[220px] h-auto shrink-0 sm:w-[250px] lg:w-[270px]"
/>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/pricing" className={navLinkClass(location.pathname === "/pricing")}>
              PressureCal Pro
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((current) => !current)}
                className={["inline-flex items-center gap-1 text-sm font-medium transition", toolsOpen ? "text-slate-950" : "text-slate-600 hover:text-slate-900"].join(" ")}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
              >
                Tools
                <span className="text-slate-400">+</span>
              </button>

              {toolsOpen ? (
                <div className="absolute right-0 top-full mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="space-y-1">
                    <Link
                      to="/calculator"
                      className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      Full Setup Calculator
                    </Link>
                    {toolLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Link to="/about" className={navLinkClass(location.pathname === "/about")}>
              About
            </Link>

            {isCalculatorPage ? (
              <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                Full Setup Calculator
              </span>
            ) : (
              <Link
                to="/calculator"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Full Setup Calculator
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/account" className={navLinkClass(location.pathname === "/account")}>
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

          <div className="flex items-center gap-2 md:hidden">
            {!isCalculatorPage ? (
              <Link
                to="/calculator"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Calculator
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                Calculator
              </span>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-100 bg-white md:hidden">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="grid gap-2">
                <Link
                  to="/pricing"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  PressureCal Pro
                </Link>
                <Link
                  to="/calculator"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Full Setup Calculator
                </Link>
                {toolLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/about"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  About
                </Link>
                <Link
                  to="/account"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  {isAuthenticated ? "Account" : "Sign in"}
                </Link>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
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
              <p className="mt-4 text-sm leading-6 text-slate-500">
                PressureCal acknowledges the Traditional Owners of Country throughout Australia and
                recognises their continuing connection to land, waters and community. We pay our
                respects to Elders past and present.
              </p>
              <p className="mt-4 text-sm text-slate-500">© {new Date().getFullYear()} PressureCal</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick links</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                  {footerQuickLinks.map((link) => (
                    <Link key={link.to} to={link.to} className="transition hover:text-slate-700">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Company</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                  {companyLinks.map((link) => (
                    <Link key={link.to} to={link.to} className="transition hover:text-slate-700">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {!hideFeedbackWidget ? <FeedbackWidget /> : null}
    </div>
  );
}
