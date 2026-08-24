import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, which is why it is server-only and why RLS is
 * enabled with no policies on every table (migration 0001): the anon key can then
 * read nothing, and the dispatch board has to come through a server route.
 */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
