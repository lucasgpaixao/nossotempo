import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cliente anon com cookies de sessão do admin (SSR).
 * Usa cookies `sb-access-token` / `sb-refresh-token` setados no login.
 */
export async function createAdminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const jar = await cookies();
  const access = jar.get("sb-access-token")?.value;
  const refresh = jar.get("sb-refresh-token")?.value;

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: access
      ? { headers: { Authorization: `Bearer ${access}` } }
      : undefined,
  });

  if (access) {
    await client.auth.setSession({
      access_token: access,
      refresh_token: refresh ?? "",
    });
  }

  return client;
}

export async function requireAdmin() {
  const client = await createAdminAuthClient();
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: row } = await supabaseAdmin()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return null;
  return user;
}
