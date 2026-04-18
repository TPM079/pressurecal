import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSharedResult } from "./_sharedResults.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { queryString, title, summary } = req.body ?? {};

    if (!queryString || typeof queryString !== "string") {
      return res.status(400).json({ error: "Missing queryString" });
    }

    const result = await createSharedResult({
      queryString,
      title: typeof title === "string" && title.trim() ? title.trim() : "PressureCal result",
      summary: typeof summary === "string" && summary.trim() ? summary.trim() : null,
      origin:
        typeof req.headers.origin === "string" && req.headers.origin.trim()
          ? req.headers.origin.trim()
          : `https://${req.headers.host ?? "www.pressurecal.com"}`,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to create share link:", error);

    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    return res.status(500).json({
      error: "Unable to create share link",
      detail,
    });
  }
}

