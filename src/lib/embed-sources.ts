export type StreamSource =
  | {
      type: "m3u8";
      url: string;
      subtitles?: { url: string; lang: string }[];
      provider: string;
      lang?: string;
    }
  | {
      type: "embed";
      url: string;
      provider: string;
      lang?: string;
    };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── SUB + DUB embed sources (AniList ID based, instant) ───────────────────
// These genuinely serve Japanese sub and English dub content.

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // MegaPlay — widest anime coverage via AniList ID
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`, provider: "MegaPlay Dub", lang: "dub" },
    // TryEmbed — good coverage, AniList native
    { type: "embed", url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/sub`, provider: "TryEmbed Sub", lang: "sub" },
    { type: "embed", url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/dub`, provider: "TryEmbed Dub", lang: "dub" },
  ];

  // MAL ID variants — different DB, catches what AniList mapping misses
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`, provider: "MegaPlay MAL Dub", lang: "dub" });
  }

  return sources;
}

// ── VidSrc via MAL ID — sub only ──────────────────────────────────────────
// NOTE: VidSrc ds_lang param does NOT change audio to Hindi/Tamil/Telugu.
// It only sets subtitle preference. Do NOT use ds_lang for Indian dubs.

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  if (isMovie) {
    return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`, provider: "VidSrc.me", lang: "sub" }];
  }
  return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`, provider: "VidSrc.me", lang: "sub" }];
}

// ── TMDB/IMDb embed sources — sub only ────────────────────────────────────
// These are general streaming embeds. They do NOT have real Hindi/Tamil/Telugu
// dubbed anime audio. Only listed under "sub" lang intentionally.

export function getEmbedSources(
  imdbId: string | null,
  tmdbId: number | null,
  season: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const sources: StreamSource[] = [];

  if (tmdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 1", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrcme.su/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 2", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 2", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      sources.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}`, provider: "VidSrc IMDb", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc IMDb", lang: "sub" });
    }
  }

  return sources;
}

// ── Indian dub sources ────────────────────────────────────────────────────
// These are ONLY added when the /api/stream?provider=indian route resolves
// real m3u8 URLs from watchanimeworld.net scraper.
// This function is intentionally empty — Indian sources come from the API route.
// DO NOT add fake ds_lang=hi VidSrc URLs here — they play English, not Hindi.
export function getIndianDubSources(
  _anilistId: number,
  _episode: number,
  _isMovie: boolean,
  _malId?: number | null
): StreamSource[] {
  return []; // Real sources fetched async via /api/stream?provider=indian
}
