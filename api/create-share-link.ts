import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getRequestOrigin,
  insertSharedResult,
  normalizeQueryString,
} from "./_sharedResults";

type CreateShareLinkBody = {
  queryString?: string;
  title?: string | null;
  summary?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as CreateShareLinkBody;
    const queryString = normalizeQueryString(body.queryString ?? "");

    if (!queryString) {
      return res.status(400).json({ error: "Missing queryString" });
    }

    const { code } = await insertSharedResult({
      queryString,
      title: body.title,
      summary: body.summary,
    });

    const origin = getRequestOrigin(req);

    return res.status(200).json({
      code,
      shortUrl: `${origin}/s/${code}`,
    });
  } catch (error) {
    console.error("Failed to create share link:", error);
    return res.status(500).json({ error: "Unable to create share link" });
  }
}
