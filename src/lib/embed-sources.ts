// src/lib/embed-sources.ts

export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── AniList-ID based embeds (always available, most reliable) ──────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  return [
    {
      type: "embed",
      url: `https://2anime.xyz/embed/${anilistId}/${ep}`,
      provider: "2Anime",
    },
    {
      type: "embed",
      url: `https://anify.tv/embed?id=${anilistId}&number=${ep}&audio=sub`,
      provider: "Anify",
    },
    {
      type: "embed",
      url: `https://miruro.tv/watch?id=${anilistId}&ep=${ep}`,
      provider: "Miruro",
    },
  ];
}

// ── IMDb/TMDB based embeds (only when imdbId is available) ─────────────────

export function getEmbedSources(
  imdbId: string | null,
  tmdbId: number | null,
  season: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const sources: StreamSource[] = [];

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/movie/${imdbId}`, provider: "VidSrc 2" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embed/${imdbId}`, provider: "2Embed" });
      sources.push({ type: "embed", url: `https://player.smashy.stream/movie/${imdbId}`, provider: "SmashyStream" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 2" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`, provider: "2Embed" });
      sources.push({ type: "embed", url: `https://player.smashy.stream/tv/${imdbId}?s=${season}&e=${episode}`, provider: "SmashyStream" });
    }
  }

  if (tmdbId && !isMovie) {
    sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" });
  }

  return sources;
}
