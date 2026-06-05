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
const ANIKOTO_DATA = "https://anikotoapi.site"; // official REST API

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

function cleanTitle(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// ── Anikoto API: search → get series → get episode embed URLs ──────────────
// This is the CORRECT way to use MegaPlay.
// anikotoapi.site gives us embed_url.sub / embed_url.dub per episode.
// These use the /stream/s-2/{episode_embed_id}/ endpoint which works for
// the FULL library — unlike /stream/ani/{anilistId} which only works for
// anime that have been manually mapped.

interface AnikotoSeriesResult {
  id: number | string;
  title?: string;
  name?: string;
  slug?: string;
}

interface AnikotoEpisode {
  number?: number;
  episode_number?: number;
  episode_embed_id?: string;
  embed_id?: string;
  embed_url?: {
    sub?: string;
    dub?: string;
  };
}

async function getMegaplayViaAnikotoAPI(
  title: string,
  episode: number
): Promise<{ type: "embed"; url: string; provider: string; lang: string }[]> {
  try {
    // Step 1: Search for the anime using the Anikoto search API
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.data || searchData?.animes || [];
    if (!results.length) return [];

    // Find best match
    const target = cleanTitle(title);
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const candidate = cleanTitle(r.name || r.title || "");
      if (candidate === target) { best = r; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const seriesId = best.id || best.slug;
    if (!seriesId) return [];

    // Step 2: Get full series data from anikotoapi.site
    // This gives us embed_url.sub / embed_url.dub per episode
    const seriesRes = await fetch(
      `${ANIKOTO_DATA}/series/${seriesId}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
    );
    if (!seriesRes.ok) return [];

    const seriesData = await seriesRes.json();
    const episodes: AnikotoEpisode[] =
      seriesData?.episodes ||
      seriesData?.data?.episodes ||
      seriesData?.anime?.episodes ||
      [];
    if (!episodes.length) return [];

    // Find the right episode
    const ep =
      episodes.find((e) => (e.number ?? e.episode_number) === episode) ||
      episodes[episode - 1];
    if (!ep) return [];

    const sources: { type: "embed"; url: string; provider: string; lang: string }[] = [];

    // Use embed_url directly — anikotoapi.site provides these ready-made
    if (ep.embed_url?.sub) {
      sources.push({
        type: "embed",
        url: ep.embed_url.sub,
        provider: "MegaPlay Sub",
        lang: "sub",
      });
    }
    if (ep.embed_url?.dub) {
      sources.push({
        type: "embed",
        url: ep.embed_url.dub,
        provider: "MegaPlay Dub",
        lang: "dub",
      });
    }

    // Fallback: construct URL from episode_embed_id if embed_url not present
    const embedId = ep.episode_embed_id || ep.embed_id;
    if (embedId && !ep.embed_url?.sub) {
      sources.push({
        type: "embed",
        url: `https://megaplay.buzz/stream/s-2/${embedId}/sub`,
        provider: "MegaPlay Sub",
        lang: "sub",
      });
      sources.push({
        type: "embed",
        url: `https://megaplay.buzz/stream/s-2/${embedId}/dub`,
        provider: "MegaPlay Dub",
        lang: "dub",
      });
    }

    return sources;
  } catch (e) {
    console.error("getMegaplayViaAnikotoAPI error:", e);
    return [];
  }
}

// ── Anikoto: real m3u8 streams ─────────────────────────────────────────────

interface AnikotoSource {
  type: "m3u8";
  url: string;
  provider: string;
  lang: string;
  subtitles?: { url: string; lang: string }[];
}

async function getAnikotoStream(
  title: string,
  episode: number,
  category: "sub" | "dub"
): Promise<AnikotoSource[]> {
  try {
    const searchRes = await fetch(
      `${ANIKOTO_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    const results: { id?: string; slug?: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.data || searchData?.animes || [];
    if (!results.length) return [];

    const target = cleanTitle(title);
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const candidate = cleanTitle(r.name || r.title || "");
      if (candidate === target) { best = r; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }

    const slug = best.id || best.slug;
    if (!slug) return [];

    const watchRes = await fetch(
      `${ANIKOTO_API}/api/watch/${slug}?ep=${episode}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
    );
    if (!watchRes.ok) return [];
    const watchData = await watchRes.json();

    const rawSources: { url?: string; isM3U8?: boolean; quality?: string }[] =
      watchData?.sources || watchData?.data?.sources || [];
    const tracks: { file?: string; src?: string; label?: string; kind?: string }[] =
      watchData?.tracks || watchData?.data?.tracks || [];

    const subtitles = tracks
      .filter((t) => t.kind === "captions" || t.kind === "subtitles")
      .map((t) => ({ url: t.file || t.src || "", lang: t.label || "Unknown" }))
      .filter((t) => t.url);

    const proxyBase: string = watchData?.proxyUrl || "";

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
    console.error("Anikoto stream error:", e);
    return [];
  }
}

// ── HiAnime API ────────────────────────────────────────────────────────────

