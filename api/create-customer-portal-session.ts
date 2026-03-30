import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
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

type PortalRequestBody = {
  userId?: string | null;
};

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

async function getStripeCustomerIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id, status, current_period_end, updated_at")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to load subscriptions for portal session:", error);
    throw new Error("Unable to load subscription details");
  }

  if (!data || data.length === 0) {
    return null;
  }

  const ranked = [...data].sort((a: any, b: any) => {
    const rank = (status?: string | null) => {
      switch (status) {
        case "active":
          return 0;
        case "trialing":
          return 1;
        case "past_due":
          return 2;
        case "unpaid":
          return 3;
        case "canceled":
          return 4;
        case "incomplete":
          return 5;
        case "incomplete_expired":
          return 6;
        default:
          return 99;
      }
    };

    const rankDiff = rank(a.status) - rank(b.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return updatedB - updatedA;
  });

  return ranked[0]?.stripe_customer_id ?? null;
}

async function ensureStripeCustomerExists(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if ("deleted" in customer && customer.deleted) {
      return null;
    }

    return customer.id;
  } catch (error: any) {
    const isMissingCustomer =
      error?.type === "StripeInvalidRequestError" &&
      error?.code === "resource_missing";

    if (isMissingCustomer) {
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
    const { userId }: PortalRequestBody = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const stripeCustomerId = await getStripeCustomerIdForUser(userId);

    if (!stripeCustomerId) {
      return res.status(404).json({ error: "No Stripe customer found for this user" });
    }

    const validCustomerId = await ensureStripeCustomerExists(stripeCustomerId);

    if (!validCustomerId) {
      return res.status(404).json({ error: "Stored Stripe customer could not be found" });
    }

    const origin = getRequestOrigin(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: validCustomerId,
      return_url: `${origin}/pricing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe portal error:", error);
    return res.status(500).json({
      error: error?.message || "Unable to create customer portal session",
    });
  }
}
