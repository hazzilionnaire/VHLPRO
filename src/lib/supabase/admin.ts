import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Every table has RLS on with no policies, so this is the
 * only way into the data — which is why it must never leave the server.
 * Authorization is the app's job: check the caller before you call this.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
