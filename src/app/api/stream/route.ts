// src/app/api/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

// Force Node.js runtime — required for consumet/got-scraping native modules
export const runtime = "nodejs";

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

      const match =
        results.find((r) =>
          r.title.toLowerCase().includes(title.toLowerCase().split(" ")[0])
        ) || results[0];

      const episodeId = `${match.id}/${episode}`;
      const sources = await getAnimePaheStream(episodeId);
      return NextResponse.json({ sources, matchedTitle: match.title });
    }

    // Default: GogoAnime
    const results = await searchGogoanime(title);
    if (!results.length) return NextResponse.json({ sources: [] });

    const match =
      results.find((r) =>
        r.title.toLowerCase().includes(title.toLowerCase().split(" ")[0])
      ) || results[0];

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