interface HiAnimeSource {
  type: "m3u8";
  url: string;
  provider: string;
  lang: string;
  subtitles?: { url: string; lang: string }[];
}

async function getHiAnimeStream(title: string, episode: number): Promise<HiAnimeSource[]> {
  try {
    const searchRes = await fetch(
      `${HIANIME_API}/api/search?keyword=${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    const animes: { id: string; name?: string; title?: string }[] =
      searchData?.results || searchData?.animes || searchData?.data?.animes || [];
    if (!animes.length) return [];

    const target = cleanTitle(title);
    let best = animes[0], bestScore = 0;
    for (const a of animes) {
      const candidate = cleanTitle(a.name || a.title || "");
      if (candidate === target) { best = a; break; }
      const words = target.split(" ");
      const score = words.filter((w) => candidate.includes(w)).length / words.length;
      if (score > bestScore) { bestScore = score; best = a; }
    }

    const animeRes = await fetch(
      `${HIANIME_API}/api/anime/${best.id}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
    );
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
        const srcRes = await fetch(
          `${HIANIME_API}/api/episode-srcs?id=${episodeId}&server=megacloud&category=${category}`,
          { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
        );
        if (!srcRes.ok) continue;
        const srcData = await srcRes.json();

        const link =
          srcData?.link || srcData?.sources?.[0]?.url || srcData?.data?.sources?.[0]?.url;
        if (!link) continue;

        const subtitles = (srcData?.tracks || srcData?.subtitles || [])
          .filter((t: { kind?: string }) => t.kind === "captions" || t.kind === "subtitles")
          .map((t: { file?: string; label?: string }) => ({ url: t.file || "", lang: t.label || "Unknown" }))
          .filter((t: { url: string }) => t.url);

        sources.push({
          type: "m3u8",
          url: link,
          provider: `HiAnime ${category === "sub" ? "Sub" : "Dub"}`,
          lang: category,
          subtitles,
        });
      } catch {}
    }
    return sources;
  } catch (e) {
    console.error("HiAnime API error:", e);
    return [];
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
    const res = await fetch(`https://api.themoviedb.org/3/search/tv?${params}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title    = searchParams.get("title");
  const episode  = parseInt(searchParams.get("episode") || "1");
  const provider = searchParams.get("provider") || "gogoanime";
  const season   = parseInt(searchParams.get("season") || "1");
  const yearParam = searchParams.get("year");
  const year     = yearParam ? parseInt(yearParam) : undefined;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // ── MegaPlay via Anikoto API (THE CORRECT METHOD) ─────────────────────
  // Uses anikotoapi.site to get embed_url.sub/dub per episode.
  // These use /stream/s-2/{episode_embed_id}/ which works for the FULL
  // library — not just mapped anime like /stream/ani/{anilistId}.
  if (provider === "megaplay") {
    const sources = await getMegaplayViaAnikotoAPI(title, episode);
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

  // ── Indian languages (Hindi/Tamil/Telugu) ────────────────────────────
  // Uses TMDB ID with ds_lang param for dubbed streams
  if (provider === "indian") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });
    const sources = [
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=hi`, provider: "VidSrc हिंदी",    lang: "hindi"  },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=hi`,     provider: "VidSrc हिंदी 2",  lang: "hindi"  },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?lang=hi`,                                  provider: "VidLink हिंदी",   lang: "hindi"  },
      { type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}&lang=hi`,             provider: "MultiEmbed हिंदी",lang: "hindi"  },
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=ta`, provider: "VidSrc தமிழ்",    lang: "tamil"  },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=ta`,     provider: "VidSrc தமிழ் 2",  lang: "tamil"  },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?lang=ta`,                                  provider: "VidLink தமிழ்",   lang: "tamil"  },
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=te`, provider: "VidSrc తెలుగు",   lang: "telugu" },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=te`,     provider: "VidSrc తెలుగు 2", lang: "telugu" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?lang=te`,                                  provider: "VidLink తెలుగు",  lang: "telugu" },
    ];
    return NextResponse.json({ sources, tmdbId });
  }

  // ── TMDB — sub + dub ─────────────────────────────────────────────────
  if (provider === "tmdb") {
    const tmdbId = await getTmdbIdByTitle(title, year);
    if (!tmdbId) return NextResponse.json({ sources: [] });

    const sources = [
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,             provider: "VidSrc.me 1",  lang: "sub" },
      { type: "embed", url: `https://vidsrcme.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                 provider: "VidSrc.me 2",  lang: "sub" },
      { type: "embed", url: `https://vsrc.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                     provider: "VidSrc.me 3",  lang: "sub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                     provider: "VidAPI",       lang: "sub" },
      { type: "embed", url: `https://primesrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,                 provider: "PrimeSrc",     lang: "sub" },
      { type: "embed", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,                                           provider: "VidLink",      lang: "sub" },
      { type: "embed", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,                      provider: "MultiEmbed",   lang: "sub" },
      { type: "embed", url: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=en`, provider: "VidSrc Dub",   lang: "dub" },
      { type: "embed", url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,                                    provider: "VidAPI Dub",   lang: "dub" },
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
