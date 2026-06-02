export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── AniList/MAL ID based — always available instantly ─────────────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  return [
    {
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`,
      provider: "MegaPlay Sub",
    },
    {
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`,
      provider: "MegaPlay Dub",
    },
  ];
}

// ── MAL ID based VidSrc — instant fallback, no API needed ─────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  const sources: StreamSource[] = [];

  if (isMovie) {
    sources.push({
      type: "embed",
      url: `https://vidsrc.cc/v2/embed/movie/mal-${malId}`,
      provider: "VidSrc CC",
    });
    sources.push({
      type: "embed",
      url: `https://vidsrc.to/embed/anime/${malId}/1/1`,
      provider: "VidSrc",
    });
    sources.push({
      type: "embed",
      url: `https://vidsrc.fyi/embed/movie/mal-${malId}`,
      provider: "VidSrc FYI",
    });
  } else {
    sources.push({
      type: "embed",
      url: `https://vidsrc.cc/v2/embed/anime/${malId}/${episode}/1`,
      provider: "VidSrc CC",
    });
    sources.push({
      type: "embed",
      url: `https://vidsrc.to/embed/anime/${malId}/${episode}`,
      provider: "VidSrc",
    });
    sources.push({
      type: "embed",
      url: `https://vidsrc.fyi/embed/anime/${malId}/${episode}`,
      provider: "VidSrc FYI",
    });
    sources.push({
      type: "embed",
      url: `https://vidlink.pro/anime/${malId}/${episode}`,
      provider: "VidLink",
    });
  }

  return sources;
}

// ── IMDb/TMDB based embeds ─────────────────────────────────────────────────

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
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc CC (TMDB)" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc (TMDB)" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/${tmdbId}`, provider: "VidSrc FYI (TMDB)" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink (TMDB)" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC (TMDB)" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc (TMDB)" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI (TMDB)" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink (TMDB)" });
    }
  }

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC (IMDb)" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc (IMDb)" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC (IMDb)" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc (IMDb)" });
    }
  }

  return sources;
}
