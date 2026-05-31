import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

export const runtime = "nodejs";

// Fetch TMDB ID using MAL ID via TMDB's external ID lookup
async function getTmdbIdFromMal(malId: number): Promise<number | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${malId}?api_key=${apiKey}&external_source=tvdb_id`,
      { next: { revalidate: 86400 } }
    );
    // MAL ID → TMDB via AniDB mapping doesn't exist directly
    // Use TMDB search by title instead
    return null;
  } catch {
    return null;
  }
}

// Search TMDB by anime title, return first TV result's ID
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

  // TMDB embed lookup (works for all anime on TMDB)
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const sources = [
      {
        type: "embed",
        url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc CC",
      },
      {
        type: "embed",
        url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc",
      },
      {
        type: "embed",
        url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidLink",
      },
      {
        type: "embed",
        url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc FYI",
      },
    ];
    return NextResponse.json({ sources, tmdbId });
  }

  try {
    if (provider === "animepahe") {
      const results = await searchAnimePahe(title);
      if (!results.length) return NextResponse.json({ sources: [] });
      const match = bestMatch(results, title);
      const sources = await getAnimePaheStream(`${match.id}/${episode}`);
      return NextResponse.json({ sources, matchedTitle: match.title });
    }

    // GogoAnime — try multiple title variants
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
    return NextResponse.json({ sources, matchedTitle: match.title });
  } catch (err) {
    console.error("Stream API error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
