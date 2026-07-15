import { NextResponse } from "next/server";
import { createAdminAuthClient } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  // Revoga a sessão no servidor (invalida o refresh token) antes de limpar
  // os cookies — só apagar os cookies deixava o token válido por até 30 dias
  // se tivesse sido copiado.
  try {
    const client = await createAdminAuthClient();
    await client.auth.signOut();
  } catch (e) {
    console.error("logout signOut", e);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  res.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
  return res;
}
