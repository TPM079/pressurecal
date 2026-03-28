export type PressureCalEventName =
  | "homepage_viewed"
  | "calculator_section_viewed"
  | "copy_setup_link_clicked"
  | "open_full_setup_calculator_clicked"
  | "pro_bridge_clicked"
  | "pricing_page_viewed"
  | "pricing_view_plans_clicked"
  | "pricing_use_free_calculator_clicked"
  | "pricing_choose_monthly_clicked"
  | "pricing_choose_yearly_clicked";

export type PressureCalEventParams = Record<string, string | number | boolean | null | undefined>;

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
