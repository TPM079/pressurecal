import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type SubscriptionWriteInput = {
  user_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id: string;
  stripe_checkout_session_id?: string | null;
  email?: string | null;
  status: string;
  price_id?: string | null;
  plan_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const stripe = new Stripe(stripeSecretKey);

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

function toIsoOrNull(value?: number | null): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
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

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

function getUserIdFromMetadata(
  metadata?: Stripe.Metadata | Record<string, unknown> | null,
  clientReferenceId?: string | null
): string | null {
  const metadataUserId = nonEmptyString(metadata?.["supabase_user_id"]);
  return metadataUserId || nonEmptyString(clientReferenceId) || null;
}

async function getExistingSubscriptionRow(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, email, metadata, stripe_checkout_session_id, stripe_customer_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertSubscription(input: SubscriptionWriteInput) {
  const existing = await getExistingSubscriptionRow(input.stripe_subscription_id);

  const payload: Record<string, unknown> = {
    stripe_subscription_id: input.stripe_subscription_id,
    stripe_customer_id: input.stripe_customer_id ?? existing?.stripe_customer_id ?? null,
    stripe_checkout_session_id:
      input.stripe_checkout_session_id ?? existing?.stripe_checkout_session_id ?? null,
    status: input.status,
    price_id: input.price_id ?? null,
    plan_interval: input.plan_interval ?? null,
    current_period_end: input.current_period_end ?? null,
    cancel_at_period_end: input.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
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

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(payload, { onConflict: "stripe_subscription_id" });

  if (error) {
    throw error;
  }
}

async function buildSubscriptionWriteInput(
  subscription: Stripe.Subscription,
  options?: {
    checkoutSession?: Stripe.Checkout.Session | null;
    source?: string;
  }
): Promise<SubscriptionWriteInput> {
  const checkoutSession = options?.checkoutSession ?? null;
  const customerId = getCustomerId(subscription.customer);

  let customerEmail: string | null = null;
  if (subscription.customer && typeof subscription.customer !== "string" && !("deleted" in subscription.customer)) {
    customerEmail = pickBestEmail(subscription.customer.email);
  }

  return {
    user_id: getUserIdFromMetadata(subscription.metadata, checkoutSession?.client_reference_id ?? null),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_checkout_session_id: checkoutSession?.id ?? null,
    email: pickBestEmail(
      customerEmail,
      checkoutSession?.customer_details?.email,
      checkoutSession?.customer_email,
      subscription.metadata?.app_email
    ),
    status: subscription.status,
    price_id: subscription.items.data[0]?.price?.id ?? null,
    plan_interval: subscription.items.data[0]?.price?.recurring?.interval ?? null,
    current_period_end: toIsoOrNull(
      (subscription as any).current_period_end ?? subscription.items.data[0]?.current_period_end ?? null
    ),
    cancel_at_period_end: subscription.cancel_at_period_end,
    metadata: {
      source: options?.source ?? "unknown",
      stripe_event_synced_at: new Date().toISOString(),
    },
  };
}

async function retrieveSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer"],
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature || !stripeWebhookSecret) {
    return res.status(400).send("Missing webhook signature or secret");
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error?.message);
    return res.status(400).send(`Webhook Error: ${error?.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription") {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id ?? null;

          if (subscriptionId) {
            const subscription = await retrieveSubscription(subscriptionId);
            const input = await buildSubscriptionWriteInput(subscription, {
              checkoutSession: session,
              source: event.type,
            });

            await upsertSubscription(input);
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const input = await buildSubscriptionWriteInput(subscription, {
          source: event.type,
        });

        await upsertSubscription(input);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;

        if (subscriptionId) {
          const subscription = await retrieveSubscription(subscriptionId);
          const input = await buildSubscriptionWriteInput(subscription, {
            source: event.type,
          });

          await upsertSubscription({
            ...input,
            metadata: {
              ...(input.metadata ?? {}),
              stripe_invoice_id: invoice.id,
            },
          });
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler failed:", error);
    return res.status(500).json({
      error: error?.message || "Webhook handler failed",
    });
  }
}
