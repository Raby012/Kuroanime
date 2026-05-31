"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamSource } from "@/lib/embed-sources";
import { getEmbedSources, getAnilistEmbedSources } from "@/lib/embed-sources";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface VideoPlayerProps {
  animeTitle: string;
  anilistId: number;
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
  anilistId,
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

    const allSources: StreamSource[] = [];

    // 1. AniList-based embeds — always work, put these FIRST as primary sources
    const anilistEmbeds = getAnilistEmbedSources(anilistId, episode, isMovie);
    allSources.push(...anilistEmbeds);

    // 2. IMDb/TMDB embeds (if available)
    const imdbEmbeds = getEmbedSources(imdbId || null, tmdbId || null, season, episode, isMovie);
    allSources.push(...imdbEmbeds);

    // 3. Try GogoAnime via API (real m3u8, best quality but often breaks)
    try {
      const gogoRes = await fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=gogoanime`
      );
      const gogoData = await gogoRes.json();
      if (gogoData.sources?.length) {
        // Prepend real streams before embeds for better quality
        allSources.unshift(...gogoData.sources);
      }
    } catch {}

    // 4. Try AnimePahe via API
    try {
      const paheRes = await fetch(
        `/api/stream?title=${encodeURIComponent(animeTitle)}&episode=${episode}&provider=animepahe`
      );
      const paheData = await paheRes.json();
      if (paheData.sources?.length) {
        // Insert after gogo but before embeds
        const m3u8Count = allSources.filter(s => s.type === "m3u8").length;
        allSources.splice(m3u8Count, 0, ...paheData.sources);
      }
    } catch {}

    setSources(allSources);
    setLoading(false);
  }, [animeTitle, anilistId, episode, season, imdbId, tmdbId, isMovie]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // Load current source into player
  useEffect(() => {
    if (!sources.length) return;
    const src = sources[sourceIndex];
    if (!src) { setError(true); return; }
    setProviderLabel(src.provider);
    if (src.type === "m3u8") loadHLS(src.url, src.subtitles);
  }, [sources, sourceIndex]);

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
