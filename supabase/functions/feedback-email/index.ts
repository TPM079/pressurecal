import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notifyEmail = Deno.env.get("FEEDBACK_NOTIFY_EMAIL");
    const fromEmail = Deno.env.get("FEEDBACK_FROM_EMAIL");

    if (!resendApiKey || !notifyEmail || !fromEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const payload = await req.json();
    const record = payload?.record ?? {};

    const message = record.message ?? "";
    const email = record.email ?? "—";
    const tag = record.tag ?? "general";
    const page = record.page ?? "—";
    const sourceUrl = record.source_url ?? "—";

    const subject = `[PressureCal Feedback] ${tag} on ${page}`;

    const html = `
      <h2>New Feedback</h2>
      <p><strong>Tag:</strong> ${tag}</p>
      <p><strong>Page:</strong> ${page}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Source:</strong> ${sourceUrl}</p>
      <hr/>
      <p>${message}</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      return new Response("Email failed", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Error", { status: 500 });
  }
});