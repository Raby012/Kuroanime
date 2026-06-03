"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource, Language } from "@/lib/embed-sources";
import {
  getEmbedSources,
  getAnilistEmbedSources,
  getMalEmbedSources,
} from "@/lib/embed-sources";
import { Loader2, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";

const LANGUAGES: { key: Language; label: string; flag: string }[] = [
  { key: "sub", label: "SUB", flag: "🇯🇵" },
  { key: "dub", label: "DUB", flag: "🇬🇧" },
  { key: "hindi", label: "हिंदी", flag: "🇮🇳" },
  { key: "tamil", label: "தமிழ்", flag: "🇮🇳" },
  { key: "telugu", label: "తెలుగు", flag: "🇮🇳" },
];

interface VideoPlayerProps {
  animeTitle: string;
  anilistId: number;
  malId?: number | null;
  episode: number;
  season?: number;
  seasonYear?: number | null;
  imdbId?: string | null;
  tmdbId?: number | null;
  isMovie?: boolean;
  onEpisodeEnd?: () => void;
  onProgress?: (episode: number) => void;
}

export function VideoPlayer({
  animeTitle,
  anilistId,
  malId,
  episode,
  season = 1,
  seasonYear,
  imdbId,
  tmdbId,
  isMovie = false,
  onEpisodeEnd,
  onProgress,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<unknown>(null);
  const embedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [language, setLanguage] = useState<Language>("sub");
  const [allSources, setAllSources] = useState<StreamSource[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // Filter sources by language — only show sources for selected lang
  const sources = (() => {
    const filtered = allSources.filter((s) => (s.lang ?? "sub") === language);
    return filtered;
  })();

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    setAllSources([]);
    setSourceIndex(0);
    setEmbedLoaded(false);
    setEmbedError(false);

    const collected: StreamSource[] = [];

    // 1. MegaPlay — AniList + MAL ID (instant, sub + dub)
    collected.push(...getAnilistEmbedSources(anilistId, episode, isMovie, malId));

    // 2. VidSrc via MAL ID (instant, sub only)
    if (malId) {
      collected.push(...getMalEmbedSources(malId, episode, isMovie));
    }

    // 3. IMDb/TMDB direct embeds (instant if available)
    if (imdbId || tmdbId) {
      collected.push(
        ...getEmbedSources(imdbId ?? null, tmdbId ?? null, season, episode, isMovie)
      );
    }

    setAllSources([...collected]);
    setLoading(false);

    // 4. All async sources in parallel
    const [hianime, anikoto, tmdbSources, gogo, pahe] = await Promise.all([
      // HiAnime — real m3u8
      fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=hianime`
      )
        .then((r) => r.json())
        .then((d) => (d.sources || []) as StreamSource[])
        .catch(() => [] as StreamSource[]),

      // Anikoto — real m3u8 sub+dub
      fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=anikoto`
      )
        .then((r) => r.json())
        .then((d) => (d.sources || []) as StreamSource[])
        .catch(() => [] as StreamSource[]),

      // TMDB — sub + LetsEmbed Hindi/Tamil/Telugu
      fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&season=${season}&provider=tmdb${seasonYear ? `&year=${seasonYear}` : ""}`
      )
        .then((r) => r.json())
        .then((d) => (d.sources || []) as StreamSource[])
        .catch(() => [] as StreamSource[]),

      // GogoAnime — m3u8
      fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
      )
        .then((r) => r.json())
        .then((d) =>
          (d.sources || []).map((s: StreamSource) => ({ ...s, lang: "sub" }))
        )
        .catch(() => [] as StreamSource[]),

      // AnimePahe — m3u8
      fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=animepahe`
      )
        .then((r) => r.json())
        .then((d) =>
          (d.sources || []).map((s: StreamSource) => ({ ...s, lang: "sub" }))
        )
        .catch(() => [] as StreamSource[]),
    ]);

    setAllSources((prev) => {
      const combined = [...prev];
      // Prepend real m3u8 streams (best quality)
      const m3u8s = [...hianime, ...anikoto, ...gogo, ...pahe].filter(
        (s) => s.type === "m3u8"
      );
      // TMDB sources include Hindi/Tamil/Telugu from LetsEmbed
      const tmdbEmbeds = tmdbSources.filter((s) => s.type === "embed");

      // Put m3u8 first, then existing embeds, then tmdb embeds (which include Indian langs)
      return [...m3u8s, ...combined, ...tmdbEmbeds];
    });
  }, [
    animeTitle,
    anilistId,
    malId,
    episode,
    season,
    seasonYear,
    imdbId,
    tmdbId,
    isMovie,
  ]);

  // Reset when episode changes
  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Reset source index when language changes
  useEffect(() => {
    setSourceIndex(0);
    setEmbedLoaded(false);
    setEmbedError(false);
    setError(false);
  }, [language]);

  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) {
      setError(true);
      return;
    }
    setProviderLabel(src.provider);
    setEmbedLoaded(false);
    setEmbedError(false);
    if (src.type === "m3u8") loadHLS(src.url, src.subtitles);
  }, [sources, sourceIndex]);

  // Auto-advance embed after 12s if not loaded
  useEffect(() => {
    const src = sources[sourceIndex];
    if (!src || src.type !== "embed") return;
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current);
    embedTimerRef.current = setTimeout(() => {
      if (!embedLoaded && !embedError) tryNextSource();
    }, 12000);
    return () => {
      if (embedTimerRef.current) clearTimeout(embedTimerRef.current);
    };
  }, [sourceIndex, sources, embedLoaded, embedError]);

  // Listen for player postMessage errors
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
        if (
          data?.type === "error" ||
          data?.event === "error" ||
          data?.status === 404 ||
          data?.error
        ) {
          setEmbedError(true);
          setTimeout(() => tryNextSource(), 1000);
          return;
        }
        if (data?.event === "complete") onEpisodeEnd?.();
        if (
          (data?.event === "time" && data.percent > 0.05) ||
          (data?.type === "watching-log" && data.currentTime > 30)
        ) {
          onProgress?.(episode);
        }
      } catch {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [episode, onEpisodeEnd, onProgress, sourceIndex]);

  async function loadHLS(
    url: string,
    subtitles?: { url: string; lang: string }[]
  ) {
    if (typeof window === "undefined") return;
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) {
      (hlsRef.current as { destroy: () => void }).destroy();
      hlsRef.current = null;
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) tryNextSource();
        });
      } else {
        tryNextSource();
      }
    }
  }

  function tryNextSource() {
    setEmbedLoaded(false);
    setEmbedError(false);
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((i) => i + 1);
    } else {
      setError(true);
    }
  }

  const currentSource = sources[sourceIndex];
  const isEmbed = currentSource?.type === "embed";

  // Count sources per language for badges
  const langCounts = LANGUAGES.reduce(
    (acc, l) => {
      acc[l.key] = allSources.filter(
        (s) => (s.lang ?? "sub") === l.key
      ).length;
      return acc;
    },
    {} as Record<Language, number>
  );

  return (
    <div className="w-full">
      {/* Language selector */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {LANGUAGES.map((l) => {
          const count = langCounts[l.key] || 0;
          return (
            <button
              key={l.key}
              onClick={() => setLanguage(l.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                language === l.key
                  ? "bg-brand text-white border-brand shadow-lg shadow-brand/30"
                  : count > 0
                  ? "bg-surface-2 text-gray-300 border-white/10 hover:border-brand/50 hover:text-white"
                  : "bg-surface-1 text-gray-600 border-white/5"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {count > 0 && (
                <span
                  className={`text-xs rounded-full px-1 ${
                    language === l.key
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Player */}
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="text-brand animate-spin" size={32} />
            <p className="text-gray-400 text-sm">
              Finding stream for episode {episode}...
            </p>
          </div>
        ) : error || sources.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
            <AlertTriangle className="text-brand" size={32} />
            <p className="text-white font-medium text-center">
              No{" "}
              {LANGUAGES.find((l) => l.key === language)?.label}{" "}
              stream available
            </p>
            <p className="text-gray-400 text-sm text-center max-w-xs">
              Try a different language or source above.
            </p>
            <button
              onClick={fetchSources}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : isEmbed && currentSource ? (
          <>
            <iframe
              ref={iframeRef}
              key={`${currentSource.url}-${sourceIndex}-${language}`}
              src={currentSource.url}
              className="w-full h-full"
              allowFullScreen
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
              style={{ border: "none" }}
              onLoad={() => setEmbedLoaded(true)}
            />
            {sourceIndex < sources.length - 1 && (
              <button
                onClick={tryNextSource}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/80 hover:bg-brand text-white text-xs px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
              >
                Next source <ChevronRight size={12} />
              </button>
            )}
          </>
        ) : currentSource?.type === "m3u8" ? (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            onEnded={onEpisodeEnd}
            onPlay={() => onProgress?.(episode)}
          />
        ) : null}
      </div>

      {/* Source info + switcher */}
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">
          Source:{" "}
          <span className="text-brand font-medium">{providerLabel}</span>
        </span>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {sources.map((s, i) => (
            <button
              key={i}
              onClick={() => setSourceIndex(i)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                i === sourceIndex
                  ? "bg-brand text-white"
                  : "bg-surface-2 text-gray-400 hover:text-white"
              }`}
            >
              {s.provider}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
