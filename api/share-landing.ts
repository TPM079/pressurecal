import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSharedResultByCode } from "./_sharedResults.js";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

    if (!code || typeof code !== "string") {
      return res.status(400).send("Missing share code");
    }

    const shared = await getSharedResultByCode(code);

    if (!shared) {
      return res.status(404).send("Share link not found");
    }

    const host = req.headers.host ?? "www.pressurecal.com";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const origin = `${protocol}://${host}`;
    const destination = `${origin}/calculator?${shared.query_string}`;
    const title = shared.title ?? "PressureCal result";
    const summary = shared.summary ?? "Open this PressureCal result";

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(summary)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(summary)}" />
  <meta property="og:url" content="${escapeHtml(`${origin}/s/${code}`)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(destination)}" />
</head>
<body>
  <p>Redirecting to your shared PressureCal result…</p>
  <p><a href="${escapeHtml(destination)}">Open result</a></p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Failed to resolve share link:", error);
    return res.status(500).send("Unable to open share link");
  }
}
