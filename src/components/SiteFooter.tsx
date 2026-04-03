import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="text-base font-semibold text-white">PressureCal</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Practical pressure washer modelling for nozzle sizing, hose pressure loss,
            and real at-gun performance.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"
        >
          <Link to="/about" className="transition hover:text-white">
            About
          </Link>
          <Link to="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link to="/terms" className="transition hover:text-white">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
