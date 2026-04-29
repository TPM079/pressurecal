import { Link } from "react-router-dom";

type PlanKey = "free" | "pro";

type FeatureStatus = "Included" | "Coming soon" | "—";

type FeatureRow = {
  feature: string;
  free: FeatureStatus;
  pro: FeatureStatus;
};

export type PricingComparisonSectionPressureCalProps = {
  alreadyPro?: boolean;
  freeCalculatorHref?: string;
  proHref?: string;
  freeSaveSetupsLabel?: FeatureStatus;
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

function buildFeatureRows(freeSaveSetupsLabel: FeatureStatus): FeatureRow[] {
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
    { feature: "Professional PDF setup reports", free: "—", pro: "Coming soon" },
  ];
}

function renderDesktopValue(value: FeatureStatus, plan: PlanKey) {
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

  if (value === "Coming soon") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
        Coming soon
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
      <MinusIcon className="h-4 w-4" />
      Not included
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
    <section className="relative scroll-mt-28 overflow-hidden bg-white py-16 pb-28 sm:py-20 sm:pb-20">
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
            PressureCal gives working pressure washing operators fast, practical
            setup modelling. PressureCal Pro adds the tools to save, duplicate,
            compare, and share real pressure washer setups over time.
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
                  Ideal for operators who want accurate setup checks and quick,
                  real-world calculations in the field.
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
                Full access to core calculators and conversions
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                Model real-world setup performance from pump to gun
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                Best for quick checks, testing, and one-off jobs
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
                    options, share setup links, and build a reusable setup library.
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
                  Save pressure washer setups for repeat jobs and standard machines
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Duplicate, compare, and reuse setups without starting again
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Share saved setup links for faster recommendations and handovers
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1C408C]" />
                  Professional PDF setup reports coming soon
                </li>
              </ul>

              <ProPrimaryAction alreadyPro={alreadyPro} proHref={proHref} />
            </div>
          </div>
        </div>

        <div className="mt-8 hidden overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm md:block">
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
    </section>
  );
}
