export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── AniList ID based ───────────────────────────────────────────────────────

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
      lang: "sub",
    },
    {
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`,
      provider: "MegaPlay Dub",
      lang: "dub",
    },
  ];
}

// ── MAL ID based VidSrc ────────────────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  const sources: StreamSource[] = [];
  if (isMovie) {
    sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/mal-${malId}`, provider: "VidSrc CC", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/1/1`, provider: "VidSrc", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/mal-${malId}`, provider: "VidSrc FYI", lang: "sub" });
  } else {
    sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/anime/${malId}/${episode}/1`, provider: "VidSrc CC", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/${episode}`, provider: "VidSrc", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/anime/${malId}/${episode}`, provider: "VidSrc FYI", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidlink.pro/anime/${malId}/${episode}`, provider: "VidLink", lang: "sub" });
  }
  return sources;
}

// ── AnimeSalt — Hindi/Tamil/Telugu dub ────────────────────────────────────

export function getAnimeSaltSources(
  title: string,
  episode: number,
  lang: "hindi" | "tamil" | "telugu"
): StreamSource[] {
  // AnimeSalt uses slug format: title-lowercase-hyphenated
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const langMap = {
    hindi: "hindi",
    tamil: "tamil",
    telugu: "telugu",
  };

  return [
    {
      type: "embed",
      url: `https://animesalt.ac/watch/${slug}-episode-${episode}`,
      provider: `AnimeSalt ${lang.charAt(0).toUpperCase() + lang.slice(1)}`,
      lang,
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

  if (tmdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc CC (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/${tmdbId}`, provider: "VidSrc FYI (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink (TMDB)", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink (TMDB)", lang: "sub" });
      sources.push({ type: "embed", url: `https://superembed.stream/embed/tmdb/${tmdbId}/${season}/${episode}`, provider: "SuperEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://autoembed.cc/embed/tmdb/${tmdbId}/tv/${season}/${episode}`, provider: "AutoEmbed", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc ICU", lang: "sub" });
      sources.push({ type: "embed", url: `https://player.videasy.net/embed/tv/${tmdbId}/${season}/${episode}`, provider: "Videasy", lang: "sub" });
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
