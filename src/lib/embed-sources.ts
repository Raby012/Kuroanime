export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── SUB + DUB sources (AniList ID, instant) ───────────────────────────────
// TryEmbed REMOVED — shows "PLAYBACK ERROR. ALL SERVERS UNAVAILABLE" for most anime.
// It loads its own UI first, then fails internally — unfixable on our end.

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // MegaPlay — AniList ID (best coverage)
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`, provider: "MegaPlay Dub", lang: "dub" },
    // VidNest — AniList ID, reliable, no TryEmbed issues
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/sub`, provider: "VidNest Sub", lang: "sub" },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/dub`, provider: "VidNest Dub", lang: "dub" },
    // NHDapi — AniList ID
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/sub`, provider: "NHDapi Sub", lang: "sub" },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/dub`, provider: "NHDapi Dub", lang: "dub" },
  ];

  // MAL ID fallbacks — different database, catches what AniList mapping misses
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`, provider: "MegaPlay MAL Dub", lang: "dub" });
  }

  return sources;
}

// ── Hindi / Tamil / Telugu — REAL dub sources ─────────────────────────────
// VidNest and NHDapi natively support hindi/tamil/telugu via AniList ID.
// These are actual dubbed audio tracks, not fake ds_lang subtitle params.

export function getIndianDubSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [];

  // VidNest — confirmed hindi/tamil/telugu support via AniList ID
  sources.push({ type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/hindi`,  provider: "VidNest हिंदी",   lang: "hindi"  });
  sources.push({ type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/tamil`,  provider: "VidNest தமிழ்",  lang: "tamil"  });
  sources.push({ type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/telugu`, provider: "VidNest తెలుగు", lang: "telugu" });

  // NHDapi — same URL format, same language support
  sources.push({ type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/hindi`,  provider: "NHDapi हिंदी",   lang: "hindi"  });
  sources.push({ type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/tamil`,  provider: "NHDapi தமிழ்",  lang: "tamil"  });
  sources.push({ type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/telugu`, provider: "NHDapi తెలుగు", lang: "telugu" });

  // AnimePahe variants via VidNest (different source backend — more coverage)
  sources.push({ type: "embed", url: `https://vidnest.fun/animepahe/${anilistId}/${ep}/hindi`,  provider: "VidNest Pahe हिंदी",   lang: "hindi"  });
  sources.push({ type: "embed", url: `https://vidnest.fun/animepahe/${anilistId}/${ep}/tamil`,  provider: "VidNest Pahe தமிழ்",  lang: "tamil"  });
  sources.push({ type: "embed", url: `https://vidnest.fun/animepahe/${anilistId}/${ep}/telugu`, provider: "VidNest Pahe తెలుగు", lang: "telugu" });

  // MegaPlay Indian dubs (these may or may not work depending on mapping)
  sources.push({ type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/hindi`,  provider: "MegaPlay हिंदी",   lang: "hindi"  });
  sources.push({ type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/tamil`,  provider: "MegaPlay தமிழ்",  lang: "tamil"  });
  sources.push({ type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/telugu`, provider: "MegaPlay తెలుగు", lang: "telugu" });

  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/hindi`,  provider: "MegaPlay MAL हिंदी",   lang: "hindi"  });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/tamil`,  provider: "MegaPlay MAL தமிழ்",  lang: "tamil"  });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/telugu`, provider: "MegaPlay MAL తెలుగు", lang: "telugu" });
  }

  return sources;
}

// ── VidSrc via MAL ID — sub only ──────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  if (isMovie) return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`, provider: "VidSrc.me", lang: "sub" }];
  return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`, provider: "VidSrc.me", lang: "sub" }];
}

// ── TMDB/IMDb embeds — sub only ───────────────────────────────────────────

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
