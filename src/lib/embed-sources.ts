export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub";

// ── Instant sources — both SUB and DUB load immediately ───────────────────────
// DUB sources are included by default. The Anikoto resolver will PREPEND
// better /stream/s-2/ URLs when it resolves. We never hide DUB initially.

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;

  const sources: StreamSource[] = [
    // ── SUB ──────────────────────────────────────────────────────────────
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`,  provider: "MegaPlay Sub",     lang: "sub" },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/sub`,          provider: "VidNest Sub",      lang: "sub" },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/sub`,           provider: "NHDapi Sub",       lang: "sub" },

    // ── DUB ──────────────────────────────────────────────────────────────
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`,  provider: "MegaPlay Dub",     lang: "dub" },
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/dub`,          provider: "VidNest Dub",      lang: "dub" },
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/dub`,           provider: "NHDapi Dub",       lang: "dub" },
  ];

  // MAL ID variants — different mapping DB, catches what AniList misses
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/dub`, provider: "MegaPlay MAL Dub", lang: "dub" });
  }

  return sources;
}

export function getMalEmbedSources(malId: number | null, episode: number, isMovie: boolean): StreamSource[] {
  if (!malId) return [];
  if (isMovie) return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`, provider: "VidSrc.me", lang: "sub" }];
  return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`, provider: "VidSrc.me", lang: "sub" }];
}

export function getEmbedSources(
  imdbId: string | null,
  tmdbId: number | null,
  season: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const s: StreamSource[] = [];
  if (tmdbId) {
    if (isMovie) {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`,        provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/movie?tmdb=${tmdbId}`,             provider: "VidSrc.me 2", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`,                  provider: "VidAPI",      lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`,                         provider: "VidLink",     lang: "sub" });
      // DUB for movies
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}&ds_lang=en`, provider: "VidSrc Dub",  lang: "dub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`,                  provider: "VidAPI Dub",  lang: "dub" });
    } else {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,         provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,             provider: "VidSrc.me 2", lang: "sub" });
      s.push({ type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                 provider: "VidSrc.me 3", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                 provider: "VidAPI",      lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,                                       provider: "VidLink",     lang: "sub" });
      s.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,                  provider: "MultiEmbed",  lang: "sub" });
      // DUB for TV series
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`, provider: "VidSrc Dub",  lang: "dub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                 provider: "VidAPI Dub",  lang: "dub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?dubbing=true`,                          provider: "VidLink Dub", lang: "dub" });
    }
  }
  if (imdbId) {
    s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc IMDb", lang: "sub" });
  }
  return s;
}
