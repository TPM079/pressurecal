import { getCookieConsentStatus, hasAnalyticsConsent } from "./cookieConsent";

export type PressureCalEventName =
  | "homepage_viewed"
  | "calculator_section_viewed"
  | "copy_setup_link_clicked"
  | "open_full_setup_calculator_clicked"
  | "homepage_tool_clicked"
  | "saved_setups_page_clicked"
  | "pro_bridge_clicked"
  | "calculator_result_viewed"
  | "save_setup_clicked"
  | "pro_gate_shown"
  | "pricing_viewed"
  | "pricing_page_viewed"
  | "pricing_view_plans_clicked"
  | "pricing_use_free_calculator_clicked"
  | "pricing_choose_monthly_clicked"
  | "pricing_choose_yearly_clicked"
  | "checkout_started"
  | "checkout_completed"
  | "saved_setup_created";

export type PressureCalEventParams = Record<string, string | number | boolean | null | undefined>;

export type PressureCalPurchaseItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

export type PressureCalPurchasePayload = {
  transactionId: string;
  value: number;
  currency: string;
  provider: "stripe" | "paypal";
  plan: "monthly" | "yearly";
  coupon?: string | null;
  items: PressureCalPurchaseItem[];
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

/**
 * Direct collect is enabled by default because gtag/dataLayer can be present
 * without dispatching hits in some browser/extension/privacy states.
 *
 * Set VITE_GA_DIRECT_COLLECT=false if you ever want to disable this fallback.
 */
const DIRECT_COLLECT_ENABLED = import.meta.env.VITE_GA_DIRECT_COLLECT !== "false";
const DEBUG_MODE = import.meta.env.DEV || import.meta.env.VITE_GA_DEBUG_MODE === "true";

const CLIENT_ID_STORAGE_KEY = "pressurecal_ga_client_id_v1";
const SESSION_ID_STORAGE_KEY = "pressurecal_ga_session_id_v1";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

let analyticsLoadStarted = false;

type DirectCollectParams = Record<string, string | number | boolean | null | undefined>;

function setGaDisabled(disabled: boolean) {
  if (!GA_ID || typeof window === "undefined") return;

  const windowWithGaDisableFlags = window as unknown as Record<string, boolean>;
  windowWithGaDisableFlags[`ga-disable-${GA_ID}`] = disabled;
}

function hasRequiredAnalyticsSettings() {
  return Boolean(GA_ID) && getCookieConsentStatus() === "accepted";
}

function getStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures. Analytics should never break the app.
  }
}

function createClientId() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${Date.now()}.${randomPart}`;
}

function getClientId() {
  if (typeof window === "undefined") return createClientId();

  const existingClientId = getStorageValue(CLIENT_ID_STORAGE_KEY);
  if (existingClientId) return existingClientId;

  const newClientId = createClientId();
  setStorageValue(CLIENT_ID_STORAGE_KEY, newClientId);
  return newClientId;
}

function getSessionId() {
  if (typeof window === "undefined") return Math.floor(Date.now() / 1000).toString();

  const now = Date.now();
  const existingSession = getStorageValue(SESSION_ID_STORAGE_KEY);

  if (existingSession) {
    try {
      const parsed = JSON.parse(existingSession) as {
        id?: string;
        lastActivity?: number;
      };

      if (
        parsed.id &&
        typeof parsed.lastActivity === "number" &&
        now - parsed.lastActivity < SESSION_TIMEOUT_MS
      ) {
        setStorageValue(
          SESSION_ID_STORAGE_KEY,
          JSON.stringify({ id: parsed.id, lastActivity: now })
        );
        return parsed.id;
      }
    } catch {
      // Fall through and create a fresh session.
    }
  }

  const newSessionId = Math.floor(now / 1000).toString();

  setStorageValue(
    SESSION_ID_STORAGE_KEY,
    JSON.stringify({ id: newSessionId, lastActivity: now })
  );

  return newSessionId;
}

function appendDirectCollectParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined
) {
  if (value === undefined || value === null || value === "") return;

  if (typeof value === "number") {
    searchParams.set(`epn.${key}`, String(value));
    return;
  }

  searchParams.set(`ep.${key}`, String(value));
}

function sendDirectGaCollect(eventName: string, params: DirectCollectParams = {}) {
  if (!DIRECT_COLLECT_ENABLED) return;
  if (!GA_ID || typeof window === "undefined") return;
  if (getCookieConsentStatus() !== "accepted") return;

  const searchParams = new URLSearchParams({
    v: "2",
    tid: GA_ID,
    cid: getClientId(),
    en: eventName,
    dl: window.location.href,
    dt: document.title,
    dr: document.referrer || "",
    ul: navigator.language || "",
    sr: `${window.screen.width}x${window.screen.height}`,
    sid: getSessionId(),
    sct: "1",
    seg: "1",
  });

  if (DEBUG_MODE) {
    searchParams.set("_dbg", "1");
    appendDirectCollectParam(searchParams, "debug_mode", "true");
  }

  Object.entries(params).forEach(([key, value]) => {
    appendDirectCollectParam(searchParams, key, value);
  });

  const url = `https://www.google-analytics.com/g/collect?${searchParams.toString()}`;

  try {
    if (navigator.sendBeacon) {
      const queued = navigator.sendBeacon(url);
      if (queued) return;
    }

    fetch(url, {
      method: "GET",
      mode: "no-cors",
      keepalive: true,
      cache: "no-store",
    }).catch(() => {
      // Ignore analytics failures. Analytics must never break PressureCal.
    });
  } catch {
    // Ignore analytics failures. Analytics must never break PressureCal.
  }
}

