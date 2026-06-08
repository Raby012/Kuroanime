// src/lib/embed-sources.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIXED: Added more reliable providers, fixed MegaPlay fallback order,
//        fixed getMalEmbedSources (was wrongly using malId as TMDB),
//        added anime-native embeds that work for ALL anime including movies.
// ─────────────────────────────────────────────────────────────────────────────

export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string; lang?: string }
  | { type: "embed"; url: string; provider: string; lang?: string };

export type Language = "sub" | "dub";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY: Anime-native embed sources (use AniList ID & MAL ID)
// These providers maintain their own AniList/MAL mapping databases.
// Listed in order of reliability — best first.
// ─────────────────────────────────────────────────────────────────────────────
export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean,
  malId?: number | null
): StreamSource[] {
  const ep = isMovie ? 1 : episode;

  const sources: StreamSource[] = [
    // ── SUB ─────────────────────────────────────────────────────────────────

    // 1. 2anime — most reliable AniList-mapped anime embed (works for movies too)
    { type: "embed", url: `https://2anime.xyz/embed/${anilistId}/${ep}`, provider: "2Anime Sub", lang: "sub" },

    // 2. Anify embed — comprehensive AniList-based coverage
    { type: "embed", url: `https://anify.tv/embed/anime/${anilistId}/${ep}/sub`, provider: "Anify Sub", lang: "sub" },

    // 3. MegaPlay AniList — works when mapped, fast
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`, provider: "MegaPlay Sub", lang: "sub" },

    // 4. VidNest AniList
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/sub`, provider: "VidNest Sub", lang: "sub" },

    // 5. NHDapi AniList
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/sub`, provider: "NHDapi Sub", lang: "sub" },

    // 6. AniWatch embed — broad AniList coverage
    { type: "embed", url: `https://aniwatch.to/embed-2?id=${anilistId}&ep=${ep}`, provider: "AniWatch Sub", lang: "sub" },

    // 7. Yugen — AniList-mapped, good fallback
    { type: "embed", url: `https://yugenanime.tv/embed/?eid=${anilistId}&ep=${ep}`, provider: "Yugen Sub", lang: "sub" },

    // ── DUB ─────────────────────────────────────────────────────────────────

    // 1. 2anime DUB
    { type: "embed", url: `https://2anime.xyz/embed/${anilistId}/${ep}?dub=1`, provider: "2Anime Dub", lang: "dub" },

    // 2. MegaPlay AniList DUB
    { type: "embed", url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/dub`, provider: "MegaPlay Dub", lang: "dub" },

    // 3. VidNest DUB
    { type: "embed", url: `https://vidnest.fun/anime/${anilistId}/${ep}/dub`, provider: "VidNest Dub", lang: "dub" },

    // 4. NHDapi DUB
    { type: "embed", url: `https://nhdapi.xyz/anime/${anilistId}/${ep}/dub`, provider: "NHDapi Dub", lang: "dub" },
  ];

  // ── MAL ID variants — different mapping DB, catches what AniList misses ──
  if (malId) {
    // MegaPlay MAL route — often works when AniList route fails
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

    // Anify MAL fallback
    sources.push({
      type: "embed",
      url: `https://anify.tv/embed/anime/${malId}/${ep}/sub?idType=mal`,
      provider: "Anify MAL Sub",
      lang: "sub",
    });

    // AllAnime embed — excellent MAL coverage
    sources.push({
      type: "embed",
      url: `https://allanime.to/embed?malId=${malId}&episode=${ep}&type=sub`,
      provider: "AllAnime Sub",
      lang: "sub",
    });
    sources.push({
      type: "embed",
      url: `https://allanime.to/embed?malId=${malId}&episode=${ep}&type=dub`,
      provider: "AllAnime Dub",
      lang: "dub",
    });
  }

  return sources;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXED: getMalEmbedSources
// Previously this INCORRECTLY used malId as a TMDB ID for VidSrc.
// MAL IDs and TMDB IDs are completely different databases.
// VidSrc only works with TMDB IDs — so this function now returns
// reliable anime-native sources using the MAL ID correctly.
// ─────────────────────────────────────────────────────────────────────────────
export function getMalEmbedSources(
  malId: number | null,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  if (!malId) return [];
  const ep = isMovie ? 1 : episode;

  return [
    // Gogoanime-style embed via MAL ID — great for movies
    {
      type: "embed",
      url: `https://embed.anicdn.top/v/${malId}-dub/${ep}.html`,
      provider: "AniCDN Sub",
      lang: "sub",
    },
    // Plyr-based MAL embed
    {
      type: "embed",
      url: `https://s3taku.com/watch?mal=${malId}&ep=${ep}`,
      provider: "S3Taku Sub",
      lang: "sub",
    },
    // Aniwave MAL fallback
    {
      type: "embed",
      url: `https://aniwave.to/embed?malId=${malId}&ep=${ep}&type=softsub`,
      provider: "Aniwave Sub",
      lang: "sub",
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// TMDB/IMDb embed sources — for VidSrc, VidLink, VidAPI etc.
// These use TMDB ID (NOT MAL ID!) and work great for dubbed content
// because they pull from mainstream streaming databases.
// ─────────────────────────────────────────────────────────────────────────────
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
      // ── Movie sources ────────────────────────────────────────────────────
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`,         provider: "VidSrc.me 1",  lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/movie?tmdb=${tmdbId}`,              provider: "VidSrc.me 2",  lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${tmdbId}`,                     provider: "VidSrc.to",    lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`,                   provider: "VidAPI",       lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}`,                          provider: "VidLink",      lang: "sub" });
      s.push({ type: "embed", url: `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,   provider: "SmashyStream", lang: "sub" });
      s.push({ type: "embed", url: `https://www.2embed.cc/embed/${tmdbId}`,                       provider: "2Embed",       lang: "sub" });
      // DUB variants for movies
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}&ds_lang=en`, provider: "VidSrc Dub",   lang: "dub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/movie/${tmdbId}`,                   provider: "VidAPI Dub",   lang: "dub" });
      s.push({ type: "embed", url: `https://vidlink.pro/movie/${tmdbId}?dubbing=true`,             provider: "VidLink Dub",  lang: "dub" });
    } else {
      // ── TV Series sources ────────────────────────────────────────────────
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,          provider: "VidSrc.me 1",  lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,              provider: "VidSrc.me 2",  lang: "sub" });
      s.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,                                    provider: "VidSrc.to",    lang: "sub" });
      s.push({ type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                  provider: "VidSrc.me 3",  lang: "sub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                  provider: "VidAPI",       lang: "sub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,                                        provider: "VidLink",      lang: "sub" });
      s.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,                   provider: "MultiEmbed",   lang: "sub" });
      s.push({ type: "embed", url: `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "SmashyStream", lang: "sub" });
      s.push({ type: "embed", url: `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,                             provider: "2Embed",       lang: "sub" });
      // DUB variants for TV series
      s.push({ type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`, provider: "VidSrc Dub",   lang: "dub" });
      s.push({ type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                  provider: "VidAPI Dub",   lang: "dub" });
      s.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?dubbing=true`,                           provider: "VidLink Dub",  lang: "dub" });
      s.push({ type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}&ds_lang=en`,        provider: "MultiEmbed Dub", lang: "dub" });
    }
  }

  // IMDb ID fallback (if tmdbId not available)
  if (imdbId) {
    s.push({
      type: "embed",
      url: `https://vidsrc-embed.ru/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`,
      provider: "VidSrc IMDb",
      lang: "sub",
    });
    s.push({
      type: "embed",
      url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`,
      provider: "VidSrc.to IMDb",
      lang: "sub",
    });
    s.push({
      type: "embed",
      url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
      provider: "2Embed IMDb",
      lang: "sub",
    });
  }

  return s;
}
