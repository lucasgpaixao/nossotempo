import { fromZonedTime } from "date-fns-tz";
import type { DraftUpdateInput } from "@/lib/validations";

const BRT = "America/Sao_Paulo";

/**
 * Converte data (YYYY-MM-DD) + hora opcional (HH:mm) em timestamptz ISO,
 * interpretando os componentes como America/Sao_Paulo.
 */
export function startedAtFromParts(
  date: string,
  time?: string | null,
): string {
  const t = time && time.length >= 4 ? time : "00:00";
  const local = `${date}T${t}:00`;
  return fromZonedTime(local, BRT).toISOString();
}

/** Mapeia campos do PATCH do wizard para colunas do banco */
export function draftPatchToRow(input: DraftUpdateInput) {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name1 !== undefined) row.name1 = input.name1;
  if (input.name2 !== undefined) row.name2 = input.name2;
  if (input.message !== undefined) row.message = input.message;
  if (input.buyerEmail !== undefined) row.buyer_email = input.buyerEmail;

  if (input.youtubeVideoId !== undefined) {
    row.youtube_video_id = input.youtubeVideoId;
  }
  if (input.youtubeTitle !== undefined) {
    row.youtube_title = input.youtubeTitle;
  }
  if (input.youtubeThumbnail !== undefined) {
    row.youtube_thumbnail = input.youtubeThumbnail;
  }

  if (input.startedDate) {
    row.started_at = startedAtFromParts(
      input.startedDate,
      input.startedTime,
    );
  }

  if (input.termsAccepted === true) {
    row.terms_accepted_at = new Date().toISOString();
  }

  return row;
}
