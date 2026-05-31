// src/lib/streaming.ts
import "server-only";

// Imports StreamSource from the single source of truth
import type { StreamSource } from "@/lib/embed-sources";

// Re-export so API route can import from one place if needed
export type { StreamSource };

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
