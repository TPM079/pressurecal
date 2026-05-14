import { Link } from "react-router-dom";

const currentYear = new Date().getFullYear();

const quickLinks = [
  { label: "Full Setup Calculator", to: "/calculator" },
  { label: "Nozzle Size Calculator", to: "/nozzle-size-calculator" },
  { label: "Hose Pressure Loss Calculator", to: "/hose-pressure-loss-calculator" },
  { label: "PressureCal Pro", to: "/pricing" },
];

const companyLinks = [
  { label: "About", to: "/about" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 md:grid-cols-[minmax(0,1fr)_auto_auto] md:px-8">
        <div className="max-w-2xl">
          <p className="text-base font-semibold text-slate-950">PressureCal</p>

          <p className="mt-3 text-sm leading-6">
            Practical pressure washer setup modelling for nozzle sizing, hose
            pressure loss, and at-gun performance.
          </p>

          <p className="mt-5 text-sm leading-6">
            PressureCal acknowledges the Traditional Owners of Country throughout
            Australia and recognises their continuing connection to land, waters
            and community. We pay our respects to Elders past and present.
          </p>

          <p className="mt-5 text-sm">
            © {currentYear} PressureCal. All rights reserved.
          </p>
        </div>

        <nav aria-label="Quick links" className="min-w-48">
          <p className="text-sm font-semibold text-slate-950">Quick links</p>
          <ul className="mt-4 space-y-3 text-sm">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition hover:text-slate-950">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company" className="min-w-32">
          <p className="text-sm font-semibold text-slate-950">Company</p>
          <ul className="mt-4 space-y-3 text-sm">
            {companyLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition hover:text-slate-950">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
