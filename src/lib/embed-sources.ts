// src/lib/embed-sources.ts

export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── AniList-ID based embeds ────────────────────────────────────────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  return [
    {
      // AnimeKai - large library, AniList sync, current seasonal anime
      type: "embed",
      url: `https://anikai.to/watch/${anilistId}?ep=${ep}`,
      provider: "AnimeKai",
    },
    {
      // AnimePahe direct watch link
      type: "embed",
      url: `https://animepahe.ru/a/${anilistId}`,
      provider: "AnimePahe",
    },
    {
      // AllAnime - reliable, has most seasonal titles
      type: "embed",
      url: `https://allanime.to/anime/${anilistId}/episode-${ep}`,
      provider: "AllAnime",
    },
  ];
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

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/movie/${imdbId}`, provider: "VidSrc 2" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 2" });
    }
  }

  return sources;
}
