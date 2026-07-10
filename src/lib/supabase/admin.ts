import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — SOMENTE no servidor.
 * Nunca importe este módulo em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Singleton lazy para Route Handlers */
let _admin: ReturnType<typeof createAdminClient> | null = null;

export function supabaseAdmin() {
  if (!_admin) {
    _admin = createAdminClient();
  }
  return _admin;
}
