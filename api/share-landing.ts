import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  escapeHtml,
  findSharedResultByCode,
  getRequestOrigin,
} from "./_sharedResults";

function renderHtml(args: {
  title: string;
  description: string;
  canonicalUrl: string;
  calculatorUrl: string;
}) {
  const title = escapeHtml(args.title);
  const description = escapeHtml(args.description);
  const canonicalUrl = escapeHtml(args.canonicalUrl);
  const calculatorUrl = escapeHtml(args.calculatorUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta http-equiv="refresh" content="0;url=${calculatorUrl}" />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 560px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        margin: 0;
        font-size: 12px;
        line-height: 1.2;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
      }
      h1 {
        margin: 14px 0 0;
        font-size: 30px;
        line-height: 1.15;
      }
      p {
        margin: 14px 0 0;
        font-size: 16px;
        line-height: 1.65;
        color: #475569;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 22px;
        padding: 12px 18px;
        border-radius: 16px;
        background: #020617;
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
      .small {
        margin-top: 12px;
        font-size: 13px;
        color: #64748b;
      }
    </style>
    <script>
      window.location.replace(${JSON.stringify(args.calculatorUrl)});
    </script>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <p class="eyebrow">PressureCal share link</p>
        <h1>${title}</h1>
        <p>${description}</p>
        <a class="button" href="${calculatorUrl}">Open in calculator</a>
        <p class="small">If the calculator does not open automatically, use the button above.</p>
      </section>
    </main>
  </body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const codeParam = req.query.code;
    const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

    if (!code) {
      return res.status(400).send("Missing share code");
    }

    const shared = await findSharedResultByCode(code);

    if (!shared) {
      return res.status(404).send("Share link not found");
    }

    const origin = getRequestOrigin(req);
    const canonicalUrl = `${origin}/s/${shared.code}`;
    const calculatorUrl = `${origin}/calculator?${shared.query_string}`;
    const title = shared.title || "PressureCal result";
    const description = shared.summary || "Open this PressureCal setup in the calculator.";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");

    return res.status(200).send(
      renderHtml({
        title,
        description,
        canonicalUrl,
        calculatorUrl,
      })
    );
  } catch (error) {
    console.error("Failed to render share landing page:", error);
    return res.status(500).send("Unable to open share link");
  }
}
