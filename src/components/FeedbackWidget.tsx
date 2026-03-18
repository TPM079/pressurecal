import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

type SubmitState = "idle" | "sending" | "sent" | "error";

export default function FeedbackWidget() {
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  function resetForm() {
    setMessage("");
    setEmail("");
    setSubmitState("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) return;

    setSubmitState("sending");

    try {
      const response = await fetch("https://formspree.io/f/xojkydez", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim(),
          source: `${location.pathname}${location.search}${location.hash}`,
          page: location.pathname,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setSubmitState("sent");
      setMessage("");
      setEmail("");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
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
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
            aria-label="Open feedback form"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-900" />
            Feedback
          </motion.button>
        ) : (
          <motion.div
            key="feedback-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Got feedback?
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">
                    Tell me what’s missing, confusing, or annoying.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close feedback form"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="px-4 py-4">
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
                        resetForm();
                        textareaRef.current?.focus();
                      }}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Send another
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
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
                      placeholder="What’s missing or annoying?"
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
                    <span className="font-medium text-slate-700">
                      {location.pathname}
                    </span>
                  </div>

                  {submitState === "error" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      Something went wrong. Please try again.
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
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