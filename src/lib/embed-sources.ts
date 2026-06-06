export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub";

// ── SUB sources only (instant, no API call) ───────────────────────────────────
// DUB sources are NOT added here — they only get added after the Anikoto
// resolver confirms the anime actually has an English dub (hasDub: true).
// This prevents the DUB tab showing for anime with no English dub.

export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [
    // SUB only — MegaPlay via AniList ID
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },
    // SUB — VidNest fallback
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/sub`, provider: "VidNest Sub", lang: "sub" },
  ];
  if (malId) {
    sources.push({ type: "embed", url: `https://megaplay.buzz/stream/mal/${malId}/${ep}/sub`, provider: "MegaPlay MAL Sub", lang: "sub" });
  }
  return sources;
}

export function getMalEmbedSources(malId: number | null, episode: number, isMovie: boolean): StreamSource[] {
  if (!malId) return [];
  if (isMovie) return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${malId}`, provider: "VidSrc.me", lang: "sub" }];
  return [{ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${malId}&season=1&episode=${episode}`, provider: "VidSrc.me", lang: "sub" }];
}

export function getEmbedSources(imdbId: string | null, tmdbId: number | null, season: number, episode: number, isMovie: boolean): StreamSource[] {
  const s: StreamSource[] = [];
  if (tmdbId) {
    if (isMovie) {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`, provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`, provider: "VidAPI", lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`, provider: "VidLink", lang: "sub" });
    } else {
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 2", lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidAPI", lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" });
      s.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`, provider: "MultiEmbed", lang: "sub" });
    }
  }
  if (imdbId) {
    if (isMovie) s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}`, provider: "VidSrc IMDb", lang: "sub" });
    else s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`, provider: "VidSrc IMDb", lang: "sub" });
  }
  return s;
}
