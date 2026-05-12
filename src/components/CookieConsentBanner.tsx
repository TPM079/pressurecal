import { useEffect, useState } from "react";
import { disableAnalytics, initAnalyticsIfConsented } from "../lib/analytics";
import {
  getCookieConsentStatus,
  OPEN_COOKIE_PREFERENCES_EVENT,
  saveCookieConsentStatus,
  type CookieConsentStatus,
} from "../lib/cookieConsent";

function getInitialStatus(): CookieConsentStatus | null {
  return getCookieConsentStatus();
}

export default function CookieConsentBanner() {
  const [status, setStatus] = useState<CookieConsentStatus | null>(() => getInitialStatus());
  const [showBanner, setShowBanner] = useState(() => getInitialStatus() === null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getInitialStatus() === "accepted");

  useEffect(() => {
    initAnalyticsIfConsented();

    function handleOpenPreferences() {
      const currentStatus = getCookieConsentStatus();

      setStatus(currentStatus);
      setAnalyticsEnabled(currentStatus === "accepted");
      setShowBanner(false);
      setShowPreferences(true);
    }

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences);

    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences);
    };
  }, []);

  function savePreference(nextStatus: CookieConsentStatus) {
    saveCookieConsentStatus(nextStatus);
    setStatus(nextStatus);
    setAnalyticsEnabled(nextStatus === "accepted");
    setShowBanner(false);
    setShowPreferences(false);

    if (nextStatus === "accepted") {
      initAnalyticsIfConsented();
    } else {
      disableAnalytics();
    }
  }

  function closePreferences() {
    setShowPreferences(false);

    if (status === null) {
      setShowBanner(true);
    }
  }

  if (!showBanner && !showPreferences) {
    return null;
  }

  return (
    <>
      {showBanner ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-4 text-slate-900 shadow-2xl backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-slate-950">Cookies on PressureCal</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                We use essential cookies and local storage to keep PressureCal working, including
                sign-in, security, checkout, and saved preferences. With your permission, we also
                use optional analytics to understand how PressureCal is used and improve the tools.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => savePreference("accepted")}
                className="inline-flex items-center justify-center rounded-xl bg-[#1C408C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173675]"
              >
                Accept optional cookies
              </button>

              <button
                type="button"
                onClick={() => savePreference("rejected")}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reject optional cookies
              </button>

              <button
                type="button"
                onClick={() => {
                  setAnalyticsEnabled(false);
                  setShowPreferences(true);
                  setShowBanner(false);
                }}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Manage preferences
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {showPreferences ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  id="cookie-preferences-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  Cookie preferences
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose whether PressureCal can use optional analytics. Essential cookies and
                  local storage stay on because they are needed for the site to work.
                </p>
              </div>

              <button
                type="button"
                onClick={closePreferences}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close cookie preferences"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Essential</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Required for core site features such as sign-in, checkout, security,
                      saved preferences, and basic page functionality.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    Always on
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Optional analytics</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Helps us understand which pages and tools are useful, so we can improve
                      PressureCal. These analytics only load after you allow them.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAnalyticsEnabled((current) => !current)}
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition",
                      analyticsEnabled ? "bg-[#1C408C]" : "bg-slate-300",
                    ].join(" ")}
                    aria-pressed={analyticsEnabled}
                    aria-label="Toggle optional analytics cookies"
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                        analyticsEnabled ? "left-6" : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => savePreference("rejected")}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reject optional cookies
              </button>

              <button
                type="button"
                onClick={() => savePreference(analyticsEnabled ? "accepted" : "rejected")}
                className="inline-flex items-center justify-center rounded-xl bg-[#1C408C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173675]"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
