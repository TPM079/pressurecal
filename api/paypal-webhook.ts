import { createClient } from "@supabase/supabase-js";

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  create_time?: string;
  summary?: string;
  resource?: Record<string, any>;
};

type PayPalSubscription = {
  id?: string;
  status?: string;
  plan_id?: string;
  custom_id?: string;
  subscriber?: {
    email_address?: string;
    payer_id?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: {
        currency_code?: string;
        value?: string;
      };
      time?: string;
    };
  };
};

type PayPalSubscriptionWriteInput = {
  user_id?: string | null;
  email?: string | null;
  status: string;
  paypal_subscription_id: string;
  paypal_plan_id?: string | null;
  provider_customer_id?: string | null;
  plan_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
};

const paypalEnv = (process.env.PAYPAL_ENV || "live").toLowerCase();
const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAYPAL_API_BASE =
  paypalEnv === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

const PAYPAL_PLAN_INTERVALS: Record<string, "monthly" | "yearly"> = {
  ...(process.env.VITE_PAYPAL_MONTHLY_PLAN_ID
    ? { [process.env.VITE_PAYPAL_MONTHLY_PLAN_ID]: "monthly" as const }
    : {}),
  ...(process.env.VITE_PAYPAL_YEARLY_PLAN_ID
    ? { [process.env.VITE_PAYPAL_YEARLY_PLAN_ID]: "yearly" as const }
    : {}),
};

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function getHeader(req: any, name: string): string | null {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickBestEmail(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    const email = nonEmptyString(candidate);
    if (email) {
      return email.toLowerCase();
    }
  }

  return null;
}

function normalizePayPalStatus(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "incomplete";
    case "SUSPENDED":
      return "suspended";
    case "CANCELLED":
    case "CANCELED":
      return "canceled";
    case "EXPIRED":
      return "expired";
    default:
      return status ? status.toLowerCase() : "unknown";
  }
}

function statusForEvent(eventType: string | undefined, subscriptionStatus?: string | null): string {
  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "PAYMENT.SALE.COMPLETED":
      return "active";
    case "BILLING.SUBSCRIPTION.CANCELLED":
      return "canceled";
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      return "suspended";
    case "BILLING.SUBSCRIPTION.EXPIRED":
      return "expired";
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      return "past_due";
    case "PAYMENT.SALE.REFUNDED":
      return "refunded";
    case "PAYMENT.SALE.REVERSED":
      return "reversed";
    default:
      return normalizePayPalStatus(subscriptionStatus);
  }
}

function getSubscriptionIdFromEvent(event: PayPalWebhookEvent): string | null {
  const resource = event.resource ?? {};
  const directId = nonEmptyString(resource.id);

  if (event.event_type?.startsWith("BILLING.SUBSCRIPTION.") && directId) {
    return directId;
  }

  return (
    nonEmptyString(resource.billing_agreement_id) ||
    nonEmptyString(resource.subscription_id) ||
    nonEmptyString(resource.supplementary_data?.related_ids?.subscription_id) ||
    null
  );
}

async function getPayPalAccessToken(): Promise<string> {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to get PayPal access token");
  }

  return data.access_token as string;
}

async function verifyPayPalWebhookSignature(req: any, event: PayPalWebhookEvent): Promise<boolean> {
  if (!paypalWebhookId) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID");
  }

  const transmissionId = getHeader(req, "paypal-transmission-id");
  const transmissionTime = getHeader(req, "paypal-transmission-time");
  const certUrl = getHeader(req, "paypal-cert-url");
  const authAlgo = getHeader(req, "paypal-auth-algo");
  const transmissionSig = getHeader(req, "paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: paypalWebhookId,
      webhook_event: event,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal webhook verification request failed:", data);
    return false;
  }

  return data.verification_status === "SUCCESS";
}

async function retrievePayPalSubscription(subscriptionId: string): Promise<PayPalSubscription | null> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error_description || "Unable to retrieve PayPal subscription");
  }

  return data as PayPalSubscription;
}