export function disableAnalytics() {
  if (typeof window === "undefined") return;

  setGaDisabled(true);

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
}

export function initAnalyticsIfConsented() {
  if (typeof window === "undefined") return;

  if (!GA_ID) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - missing VITE_GA_MEASUREMENT_ID]");
    }
    return;
  }

  if (!hasAnalyticsConsent()) {
    disableAnalytics();
    return;
  }

  setGaDisabled(false);

  if (analyticsLoadStarted || typeof window.gtag === "function") {
    window.gtag?.("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    return;
  }

  analyticsLoadStarted = true;

  window.dataLayer = window.dataLayer || [];

  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  window.gtag("js", new Date());

  // App.tsx should send page_view explicitly for React Router routes.
  window.gtag("config", GA_ID, {
    send_page_view: false,
    debug_mode: DEBUG_MODE,
  });

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(gtagScript);
}

function analyticsAllowed() {
  if (!hasRequiredAnalyticsSettings()) {
    return false;
  }

  initAnalyticsIfConsented();
  return true;
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined") return;

  const resolvedTitle = title || document.title;
  const pageLocation = window.location.href;

  if (!GA_ID) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - missing VITE_GA_MEASUREMENT_ID] page_view", path);
    }
    return;
  }

  if (!analyticsAllowed()) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - no optional cookie consent] page_view", path);
    }
    return;
  }

  // Keep gtag/dataLayer populated for debugging and future compatibility.
  window.gtag?.("event", "page_view", {
    send_to: GA_ID,
    page_title: resolvedTitle,
    page_location: pageLocation,
    page_path: path,
    debug_mode: DEBUG_MODE,
  });

  // Direct fallback proved necessary where gtag/dataLayer queues but does not dispatch.
  sendDirectGaCollect("page_view", {
    page_title: resolvedTitle,
    page_location: pageLocation,
    page_path: path,
  });
}

export function trackEvent(
  name: PressureCalEventName,
  params: PressureCalEventParams = {}
) {
  if (typeof window === "undefined") return;

  if (!GA_ID) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - missing VITE_GA_MEASUREMENT_ID]", name, params);
    }
    return;
  }

  if (!analyticsAllowed()) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - no optional cookie consent]", name, params);
    }
    return;
  }

  // Keep gtag/dataLayer populated for debugging and future compatibility.
  window.gtag?.("event", name, {
    send_to: GA_ID,
    ...params,
    debug_mode: DEBUG_MODE,
  });

  // Direct fallback sends the event even when gtag queues but does not dispatch.
  sendDirectGaCollect(name, params);
}

export function trackPurchase(payload: PressureCalPurchasePayload) {
  if (typeof window === "undefined") return;

  const eventParams = {
    transaction_id: payload.transactionId,
    value: payload.value,
    currency: payload.currency,
    coupon: payload.coupon ?? undefined,
    payment_type: payload.provider,
    plan_interval: payload.plan,
    affiliation: "PressureCal",
    items: payload.items,
  };

  if (!GA_ID) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - missing VITE_GA_MEASUREMENT_ID] purchase", eventParams);
    }
    return;
  }

  if (!analyticsAllowed()) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - no optional cookie consent] purchase", eventParams);
    }
    return;
  }

  window.gtag?.("event", "purchase", {
    send_to: GA_ID,
    ...eventParams,
    debug_mode: DEBUG_MODE,
  });

  // Lightweight direct fallback so purchase intent is not lost if gtag does not dispatch.
  // Detailed ecommerce item attribution remains best handled by gtag.
  sendDirectGaCollect("purchase", {
    transaction_id: payload.transactionId,
    value: payload.value,
    currency: payload.currency,
    payment_type: payload.provider,
    plan_interval: payload.plan,
    coupon: payload.coupon ?? undefined,
    affiliation: "PressureCal",
  });
}
