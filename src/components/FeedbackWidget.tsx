import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase, hasSupabaseEnv } from "../lib/supabase";

type SubmitState = "idle" | "sending" | "sent" | "error";
type FeedbackTag = "general" | "bug" | "idea" | "calculation" | "ux";

export default function FeedbackWidget() {
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [tag, setTag] = useState<FeedbackTag>("general");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    const path = location.pathname.toLowerCase();

    if (path.includes("nozzle") || path.includes("hose")) {
      setTag("calculation");
      return;
    }

    setTag("general");
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      resetForm();
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, location.pathname]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  if (!hasSupabaseEnv) return null;

  function resetForm() {
    setMessage("");
    setEmail("");
    setSubmitState("idle");

    const path = location.pathname.toLowerCase();
    if (path.includes("nozzle") || path.includes("hose")) {
      setTag("calculation");
    } else {
      setTag("general");
    }
  }

  function buildCalculatorContext() {
    return {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      params: Object.fromEntries(
        new URLSearchParams(window.location.search).entries()
      ),
    };
  }

  const feedbackPlaceholder =
    tag === "calculation"
      ? "Something off with the numbers?"
      : tag === "bug"
        ? "What broke?"
        : tag === "idea"
          ? "What would you like added?"
          : tag === "ux"
            ? "What feels confusing or clunky?"
            : "What’s missing or annoying?";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim() || !supabase) return;

    setSubmitState("sending");

    const payload = {
      message: message.trim(),
      email: email.trim() || null,
      tag,
      page: location.pathname,
      source_url: `${window.location.origin}${location.pathname}${location.search}${location.hash}`,
      calculator_context: buildCalculatorContext(),
      status: "new",
    };

    try {
      const { error } = await supabase.from("feedback").insert([payload]);

      if (error) {
        console.error("Feedback submit error:", error);
        setSubmitState("error");
        return;
      }

      setSubmitState("sent");
      setMessage("");
      setEmail("");

      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
      }

      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 1800);
    } catch (error) {
      console.error("Unexpected feedback submit error:", error);
      setSubmitState("error");
    }
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-50 sm:bottom-5 sm:right-5">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="feedback-trigger"
            type="button"
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-900 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
            aria-label="Open feedback form"
            title="Feedback"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden h-2.5 w-2.5 rounded-full bg-slate-900 sm:inline-flex" />
            <span className="hidden text-sm font-semibold sm:inline">Feedback</span>
          </motion.button>
        ) : (
          <motion.div
            key="feedback-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[360px]"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Got feedback?
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">
                    Tell me what feels off, confusing, or missing.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close feedback form"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[min(75vh,640px)] overflow-y-auto px-4 py-4">
              {submitState === "sent" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                    <div className="text-sm font-semibold text-green-900">
                      Thanks — feedback sent.
                    </div>
                    <div className="mt-1 text-sm text-green-800">
                      This helps improve PressureCal.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (autoCloseTimerRef.current) {
                          window.clearTimeout(autoCloseTimerRef.current);
                        }
                        resetForm();
                        setSubmitState("idle");
                        textareaRef.current?.focus();
                      }}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Send another
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (autoCloseTimerRef.current) {
                          window.clearTimeout(autoCloseTimerRef.current);
                        }
                        setIsOpen(false);
                        resetForm();
                      }}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label
                      htmlFor="feedback-tag"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Type
                    </label>
                    <select
                      id="feedback-tag"
                      value={tag}
                      onChange={(e) => setTag(e.target.value as FeedbackTag)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="general">General feedback</option>
                      <option value="bug">Bug / something broken</option>
                      <option value="idea">Feature idea</option>
                      <option value="calculation">Calculation issue</option>
                      <option value="ux">UX / confusing</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="feedback-message"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Feedback
                    </label>
                    <textarea
                      ref={textareaRef}
                      id="feedback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={feedbackPlaceholder}
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="feedback-email"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Email (optional)
                    </label>
                    <input
                      id="feedback-email"
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Page:{" "}
                    <span className="font-medium text-slate-700">{location.pathname}</span>
                  </div>

                  {submitState === "error" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      Something went wrong. Please try again.
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        resetForm();
                      }}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitState === "sending" || !message.trim()}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitState === "sending" ? "Sending..." : "Send feedback"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
