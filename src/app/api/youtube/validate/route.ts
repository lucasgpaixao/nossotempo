import { NextResponse } from "next/server";
import { validateYoutubeEmbed } from "@/lib/youtube";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { youtubeValidateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = rateLimit(`yt-validate:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const body = await req.json().catch(() => ({}));
  const parsed = youtubeValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "videoId inválido." }, { status: 400 });
  }

  try {
    const result = await validateYoutubeEmbed(parsed.data.videoId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, reason: "Validação indisponível." },
      { status: 503 },
    );
  }
}
