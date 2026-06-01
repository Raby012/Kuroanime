export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

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

export function getAutoEmbedSource(): StreamSource[] {
  return []; // dead domain
}

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
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/${tmdbId}`, provider: "VidSrc FYI" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" });
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
