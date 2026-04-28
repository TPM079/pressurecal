import Stripe from "stripe";

type Plan = "monthly" | "yearly";

type VerifyCheckoutRequestBody = {
  sessionId?: string | null;
};

type PurchasePayload = {
  transactionId: string;
  value: number;
  currency: string;
  provider: "stripe";
  plan: Plan;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category: string;
    item_brand: string;
    item_variant: string;
    price: number;
    quantity: number;
  }>;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

const PRICE_IDS: Record<Plan, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || "price_1TEq1UITi57HjFJ5yaw0JYL5",
  yearly: process.env.STRIPE_PRICE_YEARLY || "price_1TEqSJITi57HjFJ5juNulh07",
};

function getPlanValue(plan: Plan) {
  return plan === "yearly" ? 99.95 : 9.95;
}

function normalisePlan(value?: string | null): Plan | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

function inferPlan(priceId?: string | null): Plan | null {
  if (!priceId) {
    return null;
  }

  if (priceId === PRICE_IDS.monthly) {
    return "monthly";
  }

  if (priceId === PRICE_IDS.yearly) {
    return "yearly";
  }

  return null;
}

function buildPurchasePayload(
  plan: Plan,
  sessionId: string,
  priceId: string,
  amountTotal?: number | null,
  currency?: string | null
): PurchasePayload {
  const valueFromStripe =
    typeof amountTotal === "number" && Number.isFinite(amountTotal) ? amountTotal / 100 : null;
  const value = valueFromStripe ?? getPlanValue(plan);
  const label = plan === "yearly" ? "PressureCal Pro Yearly" : "PressureCal Pro Monthly";

  return {
    transactionId: sessionId,
    value,
    currency: (currency || "AUD").toUpperCase(),
    provider: "stripe",
    plan,
    items: [
      {
        item_id: priceId,
        item_name: label,
        item_category: "subscription",
        item_brand: "PressureCal",
        item_variant: plan,
        price: value,
        quantity: 1,
      },
    ],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId }: VerifyCheckoutRequestBody = req.body ?? {};

    if (!sessionId) {
      return res.status(400).json({ error: "Missing Stripe session ID" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== "subscription") {
      return res.status(400).json({ error: "Stripe session is not a subscription checkout" });
    }

    if (session.status !== "complete" && session.payment_status !== "paid") {
      return res.status(409).json({
        error: `Stripe session is ${session.status || session.payment_status || "not complete"}.`,
      });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 10,
      expand: ["data.price"],
    });

    const firstLineItem = lineItems.data[0];
    const priceId =
      typeof firstLineItem?.price === "string"
        ? firstLineItem.price
        : firstLineItem?.price?.id ?? null;

    const planFromMetadata = normalisePlan(session.metadata?.plan);
    const plan = planFromMetadata ?? inferPlan(priceId);

    if (!plan) {
      return res.status(500).json({ error: "Unable to determine Stripe checkout plan" });
    }

    if (!priceId) {
      return res.status(500).json({ error: "Unable to determine Stripe price ID" });
    }

    const purchase = buildPurchasePayload(
      plan,
      session.id,
      priceId,
      session.amount_total,
      session.currency
    );

    return res.status(200).json({
      ok: true,
      provider: "stripe",
      purchase,
    });
  } catch (error: any) {
    console.error("Stripe checkout verification error:", error);
    return res.status(500).json({
      error: error?.message || "Unable to verify Stripe checkout session",
    });
  }
}
