import { getCookieConsentStatus, hasAnalyticsConsent } from "./cookieConsent";

export type PressureCalEventName =
  | "homepage_viewed"
  | "calculator_section_viewed"
  | "copy_setup_link_clicked"
  | "open_full_setup_calculator_clicked"
  | "homepage_tool_clicked"
  | "saved_setups_page_clicked"
  | "pro_bridge_clicked"
  | "pricing_page_viewed"
  | "pricing_view_plans_clicked"
  | "pricing_use_free_calculator_clicked"
  | "pricing_choose_monthly_clicked"
  | "pricing_choose_yearly_clicked";

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

let analyticsLoadStarted = false;

function setGaDisabled(disabled: boolean) {
  if (!GA_ID || typeof window === "undefined") return;

  const windowWithGaDisableFlags = window as unknown as Record<string, boolean>;
  windowWithGaDisableFlags[`ga-disable-${GA_ID}`] = disabled;
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
  if (!GA_ID) return;

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

  window.gtag("config", GA_ID, {
    debug_mode: import.meta.env.DEV,
  });

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(gtagScript);
}

function analyticsAllowed() {
  if (getCookieConsentStatus() !== "accepted") {
    return false;
  }

  initAnalyticsIfConsented();
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackEvent(
  name: PressureCalEventName,
  params: PressureCalEventParams = {}
) {
  if (typeof window === "undefined") return;

  if (!analyticsAllowed()) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - no optional cookie consent]", name, params);
    }
    return;
  }

  window.gtag?.("event", name, params);
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

  if (!analyticsAllowed()) {
    if (import.meta.env.DEV) {
      console.info("[analytics skipped - no optional cookie consent] purchase", eventParams);
    }
    return;
  }

  window.gtag?.("event", "purchase", eventParams);
}
