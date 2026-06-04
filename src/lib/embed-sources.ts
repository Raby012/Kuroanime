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

// ── Primary anime embed sources ───────────────────────────────────────────
// These use AniList IDs directly — no TMDB lookup needed, instant load.
// Ordered by reliability / coverage (best first).

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // ── SUB ──────────────────────────────────────────────────────────────
    // MegaPlay — AniList ID (highest coverage for SUB)
    {
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`,
      provider: "MegaPlay Sub",
      lang: "sub",
    },
    // MegaPlay — MAL ID fallback (different DB, catches what AniList misses)
    ...(malId
      ? [{
          type: "embed" as const,
          url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`,
          provider: "MegaPlay MAL Sub",
          lang: "sub",
        }]
      : []),
    // TryEmbed — SUB
    {
      type: "embed",
      url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/sub`,
      provider: "TryEmbed Sub",
      lang: "sub",
    },

    // ── DUB ──────────────────────────────────────────────────────────────
    // MegaPlay — AniList ID dub
    {
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`,
      provider: "MegaPlay Dub",
      lang: "dub",
    },
    // MegaPlay — MAL ID dub
    ...(malId
      ? [{
          type: "embed" as const,
          url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`,
          provider: "MegaPlay MAL Dub",
          lang: "dub",
        }]
      : []),
    // TryEmbed — DUB
    {
      type: "embed",
      url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/dub`,
      provider: "TryEmbed Dub",
      lang: "dub",
    },
  ];

  return sources;
}

// ── Indian language dub sources ───────────────────────────────────────────
// AutoEmbed has the best Hindi/Tamil/Telugu coverage using AniList IDs.

export function getIndianDubSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [];

  // ── AutoEmbed — best Indian dub coverage ──
  sources.push({
    type: "embed",
    url: `https://player.autoembed.cc/embed/anime/${anilistId}/${ep}?audio=hindi`,
    provider: "AutoEmbed हिंदी",
    lang: "hindi",
  });
  sources.push({
    type: "embed",
    url: `https://player.autoembed.cc/embed/anime/${anilistId}/${ep}?audio=tamil`,
    provider: "AutoEmbed தமிழ்",
    lang: "tamil",
  });
  sources.push({
    type: "embed",
    url: `https://player.autoembed.cc/embed/anime/${anilistId}/${ep}?audio=telugu`,
    provider: "AutoEmbed తెలుగు",
    lang: "telugu",
  });

  // ── MegaPlay Indian dubs via AniList ID ──
  sources.push({
    type: "embed",
    url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/hindi`,
    provider: "MegaPlay हिंदी",
    lang: "hindi",
  });
  sources.push({
    type: "embed",
    url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/tamil`,
    provider: "MegaPlay தமிழ்",
    lang: "tamil",
  });
  sources.push({
    type: "embed",
    url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/telugu`,
    provider: "MegaPlay తెలుగు",
    lang: "telugu",
  });

  // ── MegaPlay Indian dubs via MAL ID ──
  if (malId) {
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/hindi`,
      provider: "MegaPlay MAL हिंदी",
      lang: "hindi",
    });
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/tamil`,
      provider: "MegaPlay MAL தமிழ்",
      lang: "tamil",
    });
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/telugu`,
      provider: "MegaPlay MAL తెలుగు",
      lang: "telugu",
    });
  }

  return sources;
}

// ── VidSrc.me — MAL/TMDB ID based ─────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  if (isMovie) {
    return [
      {
        type: "embed",
        url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`,
        provider: "VidSrc.me",
        lang: "sub",
      },
    ];
  }
  return [
    {
      type: "embed",
      url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`,
      provider: "VidSrc.me",
      lang: "sub",
    },
  ];
}

// ── TMDB/IMDb embeds ───────────────────────────────────────────────────────

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
      sources.push({ type: "embed", url: `https://vsrc.su/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 3", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://primesrc.me/embed/movie?tmdb=${tmdbId}`, provider: "PrimeSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 2", lang: "sub" });
      sources.push({ type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 3", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://primesrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "PrimeSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      sources.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}`, provider: "VidSrc.me IMDb", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${imdbId}`, provider: "VidAPI IMDb", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me IMDb", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidAPI IMDb", lang: "sub" });
    }
  }

  return sources;
}
