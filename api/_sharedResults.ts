import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export type SharedResultRecord = {
  code: string;
  query_string: string;
  title: string;
  summary: string | null;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function getRequestOrigin(req: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const forwardedProto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"];
  const forwardedHost = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"];

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  if (host) {
    const protocol = forwardedProto || "https";
    return `${protocol}://${host}`;
  }

  return "https://pressurecal.com";
}

export function makeShortCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }

  return value;
}

export function normalizeQueryString(input: string): string {
  return input.trim().replace(/^\?+/, "");
}

export async function insertSharedResult(args: {
  queryString: string;
  title?: string | null;
  summary?: string | null;
}): Promise<{ code: string }> {
  const queryString = normalizeQueryString(args.queryString);

  if (!queryString) {
    throw new Error("Missing query string");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeShortCode(6);

    const { error } = await supabaseAdmin.from("shared_results").insert({
      code,
      query_string: queryString,
      title: args.title?.trim() || "PressureCal result",
      summary: args.summary?.trim() || null,
    });

    if (!error) {
      return { code };
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Unable to generate a unique share code");
}

export async function findSharedResultByCode(code: string): Promise<SharedResultRecord | null> {
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("shared_results")
    .select("code, query_string, title, summary")
    .eq("code", trimmedCode)
    .maybeSingle<SharedResultRecord>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
