"use client";
import { useState, useEffect } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const EPISODES_PER_PAGE = 100;

interface Season { season_number: number; episode_count: number; }

interface EpisodesSectionProps {
  animeTitle: string;
  anilistId: number;
  malId?: number | null;
  totalEpisodes: number;
  isMovie: boolean;
  imdbId?: string | null;
  tmdbId?: number | null;
}

export function EpisodesSection({
  animeTitle, anilistId, malId, totalEpisodes, isMovie, imdbId, tmdbId,
}: EpisodesSectionProps) {
  const [episode, setEpisode] = useState(1);
  const [season, setSeason] = useState(1);
  const [page, setPage] = useState(0);
  const [watchedEps, setWatchedEps] = useState<Set<number>>(new Set());
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currSeasonEps, setCurrSeasonEps] = useState(totalEpisodes);

  // Fetch TMDB seasons
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!tmdbId || !key) return;
    fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${key}`)
      .then((r) => r.json())
      .then((data) => {
        const s: Season[] = (data.seasons || []).filter(
          (s: Season) => s.season_number > 0 && s.episode_count > 0
        );
        if (s.length > 0) {
          setSeasons(s);
          setCurrSeasonEps(s[0].episode_count);
        }
      })
      .catch(() => {});
  }, [tmdbId]);

  useEffect(() => {
    if (!seasons.length) return;
    const s = seasons.find((s) => s.season_number === season);
    if (s) { setCurrSeasonEps(s.episode_count); setEpisode(1); setPage(0); }
  }, [season, seasons]);

  // Load saved progress
  useEffect(() => {
    fetch(`/api/progress?anilistId=${anilistId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.episode) {
          const prev = new Set<number>();
          for (let i = 1; i <= data.episode; i++) prev.add(i);
          setWatchedEps(prev);
          setEpisode(data.episode);
          setSeason(data.season || 1);
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
      body: JSON.stringify({ anilistId, episode: ep, season }),
    }).catch(() => {});
  }

  function handleEpisodeEnd() {
    if (episode < currSeasonEps) {
      const next = episode + 1;
      setEpisode(next);
      toast.success(`Playing episode ${next}`);
      if (next > (page + 1) * EPISODES_PER_PAGE) setPage((p) => p + 1);
    } else {
      toast("Finished! 🎉", { icon: "✨" });
    }
  }

  const totalPages = Math.ceil(currSeasonEps / EPISODES_PER_PAGE);
  const startEp = page * EPISODES_PER_PAGE + 1;
  const endEp = Math.min((page + 1) * EPISODES_PER_PAGE, currSeasonEps);
  const pageEpisodes = Array.from({ length: endEp - startEp + 1 }, (_, i) => startEp + i);

  return (
    <div>
      <VideoPlayer
        anilistId={anilistId}
        malId={malId}
        animeTitle={animeTitle}
        episode={episode}
        season={season}
        imdbId={imdbId}
        tmdbId={tmdbId}
        isMovie={isMovie}
        onEpisodeEnd={handleEpisodeEnd}
        onProgress={handleProgress}
      />

      {!isMovie && currSeasonEps > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-display text-xl text-white">EPISODES</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Episode {episode} / {currSeasonEps}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap items-center">
              {/* Season tabs */}
              {seasons.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      onClick={() => setSeason(s.season_number)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        season === s.season_number
                          ? "bg-brand text-white font-bold"
                          : "bg-surface-2 text-gray-400 hover:text-white"
                      }`}
                    >
                      S{s.season_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Page selector */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg bg-surface-2 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => { setPage(i); setEpisode(i * EPISODES_PER_PAGE + 1); }}
                      className={`text-xs px-3 py-1.5 rounded-lg ${
                        page === i
                          ? "bg-brand text-white"
                          : "bg-surface-2 text-gray-400 hover:text-white"
                      }`}
                    >
                      {i * EPISODES_PER_PAGE + 1}–{Math.min((i + 1) * EPISODES_PER_PAGE, currSeasonEps)}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="p-1.5 rounded-lg bg-surface-2 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Episode grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
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

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-brand inline-block" /> Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1a3020] inline-block" /> Watched
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
