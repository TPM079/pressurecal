import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";

type Plan = "monthly" | "yearly";

type PayPalSubscribeButtonProps = {
  plan: Plan;
  userId: string;
  email: string;
  disabled?: boolean;
  onStarted?: () => void;
  onApproved?: () => void;
  onError?: (message: string) => void;
};

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

const planIds: Record<Plan, string | undefined> = {
  monthly: import.meta.env.VITE_PAYPAL_MONTHLY_PLAN_ID as string | undefined,
  yearly: import.meta.env.VITE_PAYPAL_YEARLY_PLAN_ID as string | undefined,
};

export default function PayPalSubscribeButton({
  plan,
  userId,
  email,
  disabled = false,
  onStarted,
  onApproved,
  onError,
}: PayPalSubscribeButtonProps) {
  const [busy, setBusy] = useState(false);
  const planId = planIds[plan];

  if (!clientId || !planId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        PayPal is not configured yet.
      </div>
    );
  }

  return (
    <div className={disabled || busy ? "pointer-events-none opacity-60" : ""}>
      <PayPalScriptProvider
        options={{
          clientId,
          vault: true,
          intent: "subscription",
          components: "buttons",
        }}
      >
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "blue",
            shape: "pill",
            label: "subscribe",
          }}
          disabled={disabled || busy}
          forceReRender={[planId, userId, email, disabled, busy]}
          createSubscription={(_, actions) => {
            onStarted?.();

            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId,
              subscriber: {
                email_address: email,
              },
              application_context: {
                brand_name: "PressureCal",
                user_action: "SUBSCRIBE_NOW",
              },
            } as any);
          }}
          onApprove={async (data) => {
            const subscriptionID = data.subscriptionID;

            if (!subscriptionID) {
              onError?.("PayPal approved the checkout, but no subscription ID was returned.");
              return;
            }

            setBusy(true);

            try {
              const response = await fetch("/api/paypal-subscription-approved", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  subscriptionID,
                  plan,
                  userId,
                  email,
                }),
              });

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || "Unable to confirm PayPal subscription.");
              }

              onApproved?.();
            } catch (error) {
              console.error(error);
              onError?.(
                error instanceof Error
                  ? error.message
                  : "Unable to confirm PayPal subscription."
              );
            } finally {
              setBusy(false);
            }
          }}
          onError={(error) => {
            console.error(error);
            onError?.("PayPal checkout could not be started. Please try again.");
          }}
          onCancel={() => {
            onError?.("PayPal checkout was cancelled.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
