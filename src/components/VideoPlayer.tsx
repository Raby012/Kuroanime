"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource } from "@/lib/embed-sources";
import { getEmbedSources, getAnilistEmbedSources } from "@/lib/embed-sources";
import { Loader2, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";

interface VideoPlayerProps {
  animeTitle: string;
  anilistId: number;
  episode: number;
  season?: number;
  seasonYear?: number | null;  // ← was missing
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
  seasonYear,  // ← was missing
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

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSources([]);
    setSourceIndex(0);
    setEmbedLoaded(false);
    setEmbedError(false);

    const allSources: StreamSource[] = [];

    // 1. MegaPlay via AniList ID (instant)
    allSources.push(...getAnilistEmbedSources(anilistId, episode, isMovie));

    // 2. IMDb/TMDB direct embeds
    if (imdbId || tmdbId) {
      allSources.push(
        ...getEmbedSources(imdbId ?? null, tmdbId ?? null, season, episode, isMovie)
      );
    }

    setSources([...allSources]);
    setLoading(false);

    // 3. Anikoto → MegaPlay internal ID
    const anikotoPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=anikoto`
    ).then(r => r.json()).then(d => d.sources || []).catch(() => []);

    // 4. TMDB embeds via server lookup
    const tmdbPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&season=${season}&provider=tmdb${seasonYear ? `&year=${seasonYear}` : ""}`
    ).then(r => r.json()).then(d => d.sources || []).catch(() => []);

    // 5. GogoAnime
    const gogoPromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
    ).then(r => r.json()).then(d => d.sources || []).catch(() => []);

    // 6. AnimePahe
    const pahePromise = fetch(
      `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=animepahe`
    ).then(r => r.json()).then(d => d.sources || []).catch(() => []);

    const [anikoto, tmdb, gogo, pahe] = await Promise.all([
      anikotoPromise, tmdbPromise, gogoPromise, pahePromise,
    ]);

    setSources(prev => {
      const combined = [...prev];
      if (anikoto.length) combined.splice(2, 0, ...anikoto);
      if (tmdb.length) combined.push(...tmdb);
      if (gogo.length) combined.push(...gogo);
      if (pahe.length) combined.push(...pahe);
      return combined;
    });
  }, [animeTitle, anilistId, episode, season, seasonYear, imdbId, tmdbId, isMovie]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) { setError(true); return; }
    setProviderLabel(src.provider);
    setEmbedLoaded(false);
    setEmbedError(false);
    if (src.type === "m3u8") loadHLS(src.url, src.subtitles);
  }, [sources, sourceIndex]);

  useEffect(() => {
    const src = sources[sourceIndex];
    if (!src || src.type !== "embed") return;
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current);
    embedTimerRef.current = setTimeout(() => {
      if (!embedLoaded && !embedError) tryNextSource();
    }, 12000);
    return () => { if (embedTimerRef.current) clearTimeout(embedTimerRef.current); };
  }, [sourceIndex, sources, embedLoaded, embedError]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "error" || data?.event === "error" || data?.status === 404 || data?.error) {
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

  async function loadHLS(url: string, subtitles?: { url: string; lang: string }[]) {
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
      setSourceIndex(i => i + 1);
    } else {
      setError(true);
    }
  }

  const currentSource = sources[sourceIndex];
  const isEmbed = currentSource?.type === "embed";

  if (loading) {
    return (
      <div className="w-full aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="text-brand animate-spin" size={32} />
        <p className="text-gray-400 text-sm text-center px-4">
          Finding stream for episode {episode}...
        </p>
      </div>
    );
  }

  if (error || (!loading && sources.length === 0)) {
    return (
      <div className="w-full aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="text-brand" size={32} />
        <p className="text-white font-medium text-center">No streams available</p>
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
    <div className="w-full">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
        {isEmbed ? (
          <>
            <iframe
              ref={iframeRef}
              key={`${currentSource.url}-${sourceIndex}`}
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

      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">
          Source: <span className="text-brand font-medium">{providerLabel}</span>
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
