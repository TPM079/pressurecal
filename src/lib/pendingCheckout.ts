export type CheckoutPlan = "monthly" | "yearly";

export type PendingCheckout = {
  plan: CheckoutPlan;
  source: string;
  createdAt: number;
  resumePath: string;
};

const STORAGE_KEY = "pressurecal_pending_checkout";
const MAX_AGE_MS = 1000 * 60 * 60;

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "monthly" || value === "yearly";
}

export function savePendingCheckout(
  plan: CheckoutPlan,
  source: string,
  resumePath = "/pricing?resumeCheckout=1"
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PendingCheckout = {
    plan,
    source,
    createdAt: Date.now(),
    resumePath,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingCheckout(): PendingCheckout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;

    if (
      !parsed ||
      !isCheckoutPlan(parsed.plan) ||
      typeof parsed.source !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.resumePath !== "string"
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed as PendingCheckout;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPendingCheckout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
