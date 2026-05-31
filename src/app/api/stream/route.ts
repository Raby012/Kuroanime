import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

export const runtime = "nodejs";

// Better title matching — score by similarity
function bestMatch(results: { id: string; title: string }[], title: string) {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const target = clean(title);

  let best = results[0];
  let bestScore = 0;

  for (const r of results) {
    const candidate = clean(r.title);
    // Exact match wins immediately
    if (candidate === target) return r;
    // Count matching words
    const targetWords = target.split(" ");
    const matchCount = targetWords.filter((w) =>
      candidate.includes(w)
    ).length;
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

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    if (provider === "animepahe") {
      const results = await searchAnimePahe(title);
      if (!results.length) return NextResponse.json({ sources: [] });
      const match = bestMatch(results, title);
      const episodeId = `${match.id}/${episode}`;
      const sources = await getAnimePaheStream(episodeId);
      return NextResponse.json({ sources, matchedTitle: match.title });
    }

    // GogoAnime — try original title first, then stripped title
    const searchTitles = [
      title,
      // Remove "Season X" suffix often causes no results
      title.replace(/\s+season\s+\d+/i, "").trim(),
      // Try just first 3 words
      title.split(" ").slice(0, 3).join(" "),
    ].filter((t, i, arr) => arr.indexOf(t) === i); // deduplicate

    let results: Awaited<ReturnType<typeof searchGogoanime>> = [];
    for (const searchTitle of searchTitles) {
      results = await searchGogoanime(searchTitle);
      if (results.length) break;
    }

    if (!results.length) return NextResponse.json({ sources: [] });

    const match = bestMatch(results, title);
    const episodes = await getGogoanimeEpisodes(match.id);
    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];

    if (!ep) return NextResponse.json({ sources: [] });

    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({ sources, matchedTitle: match.title, episodeId: ep.id });
  } catch (err) {
    console.error("Stream API error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
