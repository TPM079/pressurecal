import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type Plan = "monthly" | "yearly";

type CheckoutRequestBody = {
  plan?: Plan;
  userId?: string | null;
  email?: string | null;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

const PRICE_IDS: Record<Plan, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || "price_1TEq1UITi57HjFJ5yaw0JYL5",
  yearly: process.env.STRIPE_PRICE_YEARLY || "price_1TEqSJITi57HjFJ5juNulh07",
};

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function getRequestOrigin(req: any): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (req.headers.origin) {
    return req.headers.origin;
  }

  if (req.headers.referer) {
    try {
      const referer = new URL(req.headers.referer);
      return referer.origin;
    } catch {
      // ignore invalid referer
    }
  }

  return "https://pressurecal.com";
}

async function findLatestStoredStripeCustomerId(
  userId?: string | null
): Promise<string | null> {
  if (!supabaseAdmin || !userId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to find existing Stripe customer:", error);
    return null;
  }

  return data?.stripe_customer_id ?? null;
}

async function clearStaleStripeCustomerId(
  userId: string,
  staleCustomerId: string
): Promise<void> {
  if (!supabaseAdmin) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_customer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("stripe_customer_id", staleCustomerId);

  if (error) {
    console.error("Failed to clear stale Stripe customer id:", error);
  }
}

async function getReusableStripeCustomerId(
  userId?: string | null
): Promise<string | null> {
  const storedCustomerId = await findLatestStoredStripeCustomerId(userId);

  if (!storedCustomerId) {
    return null;
  }

  try {
    const customer = await stripe.customers.retrieve(storedCustomerId);

    if ("deleted" in customer && customer.deleted) {
      if (userId) {
        await clearStaleStripeCustomerId(userId, storedCustomerId);
      }
      return null;
    }

    return customer.id;
  } catch (error: any) {
    const isMissingCustomer =
      error?.type === "StripeInvalidRequestError" &&
      error?.code === "resource_missing";

    if (isMissingCustomer) {
      console.warn(
        `Stored Stripe customer ${storedCustomerId} was not found for user ${userId}. Falling back to customer_email.`
      );

      if (userId) {
        await clearStaleStripeCustomerId(userId, storedCustomerId);
      }

      return null;
    }

    throw error;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, userId, email }: CheckoutRequestBody = req.body ?? {};

    if (plan !== "monthly" && plan !== "yearly") {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const price = PRICE_IDS[plan];

    if (!price) {
      return res.status(500).json({ error: `Missing Stripe price ID for ${plan}` });
    }

    const origin = getRequestOrigin(req);
    const reusableCustomerId = await getReusableStripeCustomerId(userId);

    const metadata = {
      source: "pressurecal_checkout",
      plan,
      ...(userId ? { supabase_user_id: userId } : {}),
      ...(email ? { app_email: email } : {}),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      client_reference_id: userId || undefined,
      ...(reusableCustomerId
        ? { customer: reusableCustomerId }
        : email
          ? { customer_email: email }
          : {}),
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${origin}/pricing?checkout=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled&provider=stripe`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: error?.message || "Unable to create checkout session",
    });
  }
}
