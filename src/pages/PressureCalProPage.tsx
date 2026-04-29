import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import PricingComparisonSectionPressureCal from "../components/PricingComparisonSectionPressureCal";
import PayPalSubscribeButton from "../components/PayPalSubscribeButton";
import {
  trackEvent,
  trackPurchase,
  type PressureCalPurchasePayload,
} from "../lib/analytics";
import { supabase } from "../lib/supabase-browser";
import {
  clearPendingCheckout,
  getPendingCheckout,
  savePendingCheckout,
  type CheckoutPlan,
} from "../lib/pendingCheckout";

const FREE_CALCULATOR_HREF = "/calculator";
const VERIFIED_PURCHASE_STORAGE_KEY = "pressurecal_verified_purchase";
const TRACKED_PURCHASE_IDS_STORAGE_KEY = "pressurecal_tracked_purchase_ids";

function readTrackedPurchaseIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(TRACKED_PURCHASE_IDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function hasTrackedPurchase(transactionId: string) {
  return readTrackedPurchaseIds().includes(transactionId);
}

function markPurchaseTracked(transactionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const next = Array.from(new Set([...readTrackedPurchaseIds(), transactionId])).slice(-20);
  window.sessionStorage.setItem(TRACKED_PURCHASE_IDS_STORAGE_KEY, JSON.stringify(next));
}

function saveVerifiedPurchase(purchase: PressureCalPurchasePayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(VERIFIED_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
}

function readVerifiedPurchase(): PressureCalPurchasePayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(VERIFIED_PURCHASE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PressureCalPurchasePayload | null;

    if (!parsed?.transactionId || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearVerifiedPurchase() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(VERIFIED_PURCHASE_STORAGE_KEY);
}


const freeFeatures = [
  "Full setup calculator",
  "Nozzle size calculator",
  "Hose pressure loss calculator",
  "PSI ↔ BAR converter",
  "LPM ↔ GPM converter",
  "Nozzle size chart",
];

const proFeatures = [
  "Save setups you already trust",
  "Compare changes before you swap parts",
  "Keep your repeat-job setups organised",
  "Share proven setups with the team",
  "Professional PDF setup reports coming soon",
];

type AuthState = "loading" | "signed_out" | "signed_in";
type SubscriptionState = "loading" | "none" | "active" | "non_active";

type BillingProvider = "stripe" | "paypal" | "unknown";

type SubscriptionSummary = {
  status: string | null;
  provider: string | null;
  stripe_subscription_id: string | null;
  paypal_subscription_id: string | null;
  provider_subscription_id: string | null;
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

    if (endA !== endB) {
      return endB - endA;
    }

    // If there are two active rows from testing, prefer the PayPal row when dates tie.
    if (getBillingProvider(a) === "paypal" && getBillingProvider(b) !== "paypal") {
      return -1;
    }

    if (getBillingProvider(b) === "paypal" && getBillingProvider(a) !== "paypal") {
      return 1;
    }

    return 0;
  })[0];
}

function getBillingProvider(subscription?: SubscriptionSummary | null): BillingProvider {
  if (!subscription) {
    return "unknown";
  }

  const provider = subscription.provider?.toLowerCase();

  if (provider === "paypal" || subscription.paypal_subscription_id) {
    return "paypal";
  }

  if (provider === "stripe" || subscription.stripe_subscription_id || subscription.price_id) {
    return "stripe";
  }

  return "unknown";
}

function formatBillingProvider(provider: BillingProvider) {
  switch (provider) {
    case "paypal":
      return "PayPal";
    case "stripe":
      return "Stripe";
    default:
      return "Unknown";
  }
}

export default function PressureCalProPage() {
  const [checkoutState, setCheckoutState] = useState<"success" | "cancelled" | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading");
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<CheckoutPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>("monthly");
  const [selectedLocation, setSelectedLocation] = useState<string>("plans");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [signInMessage, setSignInMessage] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const signInCardRef = useRef<HTMLDivElement | null>(null);
  const autoResumeHandledRef = useRef(false);
  const purchaseVerificationHandledRef = useRef<string | null>(null);

  useEffect(() => {
    trackEvent("pricing_page_viewed", { page: "pricing" });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");

    if (checkout === "cancelled") {
      clearVerifiedPurchase();
    }

    if (checkout === "success" || checkout === "cancelled") {
      setCheckoutState(checkout);
    } else {
      setCheckoutState(null);
    }
  }, []);

  useEffect(() => {
    if (checkoutState !== "success") {
      return;
    }

    let cancelled = false;

    async function verifySuccessfulCheckout() {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get("provider");
      const sessionId = params.get("session_id");
      const storedPurchase = readVerifiedPurchase();

      if (sessionId) {
        if (purchaseVerificationHandledRef.current === sessionId) {
          return;
        }

        purchaseVerificationHandledRef.current = sessionId;

        try {
          const response = await fetch("/api/verify-stripe-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.purchase) {
            throw new Error(result.error || "Unable to verify Stripe purchase.");
          }

          if (cancelled) {
            return;
          }

          const purchase = result.purchase as PressureCalPurchasePayload;

          if (!hasTrackedPurchase(purchase.transactionId)) {
            trackPurchase(purchase);
            markPurchaseTracked(purchase.transactionId);
          }

          clearVerifiedPurchase();
        } catch (error) {
          console.error(error);
        }

        return;
      }

      if (provider === "paypal" && storedPurchase) {
        if (!hasTrackedPurchase(storedPurchase.transactionId)) {
          trackPurchase(storedPurchase);
          markPurchaseTracked(storedPurchase.transactionId);
        }

        clearVerifiedPurchase();
      }
    }

    void verifySuccessfulCheckout();

    return () => {
      cancelled = true;
    };
  }, [checkoutState]);

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
          .select("status, provider, stripe_subscription_id, paypal_subscription_id, provider_subscription_id, price_id, plan_interval, current_period_end, cancel_at_period_end")
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

  function openSubscriptionSettings() {
    const provider = getBillingProvider(subscription);

    if (provider === "paypal") {
      setSignInError(null);
      setTransitionMessage(null);
      setSignInMessage(
        "Opening PayPal. Manage or cancel PressureCal Pro under PayPal Automatic Payments."
      );
      window.location.href = "https://www.paypal.com/myaccount/autopay/";
      return;
    }

    void openCustomerPortal();
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

  async function startPayPalCheckout(plan: CheckoutPlan, location: string) {
    trackEvent(
      plan === "monthly" ? "pricing_choose_monthly_clicked" : "pricing_choose_yearly_clicked",
      {
        page: "pricing",
        location: `${location}_paypal`,
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user?.id || !user?.email) {
      promptInlineSignIn(plan, location);
      setSignInMessage("Sign in first, then choose PayPal checkout again.");
      return null;
    }

    if (subscriptionState === "active") {
      setSignInMessage("You already have PressureCal Pro.");
      return null;
    }

    setSelectedPlan(plan);
    setSelectedLocation(location);
    setSignInMessage(null);
    setSignInError(null);

    return {
      userId: user.id,
      email: user.email,
    };
  }

  function handlePayPalApproved(purchase?: PressureCalPurchasePayload) {
    clearPendingCheckout();
    setTransitionMessage(null);
    setSignInError(null);
    setSignInMessage("PayPal subscription confirmed. Refreshing your Pro access…");

    if (purchase) {
      saveVerifiedPurchase(purchase);
    }

    const purchaseRef = purchase?.transactionId
      ? `&purchase_ref=${encodeURIComponent(purchase.transactionId)}`
      : "";

    window.setTimeout(() => {
      window.location.href = `/pricing?checkout=success&provider=paypal${purchaseRef}`;
    }, 1200);
  }

  function handlePayPalError(message: string) {
    setTransitionMessage(null);
    setSignInError(message);
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
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
        body: "Sign in below and checkout will continue after the magic link.",
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
  const activeCheckoutPlan: CheckoutPlan = selectedPlan ?? "monthly";
  const activePlanLabel = activeCheckoutPlan === "yearly" ? "Yearly" : "Monthly";
  const activePlanPrice = activeCheckoutPlan === "yearly" ? "$99.95" : "$9.95";
  const activePlanPeriod = activeCheckoutPlan === "yearly" ? "/ year" : "/ month";
  const activePlanSupportingCopy =
    activeCheckoutPlan === "yearly"
      ? "Best value — around 27¢/day billed annually."
      : "Switch to yearly for $99.95/year — around 27¢/day.";
  const billingProvider = getBillingProvider(subscription);
  const subscriptionSettingsLabel =
    billingProvider === "paypal" ? "Manage in PayPal" : "Manage Subscription";
  const subscriptionSettingsBusyLabel =
    billingProvider === "paypal" ? "Opening PayPal…" : "Opening billing…";

  return (
    <PressureCalLayout>
      <Helmet>
        <title>PressureCal Pro | Stop working out the same setup over and over</title>
        <meta
          name="description"
          content="PressureCal Pro helps operators save known-good setups, compare changes, and keep repeat-job setups organised."
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
        <div className="mx-auto max-w-6xl py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Stop working out the same setup over and over
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-xl sm:leading-8">
              <span className="sm:hidden">
                Save known-good setups, compare changes, and keep repeat-job work organised.
              </span>
              <span className="hidden sm:inline">
                PressureCal Pro helps you save known-good setups, compare changes, and keep your repeat-job setups organised.
              </span>
            </p>

            <div className={`mt-6 hidden rounded-2xl border px-4 py-4 sm:block sm:px-5 ${authBanner.cls}`}>
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
                Use Free Calculator
              </Link>

              {alreadyPro ? (
                <button
                  type="button"
                  onClick={openSubscriptionSettings}
                  disabled={portalBusy}
                  className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalBusy ? subscriptionSettingsBusyLabel : subscriptionSettingsLabel}
                </button>
              ) : (
                <Link
                  to="/account"
                  className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {authState === "signed_in" ? "Manage account" : "Account"}
                </Link>
              )}
            </div>

            <p className="mt-4 text-sm text-slate-400">
              The core calculator stays free. Pro adds saved setups, comparisons, and repeat-job workflow.
            </p>
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <PricingComparisonSectionPressureCal
          alreadyPro={alreadyPro}
          freeCalculatorHref={FREE_CALCULATOR_HREF}
          proHref={alreadyPro ? "/saved-setups" : "#plans"}
          freeSaveSetupsLabel="—"
        />
      </div>

      <section id="plans" className="scroll-mt-28 border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              What stays free, and what Pro adds
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              PressureCal keeps the core calculator useful on its own. Pro adds the features that make repeat-job setup work faster, easier, and more organised.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-2xl font-semibold text-slate-950">
                PressureCal Free
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                For one-off setup checks and everyday calculator use
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
                  Use Free Calculator
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
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
                    <p className="mt-1">
                      Billing provider: <span className="font-medium">{formatBillingProvider(billingProvider)}</span>
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
                      onClick={openSubscriptionSettings}
                      disabled={portalBusy}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {portalBusy ? subscriptionSettingsBusyLabel : subscriptionSettingsLabel}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-semibold">PressureCal Pro</h3>
                  <p className="mt-2 text-sm font-medium text-slate-300">
                    For repeat-job setups and saved workflow
                  </p>

                  <div className="mt-6 flex flex-wrap items-end gap-3">
                    <p className="text-4xl font-bold tracking-tight">{activePlanPrice}</p>
                    <p className="pb-1 text-sm text-slate-300">{activePlanPeriod}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-300">{activePlanSupportingCopy}</p>
                    {activeCheckoutPlan === "yearly" ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-200">
                        Best value
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-8 space-y-3 text-base leading-7 text-slate-100">
                    {proFeatures.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>

                  <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-sm text-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      1. Choose billing
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan("monthly");
                          setSelectedLocation("plans");
                          setSignInError(null);
                          setSignInMessage(null);
                        }}
                        className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          activeCheckoutPlan === "monthly"
                            ? "bg-white text-slate-950"
                            : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        Monthly
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan("yearly");
                          setSelectedLocation("plans");
                          setSignInError(null);
                          setSignInMessage(null);
                        }}
                        className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          activeCheckoutPlan === "yearly"
                            ? "bg-white text-slate-950"
                            : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        Yearly <span className="ml-2 text-xs opacity-80">Best value</span>
                      </button>
                    </div>
                  </div>

                  {authState !== "signed_in" ? (
                    <div
                      ref={signInCardRef}
                      className="mt-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-200 sm:py-5"
                    >
                      <p className="font-semibold text-white">
                        Continue with {activePlanLabel} Pro
                      </p>
                      <p className="mt-2 text-slate-300">
                      Enter your email for a sign-in link. Checkout continues after sign-in.
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
                          disabled={signInBusy || busyPlan !== null || portalBusy}
                          className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {signInBusy ? "Sending magic link…" : "Continue with email"}
                        </button>
                      </form>

                      <p className="mt-3 text-xs leading-5 text-slate-400">
                        Card checkout is processed by Stripe. PayPal checkout is available after sign-in.
                      </p>

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
                    <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-sm text-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        2. Choose payment method
                      </p>
                      <p className="mt-2 text-white">
                        {activePlanLabel} Pro — {activePlanPrice} {activePlanPeriod}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => startCheckout(activeCheckoutPlan, "plans")}
                          disabled={busyPlan !== null || signInBusy || portalBusy}
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyPlan === activeCheckoutPlan ? "Starting…" : "Pay by card"}
                        </button>

                        <PayPalCheckoutSlot
                          key={activeCheckoutPlan}
                          plan={activeCheckoutPlan}
                          location="plans"
                          busyPlan={busyPlan}
                          signInBusy={signInBusy}
                          portalBusy={portalBusy}
                          startPayPalCheckout={startPayPalCheckout}
                          handlePayPalApproved={handlePayPalApproved}
                          handlePayPalError={handlePayPalError}
                        />
                      </div>

                      <p className="mt-4 text-xs leading-5 text-slate-400">
                        Card checkout is processed securely by Stripe. PayPal checkout is processed securely by PayPal.
                      </p>

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
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="hidden md:block bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stay free for one-off checks. Upgrade when it becomes part of your workflow.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Use PressureCal’s core calculator for free, then move to Pro when you want to save setups, compare changes, and keep repeat-job setups organised.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={FREE_CALCULATOR_HREF}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Use Free Calculator
            </Link>

            {alreadyPro ? (
              <button
                type="button"
                onClick={openSubscriptionSettings}
                disabled={portalBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalBusy ? subscriptionSettingsBusyLabel : subscriptionSettingsLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCheckout("monthly", "footer")}
                disabled={busyPlan !== null || signInBusy || portalBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyPlan === "monthly" ? "Starting…" : "Start PressureCal Pro"}
              </button>
            )}
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}

type PayPalCheckoutSlotProps = {
  plan: CheckoutPlan;
  location: string;
  busyPlan: CheckoutPlan | null;
  signInBusy: boolean;
  portalBusy: boolean;
  startPayPalCheckout: (
    plan: CheckoutPlan,
    location: string
  ) => Promise<{ userId: string; email: string } | null>;
  handlePayPalApproved: (purchase?: PressureCalPurchasePayload) => void;
  handlePayPalError: (message: string) => void;
};

function PayPalCheckoutSlot({
  plan,
  location,
  busyPlan,
  signInBusy,
  portalBusy,
  startPayPalCheckout,
  handlePayPalApproved,
  handlePayPalError,
}: PayPalCheckoutSlotProps) {
  const [buyer, setBuyer] = useState<{ userId: string; email: string } | null>(null);
  const disabled = busyPlan !== null || signInBusy || portalBusy;

  useEffect(() => {
    setBuyer(null);
  }, [plan]);

  async function preparePayPal() {
    const result = await startPayPalCheckout(plan, location);
    setBuyer(result);
  }

  if (!buyer) {
    return (
      <button
        type="button"
        onClick={preparePayPal}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Pay with PayPal
      </button>
    );
  }

  return (
    <PayPalSubscribeButton
      plan={plan}
      userId={buyer.userId}
      email={buyer.email}
      disabled={disabled}
      onStarted={() => {
        // Keep the checkout overlay off so the PayPal modal can render normally.
      }}
      onApproved={handlePayPalApproved}
      onError={handlePayPalError}
    />
  );
}