async function getExistingPayPalSubscriptionRow(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "user_id, email, metadata, paypal_subscription_id, provider_subscription_id, provider_customer_id, paypal_plan_id"
    )
    .or(`paypal_subscription_id.eq.${subscriptionId},provider_subscription_id.eq.${subscriptionId}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function writePayPalSubscription(input: PayPalSubscriptionWriteInput) {
  const existing = await getExistingPayPalSubscriptionRow(input.paypal_subscription_id);
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    provider: "paypal",
    provider_subscription_id: input.paypal_subscription_id,
    provider_customer_id: input.provider_customer_id ?? existing?.provider_customer_id ?? null,
    paypal_subscription_id: input.paypal_subscription_id,
    paypal_plan_id: input.paypal_plan_id ?? existing?.paypal_plan_id ?? null,
    status: input.status,
    price_id: input.paypal_plan_id ?? existing?.paypal_plan_id ?? null,
    plan_interval: input.plan_interval ?? null,
    current_period_end: input.current_period_end ?? null,
    cancel_at_period_end: input.cancel_at_period_end ?? false,
    updated_at: now,
    metadata: {
      ...(existing?.metadata ?? {}),
      ...(input.metadata ?? {}),
    },
  };

  const resolvedUserId = input.user_id ?? existing?.user_id ?? null;
  if (resolvedUserId) {
    payload.user_id = resolvedUserId;
  }

  const resolvedEmail = pickBestEmail(input.email, existing?.email);
  if (resolvedEmail) {
    payload.email = resolvedEmail;
  }

  if (existing?.paypal_subscription_id === input.paypal_subscription_id) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("paypal_subscription_id", input.paypal_subscription_id);

    if (error) {
      throw error;
    }

    return;
  }

  if (existing?.provider_subscription_id === input.paypal_subscription_id) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("provider_subscription_id", input.paypal_subscription_id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabaseAdmin.from("subscriptions").insert(payload);

  if (error) {
    throw error;
  }
}

function buildWriteInputFromEvent(
  event: PayPalWebhookEvent,
  subscriptionId: string,
  subscription: PayPalSubscription | null
): PayPalSubscriptionWriteInput {
  const resource = event.resource ?? {};
  const planId =
    nonEmptyString(subscription?.plan_id) || nonEmptyString(resource.plan_id) || nonEmptyString(resource.plan?.id);
  const payerId =
    nonEmptyString(subscription?.subscriber?.payer_id) || nonEmptyString(resource.subscriber?.payer_id);
  const userId =
    nonEmptyString(subscription?.custom_id) ||
    nonEmptyString(resource.custom_id) ||
    nonEmptyString(resource.custom) ||
    null;
  const email = pickBestEmail(
    subscription?.subscriber?.email_address,
    resource.subscriber?.email_address,
    resource.payer?.email_address
  );

  return {
    user_id: userId,
    email,
    status: statusForEvent(event.event_type, subscription?.status ?? resource.status),
    paypal_subscription_id: subscriptionId,
    paypal_plan_id: planId,
    provider_customer_id: payerId,
    plan_interval: planId ? PAYPAL_PLAN_INTERVALS[planId] ?? null : null,
    current_period_end:
      nonEmptyString(subscription?.billing_info?.next_billing_time) ||
      nonEmptyString(resource.billing_info?.next_billing_time) ||
      null,
    cancel_at_period_end: false,
    metadata: {
      source: event.event_type ?? "unknown",
      paypal_event_id: event.id ?? null,
      paypal_event_summary: event.summary ?? null,
      paypal_event_create_time: event.create_time ?? null,
      paypal_event_synced_at: new Date().toISOString(),
      paypal_environment: paypalEnv,
      paypal_last_payment_amount: subscription?.billing_info?.last_payment?.amount ?? null,
      paypal_last_payment_time: subscription?.billing_info?.last_payment?.time ?? null,
    },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  let event: PayPalWebhookEvent;

  try {
    const rawBody = await getRawBody(req);
    event = JSON.parse(rawBody.toString("utf8")) as PayPalWebhookEvent;
  } catch (error: any) {
    console.error("Invalid PayPal webhook payload:", error?.message);
    return res.status(400).send("Invalid webhook payload");
  }

  try {
    const verified = await verifyPayPalWebhookSignature(req, event);

    if (!verified) {
      return res.status(400).send("PayPal webhook signature verification failed");
    }

    const eventType = event.event_type;

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.CREATED":
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      case "PAYMENT.SALE.COMPLETED":
      case "PAYMENT.SALE.REFUNDED":
      case "PAYMENT.SALE.REVERSED": {
        const subscriptionId = getSubscriptionIdFromEvent(event);

        if (!subscriptionId) {
          console.log(`PayPal event ${eventType} did not include a subscription id.`);
          break;
        }

        const subscription = await retrievePayPalSubscription(subscriptionId);
        const input = buildWriteInputFromEvent(event, subscriptionId, subscription);

        await writePayPalSubscription(input);
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("PayPal webhook handler failed:", error);
    return res.status(500).json({
      error: error?.message || "PayPal webhook handler failed",
    });
  }
}
