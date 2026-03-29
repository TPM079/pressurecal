import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

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

function toIsoOrNull(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function upsertSubscription(input: {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_checkout_session_id?: string | null;
  email?: string | null;
  status: string;
  price_id?: string | null;
  plan_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, any>;
}) {
  const payload: Record<string, any> = {
    stripe_customer_id: input.stripe_customer_id ?? null,
    stripe_subscription_id: input.stripe_subscription_id ?? null,
    stripe_checkout_session_id: input.stripe_checkout_session_id ?? null,
    status: input.status,
    price_id: input.price_id ?? null,
    plan_interval: input.plan_interval ?? null,
    current_period_end: input.current_period_end ?? null,
    cancel_at_period_end: input.cancel_at_period_end ?? false,
    metadata: input.metadata ?? {},
  };

  // Only set email when we actually have one.
  // This prevents later subscription webhooks from overwriting it with null.
  if (input.email) {
    payload.email = input.email;
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(payload, { onConflict: "stripe_subscription_id" });

  if (error) throw error;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).send("Missing webhook signature or secret");
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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
              : session.subscription?.id;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            );

            await upsertSubscription({
              stripe_customer_id:
                typeof subscription.customer === "string"
                  ? subscription.customer
                  : subscription.customer?.id,
              stripe_subscription_id: subscription.id,
              stripe_checkout_session_id: session.id,
              email:
                session.customer_details?.email ||
                session.customer_email ||
                null,
              status: subscription.status,
              price_id: subscription.items.data[0]?.price?.id ?? null,
              plan_interval:
                subscription.items.data[0]?.price?.recurring?.interval ?? null,
              current_period_end: toIsoOrNull(
                (subscription as any).current_period_end ??
                  subscription.items.data[0]?.current_period_end ??
                  null
              ),
              cancel_at_period_end: subscription.cancel_at_period_end,
              metadata: {
                source: "checkout.session.completed",
              },
            });
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await upsertSubscription({
          stripe_customer_id:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price?.id ?? null,
          plan_interval:
            subscription.items.data[0]?.price?.recurring?.interval ?? null,
          current_period_end: toIsoOrNull(
            (subscription as any).current_period_end ??
              subscription.items.data[0]?.current_period_end ??
              null
          ),
          cancel_at_period_end: subscription.cancel_at_period_end,
          metadata: {
            source: event.type,
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              metadata: {
                source: "invoice.payment_failed",
                invoice_id: invoice.id,
              },
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) throw error;
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