export type StreamSource =
  | {
      type: "m3u8";
      url: string;
      subtitles?: { url: string; lang: string }[];
      provider: string;
      lang?: string;
    }
  | {
      type: "embed";
      url: string;
      provider: string;
      lang?: string;
    };

export type Language = "sub" | "dub" | "hindi" | "tamil" | "telugu";

// ── MegaPlay + TryEmbed — AniList & MAL ID ────────────────────────────────

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // MegaPlay via AniList ID
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
    // TryEmbed — proper anime embed API, AniList ID native support
    {
      type: "embed",
      url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/sub`,
      provider: "TryEmbed Sub",
      lang: "sub",
    },
    {
      type: "embed",
      url: `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/dub`,
      provider: "TryEmbed Dub",
      lang: "dub",
    },
  ];

  // MegaPlay via MAL ID — better coverage for older/niche anime
  if (malId) {
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`,
      provider: "MegaPlay MAL Sub",
      lang: "sub",
    });
    sources.push({
      type: "embed",
      url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`,
      provider: "MegaPlay MAL Dub",
      lang: "dub",
    });
  }

  return sources;
}

// ── VidSrc.me — live domains ───────────────────────────────────────────────

export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  if (isMovie) {
    return [
      {
        type: "embed",
        url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`,
        provider: "VidSrc.me",
        lang: "sub",
      },
    ];
  }
  return [
    {
      type: "embed",
      url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`,
      provider: "VidSrc.me",
      lang: "sub",
    },
  ];
}

// ── TMDB/IMDb embeds — verified live only ─────────────────────────────────

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
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 1", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrcme.su/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 2", lang: "sub" });
      sources.push({ type: "embed", url: `https://vsrc.su/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 3", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://primesrc.me/embed/movie?tmdb=${tmdbId}`, provider: "PrimeSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 2", lang: "sub" });
      sources.push({ type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 3", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidAPI", lang: "sub" });
      sources.push({ type: "embed", url: `https://primesrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "PrimeSrc", lang: "sub" });
      sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      sources.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}`, provider: "VidSrc.me IMDb", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${imdbId}`, provider: "VidAPI IMDb", lang: "sub" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me IMDb", lang: "sub" });
      sources.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidAPI IMDb", lang: "sub" });
    }
  }

  return sources;
}
