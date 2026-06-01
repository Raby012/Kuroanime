export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ========================================
// 1. MEGAPLAY ROTATION
// ========================================
const MEGAPLAY_DOMAINS = [
  "megaplay.buzz",
  "megaplay.nz",
  "megaplay.cc",
  "megaplay.icu",
];

function tryMegaPlayEmbed(
  anilistId: number,
  episode: number,
  type: "sub" | "dub" = "sub"
): StreamSource[] {
  const sources: StreamSource[] = [];

  for (const domain of MEGAPLAY_DOMAINS) {
    if (type === "sub") {
      sources.push({
        type: "embed",
        url: `https://${domain}/stream/ani/${anilistId}/${episode}/sub`,
        provider: `MegaPlay (${domain}) Sub`,
      });
    } else if (type === "dub") {
      sources.push({
        type: "embed",
        url: `https://${domain}/stream/ani/${anilistId}/${episode}/dub`,
        provider: `MegaPlay (${domain}) Dub`,
      });
    }
  }
  return sources;
}

// ========================================
// 2. ANILIST EMBED SOURCES (Main Function)
// ========================================
export function getAnilistEmbedSources(
  anilistId: number,
  episode: number,
  isMovie: boolean
): StreamSource[] {
  const ep = isMovie ? 1 : episode;
  const sources: StreamSource[] = [];

  // --- STEP 1: Try MegaPlay Sub & Dub with domain rotation ---
  // MegaPlay Sub
  sources.push(...tryMegaPlayEmbed(anilistId, ep, "sub"));
  // MegaPlay Dub (This will often fail if Dub not released, but we try anyway)
  sources.push(...tryMegaPlayEmbed(anilistId, ep, "dub"));

  // --- STEP 2: FALLBACK TO VIDSRC (If MegaPlay completely fails) ---
  // VidSrc Sub
  sources.push({
    type: "embed",
    url: `https://vidsrc.cc/v2/embed/anime/${anilistId}/${ep}`,
    provider: "VidSrc (Fallback)",
  });
  // VidSrc Dub (Optional, rarely works for recent anime but added for completeness)
  sources.push({
    type: "embed",
    url: `https://vidsrc.fyi/embed/anime/${anilistId}/${ep}?dub=1`,
    provider: "VidSrc Dub (Fallback)",
  });

  return sources;
}

// ========================================
// 3. OTHER HELPERS (Kept for compatibility)
// ========================================
export function getAutoEmbedSource(): StreamSource[] {
  return []; // dead domain (left empty)
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
