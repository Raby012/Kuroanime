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
const ANIKOTO_API = "https://anikoto-six.vercel.app";

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
    const score =
      words.filter((w) => candidate.includes(w)).length / words.length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

// ── Anikoto API (real m3u8 streams) ───────────────────────────────────────
// GET /api/search?keyword={title} → results[].id (slug)
// GET /api/watch/{slug}?ep={episode} → sources[].url + proxyUrl + tracks

async function getAnikotoStream(
  title: string,
  episode: number,
  category: "sub" | "dub" = "sub"
): Promise
  {
    type: "m3u8";
    url: string;
    provider: string;
    lang: string;
    subtitles?: { url: string; lang: string }[];
  }[]
> {
  try {
    // Step 1: Search
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      searchData?.results ||
      searchData?.data ||
      searchData?.animes ||
      [];
    if (!results.length) return [];

    // Find best match
    const clean = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = results[0];
    let bestScore = 0;
    for (const r of results) {
      const candidate = clean(r.name || r.title || "");
      if (candidate === target) { best = r; break; }
      const words = target.split(" ");
      const score = words.filter((w: string) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const slug = best.id || best.slug;
    if (!slug) return [];

    // Step 2: Get stream using /api/watch/{slug}?ep={episode}
    const watchRes = await fetch(
      `${ANIKOTO_API}/api/watch/${slug}?ep=${episode}`,
      { next: { revalidate: 300 } }
    );
    if (!watchRes.ok) return [];
    const watchData = await watchRes.json();

    // Response shape: { sources: [{url, isM3U8, quality}], tracks: [{file, label, kind}], proxyUrl }
    const rawSources: {
      url?: string;
      isM3U8?: boolean;
      quality?: string;
      type?: string;
    }[] = watchData?.sources || watchData?.data?.sources || [];

    const tracks: { file?: string; src?: string; label?: string; kind?: string }[] =
      watchData?.tracks || watchData?.data?.tracks || [];

    const subtitles = tracks
      .filter((t) => t.kind === "captions" || t.kind === "subtitles")
      .map((t) => ({
        url: t.file || t.src || "",
        lang: t.label || "Unknown",
      }))
      .filter((t) => t.url);

    const proxyBase: string = watchData?.proxyUrl || "";

    const sources = rawSources
      .filter((s) => s.url && (s.isM3U8 || s.url.includes(".m3u8")))
      .map((s) => {
        // Use proxyUrl if available to avoid CORS issues
        const streamUrl = proxyBase
          ? `${proxyBase}${encodeURIComponent(s.url!)}`
          : s.url!;
        return {
          type: "m3u8" as const,
          url: streamUrl,
          provider: `Anikoto ${category === "sub" ? "Sub" : "Dub"} (${s.quality || "HD"})`,
          lang: category,
          subtitles,
        };
      });

    return sources;
  } catch (e) {
    console.error("Anikoto stream error:", e);
    return [];
  }
}

// ── HiAnime API ────────────────────────────────────────────────────────────

async function getHiAnimeStream(
  title: string,
  episode: number
): Promise<{
  type: "m3u8";
  url: string;
  provider: string;
  lang: string;
  subtitles?: { url: string; lang: string }[];
}[]> {
  try {
    const searchRes = await fetch(
      `${HIANIME_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    const animes: { id: string; name?: string; title?: string }[] =
      searchData?.results ||
      searchData?.animes ||
      searchData?.data?.animes ||
      [];
    if (!animes.length) return [];

    const clean = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
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

    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return [];

    const episodeId = ep.episodeId || ep.id;
    if (!episodeId) return [];

    const sources: {
      type: "m3u8";
      url: string;
      provider: string;
      lang: string;
      subtitles?: { url: string; lang: string }[];
    }[] = [];

    for (const category of ["sub", "dub"] as const) {
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

        if (link) {
          const subtitles = (srcData?.tracks || srcData?.subtitles || [])
            .filter((t: { kind?: string }) => t.kind === "captions" || t.kind === "subtitles")
            .map((t: { file?: string; label?: string }) => ({
              url: t.file || "",
              lang: t.label || "Unknown",
            }))
            .filter((t: { url: string }) => t.url);

          sources.push({
            type: "m3u8",
            url: link,
            provider: `HiAnime ${category === "sub" ? "Sub" : "Dub"}`,
            lang: category,
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

  // ── Anikoto (real m3u8, best coverage) ───────────────────────────────
  if (provider === "anikoto") {
    const [sub, dub] = await Promise.all([
      getAnikotoStream(title, episode, "sub"),
      getAnikotoStream(title, episode, "dub"),
    ]);
    return NextResponse.json({ sources: [...sub, ...dub] });
  }

  // ── HiAnime ───────────────────────────────────────────────────────────
  if (provider === "hianime") {
    const sources = await getHiAnimeStream(title, episode);
    return NextResponse.json({ sources });
  }

  // ── TMDB embeds ───────────────────────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const sources = [
      { type: "embed", url: `https://superembed.stream/embed/tmdb/${tmdbId}/${season}/${episode}`, provider: "SuperEmbed", lang: "sub" },
      { type: "embed", url: `https://autoembed.cc/embed/tmdb/${tmdbId}/tv/${season}/${episode}`, provider: "AutoEmbed", lang: "sub" },
      { type: "embed", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc CC", lang: "sub" },
      { type: "embed", url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc ICU", lang: "sub" },
      { type: "embed", url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc", lang: "sub" },
      { type: "embed", url: `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`, provider: "VidSrc FYI", lang: "sub" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`, provider: "VidLink", lang: "sub" },
      { type: "embed", url: `https://player.videasy.net/embed/tv/${tmdbId}/${season}/${episode}`, provider: "Videasy", lang: "sub" },
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
      return NextResponse.json({
        sources: sources.map((s) => ({ ...s, lang: "sub" })),
        matchedTitle: match.title,
      });
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
    return NextResponse.json({
      sources: sources.map((s) => ({ ...s, lang: "sub" })),
      matchedTitle: match.title,
    });
  } catch (err) {
    console.error("GogoAnime error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
