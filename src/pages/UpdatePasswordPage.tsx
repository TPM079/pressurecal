import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import { supabase } from "../lib/supabase-browser";
import { updatePassword } from "../lib/supabasePasswordAuth";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;
      setReady(Boolean(data.session));
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { error } = await updatePassword(password);

      if (error) {
        throw error;
      }

      setMessage("Password updated successfully. You can now return to the account page and sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to update your password right now.";
      setErrorMessage(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Reset Password | PressureCal</title>
        <meta
          name="description"
          content="Reset your PressureCal password."
        />
      </Helmet>

      <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Reset your password
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Choose a new password for your PressureCal account.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {!ready ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                Open this page from the password reset email you received.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="password"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your new password"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    At least 8 characters. Longer is better.
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="confirmPassword"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your new password"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Updating password…" : "Update Password"}
                </button>
              </form>
            )}

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
          </section>

          <BackToTopButton />
        </div>
      </div>
    </PressureCalLayout>
  );
}
