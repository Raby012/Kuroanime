import "server-only";
import { ANIME } from "@consumet/extensions";

import type { StreamSource } from "@/lib/embed-sources";
export type { StreamSource };

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

// ==============================
// 1. GOGOANIME
// ==============================

export async function searchGogoanime(title: string): Promise<GogoResult[]> {
  try {
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

// ==============================
// 2. ANIMEPAHE
// ==============================

export async function searchAnimePahe(title: string): Promise<PaheResult[]> {
  try {
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

// ==============================
// 3. MEGAPLAY (Added for Reliability)
// ==============================

export async function getMegaPlayStream(episodeId: string, type: 'sub' | 'dub' = 'sub'): Promise<StreamSource[]> {
  try {
    const megaplay = new ANIME.MegaPlay();
    const data = await megaplay.fetchEpisodeSources(episodeId);
    
    let sources = data.sources || [];
    
    // Attempt to filter by Sub/Dub if possible
    if (type === 'sub') {
        sources = sources.filter((s: any) => !s.quality || s.quality.toLowerCase().includes('sub'));
    } else if (type === 'dub') {
        sources = sources.filter((s: any) => s.quality && s.quality.toLowerCase().includes('dub'));
    }
    
    // If filtered list is empty, just use all sources as a fallback
    if (sources.length === 0) sources = data.sources || [];

    return sources
      .filter((s: { url: string; isM3U8?: boolean }) => s.url)
      .map((s: { url: string; isM3U8?: boolean; quality?: string }) => ({
        type: "m3u8" as const,
        url: s.url,
        provider: `MegaPlay (${s.quality || "auto"})`,
      }));
  } catch (e) {
    console.error("MegaPlay stream error:", e);
    return [];
  }
}

// ==============================
// 4. UNIVERSAL FAILOVER (Fix for "No Streams Available")
// ==============================

export async function getStreamFromAnyProvider(
  episodeId: string, 
  type: 'sub' | 'dub' = 'sub'
): Promise<StreamSource[]> {
  
  // Order matters: Put your most reliable first
  const providers = [
    { name: 'MegaPlay', func: getMegaPlayStream },
    { name: 'GogoAnime', func: getGogoanimeStream },
    { name: 'AnimePahe', func: getAnimePaheStream },
  ];

  for (const provider of providers) {
    console.log(`Trying ${provider.name} for ${type} stream...`);
    try {
      const sources = await provider.func(episodeId, type);
      if (sources && sources.length > 0) {
        console.log(`✅ Found stream from ${provider.name}`);
        return sources;
      }
    } catch (e) {
      console.log(`${provider.name} failed, moving to next...`);
    }
  }
  console.log("❌ All providers failed for this episode.");
  return [];
}
