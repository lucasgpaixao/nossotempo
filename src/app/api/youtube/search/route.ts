import { NextResponse } from "next/server";
import { searchYoutube } from "@/lib/youtube";
import { youtubeSearchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const parsed = youtubeSearchSchema.safeParse({ q });
  if (!parsed.success) {
    return NextResponse.json({ error: "Query inválida." }, { status: 400 });
  }

  try {
    const items = await searchYoutube(parsed.data.q);
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Busca indisponível. Verifique YOUTUBE_API_KEY." },
      { status: 503 },
    );
  }
}
