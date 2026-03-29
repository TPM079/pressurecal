import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import { trackEvent } from "../lib/analytics";

const FREE_CALCULATOR_HREF = "/calculator";

const freeFeatures = [
  "Full system modelling",
  "Nozzle sizing",
  "Hose pressure loss",
  "PSI ↔ BAR conversion",
  "LPM ↔ GPM conversion",
  "Nozzle size chart",
];

const proFeatures = [
  "Save setups",
  "Compare setups",
  "Build your setup library",
  "Export and share saved setups",
];

const whyProCards = [
  {
    title: "Save time",
    description:
      "Keep your most-used setups ready to reuse instead of starting from scratch each time.",
  },
  {
    title: "Stay organised",
    description:
      "Build your own setup library so the configurations you rely on are always easy to find.",
  },
  {
    title: "Compare with confidence",
    description:
      "Check two setups side by side and see how changes affect pressure, flow, and overall performance.",
  },
  {
    title: "Share cleanly",
    description:
      "Export and share saved setups without rebuilding the same calculation again.",
  },
];

const faqItems = [
  {
    question: "Do I need Pro to use PressureCal?",
    answer:
      "No. The core calculator and setup modelling tools stay free.",
  },
  {
    question: "What does Pro add?",
    answer:
      "PressureCal Pro adds saved workflow features like saving setups, comparing setups, building your setup library, and exporting or sharing saved setups.",
  },
  {
    question: "Is the full calculator still free?",
    answer:
      "Yes. PressureCal keeps the main calculation tools free. Pro is about organisation, repeat use, and saved workflow.",
  },
  {
    question: "Who is Pro for?",
    answer:
      "Pro is for operators and regular users who want to come back to setups, compare results, and keep their most-used configurations organised.",
  },
  {
    question: "Can I start free?",
    answer:
      "Yes. You can use the free calculator first and upgrade when you want the extra workflow features.",
  },
];

export default function PressureCalProPage() {
  useEffect(() => {
    trackEvent("pricing_page_viewed", { page: "pricing" });
  }, []);

  return (
    <PressureCalLayout>
      <Helmet>
        <title>PressureCal Pro | Saved workflow for serious operators</title>
        <meta
          name="description"
          content="PressureCal Pro helps you save setups, compare results, build your setup library, and keep your most-used configurations organised."
        />
      </Helmet>

      <section className="-mx-4 border-b border-slate-200 bg-slate-950 px-4 text-white">
        <div className="mx-auto max-w-6xl py-16 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Go beyond one-off calculations
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              PressureCal Pro helps you save setups, compare results, build your
              setup library, and keep your most-used configurations organised.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#plans"
                onClick={() =>
                  trackEvent("pricing_view_plans_clicked", {
                    page: "pricing",
                    location: "hero",
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                View plans
              </a>

              <Link
                to={FREE_CALCULATOR_HREF}
                onClick={() =>
                  trackEvent("pricing_use_free_calculator_clicked", {
                    page: "pricing",
                    location: "hero",
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Use the free calculator
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              The core calculator stays free. Pro adds saved workflow,
              organisation, and repeat use.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built for operators who come back to setups
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal is useful from the first calculation. PressureCal Pro
              is for people who want to save time, stay organised, and reuse
              what works. It turns one-off calculations into a practical
              workflow you can come back to.
            </p>
          </div>
        </div>
      </section>

      <section id="plans" className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              What stays free, and what Pro adds
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal keeps the core calculator useful on its own. Pro adds
              the features that make repeated use faster, easier, and more
              organised.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-slate-950">
                PressureCal Free
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                For core calculations and setup modelling
              </p>
              <p className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
                Free
              </p>

              <ul className="mt-8 space-y-3 text-base leading-7 text-slate-700">
                {freeFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  to={FREE_CALCULATOR_HREF}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Use the free calculator
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white shadow-sm">
              <h3 className="text-2xl font-semibold">PressureCal Pro</h3>
              <p className="mt-2 text-sm font-medium text-slate-300">
                For saved workflow and repeat use
              </p>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <p className="text-4xl font-bold tracking-tight">$9.95</p>
                <p className="pb-1 text-sm text-slate-300">/ month</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">or $99 / year</p>

              <ul className="mt-8 space-y-3 text-base leading-7 text-slate-100">
                {proFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => startCheckout("monthly", "plans")}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Choose monthly
                </button>
                <button
                  type="button"
                  onClick={() => startCheckout("yearly", "plans")}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Choose yearly
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Why upgrade to Pro?
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {whyProCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-slate-950">
                  {card.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              What you get with PressureCal Pro
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">
                Save setups
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Save the setups you want to keep and come back to them later.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">
                Compare setups
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                See the difference between two configurations without rebuilding
                them from scratch.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">
                Setup library
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Build a practical library of the setups you use most.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">
                Export and share
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Create clean saved outputs you can reuse or send on.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">
              Pro is built to grow with the product
            </h3>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              PressureCal Pro is designed to grow into a stronger working tool
              over time, with more saved workflow and organisation features as
              the platform develops.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Pro is about workflow, not locked maths
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal is built to be useful from the start. The core
              calculator stays valuable on its own. PressureCal Pro is for the
              people who want to save setups, compare results, and build a more
              repeatable workflow around the tool.
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              That distinction matters. It keeps the free version genuinely
              useful while making Pro a clear upgrade for regular users.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Questions
            </h2>
          </div>

          <div className="mt-10 grid gap-5">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-slate-950">
                  {item.question}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start free. Upgrade when you’re ready.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Use PressureCal’s core calculator for free, then move to Pro when
              you want to save setups, compare results, and build your setup
              library.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={FREE_CALCULATOR_HREF}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Use the free calculator
            </Link>

            <button
              type="button"
              onClick={() => startCheckout("monthly", "footer")}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Start with PressureCal Pro
            </button>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
