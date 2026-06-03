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
      url: `https://vidapi.xyz/embed/anime/${anilistId}/${episode}?lang=${langCode}`,
      provider: `VidAPI ${lang.charAt(0).toUpperCase() + lang.slice(1)}`,
      lang,
    },
    {
      type: "embed",
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?dub=false&autoplay=true&primarycolor=E11D48`,
      provider: "VidPlus Sub",
      lang: "sub",
    },
    {
      type: "embed",
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?dub=true&autoplay=true&primarycolor=E11D48`,
      provider: "VidPlus Dub",
      lang: "dub",
    },
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

// ── MAL ID based ───────────────────────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  const sources: StreamSource[] = [];
  if (isMovie) {
    sources.push({ type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/1/1`, provider: "VidSrc", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidlink.pro/anime/${malId}/1`, provider: "VidLink", lang: "sub" });
  } else {
    sources.push({ type: "embed", url: `https://vidsrc.to/embed/anime/${malId}/${episode}`, provider: "VidSrc", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidlink.pro/anime/${malId}/${episode}`, provider: "VidLink", lang: "sub" });
    sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/anime/${malId}/${episode}`, provider: "VidSrc FYI", lang: "sub" });
  }
  return sources;
}

// ── Regional / Indian language sources ────────────────────────────────────

export function getRegionalSources(
  malId: number | null,
  anilistId: number,
  episode: number,
  lang: "hindi" | "tamil" | "telugu"
): StreamSource[] {
  const sources: StreamSource[] = [];
  const ep = episode;

  if (lang === "hindi") {
    // VidSrc CC with Hindi audio (works for Naruto, DBZ, One Piece etc)
    if (malId) {
      sources.push({
        type: "embed",
        url: `https://vidsrc.cc/v2/embed/anime/${malId}/${ep}?lang=hi`,
        provider: "VidSrc CC Hindi",
        lang: "hindi",
      });
      sources.push({
        type: "embed",
        url: `https://vidsrc.to/embed/anime/${malId}/${ep}?lang=hi`,
        provider: "VidSrc Hindi",
        lang: "hindi",
      });
    }
    // MegaPlay Hindi
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/hindi`,
      provider: "MegaPlay Hindi",
      lang: "hindi",
    });
    // VidPlus Hindi
    sources.push({
      type: "embed",
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?lang=hi&autoplay=true`,
      provider: "VidPlus Hindi",
      lang: "hindi",
    });
  }

  if (lang === "tamil") {
    if (malId) {
      sources.push({
        type: "embed",
        url: `https://vidsrc.cc/v2/embed/anime/${malId}/${ep}?lang=ta`,
        provider: "VidSrc CC Tamil",
        lang: "tamil",
      });
    }
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/tamil`,
      provider: "MegaPlay Tamil",
      lang: "tamil",
    });
    sources.push({
      type: "embed",
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?lang=ta&autoplay=true`,
      provider: "VidPlus Tamil",
      lang: "tamil",
    });
  }

  if (lang === "telugu") {
    if (malId) {
      sources.push({
        type: "embed",
        url: `https://vidsrc.cc/v2/embed/anime/${malId}/${ep}?lang=te`,
        provider: "VidSrc CC Telugu",
        lang: "telugu",
      });
    }
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/telugu`,
      provider: "MegaPlay Telugu",
      lang: "telugu",
    });
    sources.push({
      type: "embed",
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?lang=te&autoplay=true`,
      provider: "VidPlus Telugu",
      lang: "telugu",
    });
  }

  return sources;
}

// ── IMDB / TMDB based ──────────────────────────────────────────────────────

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
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, provider: "VidSrc CC", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`, provider: "VidSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/movie/${tmdbId}`, provider: "VidSrc FYI", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
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
