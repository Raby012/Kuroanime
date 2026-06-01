"use client";
import { useState, useEffect } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const EPISODES_PER_PAGE = 100;

interface EpisodesSectionProps {
  animeTitle: string;
  anilistId: number;
  totalEpisodes: number;
  isMovie: boolean;
  imdbId?: string | null;
  seasonYear?: number | null;
}

export function EpisodesSection({
  animeTitle,
  anilistId,
  totalEpisodes,
  isMovie,
  imdbId,
  seasonYear,
}: EpisodesSectionProps) {
  const [episode, setEpisode] = useState(1);
  const [page, setPage] = useState(0);
  const [watchedEps, setWatchedEps] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/progress?anilistId=${anilistId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.episode) {
          const prevEps = new Set<number>();
          for (let i = 1; i <= data.episode; i++) prevEps.add(i);
          setWatchedEps(prevEps);
          setEpisode(data.episode);
          setPage(Math.floor((data.episode - 1) / EPISODES_PER_PAGE));
        }
      })
      .catch(() => {});
  }, [anilistId]);

  function handleProgress(ep: number) {
    setWatchedEps((prev) => new Set([...prev, ep]));
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId, episode: ep, season: 1 }),
    }).catch(() => {});
  }

  function handleEpisodeEnd() {
    if (episode < totalEpisodes) {
      const next = episode + 1;
      setEpisode(next);
      toast.success(`Playing episode ${next}`);
      if (next > (page + 1) * EPISODES_PER_PAGE) {
        setPage((p) => p + 1);
      }
    } else {
      toast("You've finished this anime! 🎉", { icon: "✨" });
    }
  }

  const totalPages = Math.ceil(totalEpisodes / EPISODES_PER_PAGE);
  const startEp = page * EPISODES_PER_PAGE + 1;
  const endEp = Math.min((page + 1) * EPISODES_PER_PAGE, totalEpisodes);
  const pageEpisodes = Array.from(
    { length: endEp - startEp + 1 },
    (_, i) => startEp + i
  );

  return (
    <div className="w-full">
      {/* Video Player */}
      <VideoPlayer
        animeTitle={animeTitle}
        anilistId={anilistId}
        episode={episode}
        imdbId={imdbId}
        isMovie={isMovie}
        seasonYear={seasonYear}
        onEpisodeEnd={handleEpisodeEnd}
        onProgress={handleProgress}
      />

      {/* Episode List */}
      {!isMovie && totalEpisodes > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-display text-xl text-white">EPISODES</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Episode {episode} / {totalEpisodes}
              </p>
            </div>

            {/* Page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-full">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg bg-surface-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors shrink-0 whitespace-nowrap ${
                      page === i
                        ? "bg-brand text-white font-bold"
                        : "bg-surface-2 text-gray-400 hover:text-white"
                    }`}
                  >
                    {i * EPISODES_PER_PAGE + 1}–
                    {Math.min((i + 1) * EPISODES_PER_PAGE, totalEpisodes)}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1}
                  className="p-1.5 rounded-lg bg-surface-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Episode grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 sm:gap-2">
            {pageEpisodes.map((ep) => (
              <button
                key={ep}
                onClick={() => setEpisode(ep)}
                className={`ep-btn ${episode === ep ? "active" : ""} ${
                  watchedEps.has(ep) && episode !== ep ? "watched" : ""
                }`}
              >
                {ep}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-brand inline-block" />
              Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1a3020] inline-block" />
              Watched
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
