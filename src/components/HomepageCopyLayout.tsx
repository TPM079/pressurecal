import { Link } from "react-router-dom";

const trustBarItems = [
  "Real system modelling",
  "Australian-first defaults (PSI + LPM)",
  "Built for field use",
];

const workflowSteps = [
  {
    step: "01",
    title: "Enter your machine",
    description: "Start with rated pressure, flow, and hose length.",
  },
  {
    step: "02",
    title: "See real performance",
    description:
      "Get nozzle size, hose loss, and estimated at-gun pressure instantly.",
  },
  {
    step: "03",
    title: "Refine your setup",
    description: "Open the full calculator for deeper rig tuning and system checks.",
  },
];

const featureGrid = [
  "Nozzle size calculator",
  "Hose pressure loss calculator",
  "PSI ↔ BAR conversion",
  "LPM ↔ GPM conversion",
  "Nozzle size chart",
];

const proFeatures = [
  "Save setups",
  "Compare configurations",
  "Share rigs with your team",
];

type HomepageCopyLayoutProps = {
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
};

export default function HomepageCopyLayout({
  primaryCtaHref = "/#calculator",
  secondaryCtaHref = "/nozzle-size-chart",
}: HomepageCopyLayoutProps) {
  return (
    <div className="bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Model your pressure washer setup — from pump to gun.
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Nozzle size, hose loss, and real at-gun pressure — calculated together so
              you can see how your machine actually performs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={primaryCtaHref}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start your setup
              </Link>
              <Link
                to={secondaryCtaHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                View nozzle chart
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Built for pressure washing professionals and serious operators.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-3">
          {trustBarItems.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-slate-100"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Most tools stop at conversions.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Pressure washer calculators usually give you simple number changes — PSI to
              BAR, GPM to LPM — but not the answers that actually matter in the real
              world.
            </p>
            <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
              <li>• What pressure am I really getting at the gun?</li>
              <li>• Is my nozzle correctly sized?</li>
              <li>• How much is my hose reducing performance?</li>
            </ul>
            <p className="mt-6 text-lg font-semibold text-slate-950">
              Because your system is connected — not just a list of numbers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              PressureCal models the full system.
            </h2>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="grid gap-3 text-center sm:grid-cols-4">
                {["Pump", "Hose", "Nozzle", "Gun"].map((item, index) => (
                  <div key={item} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">{item}</p>
                    {index < 3 ? (
                      <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-400 sm:block">
                        →
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <ul className="mt-8 space-y-3 text-base leading-7 text-slate-700">
              <li>• Pump sets flow</li>
              <li>• Nozzle determines pressure</li>
              <li>• Hose introduces loss</li>
              <li>• The result shows real-world performance</li>
            </ul>

            <p className="mt-6 text-lg font-semibold text-slate-950">
              See what your machine is actually doing — not just what it’s rated for.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Start simple. Get real answers fast.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Enter your pressure, flow, and hose length to instantly see:
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              <li>• Recommended nozzle size</li>
              <li>• Estimated hose loss</li>
              <li>• Real at-gun pressure</li>
            </ul>
            <p className="mt-6 text-base font-semibold text-slate-950">
              Then go deeper when you need to.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">
              Go deeper with full rig modelling.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Open the full calculator to dial in every part of your setup:
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-100">
              <li>• Hose diameter</li>
              <li>• Engine horsepower</li>
              <li>• Nozzle count</li>
              <li>• Spray mode</li>
              <li>• System limits and bypass behaviour</li>
            </ul>
            <div className="mt-8">
              <Link
                to="/calculator"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open full rig calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built to model real-world performance
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal goes beyond basic conversions and shows how a pressure washer
              setup actually behaves.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Real nozzle sizing logic",
              "Hose friction using engineering formulas",
              "At-gun performance, not just pump specs",
              "System behaviour when limits are reached",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <p className="text-base font-semibold text-slate-950">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              A better way to dial in your setup
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Everything you need to model your system
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featureGrid.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-900 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built from real-world pressure washing experience
            </h2>
            <div className="mt-5 space-y-4 text-base leading-7 text-slate-600">
              <p>
                PressureCal started from real-world frustration — trying to accurately
                size nozzles and understand pressure loss in actual systems.
              </p>
              <p>
                Most tools only convert units. PressureCal was built to model how a
                pressure washer actually behaves.
              </p>
              <p>
                The goal is simple: give operators practical answers they can trust.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">
              Free to calculate. Built for professionals.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Full system modelling is free. PressureCal Pro expands how you use it:
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-100">
              {proFeatures.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start modelling your setup
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Use PressureCal free and see how your system really performs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={primaryCtaHref}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Start your setup
            </Link>
            <Link
              to="/calculator"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open full rig calculator
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
