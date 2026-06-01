"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource } from "@/lib/embed-sources";
import { getAnilistEmbedSources, getEmbedSources } from "@/lib/embed-sources";
import { Loader2, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";

interface VideoPlayerProps {
  anilistId: number;
  malId?: number | null;
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
  anilistId,
  malId,
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

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    setSources([]);
    setSourceIndex(0);

    const all: StreamSource[] = [];

    // 1. Anikoto API — real HiAnime episode IDs (best quality)
    if (malId) {
      try {
        const res = await fetch(
          `/api/anikoto?malId=${malId}&episode=${episode}&title=${encodeURIComponent(animeTitle)}`
        );
        const data = await res.json();
        if (data.sources?.length) all.push(...data.sources);
      } catch {}
    }

    // 2. AniList ID embeds (VidPlus + MegaPlay)
    all.push(...getAnilistEmbedSources(anilistId, episode, isMovie));

    // 3. IMDB / TMDB embeds
    all.push(...getEmbedSources(imdbId || null, tmdbId || null, season, episode, isMovie));

    // 4. GogoAnime via consumet (server-side, extra fallback)
    try {
      const res = await fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
      );
      const data = await res.json();
      if (data.sources?.length) all.push(...data.sources);
    } catch {}

    setSources(all);
    setLoading(false);
  }, [anilistId, malId, animeTitle, episode, season, imdbId, tmdbId, isMovie]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) { setError(true); return; }
    setProviderLabel(src.provider);
    if (src.type === "m3u8") loadHLS(src.url);
  }, [sources, sourceIndex]);

  async function loadHLS(url: string) {
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
        hls.on(Hls.Events.ERROR, () => tryNextSource());
      } else {
        tryNextSource();
      }
    }
  }

  function tryNextSource() {
    if (sourceIndex < sources.length - 1) setSourceIndex((i) => i + 1);
    else setError(true);
  }

  const currentSource = sources[sourceIndex];
  const isEmbed = currentSource?.type === "embed";

  if (loading) return (
    <div className="aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-3">
      <Loader2 className="text-brand animate-spin" size={32} />
      <p className="text-gray-400 text-sm">Finding stream for episode {episode}...</p>
    </div>
  );

  if (error || !currentSource) return (
    <div className="aspect-video bg-surface-1 rounded-xl flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="text-brand" size={32} />
      <p className="text-white font-medium">No streams found</p>
      <p className="text-gray-500 text-sm text-center max-w-xs">
        All sources exhausted. Try a different episode or check back later.
      </p>
      <button
        onClick={fetchSources}
        className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  return (
    <div>
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Source: <span className="text-brand font-medium">{providerLabel}</span>
          </span>
          {sourceIndex < sources.length - 1 && (
            <button
              onClick={tryNextSource}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              Try next source <ChevronRight size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {sources.map((s, i) => (
            <button
              key={i}
              onClick={() => setSourceIndex(i)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                i === sourceIndex
                  ? "bg-brand text-white"
                  : "bg-surface-2 text-gray-500 hover:text-white"
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
