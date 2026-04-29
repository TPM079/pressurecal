import { Link } from "react-router-dom";

type PlanKey = "free" | "pro";

type FeatureRow = {
  feature: string;
  free: string;
  pro: string;
};

export type PricingComparisonSectionPressureCalProps = {
  alreadyPro?: boolean;
  freeCalculatorHref?: string;
  proHref?: string;
  freeSaveSetupsLabel?: string;
};

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MinusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function buildFeatureRows(freeSaveSetupsLabel: string): FeatureRow[] {
  return [
    { feature: "Full setup modelling", free: "Included", pro: "Included" },
    { feature: "Core calculators and conversions", free: "Included", pro: "Included" },
    { feature: "Real at-gun performance outputs", free: "Included", pro: "Included" },
    { feature: "Save pressure washer setups", free: freeSaveSetupsLabel, pro: "Included" },
    { feature: "Duplicate and reuse setups", free: "—", pro: "Included" },
    { feature: "Compare saved setups", free: "—", pro: "Included" },
    { feature: "Share setup links", free: "—", pro: "Included" },
    { feature: "Saved setup library", free: "—", pro: "Included" },
    { feature: "Professional setup workflow tools", free: "—", pro: "Included" },
  ];
}

function renderDesktopValue(value: string, plan: PlanKey) {
  if (value === "Included") {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
          plan === "pro"
            ? "bg-[#1C408C]/10 text-[#1C408C]"
            : "bg-slate-100 text-slate-800"
        }`}
      >
        <CheckIcon className="h-4 w-4" />
        Included
      </span>
    );
  }

  if (value === "Unlimited") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#1C408C] px-3 py-1 text-sm font-semibold text-white">
        Unlimited
      </span>
    );
  }

  if (value === "—") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
        <MinusIcon className="h-4 w-4" />
        Not included
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      {value}
    </span>
  );
}

function renderCompactValue(value: string, plan: PlanKey) {
  if (value === "Included") {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
          plan === "pro" ? "bg-[#1C408C] text-white" : "bg-slate-100 text-slate-700"
        }`}
        aria-label="Included"
        title="Included"
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    );
  }

  if (value === "—") {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        aria-label="Not included"
        title="Not included"
      >
        <MinusIcon className="h-4 w-4" />
      </span>
    );
  }

  if (value === "Unlimited") {
    return (
      <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-[#1C408C] px-2 py-1 text-[11px] font-semibold text-white">
        All
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
      {value}
    </span>
  );
}

function ProPrimaryAction({
  alreadyPro,
  proHref,
}: {
  alreadyPro: boolean;
  proHref: string;
}) {
  if (alreadyPro) {
    return (
      <Link
        to={proHref}
        className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#1C408C] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-95"
      >
        Open Saved Setups
      </Link>
    );
  }

  return (
    <a
      href={proHref}
      className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#1C408C] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-95"
    >
      Upgrade to Pro
    </a>
  );
}

export default function PricingComparisonSectionPressureCal({
  alreadyPro = false,
  freeCalculatorHref = "/calculator",
  proHref = "#plans",
  freeSaveSetupsLabel = "—",
}: PricingComparisonSectionPressureCalProps) {
  const featureRows = buildFeatureRows(freeSaveSetupsLabel);

  return (
    <section className="relative overflow-hidden bg-white py-16 pb-28 sm:py-20 sm:pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,64,140,0.08),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border border-[#1C408C]/15 bg-[#1C408C]/5 px-4 py-1.5 text-sm font-semibold text-[#1C408C]">
            Pricing
          </div>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Start free. Upgrade when PressureCal becomes part of your workflow.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            PressureCal keeps the core calculators and full setup modelling
            available for free. PressureCal Pro adds the setup management layer:
            save, duplicate, compare, and share the pressure washer setups you
            use again and again.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.12fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  PressureCal
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  Free calculators and setup modelling
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Ideal for operators who want fast, practical setup checks
                  without needing to save every machine, hose, and nozzle
                  combination.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <div className="text-sm font-medium text-slate-500">Price</div>
                <div className="text-2xl font-bold text-slate-900">Free</div>
              </div>
            </div>

            <ul className="mt-8 space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                Use the core calculators and conversions whenever you need them
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                Model real-world setup performance from pump to gun
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                Best for quick checks, testing, and one-off setup decisions
              </li>
            </ul>

            <Link
              to={freeCalculatorHref}
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Start Free
            </Link>
          </div>

          <div className="relative rounded-[32px] border border-[#1C408C]/15 bg-[#1C408C] p-[1px] shadow-[0_20px_60px_rgba(28,64,140,0.18)]">
            <div className="rounded-[31px] bg-white p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-[#1C408C] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Best for Regular Use
                  </span>

                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#1C408C]">
                    PressureCal Pro
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Setup management for repeat work
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Built for operators who want to save proven setups, compare
                    options, share setup links, and build a reusable pressure
                    washer setup library.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#1C408C]/5 px-4 py-3 text-right">
                  <div className="text-sm font-medium text-slate-500">Plan</div>
                  <div className="text-2xl font-bold text-[#1C408C]">Pro</div>
                </div>
              </div>

              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Save named pressure washer setups for repeat jobs and machines
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Duplicate setups to test different hoses, nozzles, and spray modes
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Compare saved setups and share setup links with others
                </li>
              </ul>

              <ProPrimaryAction alreadyPro={alreadyPro} proHref={proHref} />
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="md:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] border-b border-slate-200 bg-slate-50">
              <div className="px-4 py-4 text-left text-sm font-semibold text-slate-900">
                Feature
              </div>
              <div className="px-2 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Free
              </div>
              <div className="bg-[#1C408C]/5 px-2 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#1C408C]">
                Pro
              </div>
            </div>

            {featureRows.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[minmax(0,1fr)_72px_72px] items-center border-b border-slate-200 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <div className="px-4 py-4 text-sm font-medium leading-6 text-slate-900">
                  {row.feature}
                </div>
                <div className="flex justify-center px-2 py-4">
                  {renderCompactValue(row.free, "free")}
                </div>
                <div className="flex justify-center bg-[#1C408C]/5 px-2 py-4">
                  {renderCompactValue(row.pro, "pro")}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[860px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-6 py-5 text-left text-sm font-semibold text-slate-900 sm:text-base">
                    Feature
                  </th>
                  <th className="border-b border-slate-200 px-6 py-5 text-center text-sm font-semibold text-slate-900 sm:text-base">
                    PressureCal
                  </th>
                  <th className="border-b border-[#1C408C]/10 bg-[#1C408C]/5 px-6 py-5 text-center text-sm font-semibold text-[#1C408C] sm:text-base">
                    PressureCal Pro
                  </th>
                </tr>
              </thead>

              <tbody>
                {featureRows.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="border-b border-slate-200 px-6 py-4 text-sm font-medium text-slate-900 sm:text-base">
                      {row.feature}
                    </td>
                    <td className="border-b border-slate-200 px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {renderDesktopValue(row.free, "free")}
                      </div>
                    </td>
                    <td className="border-b border-[#1C408C]/10 bg-[#1C408C]/5 px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {renderDesktopValue(row.pro, "pro")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
