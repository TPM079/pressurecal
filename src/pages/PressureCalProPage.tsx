import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import { trackEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase-browser";

const FREE_CALCULATOR_HREF = "/calculator";

type CheckoutState = "success" | "cancelled" | null;
type CheckoutPlan = "monthly" | "yearly";

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

export default function PressureCalProPage() {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutPlan | null>(null);

  useEffect(() => {
    trackEvent("pricing_page_viewed", { page: "pricing" });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");

    if (checkout === "success" || checkout === "cancelled") {
      setCheckoutState(checkout);
    } else {
      setCheckoutState(null);
    }
  }, []);

  async function startCheckout(plan: CheckoutPlan, location: string) {
    if (checkoutLoading) {
      return;
    }

    trackEvent(
      plan === "monthly"
        ? "pricing_choose_monthly_clicked"
        : "pricing_choose_yearly_clicked",
      {
        page: "pricing",
        location,
      }
    );

    setCheckoutLoading(plan);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message || "Unable to verify your account");
      }

      if (!user) {
        window.alert("Please sign in before starting PressureCal Pro checkout.");
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          userId: user.id,
          email: user.email ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      window.alert("Sorry, checkout could not be started right now.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  const checkoutBanner = useMemo(() => {
    if (checkoutState === "success") {
      return {
        cls: "border-green-200 bg-green-50 text-green-900",
        title: "Subscription confirmed",
        body: "Your subscription was created successfully. You can now move on to the next Pro setup steps.",
      };
    }

    if (checkoutState === "cancelled") {
      return {
        cls: "border-slate-200 bg-slate-50 text-slate-700",
        title: "Checkout cancelled",
        body: "No problem — your checkout was cancelled and you can try again any time.",
      };
    }

    return null;
  }, [checkoutState]);

  const monthlyLoading = checkoutLoading === "monthly";
  const yearlyLoading = checkoutLoading === "yearly";
  const anyCheckoutLoading = checkoutLoading !== null;

  return (
    <PressureCalLayout>
      <Helmet>
        <title>PressureCal Pro | Saved workflow for serious operators</title>
        <meta
          name="description"
          content="PressureCal Pro helps you save setups, compare results, build your setup library, and keep your most-used configurations organised."
        />
      </Helmet>

      {checkoutBanner ? (
        <section className="-mx-4 border-b border-slate-200 bg-white px-4">
          <div className="mx-auto max-w-6xl py-4">
            <div className={`rounded-2xl border px-4 py-4 sm:px-5 ${checkoutBanner.cls}`}>
              <p className="text-sm font-semibold">{checkoutBanner.title}</p>
              <p className="mt-1 text-sm leading-6">{checkoutBanner.body}</p>
            </div>
          </div>
        </section>
      ) : null}

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
            <p className="mt-2 text-sm text-slate-400">
              Sign in before starting checkout so your Pro access can be linked
              to your account.
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
                  disabled={anyCheckoutLoading}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {monthlyLoading ? "Starting monthly..." : "Choose monthly"}
                </button>

                <button
                  type="button"
                  onClick={() => startCheckout("yearly", "plans")}
                  disabled={anyCheckoutLoading}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {yearlyLoading ? "Starting yearly..." : "Choose yearly"}
                </button>
              </div>
            </div>
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
              disabled={anyCheckoutLoading}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {monthlyLoading ? "Starting monthly..." : "Start with PressureCal Pro"}
            </button>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
