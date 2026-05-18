import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/** Server-only Supabase client (service role). Returns null if env is not configured. */
export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url?.trim() || !key) return null;
  return createClient<Database>(url.trim(), key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
