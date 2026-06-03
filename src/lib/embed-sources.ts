export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── MegaPlay — AniList ID + MAL ID (both for maximum coverage) ────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // AniList ID endpoint
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`, provider: "MegaPlay Dub", lang: "dub" },
  ];

  // MAL ID endpoint — better coverage for older/niche anime
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`, provider: "MegaPlay MAL Dub", lang: "dub" });
  }

  return sources;
}

// ── VidSrc via MAL ID ──────────────────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  if (isMovie) {
    return [
      { type: "embed", url: `https://vidsrc.cc/v2/embed/movie/mal-${malId}`, provider: "VidSrc CC", lang: "sub" },
      { type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/1/1`, provider: "VidSrc", lang: "sub" },
      { type: "embed", url: `https://vidsrc.fyi/embed/movie/mal-${malId}`, provider: "VidSrc FYI", lang: "sub" },
    ];
  }
  return [
    { type: "embed", url: `https://vidsrc.cc/v2/embed/anime/${malId}/${episode}/1`, provider: "VidSrc CC", lang: "sub" },
    { type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/${episode}`, provider: "VidSrc", lang: "sub" },
    { type: "embed", url: `https://vidsrc.fyi/embed/anime/${malId}/${episode}`, provider: "VidSrc FYI", lang: "sub" },
    { type: "embed", url: `https://vidlink.pro/anime/${malId}/${episode}`, provider: "VidLink", lang: "sub" },
  ];
}

// ── LetsEmbed — Hindi/Tamil/Telugu via TMDB ID ────────────────────────────

export function getLetsEmbedSources(
  tmdbId: number | null,
  episode: number,
  season: number,
  isMovie: boolean
): StreamSource[] {
  if (!tmdbId) return [];
  if (isMovie) {
    return [
      { type: "embed", url: `https://letsembed.cc/embed/movie/?id=${tmdbId}&lang=hi`, provider: "LetsEmbed Hindi", lang: "hindi" },
      { type: "embed", url: `https://letsembed.cc/embed/movie/?id=${tmdbId}&lang=ta`, provider: "LetsEmbed Tamil", lang: "tamil" },
      { type: "embed", url: `https://letsembed.cc/embed/movie/?id=${tmdbId}&lang=te`, provider: "LetsEmbed Telugu", lang: "telugu" },
    ];
  }
  return [
    { type: "embed", url: `https://letsembed.cc/embed/tv/?id=${tmdbId}&season=${season}&episode=${episode}&lang=hi`, provider: "LetsEmbed Hindi", lang: "hindi" },
    { type: "embed", url: `https://letsembed.cc/embed/tv/?id=${tmdbId}&season=${season}&episode=${episode}&lang=ta`, provider: "LetsEmbed Tamil", lang: "tamil" },
    { type: "embed", url: `https://letsembed.cc/embed/tv/?id=${tmdbId}&season=${season}&episode=${episode}&lang=te`, provider: "LetsEmbed Telugu", lang: "telugu" },
  ];
}

// ── All TMDB/IMDb based embeds ─────────────────────────────────────────────

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
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc CC (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/${tmdbId}`, provider: "VidSrc FYI (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
      sources.push({ type: "embed", url: `https://letsembed.cc/embed/movie/?id=${tmdbId}`, provider: "LetsEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`, provider: "MultiEmbed", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      sources.push({ type: "embed", url: `https://superembed.stream/embed/tmdb/${tmdbId}/${season}/${episode}`, provider: "SuperEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://autoembed.cc/embed/tmdb/${tmdbId}/tv/${season}/${episode}`, provider: "AutoEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc ICU", lang: "sub" });
      sources.push({ type: "embed", url: `https://player.videasy.net/embed/tv/${tmdbId}/${season}/${episode}`, provider: "Videasy", lang: "sub" });
      sources.push({ type: "embed", url: `https://letsembed.cc/embed/tv/?id=${tmdbId}&season=${season}&episode=${episode}`, provider: "LetsEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC (IMDb)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc (IMDb)", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC (IMDb)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc (IMDb)", lang: "sub" });
    }
  }

  return sources;
}
