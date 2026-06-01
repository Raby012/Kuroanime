import { NextRequest, NextResponse } from "next/server";

// Convert anime title to Anikoto slug format
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const malId = searchParams.get("malId");
  const title = searchParams.get("title") || "";
  const episode = parseInt(searchParams.get("episode") || "1");

  const sources: { type: string; url: string; provider: string }[] = [];

  // ── Method 1: Anikoto API with slug (gets real HiAnime data_id) ──────────
  if (title) {
    try {
      const slug = titleToSlug(title);
      const res = await fetch(
        `https://anikoto-api.onrender.com/episodes?name=${slug}`,
        { next: { revalidate: 3600 } }
      );

      if (res.ok) {
        const episodes = await res.json();
        const ep = Array.isArray(episodes)
          ? episodes.find((e: { num: string | number }) =>
              String(e.num) === String(episode)
            ) || episodes[episode - 1]
          : null;

        if (ep?.data_id) {
          // Best quality — uses real HiAnime episode ID
          sources.push({
            type: "embed",
            url: `https://megaplay.buzz/stream/s-2/${ep.data_id}/sub`,
            provider: "Anikoto Sub",
          });
          sources.push({
            type: "embed",
            url: `https://megaplay.buzz/stream/s-2/${ep.data_id}/dub`,
            provider: "Anikoto Dub",
          });
        }
      }
    } catch {}
  }

  // ── Method 2: anikotoapi.site with MAL ID (fallback) ─────────────────────
  if (malId && sources.length === 0) {
    try {
      const res = await fetch(
        `https://anikotoapi.site/series/mal/${malId}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const episodes = data?.episodes || [];
        const ep =
          episodes.find((e: { number: number }) => e.number === episode) ||
          episodes[episode - 1];

        if (ep?.embed_url?.sub) {
          sources.push({
            type: "embed",
            url: ep.embed_url.sub,
            provider: "Anikoto Sub",
          });
        }
        if (ep?.embed_url?.dub) {
          sources.push({
            type: "embed",
            url: ep.embed_url.dub,
            provider: "Anikoto Dub",
          });
        }
      }
    } catch {}
  }

  return NextResponse.json({ sources });
}
