// src/app/api/anikoto/[anilistId]/route.ts
//
// THE CORE SOLUTION — resolves AniList ID → Anikoto series → episode embed URLs
//
// Flow:
//   1. Receive AniList ID
//   2. Search anikoto-six.vercel.app by title (title comes from AniList)
//   3. Fetch anikotoapi.site/series/{anikotoId} → get ALL episodes with embed_url
//   4. Cache for 1 hour (Next.js revalidate)
//   5. Return { episodes: [{ number, sub, dub }] }
//
// The frontend calls this ONCE per anime page load, then uses the embed URLs directly.
// No more per-episode search. No more title matching on every request.

import { NextRequest, NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anilist";

const ANIKOTO_SEARCH = "https://anikoto-six.vercel.app";
const ANIKOTO_DATA   = "https://anikotoapi.site";

interface AnikotoSearchResult {
  id?: string;
  slug?: string;
  name?: string;
  title?: string;
}

interface AnikotoEpisode {
  number?: number;
  episode_number?: number;
  episode_embed_id?: string | number;
  embed_id?: string | number;
  embed_url?: { sub?: string; dub?: string };
}

interface EpisodeMap {
  number: number;
  sub: string | null;
  dub: string | null;
  embedId: string | null;
}

function cleanTitle(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function matchScore(candidate: string, target: string): number {
  const words = target.split(" ").filter(Boolean);
  return words.filter((w) => candidate.includes(w)).length / words.length;
}

async function searchAnikoto(titles: string[]): Promise<string | null> {
  for (const title of titles) {
    try {
      const res = await fetch(
        `${ANIKOTO_SEARCH}/api/search?keyword=${encodeURIComponent(title)}`,
        { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results: AnikotoSearchResult[] =
        data?.results || data?.data || data?.animes || [];
      if (!results.length) continue;

      const target = cleanTitle(title);
      let best = results[0], bestScore = 0;
      for (const r of results) {
        const c = cleanTitle(r.name || r.title || "");
        if (c === target) return r.id || r.slug || null;
        const score = matchScore(c, target);
        if (score > bestScore) { bestScore = score; best = r; }
      }
      if (bestScore > 0.5) return best.id || best.slug || null;
    } catch {}
  }
  return null;
}

async function fetchEpisodes(anikotoId: string): Promise<EpisodeMap[]> {
  const res = await fetch(
    `${ANIKOTO_DATA}/series/${anikotoId}`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const eps: AnikotoEpisode[] =
    data?.episodes || data?.data?.episodes || data?.anime?.episodes || [];

  return eps.map((ep, i) => {
    const num = ep.number ?? ep.episode_number ?? i + 1;
    const embedId = ep.episode_embed_id ?? ep.embed_id;

    // Prefer embed_url from API (already the full URL)
    // Fall back to constructing megaplay s-2 URL from embedId
    const sub =
      ep.embed_url?.sub ||
      (embedId ? `https://megaplay.buzz/stream/s-2/${embedId}/sub` : null);
    const dub =
      ep.embed_url?.dub ||
      (embedId ? `https://megaplay.buzz/stream/s-2/${embedId}/dub` : null);

    return {
      number: num,
      sub,
      dub,
      embedId: embedId ? String(embedId) : null,
    };
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { anilistId: string } }
) {
  const anilistId = parseInt(params.anilistId);
  if (isNaN(anilistId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    // Get anime titles from AniList (already cached by your existing lib)
    const anime = await getAnimeById(anilistId);
    const titles = [
      anime.title.english,
      anime.title.romaji,
      anime.title.native,
    ].filter(Boolean) as string[];

    if (!titles.length) {
      return NextResponse.json({ episodes: [] });
    }

    // Search Anikoto for this anime
    const anikotoId = await searchAnikoto(titles);
    if (!anikotoId) {
      return NextResponse.json({ episodes: [], found: false });
    }

    // Fetch all episodes with embed URLs
    const episodes = await fetchEpisodes(anikotoId);

    return NextResponse.json(
      { episodes, anikotoId, found: true },
      {
        headers: {
          // Cache in CDN for 1 hour, stale-while-revalidate for 4 hours
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=14400",
        },
      }
    );
  } catch (e) {
    console.error("anikoto resolver error:", e);
    return NextResponse.json({ episodes: [], error: "fetch failed" });
  }
}
