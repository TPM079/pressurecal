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
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(
  name: PressureCalEventName,
  params: PressureCalEventParams = {}
) {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: name,
      ...params,
    });
    return;
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", name, params);
  }
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

  if (typeof window.gtag === "function") {
    window.gtag("event", "purchase", eventParams);
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: "purchase",
      ecommerce: eventParams,
    });
    return;
  }

  if (import.meta.env.DEV) {
    console.info("[analytics] purchase", eventParams);
  }
}
