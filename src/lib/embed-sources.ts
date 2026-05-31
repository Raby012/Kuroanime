// src/lib/embed-sources.ts

export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── VidSrc Embed Providers (TMDB/IMDB based, most stable) ─────────────────


  // In embed-sources.ts, add this function:
export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const sources: StreamSource[] = [];

  if (!isMovie) {
    sources.push({
      type: "embed",
      url: `https://2anime.xyz/embed/${anilistId}/${episode}`,
      provider: "2Anime",
    });
    sources.push({
      type: "embed",
      url: `https://www.animekai.to/player?al=${anilistId}&ep=${episode}`,
      provider: "AnimeKai",
    });
    sources.push({
      type: "embed",
      url: `https://player.animepahe.ru/anime/${anilistId}/${episode}`,
      provider: "PaheEmbed",
    });
  }

  return sources;
}
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
