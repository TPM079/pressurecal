import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import { supabase } from "../lib/supabase-browser";

type ViewState = "loading" | "signed_out" | "signed_in";

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

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = useMemo(() => `${window.location.origin}/account`, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const sessionResponse = await withTimeout(
          supabase.auth.getSession(),
          4000,
          "Checking your session"
        );

        if (!mounted) {
          return;
        }

        const user = sessionResponse.data.session?.user;

        if (user?.email) {
          setCurrentEmail(user.email);
          setViewState("signed_in");
          setErrorMessage(null);
        } else {
          setCurrentEmail(null);
          setViewState("signed_out");
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to check your session right now.";

        setCurrentEmail(null);
        setViewState("signed_out");
        setErrorMessage(message);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) {
        return;
      }

      if (session?.user?.email) {
        setCurrentEmail(session.user.email);
        setViewState("signed_in");
        setErrorMessage(null);
      } else {
        setCurrentEmail(null);
        setViewState("signed_out");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const cleanedEmail = email.trim().toLowerCase();

      if (!cleanedEmail) {
        throw new Error("Enter your email address first.");
      }

      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: cleanedEmail,
          options: {
            emailRedirectTo: redirectTo,
          },
        }),
        8000,
        "Sending magic link"
      );

      if (error) {
        throw error;
      }

      setMessage("Magic link sent. Check your email, then come back here after you click it.");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to send the sign-in link right now.";
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

  const showHelpBox = viewState === "signed_out" || Boolean(errorMessage);

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Account | PressureCal</title>
        <meta
          name="description"
          content="Sign in to PressureCal with a secure magic link so Pro subscriptions can be linked to your account."
        />
      </Helmet>

      <section className="-mx-4 border-b border-slate-200 bg-slate-950 px-4 text-white">
        <div className="mx-auto max-w-4xl py-16 sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sign in to PressureCal
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Use a magic link sent to your email. Once you are signed in, your
            Pro subscription can be linked to your account properly.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Go to pricing
            </Link>

            <Link
              to="/saved-setups"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View saved setups
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50/70">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {viewState === "loading" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Checking your session</h2>
                <p className="mt-3 text-slate-600">Just a moment…</p>
              </div>
            ) : null}

            {viewState === "signed_out" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Sign in with email
                </h2>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Enter your email and PressureCal will send you a magic link.
                  Click the link in your inbox to finish signing in.
                </p>

                <form onSubmit={sendMagicLink} className="mt-8">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="email">
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

                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Sending magic link…" : "Send magic link"}
                  </button>
                </form>
              </div>
            ) : null}

            {viewState === "signed_in" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  You are signed in
                </h2>
                <p className="mt-3 text-slate-600">
                  Signed in as <span className="font-medium text-slate-950">{currentEmail}</span>
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Go to pricing
                  </Link>

                  <Link
                    to="/saved-setups"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
                  >
                    Open saved setups
                  </Link>

                  <button
                    type="button"
                    onClick={signOut}
                    disabled={busy}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Signing out…" : "Sign out"}
                  </button>
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
                  Try requesting a new magic link, and check your spam or promotions folder if it
                  does not arrive right away.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
