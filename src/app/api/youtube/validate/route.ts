import { NextResponse } from "next/server";
import { validateYoutubeEmbed } from "@/lib/youtube";
import { youtubeValidateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
