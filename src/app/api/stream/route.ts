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
// Uses JustAnimeCore format:
// GET /api/anime/{slug}  → episodes[]
// GET /api/episode-srcs?id={episodeId}&server=megacloud&category=sub|dub

async function getHiAnimeStream(
  title: string,
  episode: number
): Promise<{ url: string; provider: string; type: "m3u8"; subtitles?: { url: string; lang: string }[] }[]> {
  try {
    // Step 1: Search for the anime
    const searchRes = await fetch(
      `${HIANIME_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    // Handle both possible response shapes
    const animes: { id: string; name?: string; title?: string }[] =
      searchData?.results ||
      searchData?.animes ||
      searchData?.data?.animes ||
      [];
    if (!animes.length) return [];

    // Find best title match
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = animes[0];
    let bestScore = 0;
    for (const a of animes) {
      const candidate = clean(a.name || a.title || "");
      if (candidate === target) { best = a; break; }
      const words = target.split(" ");
      const score = words.filter((w: string) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = a; }
    }

    // Step 2: Get anime episodes using slug ID
    const animeRes = await fetch(
      `${HIANIME_API}/api/anime/${best.id}`,
      { next: { revalidate: 300 } }
    );
    if (!animeRes.ok) return [];
    const animeData = await animeRes.json();

    const episodes: { id: string; number?: number; episodeId?: string }[] =
      animeData?.episodes ||
      animeData?.data?.episodes ||
      animeData?.results?.episodes ||
      [];
    if (!episodes.length) return [];

    const ep =
      episodes.find((e) => e.number === episode) ||
      episodes[episode - 1];
    if (!ep) return [];

    const episodeId = ep.episodeId || ep.id;
    if (!episodeId) return [];

    // Step 3: Get streams for sub and dub
    const sources: { url: string; provider: string; type: "m3u8"; subtitles?: { url: string; lang: string }[] }[] = [];

    for (const category of ["sub", "dub"]) {
      try {
        const srcRes = await fetch(
          `${HIANIME_API}/api/episode-srcs?id=${episodeId}&server=megacloud&category=${category}`,
          { next: { revalidate: 300 } }
        );
        if (!srcRes.ok) continue;
        const srcData = await srcRes.json();

        const link =
          srcData?.link ||
          srcData?.sources?.[0]?.url ||
          srcData?.data?.sources?.[0]?.url;

        if (link && (link.includes(".m3u8") || link.startsWith("http"))) {
          const subtitles = (
            srcData?.tracks ||
            srcData?.subtitles ||
            srcData?.data?.tracks ||
            []
          )
            .filter((t: { kind?: string; file?: string; label?: string }) =>
              t.kind === "captions" || t.kind === "subtitles"
            )
            .map((t: { file?: string; label?: string; src?: string; language?: string }) => ({
              url: t.file || t.src || "",
              lang: t.label || t.language || "Unknown",
            }))
            .filter((t: { url: string }) => t.url);

          sources.push({
            type: "m3u8",
            url: link,
            provider: `HiAnime ${category === "sub" ? "Sub" : "Dub"}`,
            subtitles,
          });
        }
      } catch {}
    }

    return sources;
  } catch (e) {
    console.error("HiAnime API error:", e);
    return [];
  }
}

// ── Anikoto → MegaPlay ────────────────────────────────────────────────────

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
    const results: {
      id?: string | number;
      slug?: string;
      title?: string;
      name?: string;
    }[] = searchData?.results || searchData?.data || searchData?.anime || [];
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
    const episodes: {
      number?: number;
      episode_number?: number;
      ep?: number;
      episode_embed_id?: string | number;
      embed_id?: string | number;
    }[] = epData?.episodes || epData?.data?.episodes || epData?.episode_list || [];
    if (!episodes.length) return null;

    const ep =
      episodes.find((e) =>
        e.number === episode || e.episode_number === episode || e.ep === episode
      ) || episodes[episode - 1];

    return ep?.episode_embed_id?.toString() || ep?.embed_id?.toString() || null;
  } catch (e) {
    console.error("Anikoto error:", e);
    return null;
  }
}

// ── TMDB lookup ────────────────────────────────────────────────────────────

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

  // ── HiAnime (real m3u8 streams) ───────────────────────────────────────
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
    });
  }

  // ── TMDB embeds — all providers ───────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const isMovie = false; // TV for anime
    const sources = [
      // SuperEmbed
      {
        type: "embed",
        url: isMovie
          ? `https://superembed.stream/embed/tmdb/${tmdbId}`
          : `https://superembed.stream/embed/tmdb/${tmdbId}/${season}/${episode}`,
        provider: "SuperEmbed",
      },
      // AutoEmbed
      {
        type: "embed",
        url: isMovie
          ? `https://autoembed.cc/embed/tmdb/${tmdbId}/movie`
          : `https://autoembed.cc/embed/tmdb/${tmdbId}/tv/${season}/${episode}`,
        provider: "AutoEmbed",
      },
      // VidSrc CC
      {
        type: "embed",
        url: isMovie
          ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
          : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc CC",
      },
      // VidSrc ICU
      {
        type: "embed",
        url: isMovie
          ? `https://vidsrc.icu/embed/movie/${tmdbId}`
          : `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc ICU",
      },
      // VidSrc.to
      {
        type: "embed",
        url: isMovie
          ? `https://vidsrc.to/embed/movie/${tmdbId}`
          : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc",
      },
      // VidSrc FYI
      {
        type: "embed",
        url: isMovie
          ? `https://vidsrc.fyi/embed/movie/${tmdbId}`
          : `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidSrc FYI",
      },
      // VidLink
      {
        type: "embed",
        url: isMovie
          ? `https://vidlink.pro/movie/${tmdbId}`
          : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
        provider: "VidLink",
      },
      // Videasy
      {
        type: "embed",
        url: isMovie
          ? `https://player.videasy.net/embed/movie/${tmdbId}`
          : `https://player.videasy.net/embed/tv/${tmdbId}/${season}/${episode}`,
        provider: "Videasy",
      },
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
    const ep =
      episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return NextResponse.json({ sources: [] });

    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({ sources, matchedTitle: match.title });
  } catch (err) {
    console.error("GogoAnime error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
