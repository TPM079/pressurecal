# PressureCal Internal Security Review

## Scope

This review covers:

- Public PressureCal website pages
- Login and signup flow
- Account page
- Pricing and subscription flow
- Saved Setups
- Supabase database access
- Stripe webhook and subscription handling
- Vercel deployment settings
- Environment variables
- Basic security headers

## Reference framework

OWASP ASVS 5.0.0 used as a reference framework.

## Review type

Internal self-assessment.

Pass - Created two Pro test users. User A and User B could each access Saved Setups, but neither user could view the other user’s saved setup records. Subscription access is linked by Supabase Auth user_id.

Pass - Free logged-in user could not save setups without an active Pro subscription. The app displayed the PressureCal Pro upgrade prompt, and no saved setup row was created for the free user.

Pass - Existing cancelled/expired subscription user pressurecalapp@gmail.com could not save a setup. PressureCal showed the Pro upgrade prompt, and the saved setup count did not increase after the save attempt.

Pass - User with active subscription and cancel_at_period_end=true could still access Pro Saved Setups until current_period_end. PressureCal correctly treated cancellation at period end as active access during the paid period.

Pass - Saved setup edit/delete isolation confirmed. Other authenticated Pro users could not edit or delete a saved setup owned by another user. Saved setup ownership remained tied to the original Supabase Auth user_id.

Partial Pass - Input handling test generated a setup report successfully and long operator notes did not break the report layout. However, invalid/extreme calculator values were accepted, including negative hose length and unrealistic pressure values. Add input validation to reject negative hose length and unreasonable pressure values before saving or generating reports.

Pass - Checked project code for exposed secrets. Private server-side environment variables were referenced only by backend/API TypeScript files or Supabase Edge Functions using process.env / Deno.env.get. No actual Stripe secret keys, Stripe webhook secrets, Supabase service role key values, or Resend API key values were found in frontend code.

Pass - Production build output checked. No private environment variable names or secret-looking values were found in the frontend bundle.

Pass - Stripe webhook verification reviewed. The webhook disables body parsing, reads the raw request body, checks for the Stripe-Signature header and STRIPE_WEBHOOK_SECRET, verifies the event with stripe.webhooks.constructEvent, and stops processing if verification fails. Subscription records are only updated after successful Stripe event verification.

Pass - Stripe subscription event handling reviewed. Webhook handles checkout completion, subscription created/updated/deleted events, and invoice paid/payment failed events. Subscription status, price ID, billing interval, current period end, cancel-at-period-end state, customer ID, subscription ID, email, and user ID are synced to Supabase.

Partial Pass - User-facing error handling was clean. Invalid login, free-user save attempts, and logged-out protected routes showed appropriate user-facing messages with no secrets, tokens, raw database errors, or private API details exposed. Browser console showed non-sensitive auth warnings, including multiple GoTrueClient instances and AuthSessionMissingError when logged out. These should be cleaned up, but no sensitive information was exposed.

Partial Pass - HTTPS/Vercel response is working, but application security headers are not currently configured. Add baseline security headers through vercel.json and retest response headers after deployment.

Pass - Baseline security headers added through vercel.json. Live response headers now include Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.