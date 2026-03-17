import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type PressureCalLayoutProps = {
  children: ReactNode;
};

const navLinks = [
  { to: "/psi-bar-calculator", label: "PSI ↔ BAR" },
  { to: "/nozzle-size-calculator", label: "Nozzle Size" },
  { to: "/hose-pressure-loss-calculator", label: "Hose Loss" },
];

export default function PressureCalLayout({
  children,
}: PressureCalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/"
            className="flex items-center"
            aria-label="PressureCal home"
          >
            <img
              src="/PressureCal_primary_logo.png"
              alt="PressureCal"
              className="h-10 w-auto sm:h-12"
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
          </nav>
        </div>

        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:py-10">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PressureCal</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/" className="transition hover:text-slate-700">
              Home
            </Link>
            <Link
              to="/psi-bar-calculator"
              className="transition hover:text-slate-700"
            >
              PSI ↔ BAR
            </Link>
            <Link
              to="/nozzle-size-calculator"
              className="transition hover:text-slate-700"
            >
              Nozzle Size
            </Link>
            <Link
              to="/hose-pressure-loss-calculator"
              className="transition hover:text-slate-700"
            >
              Hose Loss
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}