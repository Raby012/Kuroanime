"use client";

import { useState, useEffect } from "react";

interface EpisodesSectionProps {
  animeTitle: string;
  anilistId: number;
  totalEpisodes: number;
  isMovie?: boolean;
  imdbId?: string | null;
  malId?: number | null;
}

export function EpisodesSection({
  animeTitle,
  anilistId,
  totalEpisodes,
  isMovie = false,
  imdbId,
  malId,
}: EpisodesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const EPISODES_PER_PAGE = 20;

  // If totalEpisodes is 0, show a fallback
  const actualTotal = totalEpisodes > 0 ? totalEpisodes : 12;

  // Calculate start and end episode for the current page
  const startEpisode = (currentPage - 1) * EPISODES_PER_PAGE + 1;
  const endEpisode = Math.min(currentPage * EPISODES_PER_PAGE, actualTotal);

  const totalPages = Math.ceil(actualTotal / EPISODES_PER_PAGE);

  // Handle episode click (You may already have this logic)
  const handleEpisodeClick = (episodeNumber: number) => {
    // Tell the VideoPlayer to load this episode
    // You can use a state manager (like Zustand), Context, or a URL param
    // Example: window.location.href = `/anime/${anilistId}?ep=${episodeNumber}`;
    console.log(`Playing episode ${episodeNumber}`);
    // Add your logic here
  };

  if (actualTotal === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No episode information available.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Episodes <span className="text-sm text-gray-400 font-normal">(1-{actualTotal})</span>
        </h3>
        
        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-md bg-surface-1 text-xs disabled:opacity-50 hover:bg-surface-2 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 rounded-md bg-surface-1 text-xs disabled:opacity-50 hover:bg-surface-2 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {Array.from({ length: endEpisode - startEpisode + 1 }, (_, i) => {
          const epNum = startEpisode + i;
          return (
            <button
              key={epNum}
              onClick={() => handleEpisodeClick(epNum)}
              className="aspect-square rounded-md flex items-center justify-center text-sm bg-surface-1 hover:bg-surface-2 hover:text-brand transition-colors border border-transparent hover:border-brand/50"
            >
              {epNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
