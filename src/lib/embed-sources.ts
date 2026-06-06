export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── Instant fallback sources (show while Anikoto resolver loads) ──────────────
// These are the /ani/ and /mal/ URL formats which work for MAPPED anime.
// The real working sources come from /api/anikoto/[anilistId] which returns
// the correct /stream/s-2/{embedId}/ URLs that cover the FULL library.

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // MegaPlay AniList — works for mapped anime (instant, no API call)
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`, provider: "MegaPlay Dub", lang: "dub" },
    // VidNest fallback
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/sub`, provider: "VidNest Sub", lang: "sub" },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/dub`, provider: "VidNest Dub", lang: "dub" },
  ];
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`, provider: "MegaPlay MAL Dub", lang: "dub" });
  }
  return sources;
}

export function getIndianDubSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  return [
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/hindi`,  provider: "VidNest हिंदी",  lang: "hindi"  },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/hindi`,   provider: "NHDapi हिंदी",   lang: "hindi"  },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/tamil`,  provider: "VidNest தமிழ்", lang: "tamil"  },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/tamil`,   provider: "NHDapi தமிழ்",  lang: "tamil"  },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/telugu`, provider: "VidNest తెలుగు", lang: "telugu" },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/telugu`,  provider: "NHDapi తెలుగు", lang: "telugu" },
    ...(malId ? [
      { type: "embed" as const, url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/hindi`,  provider: "MegaPlay हिंदी",  lang: "hindi"  },
      { type: "embed" as const, url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/tamil`,  provider: "MegaPlay தமிழ்", lang: "tamil"  },
      { type: "embed" as const, url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/telugu`, provider: "MegaPlay తెలుగు", lang: "telugu" },
    ] : []),
  ];
}

export function getMalEmbedSources(malId: number | null, episode: number, isMovie: boolean): StreamSource[] {
  if (!malId) return [];
  if (isMovie) return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`, provider: "VidSrc.me", lang: "sub" }];
  return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`, provider: "VidSrc.me", lang: "sub" }];
}

export function getEmbedSources(imdbId: string | null, tmdbId: number | null, season: number, episode: number, isMovie: boolean): StreamSource[] {
  const s: StreamSource[] = [];
  if (tmdbId) {
    if (isMovie) {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`, provider: "VidAPI", lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 2", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidAPI", lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      s.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }
  if (imdbId) {
    if (isMovie) s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}`, provider: "VidSrc IMDb", lang: "sub" });
    else s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc IMDb", lang: "sub" });
  }
  return s;
}
