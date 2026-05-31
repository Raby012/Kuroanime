export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

export function getEmbedSources(
  imdbId: string | null,
  tmdbId: number | null,
  malId: number | null,
  season: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const sources: StreamSource[] = [];

  // TMDB-based sources (most reliable for anime)
  if (tmdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/tmdb:${tmdbId}`, provider: "VidSrc CC" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/tmdb:${tmdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://player.smashy.stream/tv/${tmdbId}?s=${season}&e=${episode}`, provider: "SmashyStream" });
    }
  }

  // IMDB-based sources
  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc (IMDB)" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embed/${imdbId}`, provider: "2Embed" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc (IMDB)" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`, provider: "2Embed" });
    }
  }

  // MAL ID based anime-specific sources
  if (malId && !isMovie) {
    sources.push({ type: "embed", url: `https://2anime.xyz/embed/${malId}/${episode}`, provider: "2Anime" });
    sources.push({ type: "embed", url: `https://animepahe.ru/embed/${malId}/${episode}`, provider: "AnimePahe" });
  }

  return sources;
}
