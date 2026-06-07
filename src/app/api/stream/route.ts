import { NextRequest, NextResponse } from "next/server";
import {
  searchGogoanime,
  getGogoanimeEpisodes,
  getGogoanimeStream,
  searchAnimePahe,
  getAnimePaheStream,
} from "@/lib/streaming";

export const runtime = "nodejs";

const HIANIME_API  = "https://hi-anime-api-silk.vercel.app";
const ANIKOTO_API  = "https://anikoto-six.vercel.app";   // search + watch (m3u8)
const ANIKOTO_DATA = "https://anikotoapi.site";           // series data + embed_ids

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bestMatch(results: { id: string; title: string }[], title: string) {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const target = clean(title);
  let best = results[0], bestScore = 0;
  for (const r of results) {
    const c = clean(r.title);
    if (c === target) return r;
    const score = target.split(" ").filter((w) => c.includes(w)).length / target.split(" ").length;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

const FETCH_OPTS = (ms = 8000) => ({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
  },
  signal: AbortSignal.timeout(ms),
});

// ─── Core: Anikoto episode_embed_id → MegaPlay /stream/s-2/ ──────────────────
// This is the CORRECT method. The s-2 endpoint has the full library.
// The /ani/{anilist-id} and /mal/{mal-id} endpoints only work when mapping exists.

interface AnikotoEpisodeData {
  id?: number | string;
  number?: number;
  episode_number?: number;
  episode_embed_id?: string | number;
  embed_id?: string | number;
  embed_url?: { sub?: string; dub?: string };
}

async function getMegaplayEmbeds(
  title: string,
  episode: number
): Promise<{ type: "embed"; url: string; provider: string; lang: string }[]> {
  try {
    // Step 1: search for the anime on anikoto-six (returns title-based slug)
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { ...FETCH_OPTS(), next: { revalidate: 3600 } } as RequestInit
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.data || searchData?.animes || [];
    if (!results.length) return [];

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const c = clean(r.name || r.title || "");
      if (c === target) { best = r; break; }
      const score = target.split(" ").filter((w) => c.includes(w)).length / target.split(" ").length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const seriesId = best.id || best.slug;
    if (!seriesId) return [];

    // Step 2: get full series data from anikotoapi.site
    // This returns episodes with episode_embed_id — the key to /stream/s-2/
    const seriesRes = await fetch(
      `${ANIKOTO_DATA}/series/${seriesId}`,
      { ...FETCH_OPTS(), next: { revalidate: 300 } } as RequestInit
    );
    if (!seriesRes.ok) return [];
    const seriesData = await seriesRes.json();

    const episodes: AnikotoEpisodeData[] =
      seriesData?.episodes ||
      seriesData?.data?.episodes ||
      seriesData?.anime?.episodes ||
      [];
    if (!episodes.length) return [];

    // Find the target episode
    const ep =
      episodes.find((e) => (e.number ?? e.episode_number) === episode) ||
      episodes[episode - 1];
    if (!ep) return [];

    const out: { type: "embed"; url: string; provider: string; lang: string }[] = [];

    // Prefer embed_url directly from API (already formatted)
    if (ep.embed_url?.sub) {
      out.push({ type: "embed", url: ep.embed_url.sub, provider: "Anikoto Sub", lang: "sub" });
    }
    if (ep.embed_url?.dub) {
      out.push({ type: "embed", url: ep.embed_url.dub, provider: "Anikoto Dub", lang: "dub" });
    }

    // Build /stream/s-2/ URLs using episode_embed_id — works for full library
    const embedId = ep.episode_embed_id ?? ep.embed_id;
    if (embedId) {
      if (!ep.embed_url?.sub) {
        out.push({
          type: "embed",
          url: `https://megaplay.buzz/stream/s-2/${embedId}/sub`,
          provider: "MegaPlay Sub",
          lang: "sub",
        });
      }
      if (!ep.embed_url?.dub) {
        out.push({
          type: "embed",
          url: `https://megaplay.buzz/stream/s-2/${embedId}/dub`,
          provider: "MegaPlay Dub",
          lang: "dub",
        });
      }
    }

    return out;
  } catch (e) {
    console.error("getMegaplayEmbeds error:", e);
    return [];
  }
}

// ─── Anikoto: real m3u8 streams ───────────────────────────────────────────────

async function getAnikotoM3u8(
  title: string,
  episode: number,
  category: "sub" | "dub"
): Promise<{ type: "m3u8"; url: string; provider: string; lang: string; subtitles?: { url: string; lang: string }[] }[]> {
  try {
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { ...FETCH_OPTS(), next: { revalidate: 3600 } } as RequestInit
    );
    if (!searchRes.ok) return [];
    const sd = await searchRes.json();
    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      sd?.results || sd?.data || sd?.animes || [];
    if (!results.length) return [];

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const c = clean(r.name || r.title || "");
      if (c === target) { best = r; break; }
      const score = target.split(" ").filter((w) => c.includes(w)).length / target.split(" ").length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const slug = best.id || best.slug;
    if (!slug) return [];

    const watchRes = await fetch(
      `${ANIKOTO_API}/api/watch/${slug}?ep=${episode}`,
      { ...FETCH_OPTS(), next: { revalidate: 300 } } as RequestInit
    );
    if (!watchRes.ok) return [];
    const wd = await watchRes.json();

    const rawSources: { url?: string; isM3U8?: boolean; quality?: string }[] =
      wd?.sources || wd?.data?.sources || [];
    const tracks: { file?: string; src?: string; label?: string; kind?: string }[] =
      wd?.tracks || wd?.data?.tracks || [];

    const subtitles = tracks
      .filter((t) => t.kind === "captions" || t.kind === "subtitles")
      .map((t) => ({ url: t.file || t.src || "", lang: t.label || "Unknown" }))
      .filter((t) => t.url);

    const proxyBase: string = wd?.proxyUrl || "";

    return rawSources
      .filter((s) => s.url && (s.isM3U8 || s.url.includes(".m3u8")))
      .map((s) => ({
        type: "m3u8" as const,
        url: proxyBase ? `${proxyBase}${encodeURIComponent(s.url!)}` : s.url!,
        provider: `Anikoto ${category === "sub" ? "Sub" : "Dub"} (${s.quality || "HD"})`,
        lang: category,
        subtitles,
      }));
  } catch (e) {
    console.error("getAnikotoM3u8 error:", e);
    return [];
  }
}

