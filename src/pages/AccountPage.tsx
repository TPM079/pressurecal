import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import { supabase } from "../lib/supabase-browser";
import {
  clearPendingCheckout,
  getPendingCheckout,
  savePendingCheckout,
  type CheckoutPlan,
} from "../lib/pendingCheckout";
import {
  sendPasswordReset,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from "../lib/supabasePasswordAuth";

type ViewState = "loading" | "signed_out" | "signed_in";
type AuthMode = "login" | "signup" | "forgot";
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

type CountQueryResult = {
  count: number | null;
  error: { message?: string } | null;
};

type WorkspaceCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  badge?: string;
};

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
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

function getRequestedPlanFromUrl(): CheckoutPlan | null {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");

  return plan === "monthly" || plan === "yearly" ? plan : null;
}

function getRequestedNextPathFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("next");
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

function pickBestSubscription(rows: SubscriptionSummary[]) {
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

function formatBillingCycle(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "month" || normalized === "monthly") {
    return "Monthly";
  }

  if (normalized === "year" || normalized === "yearly" || normalized === "annual") {
    return "Yearly";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status?: string | null) {
  if (!status) {
    return "No subscription";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

function WorkspaceLinkCard({ card }: { card: WorkspaceCard }) {
  return (
    <Link
      to={card.href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{card.title}</h3>
        {card.badge ? (
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
            {card.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
      <p className="mt-5 text-sm font-semibold text-slate-950 group-hover:text-blue-800">
        {card.cta} →
      </p>
    </Link>
  );
}

export default function AccountPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading");
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [savedSetupCount, setSavedSetupCount] = useState<number | null>(null);
  const [equipmentItemCount, setEquipmentItemCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<CheckoutPlan | null>(null);
  const [pendingResumePath, setPendingResumePath] = useState<string | null>(null);

  useEffect(() => {
    const requestedPlan = getRequestedPlanFromUrl();
    const requestedNext = getRequestedNextPathFromUrl();

    if (requestedPlan) {
      const resumePath = requestedNext || "/pricing?resumeCheckout=1";
      savePendingCheckout(requestedPlan, "account", resumePath);
    }

    const pending = getPendingCheckout();
    setPendingPlan(pending?.plan ?? requestedPlan ?? null);
    setPendingResumePath(pending?.resumePath ?? requestedNext ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      try {
        const sessionResponse = await withTimeout(
          supabase.auth.getSession(),
          4000,
          "Checking your session"
        );

        if (!mounted) return;

        const user = sessionResponse.data.session?.user;

        if (!user?.id || !user.email) {
          setCurrentEmail(null);
          setSubscription(null);
          setSubscriptionState("none");
          setSavedSetupCount(null);
          setEquipmentItemCount(null);
          setViewState("signed_out");
          return;
        }

        setCurrentEmail(user.email);
        setViewState("signed_in");
        setSubscriptionState("loading");
        setErrorMessage(null);

        const subscriptionRequest = supabase
          .from("subscriptions")
          .select(
            "status, provider, stripe_subscription_id, paypal_subscription_id, provider_subscription_id, price_id, plan_interval, current_period_end, cancel_at_period_end"
          )
          .eq("user_id", user.id)
          .then((result) => result as SubscriptionQueryResult);

        const { data, error } = await withTimeout(
          subscriptionRequest,
          5000,
          "Checking subscription status"
        );

        if (!mounted) return;

        if (error) {
          setSubscription(null);
          setSubscriptionState("none");
        } else {
          const best = pickBestSubscription(data ?? []);
          setSubscription(best);
          setSubscriptionState(best?.status === "active" ? "active" : best ? "non_active" : "none");
        }

        const savedSetupRequest = supabase
          .from("saved_setups")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then((result) => result as CountQueryResult);

        const equipmentRequest = supabase
          .from("equipment_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then((result) => result as CountQueryResult);

        const [savedSetups, equipmentItems] = await Promise.allSettled([
          withTimeout(savedSetupRequest, 4000, "Checking saved setups"),
          withTimeout(equipmentRequest, 4000, "Checking equipment library"),
        ]);

        if (!mounted) return;

        setSavedSetupCount(
          savedSetups.status === "fulfilled" && !savedSetups.value.error
            ? savedSetups.value.count ?? 0
            : null
        );

        setEquipmentItemCount(
          equipmentItems.status === "fulfilled" && !equipmentItems.value.error
            ? equipmentItems.value.count ?? 0
            : null
        );
      } catch (error) {
        if (!mounted) return;

        const text =
          error instanceof Error
            ? error.message
            : "Unable to check your session right now.";

        setCurrentEmail(null);
        setSubscription(null);
        setSubscriptionState("none");
        setSavedSetupCount(null);
        setEquipmentItemCount(null);
        setViewState("signed_out");
        setErrorMessage(text);
      }
    }

    void loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      void loadAccount();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const cleanedEmail = email.trim().toLowerCase();

      if (!cleanedEmail) {
        throw new Error("Enter your email address first.");
      }

      if (authMode === "login") {
        if (!password) {
          throw new Error("Enter your password.");
        }

        const { error } = await withTimeout(
          signInWithEmailPassword(cleanedEmail, password),
          8000,
          "Signing in"
        );

        if (error) {
          throw error;
        }

        setPassword("");
        return;
      }

      if (authMode === "signup") {
        if (!password) {
          throw new Error("Enter a password.");
        }

        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const { error } = await withTimeout(
          signUpWithEmailPassword(cleanedEmail, password),
          8000,
          "Creating account"
        );

        if (error) {
          throw error;
        }

        setMessage(
          pendingPlan
            ? `Account created. Check your email if confirmation is required, then sign in with your password to continue your ${pendingPlan} checkout.`
            : "Account created. Check your email if confirmation is required, then sign in with your password."
        );
        setAuthMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const { error } = await withTimeout(
        sendPasswordReset(cleanedEmail),
        8000,
        "Sending reset email"
      );

      if (error) {
        throw error;
      }

      setMessage("Password reset email sent. Check your inbox.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to complete that request right now.";
      setErrorMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        5000,
        "Signing out"
      );

      if (error) {
        throw error;
      }

      setCurrentEmail(null);
      setSubscription(null);
      setSubscriptionState("none");
      setSavedSetupCount(null);
      setEquipmentItemCount(null);
      setViewState("signed_out");
      setMessage("You are now signed out.");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to sign out right now.";
      setErrorMessage(text);
    } finally {
      setBusy(false);
    }
  }

  function cancelPendingCheckout() {
    clearPendingCheckout();
    setPendingPlan(null);
    setPendingResumePath(null);
    setMessage("Pending checkout cleared.");
    setErrorMessage(null);
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage(null);
    setErrorMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  const alreadyPro = subscriptionState === "active";
  const billingProvider = getBillingProvider(subscription);
  const statusLabel = alreadyPro ? "Active Pro" : formatStatus(subscription?.status);
  const showHelpBox = viewState === "signed_out" || Boolean(errorMessage);

  const workspaceCards: WorkspaceCard[] = useMemo(
    () => [
      {
        title: "Saved Setups",
        description: "Open saved setups, update operator notes, duplicate records, and create setup reports.",
        href: "/saved-setups",
        cta: "Open saved setups",
        badge: savedSetupCount === null ? undefined : `${savedSetupCount}`,
      },
      {
        title: "Equipment Library",
        description: "Save common machines, hoses, nozzles, surface cleaners, guns, and lances.",
        href: "/equipment-library",
        cta: "Open equipment library",
        badge: equipmentItemCount === null ? undefined : `${equipmentItemCount}`,
      },
      {
        title: "Compare Setups",
        description: "Compare two saved configurations before changing nozzles, hose length, or machine specs.",
        href: "/compare-setups",
        cta: "Compare setups",
      },
      {
        title: "Full Setup Calculator",
        description: "Run a fresh pressure washer setup check from pump to gun.",
        href: "/calculator",
        cta: "Open calculator",
      },
    ],
    [savedSetupCount, equipmentItemCount]
  );

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Account | PressureCal</title>
        <meta
          name="description"
          content="Manage your PressureCal account, Pro subscription status, saved setups, equipment library, and setup workflow tools."
        />
      </Helmet>

      <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-6 py-8 text-white md:px-8 md:py-10">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                Account
              </div>

              <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                    {viewState === "signed_in"
                      ? alreadyPro
                        ? "Your PressureCal Pro workspace"
                        : "Your PressureCal account"
                      : "Sign in to PressureCal"}
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                    {viewState === "signed_in"
                      ? alreadyPro
                        ? "Jump straight into saved setups, equipment, comparisons, reports, and your full setup calculator workflow."
                        : "You are signed in. Upgrade to Pro when you want saved setups, equipment library, comparisons, and printable setup reports."
                      : "Use your email and password to sign in. Your Pro subscription, saved setups, and equipment library stay connected to your account."}
                  </p>
                </div>

                {viewState === "signed_in" ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Signed in as
                    </p>
                    <p className="mt-2 break-words text-lg font-semibold text-white">
                      {currentEmail}
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-green-300/20 bg-green-400/10 px-3 py-1 text-sm font-semibold text-green-100">
                      {statusLabel}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {pendingPlan ? (
              <div className="border-b border-blue-100 bg-blue-50 px-6 py-4 md:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-950">
                      {`Pending ${pendingPlan === "monthly" ? "Monthly" : "Yearly"} Pro checkout`}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-900">
                      Sign in here and PressureCal will continue your checkout automatically afterward.
                    </p>
                  </div>
                  {viewState === "signed_out" ? (
                    <button
                      type="button"
                      onClick={cancelPendingCheckout}
                      className="inline-flex items-center justify-center rounded-2xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
                    >
                      Cancel pending checkout
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="px-6 py-6 md:px-8">
              {viewState === "loading" ? (
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Checking your session
                  </h2>
                  <p className="mt-3 text-slate-600">Just a moment…</p>
                </div>
              ) : null}

              {viewState === "signed_out" ? (
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      {authMode === "login"
                        ? "Log in with email and password"
                        : authMode === "signup"
                        ? "Create your account"
                        : "Reset your password"}
                    </h2>

                    <p className="mt-3 max-w-2xl text-slate-600">
                      {authMode === "login"
                        ? "Enter your email and password to sign in."
                        : authMode === "signup"
                        ? "Create a PressureCal account with your email and a password."
                        : "Enter your email and PressureCal will send you a reset link."}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          authMode === "login"
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Log In
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          authMode === "signup"
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Create Account
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          authMode === "forgot"
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Forgot Password
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
                      <div>
                        <label
                          className="block text-sm font-medium text-slate-700"
                          htmlFor="email"
                        >
                          Email address
                        </label>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                        />
                      </div>

                      {authMode !== "forgot" ? (
                        <div>
                          <label
                            className="block text-sm font-medium text-slate-700"
                            htmlFor="password"
                          >
                            Password
                          </label>
                          <input
                            id="password"
                            type="password"
                            autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                          />
                          {authMode === "signup" ? (
                            <p className="mt-2 text-sm text-slate-500">
                              At least 8 characters. Longer is better.
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {authMode === "signup" ? (
                        <div>
                          <label
                            className="block text-sm font-medium text-slate-700"
                            htmlFor="confirmPassword"
                          >
                            Confirm password
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Confirm your password"
                            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                          />
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy
                          ? authMode === "login"
                            ? "Signing in…"
                            : authMode === "signup"
                            ? "Creating account…"
                            : "Sending reset email…"
                          : authMode === "login"
                          ? "Log In"
                          : authMode === "signup"
                          ? "Create Account"
                          : "Send Reset Email"}
                      </button>
                    </form>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-950">
                      What signing in unlocks
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                      <li>• Continue checkout and connect Pro to your account.</li>
                      <li>• Open saved setups, equipment library, comparisons, and reports.</li>
                      <li>• Keep your Pro workflow connected across devices.</li>
                    </ul>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        to="/pricing"
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        View Pricing
                      </Link>
                      <Link
                        to="/calculator"
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Use Free Calculator
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              {viewState === "signed_in" ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                      label="Pro status"
                      value={statusLabel}
                      helper={
                        subscriptionState === "loading"
                          ? "Checking your subscription..."
                          : alreadyPro
                          ? `${formatBillingProvider(billingProvider)} subscription access is active.`
                          : "Upgrade to Pro to unlock saved workflow tools."
                      }
                    />
                    <StatCard
                      label="Saved setups"
                      value={savedSetupCount === null ? "—" : String(savedSetupCount)}
                      helper="Saved setup records, notes, comparisons, and reports."
                    />
                    <StatCard
                      label="Equipment items"
                      value={equipmentItemCount === null ? "—" : String(equipmentItemCount)}
                      helper="Machines, hoses, nozzles, and reusable setup components."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {alreadyPro ? "Open your Pro tools" : "Account actions"}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {alreadyPro
                            ? "Everything you need for saved setup workflow is one click away."
                            : "You are signed in. Open the calculator or view Pro plans when you are ready."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {pendingPlan ? (
                          <Link
                            to={pendingResumePath || "/pricing?resumeCheckout=1"}
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Continue Checkout
                          </Link>
                        ) : null}

                        <Link
                          to={alreadyPro ? "/saved-setups" : "/pricing"}
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          {alreadyPro ? "Open Saved Setups" : "View Pro Plans"}
                        </Link>

                        <Link
                          to="/pricing"
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
                        >
                          Billing / Subscription
                        </Link>

                        <button
                          type="button"
                          onClick={signOut}
                          disabled={busy}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? "Signing out…" : "Sign Out"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {alreadyPro ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {workspaceCards.map((card) => (
                        <WorkspaceLinkCard key={card.title} card={card} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <WorkspaceLinkCard
                        card={{
                          title: "Full Setup Calculator",
                          description: "Use the free calculator for one-off setup checks and everyday calculations.",
                          href: "/calculator",
                          cta: "Open calculator",
                        }}
                      />
                      <WorkspaceLinkCard
                        card={{
                          title: "PressureCal Pro",
                          description: "Save setups, build from equipment, compare changes, and generate setup reports.",
                          href: "/pricing",
                          cta: "View Pro plans",
                        }}
                      />
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      Subscription details
                    </h2>
                    <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="font-semibold text-slate-950">Status</p>
                        <p>{formatStatus(subscription?.status)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">Provider</p>
                        <p>{formatBillingProvider(billingProvider)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">Billing cycle</p>
                        <p>{formatBillingCycle(subscription?.plan_interval)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">Current period ends</p>
                        <p>{formatDate(subscription?.current_period_end)}</p>
                      </div>
                    </div>
                    {subscription?.cancel_at_period_end ? (
                      <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        Your subscription is set to cancel at the end of the current billing period.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {message ? (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
                  {message}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  {errorMessage}
                </div>
              ) : null}

              {showHelpBox ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  <p className="font-semibold text-slate-950">Need help signing in?</p>
                  <p className="mt-2">
                    If you already have an account, use your password. If you do not know it yet,
                    use Forgot Password to set a new one.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <BackToTopButton />
        </div>
      </div>
    </PressureCalLayout>
  );
}
