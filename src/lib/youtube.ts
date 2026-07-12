const YT_BASE = "https://www.googleapis.com/youtube/v3";

export type YoutubeSearchItem = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
};

type CacheEntry<T> = { at: number; data: T };
const searchCache = new Map<string, CacheEntry<YoutubeSearchItem[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY não configurada");
  return key;
}

export async function searchYoutube(
  q: string,
  maxResults = 5,
): Promise<YoutubeSearchItem[]> {
  const cacheKey = q.toLowerCase().trim();
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }

  const url = new URL(`${YT_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("q", q);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error("youtube search", res.status, text);
    throw new Error("Falha na busca do YouTube");
  }

  const json = (await res.json()) as {
    items?: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails?: { medium?: { url: string }; default?: { url: string } };
      };
    }[];
  };

  const items: YoutubeSearchItem[] = (json.items ?? []).map((it) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    thumbnail:
      it.snippet.thumbnails?.medium?.url ??
      it.snippet.thumbnails?.default?.url ??
      "",
  }));

  searchCache.set(cacheKey, { at: Date.now(), data: items });
  return items;
}

type ValidateResult = {
  ok: boolean;
  title?: string;
  thumbnail?: string;
  reason?: string;
};

const validateCache = new Map<string, CacheEntry<ValidateResult>>();

export async function validateYoutubeEmbed(
  videoId: string,
): Promise<ValidateResult> {
  const hit = validateCache.get(videoId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }

  const url = new URL(`${YT_BASE}/videos`);
  url.searchParams.set("part", "status,snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { ok: false, reason: "Não foi possível validar o vídeo." };
  }

  const json = (await res.json()) as {
    items?: {
      status: { embeddable: boolean; privacyStatus: string };
      snippet: {
        title: string;
        thumbnails?: { medium?: { url: string }; default?: { url: string } };
      };
    }[];
  };

  const item = json.items?.[0];
  if (!item) {
    return { ok: false, reason: "Vídeo não encontrado." };
  }
  if (!item.status.embeddable || item.status.privacyStatus === "private") {
    const result: ValidateResult = {
      ok: false,
      reason: "Este vídeo não permite embed. Escolha outro.",
    };
    // Não cacheia recusas: metadados de privacidade/embeddable podem mudar.
    return result;
  }

  const result: ValidateResult = {
    ok: true,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url,
  };
  validateCache.set(videoId, { at: Date.now(), data: result });
  return result;
}
