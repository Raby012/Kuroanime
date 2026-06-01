import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const malId = searchParams.get("malId");
  const episode = parseInt(searchParams.get("episode") || "1");

  if (!malId) return NextResponse.json({ sources: [] });

  try {
    const res = await fetch(
      `https://anikotoapi.site/series/mal/${malId}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ sources: [] });

    const data = await res.json();
    const episodes = data?.episodes || [];
    const ep =
      episodes.find((e: { number: number }) => e.number === episode) ||
      episodes[episode - 1];

    if (!ep) return NextResponse.json({ sources: [] });

    const sources = [];
    if (ep.embed_url?.sub)
      sources.push({ type: "embed", url: ep.embed_url.sub, provider: "Anikoto Sub" });
    if (ep.embed_url?.dub)
      sources.push({ type: "embed", url: ep.embed_url.dub, provider: "Anikoto Dub" });

    return NextResponse.json({ sources });
  } catch {
    return NextResponse.json({ sources: [] });
  }
}
