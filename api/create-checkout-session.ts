import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || "price_1TEq1UITi57HjFJ5yaw0JYL5",
  yearly: process.env.STRIPE_PRICE_YEARLY || "price_1TEqSJITi57HjFJ5juNulh07",
} as const;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  }

  try {
    const { plan } = req.body ?? {};

    if (plan !== "monthly" && plan !== "yearly") {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const price = PRICE_IDS[plan];

    if (!price) {
      return res.status(500).json({ error: "Missing Stripe price ID" });
    }

    const origin =
      req.headers.origin ||
      req.headers.referer?.split("/").slice(0, 3).join("/") ||
      "https://www.pressurecal.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: error?.message || "Unable to create checkout session",
    });
  }
}
