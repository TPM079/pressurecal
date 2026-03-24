import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import FeedbackWidget from "./FeedbackWidget";

type PressureCalLayoutProps = {
  children: ReactNode;
};

const navLinks = [
  { to: "/psi-bar-calculator", label: "PSI ↔ BAR" },
 { to: "/lpm-gpm-calculator", label: "LPM ↔ GPM" },
  { to: "/nozzle-size-calculator", label: "Nozzle Size" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Loss" },
  { to: "/nozzle-size-chart", label: "Nozzle Chart" },
];

export default function PressureCalLayout({
  children,
}: PressureCalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          {/* LOGO */}
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

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-5 md:flex">
            <a
              href="/#calculator"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Calculator
            </a>

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}

            <a
              href="/#about"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              About
            </a>

            <a
              href="/#calculator"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Model Your Pressure Washer
            </a>
          </nav>
        </div>

        {/* MOBILE NAV */}
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

            <a
              href="/#about"
              className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              About
            </a>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="px-4 py-8 sm:py-10">{children}</main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PressureCal</p>

          <div className="flex flex-wrap gap-4">
            <Link to="/" className="transition hover:text-slate-700">
              Home
            </Link>

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition hover:text-slate-700"
              >
                {link.label}
              </Link>
            ))}

            <a href="/#about" className="transition hover:text-slate-700">
              About
            </a>
          </div>
        </div>
      </footer>

      {/* FEEDBACK */}
      <FeedbackWidget />
    </div>
  );
}