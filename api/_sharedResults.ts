import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

type CreateSharedResultInput = {
  queryString: string;
  title: string;
  summary: string | null;
  origin: string;
};

type ResolveSharedResult = {
  query_string: string;
  title: string | null;
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

const supabase = createClient(supabaseUrl, serviceRoleKey);

function makeCode(length = 6) {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export async function createSharedResult(input: CreateSharedResultInput) {
  const code = makeCode(6);

  const { error } = await supabase.from("shared_results").insert({
    code,
    query_string: input.queryString.replace(/^\?+/, ""),
    title: input.title,
    summary: input.summary,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    code,
    shortUrl: `${input.origin.replace(/\/$/, "")}/s/${code}`,
  };
}

export async function getSharedResultByCode(code: string): Promise<ResolveSharedResult | null> {
  const { data, error } = await supabase
    .from("shared_results")
    .select("query_string,title,summary")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
