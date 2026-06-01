import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

export const runtime = "nodejs";

// ── Helpers ────────────────────────────────────────────────────────────────

function bestMatch(results: { id: string; title: string }[], title: string) {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const target = clean(title);
  let best = results[0];
  let bestScore = 0;
  for (const r of results) {
    const candidate = clean(r.title);
    if (candidate === target) return r;
    const targetWords = target.split(" ");
    const matchCount = targetWords.filter((w) => candidate.includes(w)).length;
    const score = matchCount / targetWords.length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

// ── Anikoto API → MegaPlay (full HiAnime library) ─────────────────────────

async function getAnikotoEpisodeId(
  title: string,
  episode: number
): Promise<string | null> {
  try {
    // Search Anikoto for the series by title
    const searchRes = await fetch(
      `https://anikotoapi.site/search?q=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    );

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    // Handle different response shapes
    const results: AnikotoSeries[] =
      searchData?.results ||
      searchData?.data ||
      searchData?.anime ||
      [];

    if (!results.length) return null;

    // Find best title match
    const clean = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let bestSeries = results[0];
    let bestScore = 0;

    for (const s of results) {
      const candidate = clean(s.title || s.name || "");
      if (candidate === target) { bestSeries = s; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; bestSeries = s; }
    }

    const seriesId = bestSeries.id || bestSeries.slug;
    if (!seriesId) return null;

    // Get episodes for the matched series
    const epRes = await fetch(
      `https://anikotoapi.site/series/${seriesId}`,
      { next: { revalidate: 3600 } }
    );

    if (!epRes.ok) return null;
    const epData = await epRes.json();

    const episodes: AnikotoEpisode[] =
      epData?.episodes ||
      epData?.data?.episodes ||
      epData?.episode_list ||
      [];

    if (!episodes.length) return null;

    // Find the requested episode
    const ep =
      episodes.find(
        (e) =>
          e.number === episode ||
          e.episode_number === episode ||
          e.ep === episode
      ) || episodes[episode - 1];

    return ep?.episode_embed_id?.toString() || ep?.embed_id?.toString() || null;
  } catch (e) {
    console.error("Anikoto error:", e);
    return null;
  }
}

// ── TMDB title search ──────────────────────────────────────────────────────

async function getTmdbIdByTitle(
  title: string,
  year?: number
): Promise<number | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      ...(year ? { first_air_date_year: String(year) } : {}),
    });
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?${params}`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface AnikotoSeries {
  id?: string | number;
  slug?: string;
  title?: string;
  name?: string;
}

interface AnikotoEpisode {
  number?: number;
  episode_number?: number;
  ep?: number;
  episode_embed_id?: string | number;
  embed_id?: string | number;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const episode = parseInt(searchParams.get("episode") || "1");
  const provider = searchParams.get("provider") || "gogoanime";
  const season = parseInt(searchParams.get("season") || "1");
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : undefined;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // ── Anikoto → MegaPlay (full library, no AniList mapping gaps) ────────
  if (provider === "anikoto") {
    const embedId = await getAnikotoEpisodeId(title, episode);
    if (!embedId) return NextResponse.json({ sources: [] });

    return NextResponse.json({
      sources: [
        {
          type: "embed",
          url: `https://megaplay.buzz/stream/s-2/${embedId}/sub`,
          provider: "MegaPlay Sub",
        },
        {
          type: "embed",
          url: `https://megaplay.buzz/stream/s-2/${embedId}/dub`,
          provider: "MegaPlay Dub",
        },
      ],
      embedId,
    });
  }

  // ── TMDB embed lookup ──────────────────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const sources = [];
    if (season && episode) {
      sources.push({
        type: "embed",
        url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc CC",
      });
      sources.push({
        type: "embed",
        url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc",
      });
      sources.push({
        type: "embed",
        url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc FYI",
      });
      sources.push({
        type: "embed",
        url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidLink",
      });
    }
    return NextResponse.json({ sources, tmdbId });
  }

  // ── AnimePahe ──────────────────────────────────────────────────────────
  if (provider === "animepahe") {
    try {
      const results = await searchAnimePahe(title);
      if (!results.length) return NextResponse.json({ sources: [] });
      const match = bestMatch(results, title);
      const sources = await getAnimePaheStream(`${match.id}/${episode}`);
      return NextResponse.json({ sources, matchedTitle: match.title });
    } catch (err) {
      console.error("AnimePahe error:", err);
      return NextResponse.json({ sources: [] });
    }
  }

  // ── GogoAnime (default) ────────────────────────────────────────────────
  try {
    // Try multiple title variants for better matching
    const searchTitles = [
      title,
      title.replace(/\s+season\s+\d+/i, "").trim(),
      title.split(" ").slice(0, 3).join(" "),
    ].filter((t, i, arr) => arr.indexOf(t) === i);

    let results: Awaited<ReturnType<typeof searchGogoanime>> = [];
    for (const t of searchTitles) {
      results = await searchGogoanime(t);
      if (results.length) break;
    }

    if (!results.length) return NextResponse.json({ sources: [] });

    const match = bestMatch(results, title);
    const episodes = await getGogoanimeEpisodes(match.id);
    const ep =
      episodes.find((e) => e.number === episode) || episodes[episode - 1];

    if (!ep) return NextResponse.json({ sources: [] });

    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({
      sources,
      matchedTitle: match.title,
      episodeId: ep.id,
    });
  } catch (err) {
    console.error("GogoAnime error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
