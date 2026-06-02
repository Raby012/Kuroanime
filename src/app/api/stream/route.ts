import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

export const runtime = "nodejs";

const HIANIME_API = "https://hi-anime-api-silk.vercel.app";

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
    const words = target.split(" ");
    const score = words.filter((w) => candidate.includes(w)).length / words.length;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

// ── HiAnime API (your self-hosted) ────────────────────────────────────────

async function getHiAnimeStream(
  title: string,
  episode: number
): Promise<{ url: string; provider: string; type: "embed" }[]> {
  try {
    // Search for anime
    const searchRes = await fetch(
      `${HIANIME_API}/api/v2/hianime/search?q=${encodeURIComponent(title)}&page=1`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const animes = searchData?.data?.animes || [];
    if (!animes.length) return [];

    // Find best match
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = animes[0];
    let bestScore = 0;
    for (const a of animes) {
      const candidate = clean(a.name || "");
      if (candidate === target) { best = a; break; }
      const words = target.split(" ");
      const score = words.filter((w: string) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = a; }
    }

    // Get episodes
    const epRes = await fetch(
      `${HIANIME_API}/api/v2/hianime/anime/${best.id}/episodes`,
      { next: { revalidate: 300 } }
    );
    if (!epRes.ok) return [];
    const epData = await epRes.json();
    const episodes = epData?.data?.episodes || [];
    const ep = episodes.find((e: { number: number }) => e.number === episode)
      || episodes[episode - 1];
    if (!ep) return [];

    // Get streaming servers
    const serverRes = await fetch(
      `${HIANIME_API}/api/v2/hianime/episode/servers?animeEpisodeId=${ep.episodeId}`,
      { next: { revalidate: 300 } }
    );
    if (!serverRes.ok) return [];
    const serverData = await serverRes.json();
    const subServers = serverData?.data?.sub || [];
    const dubServers = serverData?.data?.dub || [];

    const sources: { url: string; provider: string; type: "embed" }[] = [];

    // Get stream URL from first sub server
    if (subServers.length > 0) {
      try {
        const streamRes = await fetch(
          `${HIANIME_API}/api/v2/hianime/episode/sources?animeEpisodeId=${ep.episodeId}&server=${subServers[0].serverName}&category=sub`,
          { next: { revalidate: 300 } }
        );
        const streamData = await streamRes.json();
        const m3u8 = streamData?.data?.sources?.[0]?.url;
        if (m3u8) {
          sources.push({ type: "embed", url: m3u8, provider: "HiAnime Sub" });
        }
      } catch {}
    }

    // Get stream URL from first dub server
    if (dubServers.length > 0) {
      try {
        const streamRes = await fetch(
          `${HIANIME_API}/api/v2/hianime/episode/sources?animeEpisodeId=${ep.episodeId}&server=${dubServers[0].serverName}&category=dub`,
          { next: { revalidate: 300 } }
        );
        const streamData = await streamRes.json();
        const m3u8 = streamData?.data?.sources?.[0]?.url;
        if (m3u8) {
          sources.push({ type: "embed", url: m3u8, provider: "HiAnime Dub" });
        }
      } catch {}
    }

    return sources;
  } catch (e) {
    console.error("HiAnime API error:", e);
    return [];
  }
}

// ── Anikoto API ────────────────────────────────────────────────────────────

async function getAnikotoEpisodeId(
  title: string,
  episode: number
): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://anikotoapi.site/search?q=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results: { id?: string | number; slug?: string; title?: string; name?: string }[] =
      searchData?.results || searchData?.data || searchData?.anime || [];
    if (!results.length) return null;

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = results[0];
    let bestScore = 0;
    for (const s of results) {
      const candidate = clean(s.title || s.name || "");
      if (candidate === target) { best = s; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = s; }
    }

    const seriesId = best.id || best.slug;
    if (!seriesId) return null;

    const epRes = await fetch(
      `https://anikotoapi.site/series/${seriesId}`,
      { next: { revalidate: 300 } }
    );
    if (!epRes.ok) return null;
    const epData = await epRes.json();
    const episodes: { number?: number; episode_number?: number; ep?: number; episode_embed_id?: string | number; embed_id?: string | number }[] =
      epData?.episodes || epData?.data?.episodes || epData?.episode_list || [];
    if (!episodes.length) return null;

    const ep =
      episodes.find((e) => e.number === episode || e.episode_number === episode || e.ep === episode)
      || episodes[episode - 1];

    return ep?.episode_embed_id?.toString() || ep?.embed_id?.toString() || null;
  } catch (e) {
    console.error("Anikoto error:", e);
    return null;
  }
}

// ── TMDB lookup ────────────────────────────────────────────────────────────

async function getTmdbIdByTitle(title: string, year?: number): Promise<number | null> {
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

interface EmbedSource {
  type: "embed";
  url: string;
  provider: string;
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

  // ── HiAnime API (your hosted API) ─────────────────────────────────────
  if (provider === "hianime") {
    const sources = await getHiAnimeStream(title, episode);
    return NextResponse.json({ sources });
  }

  // ── Anikoto → MegaPlay ────────────────────────────────────────────────
  if (provider === "anikoto") {
    const embedId = await getAnikotoEpisodeId(title, episode);
    if (!embedId) return NextResponse.json({ sources: [] });
    return NextResponse.json({
      sources: [
        { type: "embed", url: `https://megaplay.buzz/stream/s-2/${embedId}/sub`, provider: "MegaPlay Sub" },
        { type: "embed", url: `https://megaplay.buzz/stream/s-2/${embedId}/dub`, provider: "MegaPlay Dub" },
      ],
      embedId,
    });
  }

  // ── TMDB embeds ───────────────────────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const sources: EmbedSource[] = [
      { type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC" },
      { type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc" },
      { type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink" },
      { type: "embed", url: `https://superembed.stream/embed/tmdb/${tmdbId}/${season}/${episode}`, provider: "SuperEmbed" },
      { type: "embed", url: `https://autoembed.cc/embed/tmdb/${tmdbId}/tv/${season}/${episode}`, provider: "AutoEmbed" },
      { type: "embed", url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc ICU" },
      { type: "embed", url: `https://player.videasy.net/embed/tv/${tmdbId}/${season}/${episode}`, provider: "Videasy" },
    ];
    return NextResponse.json({ sources, tmdbId });
  }

  // ── AnimePahe ─────────────────────────────────────────────────────────
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

  // ── GogoAnime (default) ───────────────────────────────────────────────
  try {
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
    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return NextResponse.json({ sources: [] });

    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({ sources, matchedTitle: match.title });
  } catch (err) {
    console.error("GogoAnime error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
