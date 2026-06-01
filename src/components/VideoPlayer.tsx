"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource } from "@/lib/embed-sources";
import {
  getEmbedSources,
  getAnilistEmbedSources,
} from "@/lib/embed-sources";
import { Loader2, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";

interface VideoPlayerProps {
  animeTitle: string;
  anilistId: number;
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

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [embedLoaded, setEmbedLoaded] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSources([]);
    setSourceIndex(0);
    setEmbedLoaded(false);

    const allSources: StreamSource[] = [];

    // 1. MegaPlay via AniList ID (instant, no API call needed)
    const anilistEmbeds = getAnilistEmbedSources(anilistId, episode, isMovie);
    allSources.push(...anilistEmbeds);

    // 2. Anikoto → MegaPlay via internal episode ID
    // (covers anime not yet mapped to AniList ID on MegaPlay)
    // Run in parallel with other fetches
    const anikotoPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=anikoto`
    )
      .then((r) => r.json())
      .then((data) => data.sources || [])
      .catch(() => []);

    // 3. TMDB-based embeds (good for popular/finished anime)
    const tmdbPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&season=${season}&provider=tmdb${seasonYear ? `&year=${seasonYear}` : ""}`
    )
      .then((r) => r.json())
      .then((data) => data.sources || [])
      .catch(() => []);

    // 4. GogoAnime real m3u8
    const gogoPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
    )
      .then((r) => r.json())
      .then((data) => data.sources || [])
      .catch(() => []);

    // 5. AnimePahe real m3u8
    const pahePromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=animepahe`
    )
      .then((r) => r.json())
      .then((data) => data.sources || [])
      .catch(() => []);

    // 6. IMDb/TMDB direct embeds from AniList external links
    if (imdbId || tmdbId) {
      const embeds = getEmbedSources(
        imdbId ?? null,
        tmdbId ?? null,
        season,
        episode,
        isMovie
      );
      allSources.push(...embeds);
    }

    // Set initial sources immediately (MegaPlay AniList + IMDb embeds)
    // so player shows something right away
    setSources([...allSources]);
    setLoading(false);

    // Then resolve async sources and append
    const [anikotoSources, tmdbSources, gogoSources, paheSources] =
      await Promise.all([
        anikotoPromise,
        tmdbPromise,
        gogoPromise,
        pahePromise,
      ]);

    setSources((prev) => {
      const combined = [...prev];

      // Insert Anikoto sources after AniList embeds (index 2)
      // to override failing AniList-mapped ones
      if (anikotoSources.length) {
        combined.splice(2, 0, ...anikotoSources);
      }

      if (tmdbSources.length) combined.push(...tmdbSources);
      if (gogoSources.length) combined.push(...gogoSources);
      if (paheSources.length) combined.push(...paheSources);

      return combined;
    });
  }, [animeTitle, anilistId, episode, season, seasonYear, imdbId, tmdbId, isMovie]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Load current source into player
  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) { setError(true); return; }
    setProviderLabel(src.provider);
    setEmbedLoaded(false);
    if (src.type === "m3u8") loadHLS(src.url, src.subtitles);
  }, [sources, sourceIndex]);

  // Auto-advance embed after 10s if iframe didn't load
  useEffect(() => {
    const src = sources[sourceIndex];
    if (!src || src.type !== "embed") return;
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current);
    embedTimerRef.current = setTimeout(() => {
      if (!embedLoaded) tryNextSource();
    }, 10000);
    return () => {
      if (embedTimerRef.current) clearTimeout(embedTimerRef.current);
    };
  }, [sourceIndex, sources, embedLoaded]);

  // Listen for MegaPlay postMessage events (episode end, progress)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
        if (data?.event === "complete") onEpisodeEnd?.();
        if (data?.event === "time" && data.percent > 0.05) {
          onProgress?.(episode);
        }
        if (data?.type === "watching-log" && data.currentTime > 30) {
          onProgress?.(episode);
        }
      } catch {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [episode, onEpisodeEnd, onProgress]);

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
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((i) => i + 1);
    } else {
      setError(true);
    }
  }

  const currentSource = sources[sourceIndex];
  const isEmbed = currentSource?.type === "embed";

  if (loading) {
    return (
      <div className="aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="text-brand animate-spin" size={32} />
        <p className="text-gray-400 text-sm">
          Finding stream for episode {episode}...
        </p>
      </div>
    );
  }

  if (error || (!loading && sources.length === 0)) {
    return (
      <div className="aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-brand" size={32} />
        <p className="text-white font-medium">No streams available</p>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          All sources exhausted. Try again later.
        </p>
        <button
          onClick={fetchSources}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!currentSource) return null;

  return (
    <div className="relative">
      <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
        {isEmbed ? (
          <>
            <iframe
              key={currentSource.url}
              src={currentSource.url}
              className="w-full h-full"
              allowFullScreen
              allow="fullscreen; autoplay; encrypted-media"
              style={{ border: "none" }}
              onLoad={() => setEmbedLoaded(true)}
            />
            {sourceIndex < sources.length - 1 && (
              <button
                onClick={tryNextSource}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-black/70 hover:bg-brand text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Try next source <ChevronRight size={12} />
              </button>
            )}
          </>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            onEnded={onEpisodeEnd}
            onPlay={() => onProgress?.(episode)}
          />
        )}
      </div>

      {/* Source label + switcher */}
      <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-gray-500">
          Source: <span className="text-brand">{providerLabel}</span>
        </span>
        <div className="flex gap-2 flex-wrap">
          {sources.map((s, i) => (
            <button
              key={i}
              onClick={() => setSourceIndex(i)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
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
