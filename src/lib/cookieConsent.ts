export type CookieConsentStatus = "accepted" | "rejected";

export type CookieConsentRecord = {
  version: 1;
  status: CookieConsentStatus;
  analytics: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "pressurecal_cookie_consent_v1";
export const COOKIE_CONSENT_CHANGED_EVENT = "pressurecal-cookie-consent-changed";
export const OPEN_COOKIE_PREFERENCES_EVENT = "pressurecal-open-cookie-preferences";

function isCookieConsentStatus(value: unknown): value is CookieConsentStatus {
  return value === "accepted" || value === "rejected";
}

export function getCookieConsentRecord(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

    if (!storedValue) return null;

    // Backwards compatibility if a simple string was ever stored.
    if (isCookieConsentStatus(storedValue)) {
      return {
        version: 1,
        status: storedValue,
        analytics: storedValue === "accepted",
        updatedAt: new Date().toISOString(),
      };
    }

    const parsed = JSON.parse(storedValue) as Partial<CookieConsentRecord>;

    if (!isCookieConsentStatus(parsed.status)) return null;

    return {
      version: 1,
      status: parsed.status,
      analytics: parsed.status === "accepted",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getCookieConsentStatus(): CookieConsentStatus | null {
  return getCookieConsentRecord()?.status ?? null;
}

export function hasAnalyticsConsent() {
  return getCookieConsentStatus() === "accepted";
}

export function saveCookieConsentStatus(status: CookieConsentStatus) {
  if (typeof window === "undefined") return;

  const record: CookieConsentRecord = {
    version: 1,
    status,
    analytics: status === "accepted",
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));

  window.dispatchEvent(
    new CustomEvent<CookieConsentRecord>(COOKIE_CONSENT_CHANGED_EVENT, {
      detail: record,
    })
  );
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}
