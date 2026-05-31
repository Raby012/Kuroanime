"use client";
import { useRouter } from "next/navigation";

interface SeasonSelectorProps {
  seasons: string[];
  seasonEmoji: Record<string, string>;
  years: number[];
  activeSeason: string;
  activeYear: number;
}

export function SeasonSelector({
  seasons, seasonEmoji, years, activeSeason, activeYear,
}: SeasonSelectorProps) {
  const router = useRouter();

  function navigate(season: string, year: number) {
    router.push(`/seasonal?season=${season.toLowerCase()}&year=${year}`);
  }

  return (
    <div className="space-y-3">
      {/* Season tabs */}
      <div className="flex gap-2 flex-wrap">
        {seasons.map((s) => (
          <button
            key={s}
            onClick={() => navigate(s, activeYear)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeSeason === s
                ? "bg-brand text-white shadow-lg shadow-brand/25"
                : "bg-surface-2 text-gray-400 hover:text-white border border-white/5"
            }`}
          >
            {seasonEmoji[s]} {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Year tabs */}
      <div className="flex gap-2 flex-wrap">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => navigate(activeSeason, y)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              activeYear === y
                ? "bg-surface-3 text-white font-bold border border-brand/40"
                : "bg-surface-1 text-gray-500 hover:text-white border border-white/5"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
