import { NextResponse } from "next/server";
import { createBrowserSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** POST /api/admin/login { email, password } */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "E-mail e senha obrigatórios." }, { status: 400 });
    }

    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const { data: admin } = await supabaseAdmin()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Sem permissão de admin." }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha no login." }, { status: 500 });
  }
}
