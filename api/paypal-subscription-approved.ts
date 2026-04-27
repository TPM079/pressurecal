import { createClient } from "@supabase/supabase-js";

type Plan = "monthly" | "yearly";

type PayPalApprovedRequestBody = {
  subscriptionID?: string | null;
  plan?: Plan | null;
  userId?: string | null;
  email?: string | null;
};

type PayPalTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type PayPalSubscriptionResponse = {
  id?: string;
  status?: string;
  plan_id?: string;
  custom_id?: string;
  subscriber?: {
    email_address?: string;
    payer_id?: string;
  };
  billing_info?: {
    next_billing_time?: string;
  };
};

const paypalEnv = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAYPAL_PLAN_IDS: Record<Plan, string | undefined> = {
  monthly: process.env.PAYPAL_MONTHLY_PLAN_ID || process.env.VITE_PAYPAL_MONTHLY_PLAN_ID,
  yearly: process.env.PAYPAL_YEARLY_PLAN_ID || process.env.VITE_PAYPAL_YEARLY_PLAN_ID,
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

function getPayPalBaseUrl() {
  return paypalEnv === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function normalisePlan(value?: string | null): Plan | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

async function getPayPalAccessToken(): Promise<string> {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error("Missing PayPal API credentials");
  }

  const credentials = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString("base64");

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as PayPalTokenResponse & { error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Unable to authenticate with PayPal");
  }

  return data.access_token;
}

async function getPayPalSubscription(subscriptionID: string): Promise<PayPalSubscriptionResponse> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionID)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = (await response.json()) as PayPalSubscriptionResponse & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Unable to retrieve PayPal subscription");
  }

  return data;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Missing Supabase admin configuration" });
  }

  try {
    const { subscriptionID, plan: requestedPlan, userId, email }: PayPalApprovedRequestBody =
      req.body ?? {};

    const plan = normalisePlan(requestedPlan);

    if (!subscriptionID) {
      return res.status(400).json({ error: "Missing PayPal subscription ID" });
    }

    if (!plan) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing PressureCal user details" });
    }

    const expectedPlanId = PAYPAL_PLAN_IDS[plan];

    if (!expectedPlanId) {
      return res.status(500).json({ error: `Missing PayPal plan ID for ${plan}` });
    }

    const paypalSubscription = await getPayPalSubscription(subscriptionID);

    if (paypalSubscription.id !== subscriptionID) {
      return res.status(400).json({ error: "PayPal subscription ID mismatch" });
    }

    if (paypalSubscription.plan_id !== expectedPlanId) {
      return res.status(400).json({ error: "PayPal subscription plan mismatch" });
    }

    if (paypalSubscription.custom_id && paypalSubscription.custom_id !== userId) {
      return res.status(400).json({ error: "PayPal subscription user mismatch" });
    }

    if (paypalSubscription.status !== "ACTIVE") {
      return res.status(409).json({
        error: `PayPal subscription is ${paypalSubscription.status || "not active"}. Please refresh in a moment.`,
      });
    }

    const now = new Date().toISOString();
    const currentPeriodEnd = paypalSubscription.billing_info?.next_billing_time ?? null;
    const paypalEmail = paypalSubscription.subscriber?.email_address || email;
    const paypalPayerId = paypalSubscription.subscriber?.payer_id ?? null;

    const subscriptionPayload = {
      user_id: userId,
      email: paypalEmail,
      status: "active",
      price_id: expectedPlanId,
      plan_interval: plan,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      provider: "paypal",
      provider_customer_id: paypalPayerId,
      provider_subscription_id: subscriptionID,
      paypal_subscription_id: subscriptionID,
      paypal_plan_id: expectedPlanId,
      updated_at: now,
    };

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("subscriptions")
      .select("paypal_subscription_id")
      .eq("paypal_subscription_id", subscriptionID)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update(subscriptionPayload)
        .eq("paypal_subscription_id", subscriptionID);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin.from("subscriptions").insert(subscriptionPayload);

      if (error) {
        throw error;
      }
    }

    return res.status(200).json({
      ok: true,
      provider: "paypal",
      status: "active",
      plan,
      subscriptionID,
    });
  } catch (error: any) {
    console.error("PayPal subscription approval error:", error);
    return res.status(500).json({
      error: error?.message || "Unable to confirm PayPal subscription",
    });
  }
}
