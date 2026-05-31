"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource } from "@/lib/streaming";
import { getEmbedSources } from "@/lib/streaming";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface VideoPlayerProps {
  animeTitle: string;
  episode: number;
  season?: number;
  imdbId?: string | null;
  tmdbId?: number | null;
  isMovie?: boolean;
  onEpisodeEnd?: () => void;
  onProgress?: (episode: number) => void;
}

export function VideoPlayer({
  animeTitle,
  episode,
  season = 1,
  imdbId,
  tmdbId,
  isMovie = false,
  onEpisodeEnd,
  onProgress,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<unknown>(null);

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");

  // Fetch real streams from API, then append embed fallbacks
  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSources([]);
    setSourceIndex(0);

    const allSources: StreamSource[] = [];

    // 1. Try GogoAnime
    try {
      const gogoRes = await fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
      );
      const gogoData = await gogoRes.json();
      if (gogoData.sources?.length) allSources.push(...gogoData.sources);
    } catch {}

    // 2. Try AnimePahe
    try {
      const paheRes = await fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=animepahe`
      );
      const paheData = await paheRes.json();
      if (paheData.sources?.length) allSources.push(...paheData.sources);
    } catch {}

    // 3. Embed fallbacks
    const embeds = getEmbedSources(imdbId || null, tmdbId || null, season, episode, isMovie);
    allSources.push(...embeds);

    setSources(allSources);
    setLoading(false);
  }, [animeTitle, episode, season, imdbId, tmdbId, isMovie]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // Load current source into player
  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) { setError(true); return; }

    setProviderLabel(src.provider);

    if (src.type === "m3u8") {
      loadHLS(src.url, src.subtitles);
    }
    // embed type handled by iframe in JSX
  }, [sources, sourceIndex]);

  async function loadHLS(url: string, subtitles?: { url: string; lang: string }[]) {
    if (typeof window === "undefined") return;
    const video = videoRef.current;
    if (!video) return;

    // Destroy existing HLS instance
    if (hlsRef.current) {
      (hlsRef.current as { destroy: () => void }).destroy();
      hlsRef.current = null;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari)
      video.src = url;
    } else {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, () => tryNextSource());
      } else {
        tryNextSource();
      }
    }
  }

  function tryNextSource() {
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
        <p className="text-gray-400 text-sm">Finding stream for episode {episode}...</p>
      </div>
    );
  }

  if (error || !currentSource) {
    return (
      <div className="aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-brand" size={32} />
        <p className="text-white font-medium">No streams available</p>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          All sources exhausted for this episode. Try again later.
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

  return (
    <div className="relative">
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        {isEmbed ? (
          <iframe
            key={currentSource.url}
            src={currentSource.url}
            className="w-full h-full"
            allowFullScreen
            allow="fullscreen; autoplay; encrypted-media"
            style={{ border: "none" }}
          />
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

      {/* Source info + switcher */}
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
