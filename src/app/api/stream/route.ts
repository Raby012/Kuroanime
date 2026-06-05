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
const ANIKOTO_API  = "https://anikoto-six.vercel.app";
const ANIKOTO_DATA = "https://anikotoapi.site";

// ── Helpers ────────────────────────────────────────────────────────────────

function bestMatch(results: { id: string; title: string }[], title: string) {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const target = clean(title);
  let best = results[0], bestScore = 0;
  for (const r of results) {
    const candidate = clean(r.title);
    if (candidate === target) return r;
    const words = target.split(" ");
    const score = words.filter((w) => candidate.includes(w)).length / words.length;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

// ── watchanimeworld.net scraper — real Hindi/Tamil/Telugu dubs ────────────
// This is the ONLY site that actually has Indian dubbed anime audio.
// We search by title, get episode page, extract m3u8/mp4 stream URLs.

type IndianLang = "hindi" | "tamil" | "telugu";

interface IndianSource {
  type: "m3u8" | "embed";
  url: string;
  provider: string;
  lang: IndianLang;
}

async function getIndianDubStream(
  title: string,
  episode: number
): Promise<IndianSource[]> {
  const sources: IndianSource[] = [];

  try {
    const BROWSER_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    };

    // Step 1: search for the anime
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, "+").trim();
    const searchRes = await fetch(
      `https://watchanimeworld.net/?s=${encodeURIComponent(title)}`,
      { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return [];
    const searchHtml = await searchRes.text();

    // Extract anime URLs from search results
    const linkMatches = [...searchHtml.matchAll(/href="(https:\/\/watchanimeworld\.net\/(?:anime|series)\/[^"]+)"/g)];
    if (!linkMatches.length) return [];

    // Find best title match
    const animeUrl = linkMatches[0][1];

    // Step 2: fetch anime page to find season/episode list
    const animeRes = await fetch(animeUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!animeRes.ok) return [];
    const animeHtml = await animeRes.text();

    // Extract episode links — pattern: /episode/anime-title-1x1/
    const epPattern = new RegExp(
      `href="(https://watchanimeworld\\.net/episode/[^"]+1x${episode}/)"`,
      "g"
    );
    const epMatches = [...animeHtml.matchAll(epPattern)];
    if (!epMatches.length) {
      // Try alternate pattern without trailing slash
      const epPattern2 = new RegExp(
        `href="(https://watchanimeworld\\.net/episode/[^"]+${episode}[^"]*)"`,
        "g"
      );
      const alt = [...animeHtml.matchAll(epPattern2)];
      if (!alt.length) return [];
      // Use first match
      const epUrl = alt[0][1];
      return await scrapeEpisodePage(epUrl, BROWSER_HEADERS);
    }

    const epUrl = epMatches[0][1];
    return await scrapeEpisodePage(epUrl, BROWSER_HEADERS);
  } catch (e) {
    console.error("Indian dub scrape error:", e);
    return [];
  }
}

async function scrapeEpisodePage(
  epUrl: string,
  headers: Record<string, string>
): Promise<IndianSource[]> {
  const sources: IndianSource[] = [];

  const epRes = await fetch(epUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!epRes.ok) return [];
  const epHtml = await epRes.text();

  // Detect languages available from tabs/buttons
  const hasHindi  = /hindi|हिंदी/i.test(epHtml);
  const hasTamil  = /tamil|தமிழ்/i.test(epHtml);
  const hasTelugu = /telugu|తెలుగు/i.test(epHtml);

  // Extract m3u8 URLs — they appear in script tags or source elements
  const m3u8Matches = [...epHtml.matchAll(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/g)];
  for (const match of m3u8Matches) {
    const url = match[1];
    // Try to detect language from URL or surrounding context
    const lowerCtx = epHtml.slice(Math.max(0, epHtml.indexOf(url) - 200), epHtml.indexOf(url) + 50).toLowerCase();
    let lang: IndianLang = "hindi";
    if (/tamil/.test(lowerCtx) || /ta/.test(url)) lang = "tamil";
    else if (/telugu/.test(lowerCtx) || /te/.test(url)) lang = "telugu";

    sources.push({ type: "m3u8", url, provider: `AnimeWorld ${lang === "hindi" ? "हिंदी" : lang === "tamil" ? "தமிழ்" : "తెలుగు"}`, lang });
  }

  // Extract iframe embed URLs (letsembed.cc, vidstreaming, etc)
  const iframeMatches = [...epHtml.matchAll(/src=["'](https?:\/\/[^"']+)['"]/g)];
  for (const match of iframeMatches) {
    const url = match[1];
    if (!url.includes("watchanimeworld") && !url.includes("wp-content")) {
      const lowerCtx = epHtml.slice(Math.max(0, epHtml.indexOf(url) - 300), epHtml.indexOf(url) + 50).toLowerCase();
      let lang: IndianLang = "hindi";
      if (/tamil/.test(lowerCtx)) lang = "tamil";
      else if (/telugu/.test(lowerCtx)) lang = "telugu";

      sources.push({
        type: "embed",
        url,
        provider: `AnimeWorld Embed ${lang === "hindi" ? "हिंदी" : lang === "tamil" ? "தமிழ்" : "తెలుగు"}`,
        lang,
      });
    }
  }

  return sources;
}

// ── MegaPlay via Anikoto episode ID — full library ─────────────────────────

interface AnikotoEpisode {
  number?: number;
  episode_number?: number;
  episode_embed_id?: string;
  embed_id?: string;
  embed_url?: { sub?: string; dub?: string };
}

async function getMegaplayS2Sources(
  title: string,
  episode: number
): Promise<{ type: "embed"; url: string; provider: string; lang: string }[]> {
  try {
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
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
      const candidate = clean(r.name || r.title || "");
      if (candidate === target) { best = r; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const seriesId = best.id || best.slug;
    if (!seriesId) return [];

    const seriesRes = await fetch(`${ANIKOTO_DATA}/series/${seriesId}`, { next: { revalidate: 300 } });
    if (!seriesRes.ok) return [];
    const seriesData = await seriesRes.json();
    const episodes: AnikotoEpisode[] = seriesData?.episodes || seriesData?.data?.episodes || [];
    if (!episodes.length) return [];

    const ep = episodes.find((e) => (e.number ?? e.episode_number) === episode) || episodes[episode - 1];
    if (!ep) return [];

    const out: { type: "embed"; url: string; provider: string; lang: string }[] = [];
    if (ep.embed_url?.sub) out.push({ type: "embed", url: ep.embed_url.sub, provider: "MegaPlay Sub", lang: "sub" });
    if (ep.embed_url?.dub) out.push({ type: "embed", url: ep.embed_url.dub, provider: "MegaPlay Dub", lang: "dub" });

    const embedId = ep.episode_embed_id || ep.embed_id;
    if (embedId && !ep.embed_url?.sub) {
      out.push({ type: "embed", url: `https://megaplay.buzz/stream/s-2/${embedId}/sub`, provider: "MegaPlay Sub", lang: "sub" });
      out.push({ type: "embed", url: `https://megaplay.buzz/stream/s-2/${embedId}/dub`, provider: "MegaPlay Dub", lang: "dub" });
    }
    return out;
  } catch (e) {
    console.error("MegaPlay s-2 error:", e);
    return [];
  }
}

// ── Anikoto m3u8 ──────────────────────────────────────────────────────────

interface AnikotoSource {
  type: "m3u8"; url: string; provider: string; lang: string;
  subtitles?: { url: string; lang: string }[];
}

async function getAnikotoStream(title: string, episode: number, category: "sub" | "dub"): Promise<AnikotoSource[]> {
  try {
    const searchRes = await fetch(`${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`, { next: { revalidate: 3600 } });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.data || searchData?.animes || [];
    if (!results.length) return [];

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const candidate = clean(r.name || r.title || "");
      if (candidate === target) { best = r; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    const slug = best.id || best.slug;
    if (!slug) return [];

    const watchRes = await fetch(`${ANIKOTO_API}/api/watch/${slug}?ep=${episode}`, { next: { revalidate: 300 } });
    if (!watchRes.ok) return [];
    const watchData = await watchRes.json();

    const rawSources: { url?: string; isM3U8?: boolean; quality?: string }[] = watchData?.sources || watchData?.data?.sources || [];
    const tracks: { file?: string; src?: string; label?: string; kind?: string }[] = watchData?.tracks || watchData?.data?.tracks || [];
    const subtitles = tracks.filter((t) => t.kind === "captions" || t.kind === "subtitles")
      .map((t) => ({ url: t.file || t.src || "", lang: t.label || "Unknown" })).filter((t) => t.url);
    const proxyBase: string = watchData?.proxyUrl || "";

    return rawSources.filter((s) => s.url && (s.isM3U8 || s.url.includes(".m3u8"))).map((s) => ({
      type: "m3u8" as const,
      url: proxyBase ? `${proxyBase}${encodeURIComponent(s.url!)}` : s.url!,
      provider: `Anikoto ${category === "sub" ? "Sub" : "Dub"} (${s.quality || "HD"})`,
      lang: category, subtitles,
    }));
  } catch (e) {
    console.error("Anikoto stream error:", e);
    return [];
  }
}

// ── HiAnime m3u8 ──────────────────────────────────────────────────────────

interface HiAnimeSource {
  type: "m3u8"; url: string; provider: string; lang: string;
  subtitles?: { url: string; lang: string }[];
}

async function getHiAnimeStream(title: string, episode: number): Promise<HiAnimeSource[]> {
  try {
    const searchRes = await fetch(`${HIANIME_API}/api/search?keyword=${encodeURIComponent(title)}`, { next: { revalidate: 3600 } });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const animes: { id: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.animes || searchData?.data?.animes || [];
    if (!animes.length) return [];

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const target = clean(title);
    let best = animes[0], bestScore = 0;
    for (const a of animes) {
      const candidate = clean(a.name || a.title || "");
      if (candidate === target) { best = a; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = a; }
    }

    const animeRes = await fetch(`${HIANIME_API}/api/anime/${best.id}`, { next: { revalidate: 300 } });
    if (!animeRes.ok) return [];
    const animeData = await animeRes.json();
    const episodes: { id: string; number?: number; episodeId?: string }[] =
      animeData?.episodes || animeData?.data?.episodes || animeData?.results?.episodes || [];
    if (!episodes.length) return [];
    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return [];
    const episodeId = ep.episodeId || ep.id;
    if (!episodeId) return [];

    const sources: HiAnimeSource[] = [];
    for (const category of ["sub", "dub"] as const) {
      try {
        const srcRes = await fetch(`${HIANIME_API}/api/episode-srcs?id=${episodeId}&server=megacloud&category=${category}`, { next: { revalidate: 300 } });
        if (!srcRes.ok) continue;
        const srcData = await srcRes.json();
        const link = srcData?.link || srcData?.sources?.[0]?.url || srcData?.data?.sources?.[0]?.url;
        if (!link) continue;
        const subtitles = (srcData?.tracks || srcData?.subtitles || [])
          .filter((t: { kind?: string }) => t.kind === "captions" || t.kind === "subtitles")
          .map((t: { file?: string; label?: string }) => ({ url: t.file || "", lang: t.label || "Unknown" }))
          .filter((t: { url: string }) => t.url);
        sources.push({ type: "m3u8", url: link, provider: `HiAnime ${category === "sub" ? "Sub" : "Dub"}`, lang: category, subtitles });
      } catch {}
    }
    return sources;
  } catch (e) {
    console.error("HiAnime error:", e);
    return [];
  }
}

// ── TMDB lookup ────────────────────────────────────────────────────────────

async function getTmdbId(title: string, year?: number): Promise<number | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, query: title, ...(year ? { first_air_date_year: String(year) } : {}) });
    const res = await fetch(`https://api.themoviedb.org/3/search/tv?${params}`, { next: { revalidate: 86400 } });
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch { return null; }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title    = searchParams.get("title");
  const episode  = parseInt(searchParams.get("episode") || "1");
  const provider = searchParams.get("provider") || "gogoanime";
  const season   = parseInt(searchParams.get("season") || "1");
  const year     = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // ── Indian dubs — watchanimeworld.net scraper ─────────────────────────
  // This is the ONLY real source for Hindi/Tamil/Telugu anime dubs.
  if (provider === "indian") {
    const sources = await getIndianDubStream(title, episode);
    return NextResponse.json({ sources });
  }

  // ── MegaPlay via Anikoto episode ID ──────────────────────────────────
  if (provider === "megaplay") {
    const sources = await getMegaplayS2Sources(title, episode);
    return NextResponse.json({ sources });
  }

  // ── Anikoto m3u8 ─────────────────────────────────────────────────────
  if (provider === "anikoto") {
    const [sub, dub] = await Promise.all([
      getAnikotoStream(title, episode, "sub"),
      getAnikotoStream(title, episode, "dub"),
    ]);
    return NextResponse.json({ sources: [...sub, ...dub] });
  }

  // ── HiAnime m3u8 ─────────────────────────────────────────────────────
  if (provider === "hianime") {
    const sources = await getHiAnimeStream(title, episode);
    return NextResponse.json({ sources });
  }

  // ── TMDB embed sources — sub/dub only (no fake Indian lang) ──────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbId(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });
    const sources = [
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,         provider: "VidSrc.me 1",  lang: "sub" },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,             provider: "VidSrc.me 2",  lang: "sub" },
      { type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                 provider: "VidSrc.me 3",  lang: "sub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                 provider: "VidAPI",       lang: "sub" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,                                       provider: "VidLink",      lang: "sub" },
      { type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,                  provider: "MultiEmbed",   lang: "sub" },
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`, provider: "VidSrc Dub", lang: "dub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                 provider: "VidAPI Dub",   lang: "dub" },
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
      return NextResponse.json({ sources: sources.map((s) => ({ ...s, lang: "sub" })), matchedTitle: match.title });
    } catch (err) {
      console.error("AnimePahe error:", err);
      return NextResponse.json({ sources: [] });
    }
  }

  // ── GogoAnime (default) ───────────────────────────────────────────────
  try {
    const searchTitles = [title, title.replace(/\s+season\s+\d+/i, "").trim(), title.split(" ").slice(0, 3).join(" ")]
      .filter((t, i, arr) => arr.indexOf(t) === i);
    let results: Awaited<ReturnType<typeof searchGogoanime>> = [];
    for (const t of searchTitles) { results = await searchGogoanime(t); if (results.length) break; }
    if (!results.length) return NextResponse.json({ sources: [] });
    const match = bestMatch(results, title);
    const episodes = await getGogoanimeEpisodes(match.id);
    const ep = episodes.find((e) => e.number === episode) || episodes[episode - 1];
    if (!ep) return NextResponse.json({ sources: [] });
    const sources = await getGogoanimeStream(ep.id);
    return NextResponse.json({ sources: sources.map((s) => ({ ...s, lang: "sub" })), matchedTitle: match.title });
  } catch (err) {
    console.error("GogoAnime error:", err);
    return NextResponse.json({ sources: [], error: "Stream fetch failed" });
  }
}
