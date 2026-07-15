import { NextResponse } from "next/server";
import { searchYoutube } from "@/lib/youtube";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { youtubeSearchSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Proxy sem auth pra YouTube Data API — sem teto, terceiros drenam a quota
  // da YOUTUBE_API_KEY.
  const limit = rateLimit(`yt-search:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

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
