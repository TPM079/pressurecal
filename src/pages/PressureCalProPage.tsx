import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import PricingComparisonSectionPressureCal from "../components/PricingComparisonSectionPressureCal";
import { trackEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase-browser";
import {
  clearPendingCheckout,
  getPendingCheckout,
  savePendingCheckout,
  type CheckoutPlan,
} from "../lib/pendingCheckout";

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

type AuthState = "loading" | "signed_out" | "signed_in";
type SubscriptionState = "loading" | "none" | "active" | "non_active";

type SubscriptionSummary = {
  status: string | null;
  price_id: string | null;
  plan_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type SubscriptionQueryResult = {
  data: SubscriptionSummary[] | null;
  error: { message?: string } | null;
};

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please refresh and try again.`));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function rankStatus(status?: string | null) {
  switch (status) {
    case "active":
      return 0;
    case "trialing":
      return 1;
    case "past_due":
      return 2;
    case "unpaid":
      return 3;
    case "canceled":
      return 4;
    case "incomplete":
      return 5;
    case "incomplete_expired":
      return 6;
    default:
      return 99;
  }
}

function pickBestSubscription(rows: SubscriptionSummary[]): SubscriptionSummary | null {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort((a, b) => {
    const rankDiff = rankStatus(a.status) - rankStatus(b.status);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    const endA = a.current_period_end ? new Date(a.current_period_end).getTime() : 0;
    const endB = b.current_period_end ? new Date(b.current_period_end).getTime() : 0;

    return endB - endA;
  })[0];
}

export default function PressureCalProPage() {
  const [checkoutState, setCheckoutState] = useState<"success" | "cancelled" | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading");
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<CheckoutPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("plans");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [signInMessage, setSignInMessage] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const signInCardRef = useRef<HTMLDivElement | null>(null);
  const autoResumeHandledRef = useRef(false);

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

  useEffect(() => {
    let mounted = true;

    async function loadSessionAndSubscription() {
      try {
        const sessionResponse = await withTimeout(
          supabase.auth.getSession(),
          4000,
          "Checking sign-in status"
        );

        if (!mounted) {
          return;
        }

        const user = sessionResponse.data.session?.user;

        if (!user?.id || !user?.email) {
          setCurrentUserId(null);
          setCurrentEmail(null);
          setSubscription(null);
          setAuthState("signed_out");
          setSubscriptionState("none");
          return;
        }

        setCurrentUserId(user.id);
        setCurrentEmail(user.email);
        setAuthState("signed_in");
        setSubscriptionState("loading");

        const subscriptionRequest = supabase
          .from("subscriptions")
          .select("status, price_id, plan_interval, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .then((result) => result as SubscriptionQueryResult);

        const { data, error } = await withTimeout(
          subscriptionRequest,
          5000,
          "Checking subscription status"
        );

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(error);
          setSubscription(null);
          setSubscriptionState("none");
          return;
        }

        const best = pickBestSubscription(data ?? []);
        setSubscription(best);

        if (!best) {
          setSubscriptionState("none");
          return;
        }

        setSubscriptionState(best.status === "active" ? "active" : "non_active");
      } catch (error) {
        console.error(error);

        if (!mounted) {
          return;
        }

        setCurrentUserId(null);
        setCurrentEmail(null);
        setSubscription(null);
        setAuthState("signed_out");
        setSubscriptionState("none");
      }
    }

    void loadSessionAndSubscription();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadSessionAndSubscription();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function maybeResumeCheckout() {
      const params = new URLSearchParams(window.location.search);
      const shouldResume = params.get("resumeCheckout") === "1";

      if (!shouldResume || authState !== "signed_in" || autoResumeHandledRef.current) {
        return;
      }

      if (subscriptionState === "active") {
        autoResumeHandledRef.current = true;
        clearPendingCheckout();
        params.delete("resumeCheckout");
        const nextSearch = params.toString();
        window.history.replaceState({}, "", nextSearch ? `/pricing?${nextSearch}` : "/pricing");
        return;
      }

      const pending = getPendingCheckout();

      if (!pending) {
        params.delete("resumeCheckout");
        const nextSearch = params.toString();
        window.history.replaceState({}, "", nextSearch ? `/pricing?${nextSearch}` : "/pricing");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user?.id || !user?.email) {
        return;
      }

      autoResumeHandledRef.current = true;
      clearPendingCheckout();
      setSelectedPlan(pending.plan);
      setSelectedLocation(pending.source);
      setSignInMessage(`Welcome back — your ${pending.plan} checkout is resuming now.`);
      setSignInError(null);
      setTransitionMessage("Taking you to secure checkout…");

      const paramsAfter = new URLSearchParams(window.location.search);
      paramsAfter.delete("resumeCheckout");
      const nextSearch = paramsAfter.toString();
      window.history.replaceState({}, "", nextSearch ? `/pricing?${nextSearch}` : "/pricing");

      await createCheckoutSession(pending.plan, "resume", user.id, user.email);
    }

    void maybeResumeCheckout();
  }, [authState, subscriptionState]);

  async function createCheckoutSession(
    plan: CheckoutPlan,
    location: string,
    userId: string,
    email: string
  ) {
    setBusyPlan(plan);
    setTransitionMessage(
      location === "resume"
        ? "Taking you back to secure checkout…"
        : `Starting secure ${plan} checkout…`
    );

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          userId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }

      clearPendingCheckout();
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      const text =
        error instanceof Error ? error.message : "Sorry, checkout could not be started right now.";
      setSignInError(text);
      setTransitionMessage(null);
    } finally {
      setBusyPlan(null);
    }
  }

  async function openCustomerPortal() {
    if (!currentUserId) {
      setSignInError("Please sign in first.");
      return;
    }

    setPortalBusy(true);
    setSignInError(null);
    setTransitionMessage("Opening your subscription settings…");

    try {
      const response = await fetch("/api/create-customer-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to open customer portal");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      const text =
        error instanceof Error ? error.message : "Unable to open subscription settings right now.";
      setSignInError(text);
      setTransitionMessage(null);
    } finally {
      setPortalBusy(false);
    }
  }

  function promptInlineSignIn(plan: CheckoutPlan, location: string) {
    setSelectedPlan(plan);
    setSelectedLocation(location);
    setSignInMessage(null);
    setSignInError(null);
    setTransitionMessage(null);
    savePendingCheckout(plan, location, "/pricing?resumeCheckout=1");

    window.setTimeout(() => {
      signInCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  async function startCheckout(plan: CheckoutPlan, location: string) {
    trackEvent(
      plan === "monthly"
        ? "pricing_choose_monthly_clicked"
        : "pricing_choose_yearly_clicked",
      {
        page: "pricing",
        location,
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user?.id || !user?.email) {
      promptInlineSignIn(plan, location);
      return;
    }

    if (subscriptionState === "active") {
      setSignInMessage("You already have PressureCal Pro.");
      return;
    }

    setSignInMessage(null);
    setSignInError(null);
    setSelectedPlan(plan);
    setSelectedLocation(location);

    await createCheckoutSession(plan, location, user.id, user.email);
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInBusy(true);
    setSignInMessage(null);
    setSignInError(null);

    try {
      const cleanedEmail = signInEmail.trim().toLowerCase();

      if (!cleanedEmail) {
        throw new Error("Enter your email address first.");
      }

      if (!selectedPlan) {
        throw new Error("Choose a plan first so checkout can continue automatically after sign-in.");
      }

      savePendingCheckout(selectedPlan, selectedLocation, "/pricing?resumeCheckout=1");

      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: cleanedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/pricing?resumeCheckout=1`,
          },
        }),
        8000,
        "Sending magic link"
      );

      if (error) {
        throw error;
      }

      setSignInMessage(
        `Magic link sent. Check your email and click the link — your ${selectedPlan} checkout will continue automatically when you come back.`
      );
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to send the sign-in link right now.";
      setSignInError(text);
    } finally {
      setSignInBusy(false);
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

  const authBanner = useMemo(() => {
    if (authState === "loading") {
      return {
        cls: "border-slate-200 bg-slate-50 text-slate-700",
        title: "Checking sign-in status",
        body: "Just a moment…",
      };
    }

    if (subscriptionState === "active" && currentEmail) {
      return {
        cls: "border-green-200 bg-green-50 text-green-900",
        title: "You already have PressureCal Pro",
        body: `Signed in as ${currentEmail}. You can open your Pro tools or manage billing below.`,
      };
    }

    if (authState === "signed_in" && currentEmail) {
      return {
        cls: "border-green-200 bg-green-50 text-green-900",
        title: "Signed in",
        body: `Signed in as ${currentEmail}. Your checkout can continue here without leaving the page.`,
      };
    }

    if (selectedPlan) {
      return {
        cls: "border-amber-200 bg-amber-50 text-amber-900",
        title: `Continue with ${selectedPlan === "monthly" ? "Monthly" : "Yearly"} Pro`,
        body: "Sign in below and we will continue straight to secure checkout after you click the magic link.",
      };
    }

    return {
      cls: "border-slate-200 bg-slate-50 text-slate-700",
      title: "Choose a plan",
      body: "If you are not signed in yet, we will ask for your email and continue to checkout automatically after sign-in.",
    };
  }, [authState, subscriptionState, currentEmail, selectedPlan]);

  const showCheckoutOverlay = Boolean(transitionMessage);
  const alreadyPro = subscriptionState === "active";

  return (
    <PressureCalLayout>
      <Helmet>
        <title>PressureCal Pro | Saved workflow for serious operators</title>
        <meta
          name="description"
          content="PressureCal Pro helps you save setups, compare results, build your setup library, and keep your most-used configurations organised."
        />
      </Helmet>

      {showCheckoutOverlay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 px-6 py-6 text-center text-white shadow-2xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
            <p className="mt-4 text-lg font-semibold">
              {portalBusy ? "Opening subscription settings" : "Taking you to secure checkout"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{transitionMessage}</p>
          </div>
        </div>
      ) : null}

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

            <div className={`mt-6 rounded-2xl border px-4 py-4 sm:px-5 ${authBanner.cls}`}>
              <p className="text-sm font-semibold">{authBanner.title}</p>
              <p className="mt-1 text-sm leading-6">{authBanner.body}</p>
            </div>

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

              {alreadyPro ? (
                <button
                  type="button"
                  onClick={openCustomerPortal}
                  disabled={portalBusy}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalBusy ? "Opening billing…" : "Manage subscription"}
                </button>
              ) : (
                <Link
                  to="/account"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {authState === "signed_in" ? "Manage account" : "Account"}
                </Link>
              )}
            </div>

            <p className="mt-4 text-sm text-slate-400">
              The core calculator stays free. Pro adds saved workflow,
              organisation, and repeat use.
            </p>
          </div>
        </div>
      </section>

      <PricingComparisonSectionPressureCal
        alreadyPro={alreadyPro}
        freeCalculatorHref={FREE_CALCULATOR_HREF}
        proHref={alreadyPro ? "/saved-setups" : "#plans"}
        freeSaveSetupsLabel="—"
      />

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
              {alreadyPro ? (
                <>
                  <h3 className="text-2xl font-semibold">You already have PressureCal Pro</h3>
                  <p className="mt-2 text-sm font-medium text-slate-300">
                    Your Pro tools are ready to use
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-200">
                    <p className="font-semibold text-white">Current access</p>
                    <p className="mt-2">
                      Status: <span className="font-medium uppercase">{subscription?.status ?? "unknown"}</span>
                    </p>
                    {subscription?.plan_interval ? (
                      <p className="mt-1">
                        Billing interval:{" "}
                        <span className="font-medium capitalize">{subscription.plan_interval}</span>
                      </p>
                    ) : null}
                    {subscription?.current_period_end ? (
                      <p className="mt-1">
                        Current period end:{" "}
                        <span className="font-medium">
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/saved-setups"
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      Open Saved Setups
                    </Link>

                    <button
                      type="button"
                      onClick={openCustomerPortal}
                      disabled={portalBusy}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {portalBusy ? "Opening billing…" : "Manage Subscription"}
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                      disabled={busyPlan !== null || signInBusy || portalBusy}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyPlan === "monthly" ? "Starting…" : "Choose monthly"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startCheckout("yearly", "plans")}
                      disabled={busyPlan !== null || signInBusy || portalBusy}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyPlan === "yearly" ? "Starting…" : "Choose yearly"}
                    </button>
                  </div>

                  {authState !== "signed_in" ? (
                    <div
                      ref={signInCardRef}
                      className="mt-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-sm text-slate-200"
                    >
                      <p className="font-semibold text-white">
                        {selectedPlan
                          ? `Continue with ${selectedPlan === "monthly" ? "Monthly" : "Yearly"} Pro`
                          : "Choose a plan to continue"}
                      </p>
                      <p className="mt-2 text-slate-300">
                        Enter your email and we will send you a magic link. After you sign in, checkout will continue automatically.
                      </p>

                      <form onSubmit={sendMagicLink} className="mt-4">
                        <label className="block text-sm font-medium text-slate-200" htmlFor="pricing-signin-email">
                          Email address
                        </label>
                        <input
                          id="pricing-signin-email"
                          type="email"
                          autoComplete="email"
                          value={signInEmail}
                          onChange={(event) => setSignInEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="mt-2 w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-white"
                        />

                        <button
                          type="submit"
                          disabled={signInBusy || !selectedPlan || busyPlan !== null || portalBusy}
                          className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {signInBusy ? "Sending magic link…" : "Continue with email"}
                        </button>
                      </form>

                      {signInMessage ? (
                        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
                          {signInMessage}
                        </div>
                      ) : null}

                      {signInError ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                          {signInError}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-200">
                      You are signed in, so choosing a plan now will take you straight to secure checkout.
                    </div>
                  )}
                </>
              )}
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

            {alreadyPro ? (
              <button
                type="button"
                onClick={openCustomerPortal}
                disabled={portalBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalBusy ? "Opening billing…" : "Manage Subscription"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCheckout("monthly", "footer")}
                disabled={busyPlan !== null || signInBusy || portalBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyPlan === "monthly" ? "Starting…" : "Start with PressureCal Pro"}
              </button>
            )}
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
