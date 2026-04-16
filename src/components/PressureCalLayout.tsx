
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase-browser";
import FeedbackWidget from "./FeedbackWidget";
import pressureCalPrimaryLogo from "../assets/PressureCal_primary_logo.png";

type PressureCalLayoutProps = {
  children: ReactNode;
  hideFeedbackWidget?: boolean;
};

const primaryNavLinks = [
  { to: "/calculator", label: "Full Setup Calculator" },
  { to: "/pricing", label: "PressureCal Pro" },
];

const toolLinks = [
  { to: "/nozzle-size-calculator", label: "Nozzle Size Calculator" },
  { to: "/target-pressure-nozzle-calculator", label: "Target Pressure Nozzle Calculator" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Pressure Loss Calculator" },
  { to: "/nozzle-size-chart", label: "Nozzle Size Chart" },
  { to: "/psi-bar-calculator", label: "PSI ↔ BAR Converter" },
  { to: "/lpm-gpm-calculator", label: "LPM ↔ GPM Converter" },
];

const quickFooterLinks = [
  { to: "/calculator", label: "Full Setup Calculator" },
  { to: "/nozzle-size-calculator", label: "Nozzle Size Calculator" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Pressure Loss Calculator" },
  { to: "/pricing", label: "PressureCal Pro" },
];

const legalLinks = [
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

function HeaderActionButton({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className: string;
}) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export default function PressureCalLayout({
  children,
  hideFeedbackWidget = false,
}: PressureCalLayoutProps) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [desktopToolsOpen, setDesktopToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [footerLinksOpen, setFooterLinksOpen] = useState(false);
  const [footerCompanyOpen, setFooterCompanyOpen] = useState(false);

  const desktopToolsRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    setDesktopToolsOpen(false);
    setMobileMenuOpen(false);
    setMobileToolsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!desktopToolsRef.current) return;

      if (!desktopToolsRef.current.contains(event.target as Node)) {
        setDesktopToolsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
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

  const mobileAccountLabel = isAuthenticated ? "Account" : "Sign in";

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
              src={pressureCalPrimaryLogo}
              alt="PressureCal"
              className="h-12 w-auto sm:h-14"
            />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {primaryNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}

            <div className="relative" ref={desktopToolsRef}>
              <button
                type="button"
                onClick={() => setDesktopToolsOpen((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                aria-expanded={desktopToolsOpen}
                aria-haspopup="menu"
              >
                Tools
                <span className="text-slate-400">{desktopToolsOpen ? "−" : "+"}</span>
              </button>

              {desktopToolsOpen ? (
                <div className="absolute right-0 top-[calc(100%+14px)] w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="grid gap-1">
                    {toolLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              to="/about"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              About
            </Link>

            <HeaderActionButton
              to="/calculator"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Full Setup Calculator
            </HeaderActionButton>

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
              <HeaderActionButton
                to="/account"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign in
              </HeaderActionButton>
            )}
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <HeaderActionButton
              to="/calculator"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-4 sm:text-sm"
            >
              Open Calculator
            </HeaderActionButton>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className="text-lg leading-none">{mobileMenuOpen ? "×" : "≡"}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="space-y-2">
                <Link
                  to="/calculator"
                  className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                >
                  Full Setup Calculator
                </Link>

                <Link
                  to="/pricing"
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  PressureCal Pro
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileToolsOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span>Tools</span>
                  <span className="text-slate-400">{mobileToolsOpen ? "−" : "+"}</span>
                </button>

                {mobileToolsOpen ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <div className="grid gap-1">
                      {toolLinks.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-950"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Link
                  to="/about"
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  About
                </Link>

                <Link
                  to="/account"
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {mobileAccountLabel}
                </Link>

                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="px-4 py-8 pb-28 sm:py-10 sm:pb-12">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
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
              <p className="mt-4 text-sm text-slate-500">
                © {new Date().getFullYear()} PressureCal
              </p>
            </div>

            <div className="hidden gap-10 sm:grid sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick links</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                  {quickFooterLinks.map((link) => (
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

            <div className="space-y-3 sm:hidden">
              <div className="rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFooterLinksOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900">Quick links</span>
                  <span className="text-slate-500">{footerLinksOpen ? "−" : "+"}</span>
                </button>

                {footerLinksOpen ? (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-2 text-sm text-slate-500">
                      {quickFooterLinks.map((link) => (
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
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFooterCompanyOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900">Company</span>
                  <span className="text-slate-500">{footerCompanyOpen ? "−" : "+"}</span>
                </button>

                {footerCompanyOpen ? (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-2 text-sm text-slate-500">
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {!hideFeedbackWidget ? <FeedbackWidget /> : null}
    </div>
  );
}