// ─── HiAnime m3u8 ─────────────────────────────────────────────────────────────

async function getHiAnimeM3u8(title: string, episode: number) {
  try {
    const searchRes = await fetch(
      `${HIANIME_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { ...FETCH_OPTS(), next: { revalidate: 3600 } } as RequestInit
    );
    if (!searchRes.ok) return [];
    const sd = await searchRes.json();
    const animes: { id: string; name?: string; title?: string }[] =
      sd?.results || sd?.animes || sd?.data?.animes || [];
    if (!animes.length) return [];

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = animes[0], bestScore = 0;
    for (const a of animes) {
      const c = clean(a.name || a.title || "");
      if (c === target) { best = a; break; }
      const score = target.split(" ").filter((w) => c.includes(w)).length / target.split(" ").length;
      if (score > bestScore) { bestScore = score; best = a; }
    }

    const animeRes = await fetch(
      `${HIANIME_API}/api/anime/${best.id}`,
      { ...FETCH_OPTS(), next: { revalidate: 300 } } as RequestInit
    );
    if (!animeRes.ok) return [];
    const ad = await animeRes.json();
    const episodes: { id: string; number?: number; episodeId?: string }[] =
      ad?.episodes || ad?.data?.episodes || ad?.results?.episodes || [];
    if (!episodes.length) return [];

    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return [];
    const episodeId = ep.episodeId || ep.id;
    if (!episodeId) return [];

    const sources: { type: "m3u8"; url: string; provider: string; lang: string; subtitles?: { url: string; lang: string }[] }[] = [];
    for (const cat of ["sub", "dub"] as const) {
      try {
        const srcRes = await fetch(
          `${HIANIME_API}/api/episode-srcs?id=${episodeId}&server=megacloud&category=${cat}`,
          { ...FETCH_OPTS(), next: { revalidate: 300 } } as RequestInit
        );
        if (!srcRes.ok) continue;
        const srcData = await srcRes.json();
        const link = srcData?.link || srcData?.sources?.[0]?.url || srcData?.data?.sources?.[0]?.url;
        if (!link) continue;
        const subtitles = (srcData?.tracks || [])
          .filter((t: { kind?: string }) => t.kind === "captions" || t.kind === "subtitles")
          .map((t: { file?: string; label?: string }) => ({ url: t.file || "", lang: t.label || "Unknown" }))
          .filter((t: { url: string }) => t.url);
        sources.push({ type: "m3u8", url: link, provider: `HiAnime ${cat === "sub" ? "Sub" : "Dub"}`, lang: cat, subtitles });
      } catch {}
    }
    return sources;
  } catch (e) {
    console.error("getHiAnimeM3u8 error:", e);
    return [];
  }
}

// ─── TMDB lookup ──────────────────────────────────────────────────────────────

async function getTmdbId(title: string, year?: number): Promise<number | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const p = new URLSearchParams({ api_key: key, query: title, ...(year ? { first_air_date_year: String(year) } : {}) });
    const r = await fetch(`https://api.themoviedb.org/3/search/tv?${p}`, { next: { revalidate: 86400 } });
    return (await r.json()).results?.[0]?.id ?? null;
  } catch { return null; }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp       = new URL(req.url).searchParams;
  const title    = sp.get("title");
  const episode  = parseInt(sp.get("episode") || "1");
  const provider = sp.get("provider") || "gogoanime";
  const season   = parseInt(sp.get("season") || "1");
  const year     = sp.get("year") ? parseInt(sp.get("year")!) : undefined;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // ── Megaplay via Anikoto episode_embed_id (the correct full-library method) ──
  if (provider === "megaplay") {
    const sources = await getMegaplayEmbeds(title, episode);
    return NextResponse.json({ sources });
  }

  // ── Anikoto m3u8 ─────────────────────────────────────────────────────────────
  if (provider === "anikoto") {
    const [sub, dub] = await Promise.all([
      getAnikotoM3u8(title, episode, "sub"),
      getAnikotoM3u8(title, episode, "dub"),
    ]);
    return NextResponse.json({ sources: [...sub, ...dub] });
  }

  // ── HiAnime m3u8 ─────────────────────────────────────────────────────────────
  if (provider === "hianime") {
    return NextResponse.json({ sources: await getHiAnimeM3u8(title, episode) });
  }

  // ── TMDB embeds — sub/dub only ───────────────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbId(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });
    const sources = [
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, provider: "VidSrc.me 1", lang: "sub" },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,     provider: "VidSrc.me 2", lang: "sub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                         provider: "VidAPI",       lang: "sub" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,                               provider: "VidLink",      lang: "sub" },
      { type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,          provider: "MultiEmbed",   lang: "sub" },
      // ── DUB sources via TMDB ──────────────────────────────────────────
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`, provider: "VidSrc Dub",   lang: "dub" },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`,     provider: "VidSrc Dub 2", lang: "dub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                    provider: "VidAPI Dub",   lang: "dub" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?dubbing=true`,                             provider: "VidLink Dub",  lang: "dub" },
      { type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}&lang=en`,             provider: "MultiEmbed Dub", lang: "dub" },
    ];
    return NextResponse.json({ sources, tmdbId });
  }

  // ── AnimePahe m3u8 ───────────────────────────────────────────────────────────
  if (provider === "animepahe") {
    try {
      const results = await searchAnimePahe(title);
      if (!results.length) return NextResponse.json({ sources: [] });
      const match = bestMatch(results, title);
      const sources = await getAnimePaheStream(`${match.id}/${episode}`);
      return NextResponse.json({ sources: sources.map((s) => ({ ...s, lang: "sub" })) });
    } catch (e) {
      console.error("AnimePahe error:", e);
      return NextResponse.json({ sources: [] });
    }
  }

  // ── GogoAnime m3u8 (default) ─────────────────────────────────────────────────
  try {
    const searchTitles = [
      title,
      title.replace(/\s+season\s+\d+/i, "").trim(),
      title.split(" ").slice(0, 3).join(" "),
    ].filter((t, i, a) => a.indexOf(t) === i);

    let results: Awaited<ReturnType<typeof searchGogoanime>> = [];
    for (const t of searchTitles) {
      results = await searchGogoanime(t);
      if (results.length) break;
    }
    if (!results.length) return NextResponse.json({ sources: [] });
    const match = bestMatch(results, title);
    const eps   = await getGogoanimeEpisodes(match.id);
    const ep    = eps.find((e) => e.number === episode) || eps[episode - 1];
    if (!ep) return NextResponse.json({ sources: [] });
    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({ sources: sources.map((s) => ({ ...s, lang: "sub" })) });
  } catch (e) {
    console.error("GogoAnime error:", e);
    return NextResponse.json({ sources: [], error: "fetch failed" });
  }
}
