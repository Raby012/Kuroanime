// src/lib/embed-sources.ts

export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── AniList-ID based embeds (ACTUALLY WORK) ────────────────────────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  return [
    {
      // MegaPlay — full HiAnime library, direct AniList ID support
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`,
      provider: "MegaPlay Sub",
    },
    {
      // MegaPlay Dub
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`,
      provider: "MegaPlay Dub",
    },
  ];
}

// ── Title-slug based (AutoEmbed) ───────────────────────────────────────────

export function getAutoEmbedSource(
  title: string,
  year: number | null,
  episode: number
): StreamSource[] {
  // AutoEmbed format: lowercase, spaces→hyphens, append year
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const slugWithYear = year ? `${slug}-${year}` : slug;

  return [
    {
      type: "embed",
      url: `https://anime.autoembed.cc/embed/${slugWithYear}-episode-${episode}`,
      provider: "AutoEmbed",
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
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embed/${imdbId}`, provider: "2Embed" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`, provider: "2Embed" });
    }
  }

  if (tmdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc TMDB" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc TMDB" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" });
    }
  }

  return sources;
}
