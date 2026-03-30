import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please refresh and try again.`));
    }, timeoutMs);

    promise.then(
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

export default function PressureCalProPage() {
  const [checkoutState, setCheckoutState] = useState<"success" | "cancelled" | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<CheckoutPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("plans");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
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

    async function loadSession() {
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

        if (user?.email) {
          setCurrentEmail(user.email);
          setAuthState("signed_in");
        } else {
          setCurrentEmail(null);
          setAuthState("signed_out");
        }
      } catch {
        if (!mounted) {
          return;
        }

        setCurrentEmail(null);
        setAuthState("signed_out");
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (session?.user?.email) {
        setCurrentEmail(session.user.email);
        setAuthState("signed_in");
      } else {
        setCurrentEmail(null);
        setAuthState("signed_out");
      }
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

      const pending = getPendingCheckout();

      if (!pending) {
        params.delete("resumeCheckout");
        const nextSearch = params.toString();
        window.history.replaceState({}, "", nextSearch ? `/pricing?${nextSearch}` : "/pricing");
        return;
      }

      autoResumeHandledRef.current = true;
      clearPendingCheckout();
      setSelectedPlan(pending.plan);
      setSelectedLocation(pending.source);
      setSignInMessage(`Welcome back — your ${pending.plan} checkout is resuming now.`);
      setSignInError(null);
      setTransitionMessage("Taking you to secure checkout…");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user?.id || !user?.email) {
        setTransitionMessage(null);
        setSignInError("You are signed in, but your account details could not be read. Please try again.");
        return;
      }

      const paramsAfter = new URLSearchParams(window.location.search);
      paramsAfter.delete("resumeCheckout");
      const nextSearch = paramsAfter.toString();
      window.history.replaceState({}, "", nextSearch ? `/pricing?${nextSearch}` : "/pricing");

      await createCheckoutSession(pending.plan, "resume", user.id, user.email);
    }

    void maybeResumeCheckout();
  }, [authState]);

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
  }, [authState, currentEmail, selectedPlan]);

  const showCheckoutOverlay = Boolean(transitionMessage);

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
            <p className="mt-4 text-lg font-semibold">Taking you to secure checkout</p>
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

              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {authState === "signed_in" ? "Manage account" : "Account"}
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              The core calculator stays free. Pro adds saved workflow,
              organisation, and repeat use.
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
                  disabled={busyPlan !== null || signInBusy}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyPlan === "monthly" ? "Starting…" : "Choose monthly"}
                </button>

                <button
                  type="button"
                  onClick={() => startCheckout("yearly", "plans")}
                  disabled={busyPlan !== null || signInBusy}
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
                      disabled={signInBusy || !selectedPlan || busyPlan !== null}
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
              disabled={busyPlan !== null || signInBusy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyPlan === "monthly" ? "Starting…" : "Start with PressureCal Pro"}
            </button>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
