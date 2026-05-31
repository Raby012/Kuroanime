// Streaming sources with fallback chain:
// 1. GogoAnime via consumet.ts (real m3u8)
// 2. AnimePahe via consumet.ts (real m3u8)
// 3. VidSrc embed providers (iframe fallback)
import type { StreamSource } from "@/lib/embed-sources";
export type { StreamSource };
export type StreamSource =
  | { type: "m3u8"; url: string; subtitles?: { url: string; lang: string }[]; provider: string }
  | { type: "embed"; url: string; provider: string };

// ── VidSrc Embed Providers (TMDB/IMDB based, most stable) ─────────────────

export function getEmbedSources(imdbId: string | null, tmdbId: number | null, season: number, episode: number, isMovie: boolean): StreamSource[] {
  const sources: StreamSource[] = [];

  if (imdbId) {
    if (isMovie) {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/movie/${imdbId}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/movie/${imdbId}`, provider: "VidSrc 2" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embed/${imdbId}`, provider: "2Embed" });
      sources.push({ type: "embed", url: `https://player.smashy.stream/movie/${imdbId}`, provider: "SmashyStream" });
    } else {
      sources.push({ type: "embed", url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 1" });
      sources.push({ type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc CC" });
      sources.push({ type: "embed", url: `https://vidsrcme.ru/embed/tv/${imdbId}/${season}/${episode}`, provider: "VidSrc 2" });
      sources.push({ type: "embed", url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`, provider: "2Embed" });
      sources.push({ type: "embed", url: `https://player.smashy.stream/tv/${imdbId}?s=${season}&e=${episode}`, provider: "SmashyStream" });
    }
  }

  if (tmdbId && !isMovie) {
    sources.push({ type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" });
  }

  return sources;
}

// ── GogoAnime via Consumet (server-side only) ─────────────────────────────

export async function searchGogoanime(title: string): Promise<GogoResult[]> {
  try {
    const { ANIME } = await import("@consumet/extensions");
    const gogoanime = new ANIME.Gogoanime();
    const results = await gogoanime.search(title);
    return (results.results || []) as GogoResult[];
  } catch (e) {
    console.error("GogoAnime search error:", e);
    return [];
  }
}

export async function getGogoanimeEpisodes(animeId: string): Promise<GogoEpisode[]> {
  try {
    const { ANIME } = await import("@consumet/extensions");
    const gogoanime = new ANIME.Gogoanime();
    const info = await gogoanime.fetchAnimeInfo(animeId);
    return (info.episodes || []) as GogoEpisode[];
  } catch (e) {
    console.error("GogoAnime episodes error:", e);
    return [];
  }
}

export async function getGogoanimeStream(episodeId: string): Promise<StreamSource[]> {
  try {
    const { ANIME } = await import("@consumet/extensions");
    const gogoanime = new ANIME.Gogoanime();
    const data = await gogoanime.fetchEpisodeSources(episodeId);
    const sources: StreamSource[] = [];

    for (const s of data.sources || []) {
      if (s.url && (s.url.includes(".m3u8") || s.isM3U8)) {
        sources.push({
          type: "m3u8",
          url: s.url,
          provider: `GogoAnime (${s.quality || "auto"})`,
          subtitles: (data.subtitles || []).map((sub: { url: string; lang: string }) => ({
            url: sub.url,
            lang: sub.lang,
          })),
        });
      }
    }
    return sources;
  } catch (e) {
    console.error("GogoAnime stream error:", e);
    return [];
  }
}

// ── AnimePahe via Consumet (server-side only) ─────────────────────────────

export async function searchAnimePahe(title: string): Promise<PaheResult[]> {
  try {
    const { ANIME } = await import("@consumet/extensions");
    const animepahe = new ANIME.Animepahe();
    const results = await animepahe.search(title);
    return (results.results || []) as PaheResult[];
  } catch (e) {
    console.error("AnimePahe search error:", e);
    return [];
  }
}

export async function getAnimePaheStream(episodeId: string): Promise<StreamSource[]> {
  try {
    const { ANIME } = await import("@consumet/extensions");
    const animepahe = new ANIME.Animepahe();
    const data = await animepahe.fetchEpisodeSources(episodeId);
    return (data.sources || [])
      .filter((s: { url: string; isM3U8?: boolean }) => s.url)
      .map((s: { url: string; isM3U8?: boolean; quality?: string }) => ({
        type: "m3u8" as const,
        url: s.url,
        provider: `AnimePahe (${s.quality || "auto"})`,
      }));
  } catch (e) {
    console.error("AnimePahe stream error:", e);
    return [];
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface GogoResult {
  id: string;
  title: string;
  url: string;
  image?: string;
}

export interface GogoEpisode {
  id: string;
  number: number;
  url?: string;
}

export interface PaheResult {
  id: string;
  title: string;
  image?: string;
}
